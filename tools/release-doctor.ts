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
      // --prefer-online on every registry read: npm view answers from cache and
      // has served a version minutes stale right after a publish, turning this
      // check into a confident wrong answer (releasing.md step 8b).
      const { ok, out } = await run(['npm', 'view', '--prefer-online', pkg.name, 'version'])
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
    const { ok, out } = await run(['npm', 'view', '--prefer-online', name, 'version'])
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
    const packed = await run(['npm', 'pack', '--dry-run', '--json'])
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
        for (const f of files.filter((x) => x.endsWith('.d.ts'))) {
          const abs = join(process.cwd(), f)
          if (!existsSync(abs)) continue
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
        if (missing.length)
          add('packaged exports', 'FAIL',
            `package.json points at files the tarball does not contain — consumers get an unresolved module:\n${missing.join('\n')}`)
        else add('packaged exports', 'PASS', `${targets.size + declTargets.size} target(s) (${targets.size} declared, ${declTargets.size} re-exported) present in ${files.length} packed files`)

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
          const seen = (spec: string, file: string, dynamic: boolean) => {
            if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:') || spec.startsWith('bun')) return
            const p = pkgOf(spec)
            if (builtin.has(p) || declared.has(p)) return
            const map = dynamic ? dynOnly : undeclared
            const list = map.get(p) ?? []
            if (!list.includes(file)) list.push(file)
            map.set(p, list)
          }
          for (const f of files.filter((x) => /\.(js|mjs|cjs)$/.test(x))) {
            const abs = join(process.cwd(), f)
            if (!existsSync(abs)) continue
            const src = readFileSync(abs, 'utf8')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/^[ \t]*\/\/.*$/gm, '')
            for (const m of src.matchAll(/(?:^|[^\w$.])(?:import|export)\s*(?:[\w${},*\s]+from\s*)?['"]([^'"\n]+)['"]/g))
              seen(m[1], f, false)
            for (const m of src.matchAll(/(?:^|[^\w$.])require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g))
              seen(m[1], f, false)
            for (const m of src.matchAll(/(?:^|[^\w$.])import\s*\(\s*['"]([^'"\n]+)['"]/g))
              seen(m[1], f, true)
          }
          for (const k of dynOnly.keys()) if (undeclared.has(k)) dynOnly.delete(k)
          const fmt = (m: Map<string, string[]>) =>
            [...m.entries()]
              .map(([p, fs]) => `${p} (${fs.slice(0, 3).join(', ')}${fs.length > 3 ? ', …' : ''})`)
              .join('\n')
          if (undeclared.size)
            add('shipped imports declared', 'FAIL',
              `shipped code imports packages the manifest never declares — resolves only by hoisting luck:\n${fmt(undeclared)}`)
          else if (dynOnly.size)
            add('shipped imports declared', 'WARN',
              `dynamic import() of undeclared package(s) — deliberate optional-peer pattern, or a missing declaration?\n${fmt(dynOnly)}`)
          else add('shipped imports declared', 'PASS')
        } catch (e) {
          add('shipped imports declared', 'SKIP', `scan failed: ${String(e).slice(0, 120)}`)
        }
      } catch { add('packaged exports', 'SKIP', 'could not parse npm pack output') }
    }
  }

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
