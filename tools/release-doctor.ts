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
  const r = await runSplit(cmd)
  return { ok: r.ok, out: r.stdout + r.stderr }
}

/**
 * stdout and stderr SEPARATELY — for any command whose stdout is machine-readable.
 *
 * `run()` concatenates the two, which is fine for grepping and wrong for parsing: a package
 * with a `prepare` script prints `> pkg@x prepare …` to STDERR during `npm pack`, which then
 * lands AFTER the JSON and makes `JSON.parse` throw. The packaged-exports block caught that
 * and reported SKIP — hiding four checks at once (exports resolve, relative specifiers
 * resolve, imports declared, bins packed) on every repo with a `prepare` script. Found on
 * tjs-lang 0.14.0-rc.0, 2026-09-24.
 */
/**
 * Every DIST-TAG's version, not just `latest`. `npm view <pkg> version` answers with `latest`
 * only, and a prerelease on `rc`/`next`/`beta` never becomes `latest` — so a check built on it is
 * blind to every prerelease. Found in tjs-lang at 0.14.0-rc.0: its own prepublish-check called a
 * published rc "unclaimed" and "previous release tagged" while the rc sat untagged. `null` means
 * the registry could not be read — unknown, never empty.
 */
async function distTags(name: string): Promise<Record<string, string> | null> {
  const r = await runSplit(['npm', 'view', '--prefer-online', name, 'dist-tags', '--json'])
  if (!r.ok) return null
  try {
    const t = JSON.parse(r.stdout)
    return t && typeof t === 'object' && Object.keys(t).length ? t : null
  } catch {
    return null
  }
}

