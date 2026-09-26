#!/usr/bin/env bun
/**
 * attest — record that test lanes CI cannot run were run locally, on exactly this tree.
 *
 *   bun <practices>/tools/attest.ts            # run the attested lanes, write release-attestation.json
 *   bun <practices>/tools/attest.ts --verify   # check HEAD carries a valid attestation (exit 0/1)
 *   bun <practices>/tools/attest.ts --verify-shipped <tgz>   # the tarball CI packed contains
 *                                                            # exactly the attested files
 *
 * Some suites cannot run in CI — tjs-lang's need live LLMs. The publish workflow still has to
 * know they passed. The repo declares them:
 *
 *   package.json → "releaseDoctor": { "attestedLanes": ["test:llm"] }
 *
 * The flow: make the release commit → run this on the CLEAN tree → commit ONLY
 * release-attestation.json → tag that commit. Verification requires exactly that shape: HEAD
 * changes nothing but the attestation, and HEAD's parent has the tree the lanes ran on. Any edit
 * after testing changes the tree, and the attestation stops verifying.
 *
 * HONEST LIMIT: this is a record, not a proof. Anyone who can push could write a false one —
 * but anyone who can push can change the code too. The maintainer's 2FA approval of the staged
 * publish stays the real gate. What this buys is that "the heavy tests passed on this exact
 * tree" is written down, checked mechanically, and cannot silently go stale.
 */

import { $ } from 'bun'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const ATTESTATION_FILE = 'release-attestation.json'

export interface LaneResult {
  command: string
  exitCode: number
  durationMs: number
  /** the last lines of output, so a reader can see what "passed" looked like */
  tail: string
}

export interface Attestation {
  version: string
  /** the tree the lanes ran on: `git rev-parse HEAD^{tree}` at attestation time */
  tree: string
  commit: string
  bun: string
  lanes: Record<string, LaneResult>
  /**
   * sha256 of every file `npm pack` would ship, taken after the lanes on the clean tree —
   * the BUILD that was tested and signed off, not just the source it came from. CI rebuilds
   * and must reproduce it exactly (`--verify-shipped`), so what npm ships is byte-for-byte
   * what the local suite vouched for, and the suite never has to run in GitHub. Per FILE,
   * not the tarball's integrity: tar metadata (file modes) differs between macOS and Linux
   * while the contents do not.
   */
  shipped?: Record<string, string>
}

async function git(args: string[], cwd: string): Promise<string> {
  const r = await $`git ${args}`.cwd(cwd).nothrow().quiet()
  return r.exitCode === 0 ? r.stdout.toString().trim() : ''
}

/** sha256 of every entry in a packed tarball, keyed by its path in the package. */
export async function tarballManifest(tarball: string): Promise<Record<string, string>> {
  const dir = mkdtempSync(join(tmpdir(), 'attest-'))
  try {
    const r = await $`tar -xzf ${tarball} -C ${dir}`.nothrow().quiet()
    if (r.exitCode !== 0) throw new Error(`could not unpack ${tarball}: ${r.stderr.toString().trim()}`)
    const root = join(dir, 'package')
    const out: Record<string, string> = {}
    const walk = (rel: string) => {
      for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
        const p = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) walk(p)
        else {
          const h = new Bun.CryptoHasher('sha256')
          h.update(readFileSync(join(root, p)))
          out[p] = h.digest('hex')
        }
      }
    }
    walk('')
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * The manifest of what `cwd` SHIPS: packed exactly as the publish workflow packs it
 * (`npm pack`, lifecycle scripts included), then hashed entry by entry. Both sides of the
 * comparison are real tarballs' contents, so npm's own normalisation (package.json, file
 * selection) is on both sides rather than hidden between them.
 */
