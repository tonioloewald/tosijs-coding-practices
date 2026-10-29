import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  addedLines,
  classifySurface,
  dependencyTrees,
  exemptionState,
  importClosure,
  parseAudit,
  primitiveHits,
  scanSecrets,
  surfaceTouched,
  workflowHygiene,
} from './security-surface.ts'

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'security-surface-'))
  mkdirSync(join(root, 'src/vm'), { recursive: true })
  mkdirSync(join(root, 'src/lang'), { recursive: true })
  mkdirSync(join(root, 'functions'), { recursive: true })
  writeFileSync(join(root, 'src/vm/index.ts'), `import { parse } from '../lang/parser'\nexport const run = async () => (await import('./lazy.ts')).x`)
  writeFileSync(join(root, 'src/vm/lazy.ts'), `export const x = 1`)
  writeFileSync(join(root, 'src/lang/parser.ts'), `import './util.js'\nexport const parse = 1`)
  writeFileSync(join(root, 'src/lang/util.js'), `export {}`)
  writeFileSync(join(root, 'src/unrelated.ts'), `export {}`)
  writeFileSync(join(root, 'package.json'), '{}')
  writeFileSync(join(root, 'bun.lock'), '')
  writeFileSync(join(root, 'functions/package.json'), '{}')
  writeFileSync(join(root, 'functions/package-lock.json'), '{}')
  return root
}

describe('importClosure', () => {
  test('follows static, dynamic and re-exported imports across directories, and only those', () => {
    const c = importClosure(['src/vm/index.ts'], fixture())
    expect([...c].sort()).toEqual(['src/lang/parser.ts', 'src/lang/util.js', 'src/vm/index.ts', 'src/vm/lazy.ts'])
  })
  test('a missing entry contributes nothing rather than throwing', () => {
    expect(importClosure(['nope.ts'], fixture()).size).toBe(0)
  })
})

describe('classifySurface', () => {
  const closure = new Set(['src/lang/parser.ts'])
  test('a "language" change to a file the sandbox loads is a security surface', () => {
    const s = classifySurface(['src/lang/parser.ts', 'README.md'], closure)
    expect(s.closure).toEqual(['src/lang/parser.ts'])
    expect(surfaceTouched(s)).toBe(true)
  })
  test('manifests and lockfiles in any tree, workflows, release scripts and declared docs count', () => {
    const s = classifySurface(
      ['functions/package-lock.json', 'bun.lock', '.github/workflows/publish.yml', 'scripts/release.ts', 'docs/host-fetch.md'],
      closure,
      ['docs/host-*.md'],
    )
    expect(s.manifests).toEqual(['functions/package-lock.json', 'bun.lock'])
    expect(s.pipeline).toEqual(['.github/workflows/publish.yml', 'scripts/release.ts'])
    expect(s.docs).toEqual(['docs/host-fetch.md'])
  })
  test('a change outside every surface is none', () => {
    expect(surfaceTouched(classifySurface(['src/unrelated.ts', 'CHANGELOG.md'], closure))).toBe(false)
  })
})

const diff = `diff --git a/src/a.ts b/src/a.ts
+++ b/src/a.ts
@@ -1,0 +10,3 @@
+const f = new Function('return 1')
+const k = "AKIA${'ABCDEFGHIJKLMNOP'}"
+const t = "pk.eyJ${'x'.repeat(30)}"
+++ b/src/b.ts
@@ -5 +5 @@
+obj.eval(1); fetch(url)
`

describe('addedLines / scanSecrets / primitiveHits', () => {
  const lines = addedLines(diff)
  test('added lines carry their file and new line number', () => {
    expect(lines.map((l) => `${l.file}:${l.line}`)).toEqual(['src/a.ts:10', 'src/a.ts:11', 'src/a.ts:12', 'src/b.ts:5'])
  })
  test('secrets are classed, and the report never carries the value', () => {
    const hits = scanSecrets(lines)
    expect(hits).toEqual([
      { file: 'src/a.ts', line: 11, kind: 'AWS access key', secret: true },
      { file: 'src/a.ts', line: 12, kind: 'Mapbox public token', secret: false },
    ])
    expect(JSON.stringify(hits)).not.toContain('AKIA')
  })
  test('primitives are reported only inside the closure, and a method named eval is not eval', () => {
    expect(primitiveHits(lines, new Set(['src/a.ts']))).toEqual([{ file: 'src/a.ts', line: 10, primitive: 'new Function' }])
    expect(primitiveHits(lines, new Set(['src/b.ts'])).map((h) => h.primitive)).toEqual(['fetch'])
  })
})

describe('workflowHygiene', () => {
  test('flags an unpinned third-party action, and a moving-ref checkout of another repo in a job that mints tokens', () => {
    const wf = `
permissions:
  contents: read
jobs:
  publish:
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: someone/practices
      - uses: oven-sh/setup-bun@v2
      - uses: oven-sh/setup-bun@${'a'.repeat(40)}
  test:
    steps:
      - uses: actions/checkout@v4
        with:
          repository: someone/practices
`
    expect(workflowHygiene('publish.yml', wf).map((i) => `${i.severity} ${i.job}: ${i.detail}`)).toEqual([
      'FAIL publish: checks out someone/practices at a moving ref in a job holding id-token: write',
      'WARN publish: third-party action not pinned by SHA: oven-sh/setup-bun@v2',
    ])
  })
})

describe('dependency trees and advisories', () => {
  test('every package.json with its own lockfile is a tree, nested ones included', () => {
    expect(dependencyTrees(fixture()).sort()).toEqual(['', 'functions'])
  })
  test('bun and npm audit output normalize to one shape', () => {
    const bun = `{"re2js":[{"url":"https://github.com/advisories/GHSA-gg6h-894w-4m9c","title":"ReDoS","severity":"high"}]}`
    const npm = `{"vulnerabilities":{"x":{"severity":"critical","via":[{"url":"https://github.com/advisories/GHSA-aaaa","title":"t","severity":"critical"},"y"]}}}`
    expect(parseAudit('', bun)).toEqual([{ tree: '', pkg: 're2js', id: 'GHSA-gg6h-894w-4m9c', severity: 'high', title: 'ReDoS' }])
    expect(parseAudit('functions', npm)).toEqual([{ tree: 'functions', pkg: 'x', id: 'GHSA-aaaa', severity: 'critical', title: 't' }])
  })
  test('an exemption suppresses only with a reason and a future expiry', () => {
    const today = new Date('2026-10-29')
    expect(exemptionState(undefined, today)).toBe('none')
    expect(exemptionState({ reason: 'no fix upstream', expires: '2026-12-01' }, today)).toBe('valid')
    expect(exemptionState({ expires: '2026-12-01' }, today)).toBe('invalid')
    expect(exemptionState({ reason: 'r', expires: 'soon' }, today)).toBe('invalid')
    expect(exemptionState({ reason: 'r', expires: '2026-10-01' }, today)).toBe('expired')
  })
})