async function runSplit(
  cmd: string[]
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const code = await proc.exited
    return { ok: code === 0, stdout, stderr }
  } catch (e) {
    return { ok: false, stdout: '', stderr: String(e) }
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

/**
 * The failure detail for a test lane: the NAMES of the failing tests, then the summary tail.
 *
 * It used to be the last 8 lines only — the pass/fail counts — and bun prints `(fail) <name>`
 * lines far above that. So a lane could report FAIL with no way to tell WHICH test: tjs-lang's
 * 0.14.0 Tier 0 showed `test:dogfood — 1 fail` and the name was simply gone; the failure never
 * reproduced, and without the name it could not even be looked up. Keep up to 10 names.
 */
function laneFailureDetail(out: string): string {
  const lines = out.split('\n')
  const failed = lines.filter((l) => /^\(fail\)/.test(l.trim())).slice(0, 10)
  const tail = lines.slice(-8).join('\n')
  return failed.length ? `${failed.join('\n')}\n${tail}` : tail
}

// 2. Tests — name every lane you can find, run each (releasing.md step 3: the build does NOT run them)
{
  const lanes = Object.keys(scripts).filter((s) => s === 'test' || s.startsWith('test:'))
  if (lanes.length === 0) {
    const hasTests = existsSync(join(process.cwd(), 'src')) &&
      readdirSync(join(process.cwd(), 'src')).some((f) => f.includes('.test.'))
    if (hasTests) {
      const r = await run(['bun', 'test'])
      add('tests (bun test)', r.ok ? 'PASS' : 'FAIL', r.ok ? '' : laneFailureDetail(r.out))
    } else add('tests', 'SKIP', 'no test script and no *.test.* under src/ — if this project verifies by demo, that is the intended workflow (testing.md)')
  } else {
    /*
     * ADVISORY lanes, declared by the repo with a reason:
     *   package.json → "releaseDoctor": { "advisoryLanes": { "test:grok": "<why it never blocks>" } }
     * An advisory lane still RUNS and its result is still shown — a failure becomes WARN, not
     * FAIL. Some lanes measure something that is not the code: tjs-lang's `test:grok` samples a
     * small live model's success rate, a documented "never blocks a release" lane, and failing
     * Tier 0 on a model's bad day teaches people to stop reading Tier 0. A declaration without a
     * reason is itself a FAIL: an unexplained exemption is a silent hole.
     */
    const advisory: Record<string, unknown> = pkg.releaseDoctor?.advisoryLanes ?? {}
    for (const lane of lanes) {
      const isAdvisory = Object.prototype.hasOwnProperty.call(advisory, lane)
      const reason = isAdvisory ? String(advisory[lane] ?? '').trim() : ''
      if (isAdvisory && !reason) {
        add(`tests (${lane})`, 'FAIL', 'declared advisory with no reason — give one in releaseDoctor.advisoryLanes')
        continue
      }
      const r = await run(['bun', 'run', lane])
      const blocked = r.ok ? undefined : cannotRun(r.out)
      if (blocked) {
        add(`tests (${lane})`, 'SKIP', `could not run: ${blocked}`)
        continue
      }
      if (!r.ok && isAdvisory) {
        add(`tests (${lane})`, 'WARN', `ADVISORY lane failed (${reason}):\n${laneFailureDetail(r.out)}`)
        continue
      }
      add(`tests (${lane})`, r.ok ? 'PASS' : 'FAIL', r.ok ? (isAdvisory ? 'advisory' : '') : laneFailureDetail(r.out))
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
      // --prefer-online on every registry read: npm view answers from cache and
      // has served a version minutes stale right after a publish, turning this
      // check into a confident wrong answer (releasing.md step 8b).
      // `published` is THIS version if any dist-tag names it (an rc on `rc` counts), else
      // `latest`. Asking for `version` alone saw only `latest`, so an already-published
      // prerelease read as "not yet published" — see distTags().
      const tagsNow = await distTags(pkg.name)
      const published = !tagsNow
        ? ''
        : Object.values(tagsNow).includes(version)
          ? version
          : (tagsNow.latest ?? '')
      if (published === '') {
        add('release identity', 'SKIP', 'could not reach the registry')
      } else if (published !== version) {
        add('release identity', 'PASS', `${version} (npm has ${published})`)
      } else {
        /*
         * Local version EQUALS the published one. That is the shape described
         * above — and it is ALSO the shape of a repo that just shipped and has
         * not been touched since, which is the healthiest state a project is
         * ever in. Failing both alike left every project red from the moment it
         * published until its next bump: tosijs-product went green-to-red purely
         * by a successful `npm publish` landing. A Tier 0 that is red in the good
         * state teaches people to stop reading it, which costs more than the bug
         * this guard catches.
         *
         * What separates the two is whether any work rides on top of the release.
         * With no commits since the tag, HEAD *is* the published artifact and
         * there is nothing yet to misidentify. The original failure had new code
         * under the old version — commits since the tag — so it still fails.
         */
        let tag = ''
        for (const candidate of [`v${version}`, version]) {
          const found = await run(['git', 'rev-parse', '--verify', '--quiet', `refs/tags/${candidate}`])
          if (found.ok) {
            tag = candidate
            break
          }
        }
        const counted = tag ? await run(['git', 'rev-list', '--count', `${tag}..HEAD`]) : null
        const ahead = counted?.ok ? parseInt(counted.out.trim() || '0', 10) : Number.NaN
        if (!tag || Number.isNaN(ahead)) {
          // Published under this version but no local tag names it: we cannot tell
          // shipped-and-idle from unbumped-new-code, so stay strict.
          add(
            'release identity',
            'FAIL',
            `package.json is ${version} and npm already publishes ${published}, and ` +
              'no local tag names it — bump before tagging, or the artifact ships ' +
              'self-identifying as its predecessor'
          )
        } else if (ahead === 0) {
          add(
            'release identity',
            'PASS',
            `${version} shipped and unchanged since ${tag} — the next change needs a bump`
          )
        } else {
          add(
            'release identity',
            'FAIL',
            `package.json is ${version}, npm already publishes ${published}, and ` +
              `${ahead} commit(s) landed since ${tag} — bump before tagging, or the ` +
              'artifact ships self-identifying as its predecessor'
          )
        }
      }
    }
    const { out: lastClCommit } = await run(['git', 'log', '-1', '--format=%H', '--', 'CHANGELOG.md'])
    if (lastClCommit.trim()) {
      const { out: since } = await run(['git', 'rev-list', '--count', `${lastClCommit.trim()}..HEAD`])
      const n = parseInt(since.trim() || '0', 10)
      if (n > 15) add('changelog freshness', 'WARN', `${n} commits since CHANGELOG last touched`)
      else add('changelog freshness', 'PASS', `${n} commits since last touch`)
    }
    // A re-review trigger stated in a report's prose does not fire (tosijs-virta
    // 0.5.0: "sooner if the adapter lands" — the adapter landed, 53 commits and
    // 14k lines went unreviewed). Count commits since the newest review instead.
    const { out: newestReview } = await run(['git', 'log', '-1', '--format=%H', '--', 'reviews'])
    if (newestReview.trim()) {
      const { out: sinceReview } = await run(['git', 'rev-list', '--count', `${newestReview.trim()}..HEAD`])
      const r = parseInt(sinceReview.trim() || '0', 10)
      if (r > 15) add('review freshness', 'WARN', `${r} commits since reviews/ was last touched — run the review`)
      else add('review freshness', 'PASS', `${r} commits since the newest review`)
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
    const allTags = await distTags(name)
    if (!allTags?.latest) add('tag/publish reconciliation', 'SKIP', 'could not read dist-tags — could not check; do not read this as clean')
    else {
      const npmVersion = allTags.latest
      const { out: tags } = await run(['git', 'tag', '--list', 'v*'])
      const tagList = tags.trim().split('\n').filter(Boolean)
      // Every OTHER channel too: a published prerelease with no git tag is the same "published
      // release not identifiable in the repo" as an untagged `latest`, and was invisible here.
      const untaggedChannels = Object.entries(allTags)
        .filter(([ch, v]) => ch !== 'latest' && !tagList.includes(`v${v}`))
        .map(([ch, v]) => `${v} (\`${ch}\`)`)
      if (untaggedChannels.length)
        add('prerelease tags', 'WARN', `published but never tagged: ${untaggedChannels.join(', ')} — tag the commit it was published FROM, not HEAD`)
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
      {
        const body = readFileSync(join(dir, f), 'utf8')
        if (!/verdict[:*\s]+block/i.test(body)) continue
        /*
        A RESOLVED report is not a finding.

        Every gate a project ever failed stays on disk, so grepping for the
        verdict alone means this warning grows monotonically and names the same
        historical reports forever — and a check that fires on its most common
        input teaches you to skim past it, which is exactly when it will be
        right. A report that records its own resolution is answered: that IS the
        confirmation this check asks for.
        */
        if (/\*\*STATUS:[^*\n]*\b(CLEARED|SUPERSEDED|RESOLVED)\b/i.test(body))
          continue
        blocked.push(join(dir, f))
      }
  if (blocked.length > 0)
    add('review verdicts', 'WARN', `reports with an UNRESOLVED Verdict: BLOCK — resolve each, or record the outcome as \`**STATUS: CLEARED**\` (or SUPERSEDED): ${blocked.join(', ')}`)
  else if (dirs.length > 0) add('review verdicts', 'PASS')
  else add('review verdicts', 'SKIP', 'no reviews/ directory')
}

/*
Dependency declarations as a release gate — tosijs-ui#61 §2.

Eight issues on that repo are one missing script: peers whose range excludes the
version anyone would install, peers the repo does not itself install (so the
combination shipped is not the combination tested), runtime imports that were
never declared, and bins without a shebang — that last one filed TWICE.

Each check FAILS only where the answer is unambiguous and WARNs where a
maintainer could reasonably have meant it. A gate that cries wolf gets muted,
and a muted gate is worse than no gate.
*/
{
  const peers: Record<string, string> = pkg.peerDependencies ?? {}
  const peerMeta: Record<string, { optional?: boolean }> = pkg.peerDependenciesMeta ?? {}
  const deps: Record<string, string> = pkg.dependencies ?? {}
  const devDeps: Record<string, string> = pkg.devDependencies ?? {}

  // --- peers vs what is actually installed here -----------------------------
  // Read node_modules, not devDependencies: the installed tree is what the test
  // suite and the build actually ran against. A range that agrees with the
  // manifest but not with the tree is the interesting failure.
  const untested: string[] = []
  for (const [name, range] of Object.entries(peers)) {
    const mp = join(process.cwd(), 'node_modules', name, 'package.json')
    if (!existsSync(mp)) {
      if (!peerMeta[name]?.optional) untested.push(`${name} (declared ^peer but not installed here)`)
      continue
    }
    try {
      const installed = JSON.parse(readFileSync(mp, 'utf8')).version
      if (!Bun.semver.satisfies(installed, range))
        untested.push(`${name}: declares "${range}", tests against ${installed}`)
    } catch {}
  }
  if (Object.keys(peers).length === 0) add('peer/dev agreement', 'SKIP', 'no peerDependencies')
  else if (untested.length)
    add('peer/dev agreement', 'FAIL',
      `a declared peer is not what this repo builds and tests against — the shipped combination is untested:\n${untested.join('\n')}`)
  else add('peer/dev agreement', 'PASS')

  // --- shipped-size baseline (releasing.md "track bundle size") ----------------
  // The build must print the delta; it can only do that against a committed
  // baseline. tosijs-virta 0.5.0 grew ×3.8 with nothing printed and no line in
  // the CHANGELOG — the reviewer rebuilt the base by hand to find out.
  if (existsSync(join(process.cwd(), 'dist')) || existsSync(join(process.cwd(), 'docs'))) {
    if (existsSync(join(process.cwd(), 'dist-sizes.json'))) add('shipped-size baseline', 'PASS')
    else add('shipped-size baseline', 'WARN', 'no dist-sizes.json: the build cannot print a size delta; record one at release')
  }

  // --- bin shebangs (tosijs-ui#35 and #36 — the same bug, filed twice) -------
  const bins: Record<string, string> =
    typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : (pkg.bin ?? {})
  const noShebang: string[] = []
  for (const [binName, rel] of Object.entries(bins)) {
    const f = join(process.cwd(), rel)
    if (!existsSync(f)) { noShebang.push(`${binName} → ${rel} (missing)`); continue }
    if (!readFileSync(f, 'utf8').startsWith('#!')) noShebang.push(`${binName} → ${rel}`)
  }
  if (Object.keys(bins).length === 0) add('bin shebangs', 'SKIP', 'no bin entries')
  else if (noShebang.length)
    add('bin shebangs', 'FAIL', `a bin without a shebang is not executable when npm links it:\n${noShebang.join('\n')}`)
  else add('bin shebangs', 'PASS')

  // --- every exports target must actually be IN the tarball -----------------
  /*
  `files` is an allowlist and `exports` is a promise; nothing checks that the
  promise is covered by the allowlist. Caught for real in tosijs-product:
  `dist/index.d.ts` re-exported seven modules while `files` shipped two of them,
  so five declaration files were missing from the published package and every
  TypeScript consumer importing anything but the theme API got an unresolved
  module. Present for two releases; invisible to tests, typecheck and build,
  because all three run against the repo and not the tarball.
  */
  if (isPrivate) add('packaged exports', 'SKIP', 'private package')
  else {
    const packedRaw = await runSplit(['npm', 'pack', '--dry-run', '--json'])
    // Parse STDOUT only — see runSplit. `out` stays combined for any message that quotes it.
    const packed = { ok: packedRaw.ok, out: packedRaw.stdout }
    if (!packed.ok) add('packaged exports', 'SKIP', 'npm pack --dry-run failed')
    else {
      try {
        const jsonStart = packed.out.indexOf('[')
        const files: string[] = JSON.parse(packed.out.slice(jsonStart))[0].files.map((f: any) => f.path)
        const targets = new Set<string>()
        const collect = (v: unknown) => {
          if (typeof v === 'string') { if (v.startsWith('./') || v.startsWith('dist/')) targets.add(v.replace(/^\.\//, '')) }
          else if (v && typeof v === 'object') Object.values(v).forEach(collect)
        }
        for (const k of ['main', 'module', 'types', 'typings', 'browser']) collect(pkg[k])
        collect(pkg.exports)
        /*
        Follow relative re-exports one level out of every packed declaration file.
        The entry points being present is NOT the bug: tosijs-product shipped a
        `dist/index.d.ts` that re-exported seven siblings while `files` packed two
        of them, so `exports` was satisfied and five modules were still missing.
        The promise a .d.ts makes is the whole graph it names, not its own path.
        */
        const declTargets = new Set<string>()
        /*
        Unreadable packed declarations are REPORTED, not skipped. `continue` here
        was a silent skip: the check would examine fewer files and still say PASS,
        which is the vacuous-guard failure this whole gate exists to catch — in the
        guard itself. See tosijs-ui#61 (tosijs: "a check you have not seen fail is
        not a check"; haltija: "a guard must be seen to fail").
        */
        const unreadable: string[] = []
        for (const f of files.filter((x) => x.endsWith('.d.ts'))) {
          const abs = join(process.cwd(), f)
          if (!existsSync(abs)) { unreadable.push(f); continue }
          const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : ''
          for (const m of readFileSync(abs, 'utf8').matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
            const rel = m[1].replace(/^\.\//, '')
            const base = (dir ? dir + '/' : '') + rel
            /*
            A declaration written for ESM says `from './x.js'` — the emitted
            neighbour is `x.d.ts`, NOT `x.js.d.ts`. Getting this wrong made the
            check report four phantom files on tosijs-ui, which is precisely the
            cry-wolf this file warns about elsewhere. Candidates, in order; the
            target counts as present if ANY of them is packed.
            */
            const norm = (x: string) => {
              const out: string[] = []
              for (const seg of x.split('/')) {
                if (seg === '.' || seg === '') continue
                if (seg === '..') out.pop()
                else out.push(seg)
              }
              return out.join('/')
            }
            const cands = base.endsWith('.d.ts')
              ? [base]
              : [base.replace(/\.(js|mjs|cjs)$/, '') + '.d.ts', base + '.d.ts', base + '/index.d.ts']
            declTargets.add(cands.map(norm).join('|'))
          }
        }
        const missing = [...targets].filter((t) => !t.includes('*') && !files.includes(t))
        // Alternatives are '|'-joined: satisfied if any candidate is in the tarball.
        for (const alts of declTargets)
          if (!alts.split('|').some((c) => files.includes(c))) missing.push(alts.split('|')[0])
        const examined = targets.size + declTargets.size
        if (missing.length)
          add('packaged exports', 'FAIL',
            `package.json points at files the tarball does not contain — consumers get an unresolved module:\n${missing.join('\n')}`)
        else if (unreadable.length)
          add('packaged exports', 'FAIL',
            `packed declaration(s) could not be read, so their re-exports went unchecked — this check cannot vouch for the tarball:\n${unreadable.join('\n')}`)
        // A PASS over an empty set is not a pass. Say so rather than bank it.
        else if (examined === 0)
          add('packaged exports', 'SKIP', 'nothing to check — no exports targets and no packed declarations')
        else add('packaged exports', 'PASS', `${examined} target(s) (${targets.size} declared, ${declTargets.size} re-exported) present in ${files.length} packed files`)

        /*
        --- every bare import in SHIPPED code must be declared -----------------
        Check the files against the manifest, never the manifest against itself
        — a manifest is always self-consistent. tjs-lang shipped
        editors/codemirror importing five @codemirror/* packages with no
        peerDependencies block at all, resolving purely by hoisting luck: green
        tests, green build, green typecheck, hard failure in any consumer with
        an isolated install. Nominated for this script independently from two
        threads (tosijs-ui#131, tosijs-ui#61 — ensemble's undeclared runtime
        import is the same class). Scans only what `npm pack` would ship.
        Dynamic import() of an undeclared package WARNs instead of failing:
        `try { await import('optional-peer') } catch {}` is a recorded
        deliberate pattern (performance.md).
        */
        try {
          const { builtinModules } = await import('node:module')
          // Shipped code is every packed file a runtime executes — including a
          // bin script in a source language (`#!/usr/bin/env bun` + .ts). This
          // scan opened only .js/.mjs/.cjs, so it printed PASS over a tarball
          // whose bin could not load (tosijs-virta 0.5.0, B1).
          const transpilers = {
            js: new Bun.Transpiler({ loader: 'js' }),
            ts: new Bun.Transpiler({ loader: 'ts' }),
          }
          const transpilerFor = (file: string) =>
            /\.(ts|mts|cts)$/.test(file) ? transpilers.ts : transpilers.js
          const builtin = new Set(builtinModules)
          const declared = new Set([
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.peerDependencies ?? {}),
            ...Object.keys(pkg.optionalDependencies ?? {}),
            pkg.name,
          ])
          const pkgOf = (spec: string) =>
            spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
          const undeclared = new Map<string, string[]>()
          const dynOnly = new Map<string, string[]>()
          /*
          --- every RELATIVE specifier in shipped code must name a packed file --
          A per-file (tsc) emit passes `from './model'` through verbatim, and
          Node's ESM resolver rejects it (ERR_MODULE_NOT_FOUND) while every
          loop in this stack — bundlers, Bun, the doc site — resolves it, so
          the one consumer that notices is the one nobody runs. releasing.md
          "A per-file build must write `.js`" records three shipments of it
          (tosijs-3d-ensemble ×3, tosijs-3d) and each repo grew its own guard
          in a different shape; tosijs-virta was the fourth (found by review,
          not by any build step). Resolution is checked the way Node does it:
          the specifier, joined to the importing file's directory, must be a
          packed path — so a missing `.js`, a directory import, and a typo all
          fail the same way. — seen in: tosijs-virta (0d3e804..fad1acf)
          */
          const packedSet = new Set(files)
          const unresolvable = new Map<string, string[]>()
          const posix = await import('node:path/posix')
          const seen = (spec: string, file: string, dynamic: boolean) => {
            /*
             * A TEMPLATE PLACEHOLDER IS NOT AN IMPORT. A static import
             * specifier is a plain string literal and can never contain
             * `${`, so anything that does is a specifier-shaped string
             * INSIDE a template literal — most often a code generator
             * emitting source for a project it is scaffolding.
             *
             * False-positived on tosijs `dist/cli.mjs`, which writes
             * `import x from './components/${'$'}{tag}'` into the app it
             * generates. That file is correct, the generated import is
             * correct, and `cli.mjs` never imports it — but the gate
             * reported a shipped unresolvable specifier and failed a
             * release. A gate that fails on correct code is the failure
             * mode testing.md calls "a gate that cannot go green": whoever
             * meets it disables it.
             */
            if (spec.includes('${')) return
            if (spec.startsWith('.')) {
              const target = posix.normalize(posix.join(posix.dirname(file), spec))
              if (!packedSet.has(target)) {
                const list = unresolvable.get(target) ?? []
                if (!list.includes(file)) list.push(file)
                unresolvable.set(target, list)
              }
              return
            }
            // relative, absolute, builtin — and URL specifiers, which are
            // valid ESM in a browser and are never a package to declare. A
            // scaffolder that EMITS example code containing
            // `import … from "https://cdn.jsdelivr.net/npm/…"` was reported as
            // depending on a package called `https:`.
            if (
              spec.startsWith('.') ||
              spec.startsWith('/') ||
              spec.startsWith('node:') ||
              spec.startsWith('bun') ||
              /^[a-z][a-z0-9+.-]*:/i.test(spec)
            )
              return
            const p = pkgOf(spec)
            if (builtin.has(p) || declared.has(p)) return
            const map = dynamic ? dynOnly : undeclared
            const list = map.get(p) ?? []
            if (!list.includes(file)) list.push(file)
            map.set(p, list)
          }
          // .d.ts declarations resolve by TypeScript's rules (extensionless is correct there)
          for (const f of files.filter((x) => /\.(js|mjs|cjs|ts|mts|cts)$/.test(x) && !x.endsWith('.d.ts'))) {
            const abs = join(process.cwd(), f)
            if (!existsSync(abs)) continue
            /*
            PARSE, don't regex. The previous implementation matched the keyword
            `import` inside string literals, and the two recorded false positives
            are two faces of the same impossibility its own comment admitted —
            "a regex cannot distinguish code from string contents":

              1. `if(i==="@import")return`@import url('${r}');`` in a CSS-in-JS
                 bundle, reported as a package called `)return`@import url(`.
                 Patched by requiring the preceding char not be a quote or `@`.
              2. A multi-line TEMPLATE LITERAL carrying example code —

                     var help = `
                       import { validate } from 'tosijs-schema' // ^1.8.0
                     `

                 where the character before `import` is a newline, so the patch
                 above passes it straight through. Reported against
                 tosijs-product, whose IIFE cannot contain a live import at all.

            `Bun.Transpiler.scanImports` is the actual parser, so string contents
            are invisible to it by construction and it returns the static /
            dynamic / require distinction this check already wanted. Falls back to
            the old regexes only if a shipped file will not parse as JS, so a
            weird artifact degrades to the previous behaviour instead of going
            unchecked.

            NOTE for anyone mutation-testing this: you cannot do it end-to-end
            through the script, because the `build` check above regenerates
            `dist/` and wipes the mutation before this check reads it — which
            makes both artifact-scanning checks LOOK vacuous. Exercise the
            classify logic directly instead.
            */
            const src = readFileSync(abs, 'utf8')
            let scanned = false
            try {
              for (const imp of transpilerFor(f).scanImports(src)) {
                seen(imp.path, f, imp.kind === 'dynamic-import')
              }
              scanned = true
            } catch {
              /* unparseable — fall through to the regex approximation below */
            }
            if (!scanned) {
              const stripped = src
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/^[ \t]*\/\/.*$/gm, '')
              for (const m of stripped.matchAll(/(?:^|[^\w$.'"`@])(?:import|export)\s*(?:[\w${},*\s]+from\s*)?['"]([^'"\n]+)['"]/g))
                seen(m[1], f, false)
              for (const m of stripped.matchAll(/(?:^|[^\w$.'"`@])require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g))
                seen(m[1], f, false)
              for (const m of stripped.matchAll(/(?:^|[^\w$.'"`@])import\s*\(\s*['"]([^'"\n]+)['"]/g))
                seen(m[1], f, true)
            }
          }
          for (const k of dynOnly.keys()) if (undeclared.has(k)) dynOnly.delete(k)
          const fmt = (m: Map<string, string[]>) =>
            [...m.entries()]
              .map(([p, fs]) => `${p} (${fs.slice(0, 3).join(', ')}${fs.length > 3 ? ', …' : ''})`)
              .join('\n')
          if (unresolvable.size)
            add('shipped relative specifiers resolve', 'FAIL',
              `shipped code imports a relative path that is not a packed file — Node rejects this (ERR_MODULE_NOT_FOUND); a bundler or Bun hides it. Write the extension in the source, or ship a bundle:\n${fmt(unresolvable)}`)
          else add('shipped relative specifiers resolve', 'PASS')
          if (undeclared.size)
            add('shipped imports declared', 'FAIL',
              `shipped code imports packages the manifest never declares — resolves only by hoisting luck:\n${fmt(undeclared)}`)
          else if (dynOnly.size)
            add('shipped imports declared', 'WARN',
              `dynamic import() of undeclared package(s) — deliberate optional-peer pattern, or a missing declaration?\n${fmt(dynOnly)}`)
          else add('shipped imports declared', 'PASS')
          // every `bin` target must itself be in the tarball: a bin that
          // points at a file `files` does not ship is a command nobody can run
          const missingBins = Object.entries(bins)
            .map(([name, target]) => [name, target.replace(/^\.\//, '')] as const)
            .filter(([, target]) => !files.includes(target))
          if (missingBins.length)
            add('shipped bins packed', 'FAIL',
              missingBins.map(([n, t]) => `${n} → ${t} is not in the tarball`).join('\n'))
          else if (Object.keys(bins).length) add('shipped bins packed', 'PASS')
        } catch (e) {
          add('shipped imports declared', 'SKIP', `scan failed: ${String(e).slice(0, 120)}`)
        }
      } catch { add('packaged exports', 'SKIP', 'could not parse npm pack output') }
    }
  }

  // --- npm packs the WORKING TREE, not the commit ----------------------------
  /*
  `files` is an allowlist of PATHS, so a directory entry like "dist" ships
  whatever is sitting in that directory — including files nobody put there on
  purpose. The tarball becomes a function of one machine's working tree rather
  than of the tag, and the difference is invisible to every other gate: tests,
  typecheck, build and `git status` all pass, because build output is usually
  gitignored and an ignored file is not a change.

  Checking "is it tracked?" does NOT work — build output is gitignored in most
  projects, so that flags the entire tarball. Dotfiles are the tight version of
  the same question: essentially no package means to publish one inside its
  build output, and the accidents are all dotfiles — `.DS_Store`,
  `.metadata_never_index`, editor swap files, a stray `.env` dropped in an
  output directory.

  Caught in tosijs-styled-editor 0.5.0: the pending tarball carried
  `dist/.metadata_never_index`, a zero-byte macOS Spotlight artifact that would
  have shipped from the maintainer's laptop and from nowhere else. Harmless
  itself; the hole is not.
  */
  const DELIBERATE_DOTFILES = new Set(['.npmrc', '.npmignore'])
  if (!isPrivate) {
    // STDOUT only — see runSplit. This block had the same merged-stderr bug as the packaged-
    // exports block after that one was fixed, and it hid a real FAIL: tjs-lang's
    // 0.14.0-rc.0 tarball carried the very `.metadata_never_index` this check exists for.
    const packedRaw = await runSplit(['npm', 'pack', '--dry-run', '--json'])
    const packed = { ok: packedRaw.ok, out: packedRaw.stdout }
    if (packed.ok) {
      try {
        const entries: string[] = (JSON.parse(packed.out)[0]?.files ?? []).map(
          (f: { path: string }) => f.path
        )
        const dotfiles = entries.filter((f) => {
          const base = f.split('/').pop() ?? ''
          return base.startsWith('.') && !DELIBERATE_DOTFILES.has(base)
        })
        /*
        The GENERAL rule, of which stray dotfiles are one case: the tarball must be the
        committed tree plus declared build output. npm packs the WORKING tree, so any gitignored
        file that happens to sit on the publishing machine ships from that machine only.
        tjs-lang's 0.14.0-rc.0 carried six — one dotfile (which the check below caught) and five
        it could not see: stale examples/modules/dist/* and a stray src/lang/keywords.d.ts.
        Build-output dirs come from package.json `releaseDoctor.buildOutputs` (default ["dist"]).
        Reference implementation: tjs-lang scripts/prepublish-check.ts.
        */
        const outputs: string[] = pkg.releaseDoctor?.buildOutputs ?? ['dist']
        const { out: lsOut, ok: lsOk } = await run(['git', 'ls-files'])
        if (!lsOk) add('tarball = committed tree + build output', 'SKIP', 'git ls-files failed — could not check; do not read this as clean')
        else {
          const tracked = new Set(lsOut.split('\n'))
          const untracked = entries.filter(
            (f) => !tracked.has(f) && f !== 'package.json' && !outputs.some((d) => f === d || f.startsWith(`${d.replace(/\/$/, '')}/`))
          )
          if (untracked.length)
            add('tarball = committed tree + build output', 'FAIL',
              `npm would ship ${untracked.length} file(s) no commit contains — they exist only on this machine:\n${untracked.join('\n')}\nDelete them, or exclude them in package.json "files". Build-output dirs: ${outputs.join(', ')} (releaseDoctor.buildOutputs).`)
          else add('tarball = committed tree + build output', 'PASS')
        }
        if (dotfiles.length)
          add(
            'no stray dotfiles in the tarball',
            'FAIL',
            `npm packs the working tree, so these ship from whichever machine publishes:\n${dotfiles.join('\n')}\nExclude them in package.json "files" (e.g. "!dist/.*").`
          )
        else add('no stray dotfiles in the tarball', 'PASS')
      } catch {
        add('no stray dotfiles in the tarball', 'SKIP', 'could not parse npm pack output')
      }
    } else add('no stray dotfiles in the tarball', 'SKIP', 'npm pack unavailable')
  } else add('no stray dotfiles in the tarball', 'SKIP', 'private package')

  // --- declared peers vs what a consumer would actually install --------------
  // Network-dependent, so it SKIPs offline rather than failing. A newer MAJOR
  // outside the range is a legitimate "not supported yet" and only WARNs; a
  // latest that is the SAME major and still out of range is a stale floor or
  // ceiling with no such excuse.
  const stale: string[] = []
  const behindMajor: string[] = []
  /*
  CONCURRENT, and only over peers + runtime deps. Serially this walked every
  dependency at one `npm view` apiece and blew a two-minute budget on a repo with
  a normal-sized manifest — and a gate slow enough to interrupt you is a gate
  people stop running, which costs more than the check is worth.
  */
  const rangeTargets = Object.entries({ ...peers, ...deps }).filter(
    ([, r]) => !r.startsWith('file:') && !r.startsWith('workspace:')
  )
  await Promise.all(
    rangeTargets.map(async ([name, range]) => {
      const res = await run(['npm', 'view', '--prefer-online', name, 'version'])
      if (!res.ok) return
      const latest = res.out.trim().split('\n').pop() ?? ''
      if (!/^\d+\.\d+\.\d+/.test(latest)) return
      if (Bun.semver.satisfies(latest, range)) return
      const latestMajor = latest.split('.')[0]
      const rangeMajor = (range.match(/(\d+)\./) ?? [])[1]
      if (rangeMajor && latestMajor !== rangeMajor) behindMajor.push(`${name}: "${range}" vs latest ${latest}`)
      else stale.push(`${name}: "${range}" excludes latest ${latest} (same major)`)
    })
  )
  if (stale.length)
    add('dependency ranges', 'FAIL', `a range excludes the version a consumer installs today:\n${stale.join('\n')}`)
  else if (behindMajor.length)
    add('dependency ranges', 'WARN', `a newer MAJOR exists outside the declared range — deliberate, or stale?\n${behindMajor.join('\n')}`)
  else add('dependency ranges', 'PASS')
}

/*
 * PROPOSAL (open — review.md's "remediation record" lesson; virta AAR cycle 6):
 * a gate over remediation-record claims. Every claim in the remediation
 * commit message / CHANGELOG that names a test or a behaviour must point at
 * a test that is RED on the base and GREEN on HEAD, and a discriminating one
 * at that — "the test exists" does not catch "the test passes for the wrong
 * reason" (a `settled()` that never waited, a cleanup whose exit hook never
 * ran under the test runner: both claimed fixed, both green without the
 * fix). Mechanics: parse the claims (a `Test: <name>` / `[x] … (test:
 * …)` convention in the remediation message), checkout the base commit in a
 * scratch worktree, run each named test there (expect red), run it at HEAD
 * (expect green). The base must be the IMMEDIATELY PRECEDING source commit
 * (the state just before the fix) — a base that predates the feature
 * proves nothing (virta AAR cycle 8: "red two commits back" passed only
 * because the tested branches were absent there). The check is mechanical,
 * not a claim: the named base must equal `git rev-parse <commit>^` (cycle
 * 9's record named a hash that was not the parent), the record's
 * count of tests must match the diff, and the red must be BY ASSERTION —
 * a test file that fails to import on the base proves nothing (cycle 10:
 * two headline rows were red only because their modules were absent).
 * A practices write-back must NAME ITS COMMIT RANGE and postdate the last
 * blocker-remediation wave it claims to cover (cycle 11's write-back
 * landed minutes before that wave and named no range). A claim that
 * cannot name
 * such a test is reported UNVERIFIED, not PASS. Do not root-cause the
 * cycles here — that is the periodic AAR review's job.
 */

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
