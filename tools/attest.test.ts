/**
 * attest.ts's shipped-file binding, against a scratch package and real `npm pack` tarballs.
 * It had no test at all (tjs-lang 0.14.0 re-review 4, M-2).
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { $ } from 'bun'
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { shippedManifest, shippedChanges, verifyShipped, ATTESTATION_FILE } from './attest'

let repo: string
let out: string

async function pack(): Promise<string> {
  for (const f of readdirSync(out)) rmSync(join(out, f))
  const r = await $`npm pack --json --pack-destination ${out}`.cwd(repo).quiet()
  return join(out, JSON.parse(r.stdout.toString())[0].filename)
}

async function commitAll(msg: string) {
  await $`git add -A && git commit -q -m ${msg}`.cwd(repo).quiet()
}

/** Attest the current tree the way attest.ts does, minus the lanes: HEAD^ is the tree. */
async function attest() {
  const tree = (await $`git rev-parse HEAD^{tree}`.cwd(repo).quiet()).stdout.toString().trim()
  const pkg = JSON.parse(await Bun.file(join(repo, 'package.json')).text())
  writeFileSync(
    join(repo, ATTESTATION_FILE),
    JSON.stringify({ version: pkg.version, tree, commit: '', bun: Bun.version, lanes: {}, shipped: await shippedManifest(repo) })
  )
  await commitAll('attest')
}

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'attest-repo-'))
  out = mkdtempSync(join(tmpdir(), 'attest-out-'))
  writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'scratch-attest', version: '1.0.0', files: ['index.js'] }))
  writeFileSync(join(repo, 'index.js'), 'export const x = 1\n')
  await $`git init -q && git config user.email t@t && git config user.name t`.cwd(repo).quiet()
  await commitAll('release')
  await attest()
})
afterAll(() => {
  rmSync(repo, { recursive: true, force: true })
  rmSync(out, { recursive: true, force: true })
})

describe('verifyShipped', () => {
  it('the same build: identical', async () => {
    expect(await verifyShipped(repo, await pack())).toBeNull()
  })

  it('a changed shipped file is named', async () => {
    writeFileSync(join(repo, 'index.js'), 'export const x = 2\n')
    const tgz = await pack()
    writeFileSync(join(repo, 'index.js'), 'export const x = 1\n')
    expect(await verifyShipped(repo, tgz)).toMatch(/differs: index\.js/)
  })

  it('a stale attestation is named as STALE, not as a bad build', async () => {
    const pkg = JSON.parse(await Bun.file(join(repo, 'package.json')).text())
    writeFileSync(join(repo, 'package.json'), JSON.stringify({ ...pkg, version: '1.0.1' }))
    await commitAll('bump without re-attesting')
    const msg = await verifyShipped(repo, await pack())
    expect(msg).toMatch(/does not cover this tree/)
    expect(msg).not.toMatch(/not the attested build/)
  })

  it('…and in a dry run it warns rather than fails', async () => {
    process.env.DRY_RUN = 'true'
    try {
      expect(await verifyShipped(repo, await pack())).toBeNull()
    } finally {
      delete process.env.DRY_RUN
    }
  })
})

describe('shippedChanges', () => {
  const shipped = { 'dist/index.js': 'a', 'README.md': 'b' }
  it('a rewritten file that ships is refused', () => {
    expect(shippedChanges(' M dist/index.js\n M docs/version.json\n', shipped)).toEqual({
      shipped: ['dist/index.js'],
      ignored: ['docs/version.json'],
    })
  })
  it('files that do not ship are ignored, not refused', () => {
    expect(shippedChanges(' M docs/version.json\n M docs/site.epub\n', shipped).shipped).toEqual([])
  })
  it('an untracked file that would ship counts, and renames resolve to the new path', () => {
    expect(shippedChanges('?? README.md\nR  old.js -> dist/index.js\n', shipped).shipped).toEqual(['README.md', 'dist/index.js'])
  })
  it('the first line survives trimming — a shipped file listed first is still refused', () => {
    // git() trims its output, so the first porcelain line arrives without its leading space
    expect(shippedChanges('M dist/index.js\n M docs/version.json', shipped)).toEqual({
      shipped: ['dist/index.js'],
      ignored: ['docs/version.json'],
    })
  })
})
