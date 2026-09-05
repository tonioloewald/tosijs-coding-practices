#!/usr/bin/env bun
/**
 * scoreboard — regenerate the FACT columns of the README's Project scoreboard.
 *
 *   bun tools/scoreboard.ts          # rewrite Version + "As of" cells in place
 *   bun tools/scoreboard.ts --check  # report divergences, change nothing, exit 1 if stale
 *
 * Design rule (TODO.md, "The navigation hub"): expose what we write, write what
 * we expose. The "What it is" and "Activity" columns are curated prose — this
 * tool NEVER touches them. The Version and "As of" columns are facts about
 * registries and repos, which rot when hand-maintained (releasing.md step 9
 * exists because they did) — so they are generated, and a stale row becomes
 * impossible instead of a chore.
 *
 * Honesty rules (dependencies.md §1): a project the tool cannot verify is left
 * untouched — its "As of" date does NOT advance, because that date means "when
 * this row was last verified against reality" and an unverified stamp is a lie.
 * Registry reads go straight to the registry, not through npm's cache
 * (releasing.md step 8b: npm view has served stale versions minutes after a
 * publish).
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Project = {
  /** unique text that identifies the row's first cell */
  key: string
  /** owner/repo on GitHub; omit for local-only projects (row left alone) */
  repo?: string
  /** npm package name; omit if the project does not publish */
  npm?: string
}

// The metadata. One list, in the tool that consumes it — the README displays
// it, this maps it. Add a row here when you add a row there (the tool fails
// loudly if the two drift).
const PROJECTS: Project[] = [
  { key: '[tosijs](', repo: 'tonioloewald/tosijs', npm: 'tosijs' },
  { key: '[tosijs-ui](', repo: 'tonioloewald/tosijs-ui', npm: 'tosijs-ui' },
  { key: '[tosijs-schema](', repo: 'tonioloewald/tosijs-schema', npm: 'tosijs-schema' },
  { key: '[tosijs-floorplan](', repo: 'tonioloewald/tosijs-floorplan', npm: 'tosijs-floorplan' },
  { key: '[tjs-lang](', repo: 'tonioloewald/tjs-lang', npm: 'tjs-lang' },
  { key: '[react-tosijs](', repo: 'tonioloewald/react-tosijs', npm: 'react-tosijs' },
  { key: '[ngx-tosijs](', repo: 'tonioloewald/ngx-tosijs', npm: 'ngx-tosijs' },
  { key: '[tosijs-3d](', repo: 'tonioloewald/tosijs-3d', npm: 'tosijs-3d' },
  { key: 'tosijs-3d-ensemble' }, // local repo, unpublished — row is hand-maintained
  { key: 'manta-recon' }, // local, private
  { key: '[tosijs-product](', repo: 'tonioloewald/tosijs-product', npm: 'tosijs-product' },
  { key: '[tosijs-timezone-picker](', repo: 'tonioloewald/tosijs-timezone-picker', npm: 'tosijs-timezone-picker' },
  { key: '[haltija](', repo: 'tonioloewald/haltija', npm: 'haltija' },
  { key: '[wobbly](', repo: 'tonioloewald/wobbly', npm: 'wobbly-js' },
  { key: '[tosijs-editor](', repo: 'tonioloewald/tosijs-editor', npm: 'tosijs-styled-editor' },
  { key: '[lukko](', repo: 'tonioloewald/lukko' },
  { key: '[loewald-dot-com](', repo: 'tonioloewald/tosijs-platform' },
  { key: '[kith-email](', repo: 'tonioloewald/kith-email' },
]

const check = process.argv.includes('--check')
const readmePath = join(import.meta.dir, '..', 'README.md')
const today = new Date().toISOString().slice(0, 10)

async function sh(cmd: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
    const out = await new Response(proc.stdout).text()
    return (await proc.exited) === 0 ? out : null
  } catch {
    return null
  }
}