export async function shippedManifest(cwd: string): Promise<Record<string, string>> {
  const dir = mkdtempSync(join(tmpdir(), 'attest-pack-'))
  try {
    const r = await $`npm pack --json --pack-destination ${dir}`.cwd(cwd).nothrow().quiet()
    if (r.exitCode !== 0) throw new Error(`npm pack failed: ${r.stderr.toString().trim()}`)
    const file = JSON.parse(r.stdout.toString())[0].filename
    return await tarballManifest(join(dir, file))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Does `tarball` (what CI packed and is about to stage) contain exactly the files the
 * attestation recorded? The reason it does not, or null.
 *
 * Staleness is checked FIRST and named as staleness. Comparing hashes against an attestation
 * for another version or tree reported "this build does not reproduce the attested one" —
 * pointing at the build, when the cause was a release commit made without re-attesting.
 */
export async function verifyShipped(cwd: string, tarball: string): Promise<string | null> {
  const { error, attestation } = await verifyAttestation(cwd, [])
  if (error) {
    const stale = `the attestation does not cover this tree, so its build cannot be checked: ${error}`
    // A REHEARSAL on a branch that has moved on since the last release is not a release: say
    // so and carry on. A real publish (no DRY_RUN) refuses.
    if (process.env.DRY_RUN === 'true') {
      console.warn(`⚠️  ${stale} (dry run: not failing)`)
      return null
    }
    return stale
  }
  if (!attestation!.shipped)
    return `${ATTESTATION_FILE} records no shipped-file manifest — re-attest with a current attest.ts`
  const want = attestation!.shipped
  const got = await tarballManifest(tarball)
  const diffs: string[] = []
  for (const [p, h] of Object.entries(want)) {
    if (!(p in got)) diffs.push(`missing: ${p}`)
    else if (got[p] !== h) diffs.push(`differs: ${p}`)
  }
  for (const p of Object.keys(got)) if (!(p in want)) diffs.push(`extra:   ${p}`)
  if (!diffs.length) return null
  return `the tarball CI built is not the attested build (${diffs.length} file(s)):\n  ${diffs.slice(0, 40).join('\n  ')}${diffs.length > 40 ? '\n  …' : ''}`
}

export function attestedLanes(cwd: string): string[] {
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  const lanes = pkg.releaseDoctor?.attestedLanes
  return Array.isArray(lanes) ? lanes : []
}

/**
 * Does HEAD carry a valid attestation? Returns the reason it does not, or null when it does.
 * `lanes` are the lanes the caller needs covered.
 */
export async function verifyAttestation(
  cwd: string,
  lanes: string[]
): Promise<{ error: string | null; attestation?: Attestation }> {
  const file = join(cwd, ATTESTATION_FILE)
  if (!existsSync(file)) return { error: `no ${ATTESTATION_FILE}` }
  let att: Attestation
  try {
    att = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return { error: `${ATTESTATION_FILE} is not valid JSON` }
  }
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  if (att.version !== pkg.version)
    return { error: `attestation is for ${att.version}, package.json is ${pkg.version}` }
  const changed = (await git(['diff', '--name-only', 'HEAD^', 'HEAD'], cwd)).split('\n').filter(Boolean)
  if (changed.length !== 1 || changed[0] !== ATTESTATION_FILE)
    return {
      error: `HEAD must change ONLY ${ATTESTATION_FILE} (it changes: ${changed.join(', ') || 'nothing'}) — commit the attestation alone, last, and tag that`,
    }
  const parentTree = await git(['rev-parse', 'HEAD^^{tree}'], cwd)
  if (parentTree !== att.tree)
    return { error: `the lanes ran on tree ${att.tree.slice(0, 12)}, but HEAD's parent is ${parentTree.slice(0, 12)} — the code changed after testing; re-attest` }
  for (const lane of lanes) {
    const r = att.lanes?.[lane]
    if (!r) return { error: `lane ${lane} is not in the attestation` }
    if (r.exitCode !== 0) return { error: `lane ${lane} is recorded as FAILED (exit ${r.exitCode})` }
  }
  return { error: null, attestation: att }
}

async function attest(cwd: string) {
  const lanes = attestedLanes(cwd)
  if (lanes.length === 0) {
    console.error('🛑 no lanes declared: package.json → "releaseDoctor": { "attestedLanes": ["test:…"] }')
    process.exit(1)
  }
  if (await git(['status', '--porcelain'], cwd)) {
    console.error('🛑 the tree is not clean. Commit the release first — the attestation records the committed tree.')
    process.exit(1)
  }
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  const results: Record<string, LaneResult> = {}
  let failed = false
  for (const lane of lanes) {
    if (!pkg.scripts?.[lane]) {
      console.error(`🛑 ${lane} is declared as attested but package.json has no such script`)
      process.exit(1)
    }
    console.log(`▶ ${lane}`)
    const start = Date.now()
    const r = await $`bun run ${lane}`.cwd(cwd).nothrow()
    const out = (r.stdout.toString() + r.stderr.toString()).trimEnd().split('\n')
    results[lane] = {
      command: pkg.scripts[lane],
      exitCode: r.exitCode,
      durationMs: Date.now() - start,
      tail: out.slice(-6).join('\n'),
    }
    if (r.exitCode !== 0) failed = true
  }
  // The lanes must not have changed the tree either, or the record describes something else.
  if (await git(['status', '--porcelain'], cwd)) {
    console.error('🛑 running the lanes modified the tree — the attestation would not describe it. Fix that first.')
    process.exit(1)
  }
  if (failed) {
    for (const [lane, r] of Object.entries(results))
      if (r.exitCode !== 0) console.error(`❌ ${lane} (exit ${r.exitCode})\n${r.tail}`)
    console.error('🛑 not attesting: a lane failed. Nothing was written.')
    process.exit(1)
  }
  const att: Attestation = {
    version: pkg.version,
    tree: await git(['rev-parse', 'HEAD^{tree}'], cwd),
    commit: await git(['rev-parse', 'HEAD'], cwd),
    bun: Bun.version,
    lanes: results,
    shipped: await shippedManifest(cwd),
  }
  writeFileSync(join(cwd, ATTESTATION_FILE), JSON.stringify(att, null, 2) + '\n')
  console.log(`✅ attested ${lanes.join(', ')} for ${pkg.version} on tree ${att.tree.slice(0, 12)}, and the ${Object.keys(att.shipped!).length} files it ships`)
  console.log(`   Now: git add ${ATTESTATION_FILE} && git commit -m "attest: v${pkg.version}" — ALONE — then tag that commit.`)
}

if (import.meta.main) {
  const cwd = process.cwd()
  if (process.argv.includes('--verify-shipped')) {
    const tarball = process.argv[process.argv.indexOf('--verify-shipped') + 1]
    if (!tarball || tarball.startsWith('--')) {
      console.error('usage: attest.ts --verify-shipped <tarball>')
      process.exit(1)
    }
    const error = await verifyShipped(cwd, tarball)
    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }
    console.log('✅ the tarball CI built contains exactly the files the attestation vouches for')
  } else if (process.argv.includes('--verify')) {
    const { error } = await verifyAttestation(cwd, attestedLanes(cwd))
    if (error) {
      console.error(`❌ attestation: ${error}`)
      process.exit(1)
    }
    console.log('✅ attestation verifies for this tree')
  } else {
    await attest(cwd)
  }
}
