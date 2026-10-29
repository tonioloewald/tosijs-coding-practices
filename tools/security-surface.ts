#!/usr/bin/env bun
/**
 * security-surface — the mechanical half of the security lens (Tier 0).
 *
 *   bun <practices>/tools/security-surface.ts [--base <ref>] [--entries a.ts,b.ts]   # print the surface report
 *
 * The security lens's gate 1 used to be a judgement: "does the diff touch or sit adjacent to
 * a security subsystem?" Measured on tjs-lang, 17 of 51 commits changed files the sandbox
 * loads, every one subject-lined as language work, and one of them shipped a property GET
 * inside the VM's own equality with no security pass (tjs-lang board #3529, #3531). Whether a
 * diff touches a security surface is a fact, so a script computes it and the lens starts from
 * it. The lens may widen the scope; it may take its fast exit only when this says "none".
 *
 * A diff touches a security surface when it changes any of:
 *   1. a file in the import closure of a declared entry point
 *      (package.json → "releaseDoctor": { "securityEntries": ["src/vm/index.ts", …] });
 *   2. a dependency manifest or lockfile, in any tree;
 *   3. a CI or publish workflow, or a release script;
 *   4. docs that teach host-integration code ("securityDocs": ["docs/host-*.md", …]).
 *
 * Pure functions are exported for release-doctor and for tests; nothing here prints a secret.
 */

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'fs'
import { dirname, join, relative, sep } from 'path'

const CODE_EXT = /\.(m|c)?(t|j)sx?$/

/** Repo-relative paths of every in-repo file reachable by static or dynamic import. */
export function importClosure(entries: string[], root: string): Set<string> {
  root = realpathSync(root) // resolveSync returns real paths; /var vs /private/var would read as outside
  const seen = new Set<string>()
  const stack = entries.map((e) => join(root, e)).filter((f) => existsSync(f))
  while (stack.length) {
    const file = stack.pop()!
    const rel = relative(root, file)
    if (seen.has(rel)) continue
    seen.add(rel)
    if (!CODE_EXT.test(file)) continue
    let imports: { path: string }[] = []
    try {
      const ext = file.match(/\.(\w+)$/)![1]
      const loader = ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext.endsWith('ts') ? 'ts' : 'js'
      imports = new Bun.Transpiler({ loader }).scanImports(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    for (const { path } of imports) {
      let resolved: string
      try {
        resolved = realpathSync(Bun.resolveSync(path, dirname(file)))
      } catch {
        continue
      }
      const r = relative(root, resolved)
      if (r.startsWith('..') || r.split(sep).includes('node_modules')) continue
      if (!seen.has(r)) stack.push(resolved)
    }
  }
  return seen
}

const MANIFEST = /(^|\/)(package\.json|bun\.lockb?|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|npm-shrinkwrap\.json)$/
const PIPELINE = /(^\.github\/workflows\/|(^|\/)(release|publish)[\w.-]*\.(ts|js|sh|mjs)$)/

export interface Surface {
  closure: string[]
  manifests: string[]
  pipeline: string[]
  docs: string[]
}

export function classifySurface(changed: string[], closure: Set<string>, docGlobs: string[] = []): Surface {
  const globs = docGlobs.map((g) => new Bun.Glob(g))
  return {
    closure: changed.filter((f) => closure.has(f)),
    manifests: changed.filter((f) => MANIFEST.test(f)),
    pipeline: changed.filter((f) => PIPELINE.test(f)),
    docs: changed.filter((f) => globs.some((g) => g.match(f))),
  }
}

export const surfaceTouched = (s: Surface) =>
  s.closure.length + s.manifests.length + s.pipeline.length + s.docs.length > 0

export interface AddedLine { file: string; line: number; text: string }

/** Parse `git diff -U0` output into the lines it adds. */
export function addedLines(diff: string): AddedLine[] {
  const out: AddedLine[] = []
  let file = ''
  let line = 0
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) file = l.replace(/^\+\+\+ (b\/)?/, '')
    else if (l.startsWith('@@')) line = Number(l.match(/\+(\d+)/)?.[1] ?? 0)
    else if (l.startsWith('+')) out.push({ file, line: line++, text: l.slice(1) })
  }
  return out.filter((a) => a.file && a.file !== '/dev/null')
}