/** npm `latest`, straight from the registry (no cache — releasing.md 8b). */
async function npmLatest(pkg: string): Promise<string | null | 'unpublished'> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`)
    if (res.status === 404) return 'unpublished'
    if (!res.ok) return null
    return ((await res.json()) as any).version ?? null
  } catch {
    return null
  }
}

/** package.json version on the default branch, via gh (works for private repos too). */
async function repoVersion(repo: string): Promise<string | null> {
  const out = await sh(['gh', 'api', `repos/${repo}/contents/package.json`, '-q', '.content'])
  if (!out) return null
  try {
    return JSON.parse(atob(out.trim().replace(/\n/g, ''))).version ?? null
  } catch {
    return null
  }
}

/** Highest stable v* tag on the remote. */
async function latestTag(repo: string): Promise<string | null | 'untagged'> {
  const out = await sh(['git', 'ls-remote', '--tags', `https://github.com/${repo}`])
  if (out == null) return null
  const versions = [...out.matchAll(/refs\/tags\/v(\d+\.\d+\.\d+)(?:\^\{\})?$/gm)].map((m) => m[1])
  if (versions.length === 0) return 'untagged'
  versions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return versions[versions.length - 1]
}

function versionCell(pkgV: string | null, tagV: string | null | 'untagged', npmV: string | null | 'unpublished', p: Project): string | null {
  // could not verify enough to say anything → leave the row alone
  if (pkgV == null) return null
  const npmKnown = p.npm != null && npmV != null
  if (p.npm && npmV == null) return null // publishes, but registry unreachable — don't guess
  const npmLabel = p.npm && p.npm !== p.key.replace(/^\[|\]\($/g, '').replace(/\]\($/, '') ? ` (\`${p.npm}\`)` : ''
  if (npmKnown && npmV !== 'unpublished' && pkgV === npmV && tagV === npmV)
    return `${npmV} (repo · tag · npm all agree)`
  const parts: string[] = []
  if (p.npm) parts.push(npmV === 'unpublished' ? `npm **unpublished**${npmLabel}` : `npm \`latest\` **${npmV}**${npmLabel}`)
  parts.push(`\`package.json\` **${pkgV}**`)
  if (tagV != null) parts.push(tagV === 'untagged' ? '**untagged**' : `tag **v${tagV}**`)
  const published = npmV !== 'unpublished' && npmV != null
  const diverged =
    (published && pkgV !== npmV) ||
    (published && tagV != null && tagV !== 'untagged' && tagV !== npmV)
  return `${diverged ? '⚠️ ' : ''}${parts.join(' · ')}`
}

// ---------------------------------------------------------------------------

const readme = readFileSync(readmePath, 'utf8')
const lines = readme.split('\n')
const problems: string[] = []
const changes: string[] = []

for (const p of PROJECTS) {
  if (!p.repo) continue // local-only: hand-maintained by design
  const i = lines.findIndex((l) => l.startsWith('|') && l.includes(p.key))
  if (i === -1) {
    problems.push(`no scoreboard row found for ${p.key} — README and tool metadata have drifted`)
    continue
  }
  const cells = lines[i].split('|')
  if (cells.length !== 8) {
    problems.push(`row for ${p.key} has ${cells.length - 2} cells, expected 6 — not touching it`)
    continue
  }
  const [pkgV, tagV, npmV] = await Promise.all([
    repoVersion(p.repo),
    latestTag(p.repo),
    p.npm ? npmLatest(p.npm) : Promise.resolve(null),
  ])
  const cell = versionCell(pkgV, tagV, npmV, p)
  if (cell == null) {
    problems.push(`${p.key} could not be verified (repo/registry unreachable) — row left as-is, "As of" NOT advanced`)
    continue
  }
  const oldVersion = cells[3].trim()
  const oldAsOf = cells[6].trim()
  if (oldVersion !== cell) changes.push(`${p.repo}:\n    was: ${oldVersion}\n    now: ${cell}`)
  cells[3] = ` ${cell} `
  cells[6] = ` ${today} `
  lines[i] = cells.join('|')
  void oldAsOf
}

if (problems.length) {
  console.error('scoreboard: problems —')
  for (const m of problems) console.error(`  ✗ ${m}`)
}
if (changes.length) {
  console.log(`scoreboard: ${changes.length} fact cell(s) ${check ? 'STALE' : 'updated'} —`)
  for (const c of changes) console.log(`  ${c}`)
} else {
  console.log('scoreboard: all verified rows already accurate')
}

if (!check) writeFileSync(readmePath, lines.join('\n'))
process.exit(check && (changes.length || problems.length) ? 1 : problems.length ? 1 : 0)
