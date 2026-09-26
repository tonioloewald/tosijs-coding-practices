#!/usr/bin/env bun
/**
 * attest — record that test lanes CI cannot run were run locally, on exactly this tree.
 *
 *   bun <practices>/tools/attest.ts            # run the attested lanes, write release-attestation.json
 *   bun <practices>/tools/attest.ts --verify   # check HEAD carries a valid attestation (exit 0/1)
 *   bun <practices>/tools/attest.ts --verify-shipped   # after a build: the files it would ship
 *                                                      # are byte-identical to the attested ones
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
import { existsSync, readFileSync, writeFileSync } from 'fs'
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

/** sha256 of every file `npm pack` would ship from `cwd`, keyed by its path in the package. */
export async function shippedManifest(cwd: string): Promise<Record<string, string>> {
  const r = await $`npm pack --dry-run --json --ignore-scripts`.cwd(cwd).nothrow().quiet()
  if (r.exitCode !== 0) throw new Error(`npm pack --dry-run failed: ${r.stderr.toString().trim()}`)
  const files: Array<{ path: string }> = JSON.parse(r.stdout.toString())[0].files
  const out: Record<string, string> = {}
  for (const { path } of files.sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const h = new Bun.CryptoHasher('sha256')
    h.update(readFileSync(join(cwd, path)))
    out[path] = h.digest('hex')
  }
  return out
}

/** Does the build in `cwd` ship exactly the files the attestation recorded? Reason, or null. */
export async function verifyShipped(cwd: string): Promise<string | null> {
  const file = join(cwd, ATTESTATION_FILE)
  if (!existsSync(file)) return `no ${ATTESTATION_FILE}`
  const att: Attestation = JSON.parse(readFileSync(file, 'utf8'))
  if (!att.shipped) return `${ATTESTATION_FILE} records no shipped-file manifest — re-attest with a current attest.ts`
  const now = await shippedManifest(cwd)
  const diffs: string[] = []
  for (const [p, h] of Object.entries(att.shipped)) {
    if (!(p in now)) diffs.push(`missing: ${p}`)
    else if (now[p] !== h) diffs.push(`differs: ${p}`)
  }
  for (const p of Object.keys(now)) if (!(p in att.shipped)) diffs.push(`extra:   ${p}`)
  if (!diffs.length) return null
  return `this build does not reproduce the attested one (${diffs.length} file(s)):\n  ${diffs.slice(0, 40).join('\n  ')}${diffs.length > 40 ? '\n  …' : ''}`
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
    const error = await verifyShipped(cwd)
    if (error) {
      console.error(`❌ ${error}`)
      process.exit(1)
    }
    console.log('✅ this build ships exactly the files the attestation vouches for')
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
