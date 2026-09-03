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
 * never a pass it didn't earn, and never a FAIL it didn't earn either. The second half
 * matters as much as the first: a gate that cries wolf gets muted, and a muted gate is
 * worse than no gate. An UNMET PRECONDITION (a lane whose runtime is too old, a binary
 * that is not installed) is not a finding about the code — it is the check declining to
 * run, and it must say so. Exit 1 on any FAIL.
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

/**
 * Did this lane FAIL, or was it unable to RUN?
 *
 * Reported by tosijs on release-doctor's first outing elsewhere: its
 * `test:browser` lane exited non-zero with "You are running Node.js 14.17.3.
 * Playwright requires Node.js 20 or higher." That is an unmet precondition, not
 * a defect in the project — and reporting it as FAIL is exactly the
 * cry-wolf that teaches people to skim past this output.
 *
 * Deliberately NARROW: these patterns are tools stating their own preconditions
 * in the imperative. Anything ambiguous stays a FAIL, because swallowing a real
 * failure is the worse error of the two.
 */
const CANNOT_RUN = [
  /requires Node\.js \d+(\.\d+)* or higher/i,
  /command not found/i,
  /is not recognized as an internal or external command/i,
  /Executable doesn't exist at .*(playwright|ms-playwright)/i,
  /Please (install|run) .*(playwright install|browsers)/i,
]
const cannotRun = (out: string): string | undefined => {
  for (const re of CANNOT_RUN) {
    const m = out.match(re)
    if (m) {
      const line = out.split('\n').find((l) => re.test(l))?.trim() ?? m[0]
      return line.slice(0, 160)
    }
  }
  return undefined
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
      const blocked = r.ok ? undefined : cannotRun(r.out)
      if (blocked) {
        add(`tests (${lane})`, 'SKIP', `could not run: ${blocked}`)
        continue
      }
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

/**
 * The full build is not always called `build`.
 *
 * tjs-lang calls its `make`, deliberately: `bun build` is a Bun BUILTIN (the bundler), so a
 * `build` script means `bun build` silently runs the builtin while `bun run build` runs the
 * script, and the two drift. Ordered, so a repo with both still gets `build`.
 *
 * Defined ONCE, because it was defined twice: check 4 knew about `make` and the
 * artifact-freshness check below read `scripts.build` directly, so it reported
 * `no build script` forever in exactly the repo that had renamed it.
 *
 * That cost a security-vulnerable publish. tjs-lang 0.13.7 shipped a sandbox-escape fix in
 * `src/` and a `dist/` built 35 minutes earlier; Bun resolves that package to `src/` and Node
 * to `dist/`, so every Node consumer got the vulnerable build. Artifact freshness is the check
 * for precisely that, and it had never run there. A SKIP that can never become a PASS is worse
 * than a missing check — it reads as coverage, and this tool's own summary line ("skips are
 * NOT passes") is aimed at a reader who will believe it anyway.
 */
const buildScript = scripts.build
  ? 'build'
  : scripts.make
    ? 'make'
    : scripts['build:all']
      ? 'build:all'
      : null

// 4. Build (build or make — never assume it ran tests)
{
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
    /*
     * …AND THE CHECK ABOVE IS SATISFIABLE BY NOT BUMPING.
     *
     * With `version` still at the LAST published release, the entry for that
     * release is obviously present, so the gate passes against the previous
     * release's text. That is how a release with unbumped identity reached two
     * consecutive pre-release reviews at full green: package.json, version.ts,
     * the committed dist/ and the newest CHANGELOG heading all still named the
     * prior version while the bundles carried new code. Published as-is, the
     * artifact is byte-different from its predecessor but self-identifies as
     * it — agent.version, the debug-bundle banner and every consumer bug
     * report would name the wrong release.
     *
     * So: if the local version EQUALS what npm already publishes, this is not
     * a release, it is the previous one wearing today's code.
     */
    if (!isPrivate && version) {
      const { ok, out } = await run(['npm', 'view', pkg.name, 'version'])
      const published = ok ? out.trim() : ''
      if (published === '') {
        add('release identity', 'SKIP', 'could not reach the registry')
      } else if (published === version) {
        add(
          'release identity',
          'FAIL',
          `package.json is ${version} and npm already publishes ${published} — ` +
            'bump before tagging, or the artifact ships self-identifying as its ' +
            'predecessor'
        )
      } else {
        add('release identity', 'PASS', `${version} (npm has ${published})`)
      }
    }
    const { out: lastClCommit } = await run(['git', 'log', '-1', '--format=%H', '--', 'CHANGELOG.md'])
    if (lastClCommit.trim()) {
      const { out: since } = await run(['git', 'rev-list', '--count', `${lastClCommit.trim()}..HEAD`])
      const n = parseInt(since.trim() || '0', 10)
      if (n > 15) add('changelog freshness', 'WARN', `${n} commits since CHANGELOG last touched`)
      else add('changelog freshness', 'PASS', `${n} commits since last touch`)
    }
  }
}

/*
 * 5b. COMMITTED BUILD OUTPUT MUST MATCH THE SOURCE THAT WAS TESTED.
 *
 * Every project that commits `dist/` has the severed-propagation shape: the
 * suite exercises `src/`, the consumer executes `dist/`, and nothing
 * machine-checks that they agree. A tosijs release fixed a secret-redaction
 * leak in src, passed 918 tests, and had a committed dist/ that predated the
 * security commit entirely — the fix was correct and unshipped.
 *
 * Rebuild and diff. Cheap next to the failure it prevents.
 */
{
  const tracked = ['dist', 'docs'].filter((d) =>
    existsSync(join(process.cwd(), d))
  )
  const { out: trackedOut } = await run([
    'git',
    'ls-files',
    '--error-unmatch',
    ...tracked,
  ])
  if (tracked.length === 0 || trackedOut.trim() === '') {
    add('artifact freshness', 'SKIP', 'no committed build output to check')
  } else if (buildScript == null) {
    add('artifact freshness', 'SKIP', 'no build script')
  } else {
    const built = await run(['bun', 'run', buildScript])
    if (!built.ok) {
      add('artifact freshness', 'SKIP', 'build failed — see the build check')
    } else {
      const { ok: clean, out: drift } = await run([
        'git',
        'diff',
        '--stat',
        '--',
        ...tracked,
      ])
      void clean
      const changed = drift
        .trim()
        .split('\n')
        .filter((l) => l.trim() !== '')
      // some generators are nondeterministic (epub timestamps, build stamps);
      // report rather than fail on a handful, fail when the code itself moved
      const codeDrift = changed.filter((l) => /\.(js|mjs|cjs|d\.ts)\b/.test(l))
      if (codeDrift.length > 0) {
        add(
          'artifact freshness',
          'FAIL',
          `committed build output is stale — rebuilding changed ${codeDrift.length} ` +
            `code artifact(s). The tested source is not the shipped source:\n` +
            codeDrift.slice(0, 6).join('\n')
        )
      } else if (changed.length > 0) {
        add(
          'artifact freshness',
          'WARN',
          `${changed.length} non-code artifact(s) differ (timestamps/stamps)`
        )
      } else {
        add('artifact freshness', 'PASS', 'rebuild reproduces the committed output')
      }
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
