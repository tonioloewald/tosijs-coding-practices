#!/usr/bin/env bun
/**
 * release-doctor — Tier 0 of the review structure (reviews/2026-09-practices-audit.md, D2).
 *
 * The mechanical release gate: every check here corresponds to a blocker class that a
 * model-driven review historically caught at model prices (~20% of all blockers ever found).
 * Run from a project root before tagging, and any time you want the truth:
 *
 *   bun /path/to/tosijs-coding-practices/tools/release-doctor.ts
 *
 * Honesty rules (dependencies.md §1): a check that cannot run reports SKIP with a reason —
 * never a pass it didn't earn. Exit 1 on any FAIL.
 */

import { $ } from 'bun'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

type Result = { name: string; status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'; detail: string }
const results: Result[] = []
const add = (name: string, status: Result['status'], detail = '') =>
  results.push({ name, status, detail })

const pkgPath = join(process.cwd(), 'package.json')
if (!existsSync(pkgPath)) {
  console.error('release-doctor: no package.json here — run from a project root')
  process.exit(2)
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const version: string = pkg.version ?? ''
const isPrivate = pkg.private === true
const scripts: Record<string, string> = pkg.scripts ?? {}

async function run(cmd: string[]): Promise<{ ok: boolean; out: string }> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text())
    const code = await proc.exited
    return { ok: code === 0, out }
  } catch (e) {
    return { ok: false, out: String(e) }
  }
}

// 1. Working tree state (context, not a gate)
{
  const { out } = await run(['git', 'status', '--porcelain'])
  if (out.trim()) add('clean tree', 'WARN', `${out.trim().split('\n').length} uncommitted paths`)
  else add('clean tree', 'PASS')
}

// 2. Tests — name every lane you can find, run each (releasing.md step 3: the build does NOT run them)
{
  const lanes = Object.keys(scripts).filter((s) => s === 'test' || s.startsWith('test:'))
  if (lanes.length === 0) {
    const hasTests = existsSync(join(process.cwd(), 'src')) &&
      readdirSync(join(process.cwd(), 'src')).some((f) => f.includes('.test.'))
    if (hasTests) {
      const r = await run(['bun', 'test'])
      add('tests (bun test)', r.ok ? 'PASS' : 'FAIL', r.ok ? '' : r.out.split('\n').slice(-8).join('\n'))
    } else add('tests', 'SKIP', 'no test script and no *.test.* under src/ — if this project verifies by demo, that is the intended workflow (testing.md)')
  } else {
    for (const lane of lanes) {
      const r = await run(['bun', 'run', lane])
      add(`tests (${lane})`, r.ok ? 'PASS' : 'FAIL', r.ok ? '' : r.out.split('\n').slice(-8).join('\n'))
    }
  }
}

// 3. Typecheck
{
  if (scripts.typecheck) {
    const r = await run(['bun', 'run', 'typecheck'])
    add('typecheck', r.ok ? 'PASS' : 'FAIL', r.ok ? '' : r.out.split('\n').slice(-8).join('\n'))
  } else add('typecheck', 'SKIP', 'no typecheck script')
}

// 4. Build (build or make — never assume it ran tests)
{
  const buildScript = scripts.build ? 'build' : scripts.make ? 'make' : null
  if (buildScript) {
    const r = await run(['bun', 'run', buildScript])
    add(`build (${buildScript})`, r.ok ? 'PASS' : 'FAIL', r.ok ? '' : r.out.split('\n').slice(-6).join('\n'))
  } else add('build', 'SKIP', 'no build/make script')
}

// 5. CHANGELOG has an entry for the current version, and isn't badly stale
{
  const clPath = join(process.cwd(), 'CHANGELOG.md')
  if (!existsSync(clPath)) add('changelog', 'FAIL', 'no CHANGELOG.md — every product ships one (development.md)')
  else {
    const cl = readFileSync(clPath, 'utf8')
    if (version && cl.includes(version)) add(`changelog entry for ${version}`, 'PASS')
    else add(`changelog entry for ${version}`, 'FAIL', 'no heading mentions the version being released')
    const { out: lastClCommit } = await run(['git', 'log', '-1', '--format=%H', '--', 'CHANGELOG.md'])
    if (lastClCommit.trim()) {
      const { out: since } = await run(['git', 'rev-list', '--count', `${lastClCommit.trim()}..HEAD`])
      const n = parseInt(since.trim() || '0', 10)
      if (n > 15) add('changelog freshness', 'WARN', `${n} commits since CHANGELOG last touched`)
      else add('changelog freshness', 'PASS', `${n} commits since last touch`)
    }
  }
}