// Secret-class patterns authorize something; public-class ones only identify (a Mapbox pk.
// token, a Firebase web key). The report names the file, line and class, never the value.
const SECRET_PATTERNS: [string, RegExp][] = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b|github_pat_[A-Za-z0-9_]{22,}/],
  ['API secret key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Mapbox secret token', /\bsk\.eyJ[A-Za-z0-9._-]{20,}/],
]
const PUBLIC_PATTERNS: [string, RegExp][] = [
  ['Google/Firebase web key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Mapbox public token', /\bpk\.eyJ[A-Za-z0-9._-]{20,}/],
]

export interface SecretHit { file: string; line: number; kind: string; secret: boolean }

export function scanSecrets(lines: AddedLine[]): SecretHit[] {
  const hits: SecretHit[] = []
  for (const a of lines) {
    for (const [kind, re] of SECRET_PATTERNS) if (re.test(a.text)) hits.push({ file: a.file, line: a.line, kind, secret: true })
    for (const [kind, re] of PUBLIC_PATTERNS) if (re.test(a.text)) hits.push({ file: a.file, line: a.line, kind, secret: false })
  }
  return hits
}

// Execution and egress primitives. A hit is not a finding; it is an input the lens must
// address by name.
const PRIMITIVES: [string, RegExp][] = [
  ['new Function', /\bnew\s+Function\s*\(/],
  ['eval', /(^|[^.\w])eval\s*\(/],
  ['structuredClone', /\bstructuredClone\s*\(/],
  ['spawn/exec', /\b(spawn|spawnSync|exec|execSync|execFile)\s*\(|Bun\.spawn/],
  ['listen', /\.listen\s*\(|Bun\.serve\s*\(/],
  ['process.kill', /\bprocess\.kill\s*\(/],
  ['fetch', /\bfetch\s*\(/],
  ['new RegExp', /\bnew\s+RegExp\s*\(/],
]

export interface PrimitiveHit { file: string; line: number; primitive: string }

export function primitiveHits(lines: AddedLine[], files: Set<string>): PrimitiveHit[] {
  const hits: PrimitiveHit[] = []
  for (const a of lines) {
    if (!files.has(a.file)) continue
    for (const [primitive, re] of PRIMITIVES) if (re.test(a.text)) hits.push({ file: a.file, line: a.line, primitive })
  }
  return hits
}

export interface WorkflowIssue { file: string; job: string; detail: string; severity: 'FAIL' | 'WARN' }

const SHA = /^[0-9a-f]{40}$/

/**
 * Third-party actions pinned by SHA, and no checkout of another repo at a moving ref in a job
 * that can mint an OIDC token (tjs-lang final-rereview-3: an unpinned practices checkout in a
 * job holding `id-token: write`).
 */
export function workflowHygiene(file: string, text: string): WorkflowIssue[] {
  let wf: any
  try {
    wf = Bun.YAML.parse(text)
  } catch (e) {
    return [{ file, job: '-', detail: `does not parse as YAML: ${(e as Error).message}`, severity: 'WARN' }]
  }
  const issues: WorkflowIssue[] = []
  const mintsToken = (perms: any) => perms === 'write-all' || (perms && typeof perms === 'object' && perms['id-token'] === 'write')
  const workflowMints = mintsToken(wf?.permissions)
  for (const [job, def] of Object.entries<any>(wf?.jobs ?? {})) {
    const mints = workflowMints || mintsToken(def?.permissions)
    for (const step of def?.steps ?? []) {
      const uses: string | undefined = step?.uses
      if (!uses || uses.startsWith('./') || uses.startsWith('docker://')) continue
      const [action, ref = ''] = uses.split('@')
      if (!action.startsWith('actions/') && !action.startsWith('github/') && !SHA.test(ref))
        issues.push({ file, job, detail: `third-party action not pinned by SHA: ${uses}`, severity: 'WARN' })
      if (mints && action === 'actions/checkout' && step?.with?.repository && !SHA.test(String(step?.with?.ref ?? '')))
        issues.push({ file, job, detail: `checks out ${step.with.repository} at a moving ref in a job holding id-token: write`, severity: 'FAIL' })
    }
  }
  return issues
}

/** Directories (repo-relative, '' = root) holding a package.json and its own lockfile. */
export function dependencyTrees(root: string): string[] {
  const trees: string[] = []
  const walk = (dir: string) => {
    let names: string[]
    try {
      names = readdirSync(dir)
    } catch {
      return
    }
    if (names.includes('package.json') && names.some((n) => /^(bun\.lockb?|package-lock\.json)$/.test(n)))
      trees.push(relative(root, dir))
    for (const n of names) {
      if (n === 'node_modules' || n.startsWith('.') || n === 'dist') continue
      const p = join(dir, n)
      try {
        if (statSync(p).isDirectory()) walk(p)
      } catch {}
    }
  }
  walk(root)
  return trees
}

export interface Advisory { tree: string; pkg: string; id: string; severity: string; title: string }

/** Normalize `bun audit --json` ({pkg: [advisory]}) or `npm audit --json` ({vulnerabilities}). */
export function parseAudit(tree: string, json: string): Advisory[] {
  const data = JSON.parse(json || '{}')
  const out: Advisory[] = []
  if (data && typeof data.vulnerabilities === 'object') {
    for (const [pkg, v] of Object.entries<any>(data.vulnerabilities))
      for (const via of v.via ?? [])
        if (typeof via === 'object')
          out.push({ tree, pkg, id: String(via.url ?? via.source ?? '').split('/').pop() || '?', severity: via.severity ?? v.severity, title: via.title ?? '' })
    return out
  }
  for (const [pkg, list] of Object.entries<any>(data ?? {}))
    if (Array.isArray(list))
      for (const a of list)
        out.push({ tree, pkg, id: String(a.url ?? a.id).split('/').pop()!, severity: a.severity, title: a.title ?? '' })
  return out
}

export interface Exemption { reason?: string; expires?: string }

/** dependencies.md §3: an exemption needs a reason and a future expiry, or it does not suppress. */
export function exemptionState(e: Exemption | undefined, today = new Date()): 'none' | 'valid' | 'invalid' | 'expired' {
  if (!e) return 'none'
  if (!e.reason || !e.expires || Number.isNaN(Date.parse(e.expires))) return 'invalid'
  return Date.parse(e.expires) < today.getTime() ? 'expired' : 'valid'
}

// ---- CLI: print the surface so a lens (or a person) can read it ----------------------------
if (import.meta.main) {
  const root = process.cwd()
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const argBase = process.argv.indexOf('--base')
  let base = argBase > 0 ? process.argv[argBase + 1] : process.env.RELEASE_DOCTOR_BASE
  if (!base) base = (await Bun.$`git describe --tags --abbrev=0 --match v*`.nothrow().quiet().text()).trim()
  if (!base) {
    console.log('security surface: UNKNOWN — no base (no v* tag; pass --base <ref>). The security lens may not fast-exit.')
    process.exit(0)
  }
  const changed = (await Bun.$`git diff --name-only ${base}...HEAD`.nothrow().quiet().text()).split('\n').filter(Boolean)
  const argEntries = process.argv.indexOf('--entries') // try entries before declaring them
  const entries: string[] = argEntries > 0 ? process.argv[argEntries + 1].split(',') : pkg.releaseDoctor?.securityEntries ?? []
  const closure = importClosure(entries, root)
  const s = classifySurface(changed, closure, pkg.releaseDoctor?.securityDocs ?? [])
  const lines = addedLines(await Bun.$`git diff -U0 ${base}...HEAD`.nothrow().quiet().text())
  console.log(`security surface since ${base} (${changed.length} files changed):`)
  if (!entries.length)
    console.log('  closure: UNKNOWN — no releaseDoctor.securityEntries declared; the lens may not fast-exit on a source change')
  else console.log(`  closure of ${entries.join(', ')} (${closure.size} files): ${s.closure.length ? s.closure.join(', ') : 'untouched'}`)
  console.log(`  manifests/lockfiles: ${s.manifests.join(', ') || 'untouched'}`)
  console.log(`  CI/publish/release: ${s.pipeline.join(', ') || 'untouched'}`)
  console.log(`  host-integration docs: ${s.docs.join(', ') || 'untouched'}`)
  const prims = primitiveHits(lines, new Set(s.closure))
  for (const p of prims) console.log(`  primitive in closure diff: ${p.primitive} at ${p.file}:${p.line}`)
  const unknown = !entries.length && changed.some((f) => CODE_EXT.test(f))
  console.log(surfaceTouched(s) || unknown ? 'VERDICT: touched — the security lens runs its cascade' : 'VERDICT: none — the security lens may take its fast exit')
}