// 6. License (skip for private packages)
{
  if (isPrivate) add('license', 'SKIP', 'private package')
  else {
    const hasField = !!pkg.license
    const hasFile = existsSync(join(process.cwd(), 'LICENSE')) || existsSync(join(process.cwd(), 'LICENSE.md'))
    if (hasField && hasFile) add('license', 'PASS')
    else add('license', 'FAIL', `${hasField ? '' : 'no license field; '}${hasFile ? '' : 'no LICENSE file'}`)
  }
}

// 7. Land the plane: tag/publish/tree divergence (D4: this blocks version work regardless of audience)
{
  if (isPrivate) add('tag/publish reconciliation', 'SKIP', 'private package')
  else {
    const name = pkg.name
    const { ok, out } = await run(['npm', 'view', name, 'version'])
    if (!ok) add('tag/publish reconciliation', 'SKIP', `npm view failed (${out.trim().split('\n')[0]}) — could not check; do not read this as clean`)
    else {
      const npmVersion = out.trim()
      const { out: tags } = await run(['git', 'tag', '--list', 'v*'])
      const tagList = tags.trim().split('\n').filter(Boolean)
      const tagForNpm = tagList.includes(`v${npmVersion}`)
      const unpublishedTags = tagList.filter((t) => {
        const v = t.slice(1)
        return v.localeCompare(npmVersion, undefined, { numeric: true }) > 0 && !v.includes('-')
      })
      if (unpublishedTags.length > 0)
        add('tag/publish reconciliation', 'FAIL',
          `tags ahead of npm (${npmVersion}): ${unpublishedTags.join(', ')} — land the plane before any new version work (releasing.md)`)
      else if (!tagForNpm && tagList.length > 0)
        add('tag/publish reconciliation', 'WARN', `npm has ${npmVersion} but no v${npmVersion} tag exists — published release not identifiable in the repo`)
      else if (tagList.length === 0)
        add('tag/publish reconciliation', npmVersion ? 'WARN' : 'PASS', npmVersion ? `published ${npmVersion} but repo has zero tags` : '')
      else add('tag/publish reconciliation', 'PASS', `npm ${npmVersion}, tags consistent`)
    }
  }
}

// 8. Unresolved BLOCK verdicts in review reports
{
  const dirs = ['reviews', join('docs', 'reviews')].map((d) => join(process.cwd(), d)).filter(existsSync)
  const blocked: string[] = []
  for (const dir of dirs)
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.md')))
      if (/verdict[:*\s]+block/i.test(readFileSync(join(dir, f), 'utf8'))) blocked.push(join(dir, f))
  if (blocked.length > 0)
    add('review verdicts', 'WARN', `reports with Verdict: BLOCK on disk — confirm each was resolved: ${blocked.join(', ')}`)
  else if (dirs.length > 0) add('review verdicts', 'PASS')
  else add('review verdicts', 'SKIP', 'no reviews/ directory')
}

// Report
const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️ ', SKIP: '⏭️ ' } as const
console.log(`\nrelease-doctor — ${pkg.name}@${version}\n`)
for (const r of results) {
  console.log(`${icons[r.status]} ${r.name}${r.detail ? ` — ${r.detail.split('\n')[0]}` : ''}`)
  if (r.status === 'FAIL' && r.detail.includes('\n'))
    console.log(r.detail.split('\n').slice(1).map((l) => `     ${l}`).join('\n'))
}
const fails = results.filter((r) => r.status === 'FAIL').length
const warns = results.filter((r) => r.status === 'WARN').length
const skips = results.filter((r) => r.status === 'SKIP').length
console.log(`\n${fails} failed, ${warns} warnings, ${skips} skipped (skips are NOT passes)`)
process.exit(fails > 0 ? 1 : 0)
