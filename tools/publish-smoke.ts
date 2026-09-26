#!/usr/bin/env bun
/**
 * publish-smoke — install a package TARBALL the way an adopter would, and check it holds up.
 *
 *   bun <practices>/tools/publish-smoke.ts <path/to/pkg-x.y.z.tgz>
 *
 * Used twice by templates/publish.yml: on the tarball about to be staged, and again on the copy
 * downloaded from the registry after approval — so what is checked is what adopters install.
 *
 * If the repo has its own `test-consumer` script, that runs instead, with SMOKE_TARBALL set to
 * the tarball. CONTRACT: it must print the tarball's path. A script that ignores SMOKE_TARBALL
 * and packs its own tree would pass while testing other bytes, so the path must appear in its
 * output or this fails. (tosijs-ui's `bin/smoke-consumer.ts` is the reference.)
 *
 * Otherwise, a generic check:
 *  1. `npm install <tarball>` into a scratch project — catches ERESOLVE peer ranges and missing
 *     dependencies, which bun resolves and npm refuses (tosijs-ui#182).
 *  2. every non-wildcard `exports` target exists in the installed package.
 *  3. a type-only import of every entry point with types, compiled with skipLibCheck OFF —
 *     catches .d.ts files that do not compile for a consumer, and types that name modules the
 *     consumer cannot resolve.
 * It does not IMPORT at runtime: most of these libraries need a DOM to load at all. A repo that
 * needs that writes a `test-consumer`.
 */

import { $ } from 'bun'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { basename, join, resolve } from 'path'

const tarballArg = process.argv[2]
if (!tarballArg || !existsSync(tarballArg)) {
  console.error(`usage: publish-smoke.ts <tarball>  (got ${tarballArg ?? 'nothing'})`)
  process.exit(2)
}
const tarball = resolve(tarballArg)
const repo = process.cwd()
const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'))

if (pkg.scripts?.['test-consumer']) {
  console.log(`▶ test-consumer with SMOKE_TARBALL=${tarball}`)
  const r = await $`bun run test-consumer`.cwd(repo).env({ ...process.env, SMOKE_TARBALL: tarball }).nothrow()
  const out = r.stdout.toString() + r.stderr.toString()
  process.stdout.write(out)
  if (r.exitCode !== 0) process.exit(r.exitCode)
  if (!out.includes(basename(tarball))) {
    console.error(`❌ test-consumer never printed ${basename(tarball)} — it ignored SMOKE_TARBALL and tested some other bytes`)
    process.exit(1)
  }
  process.exit(0)
}

const failures: string[] = []
const work = mkdtempSync(join(tmpdir(), 'publish-smoke-'))
try {
  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }))
  console.log(`▶ npm install ${basename(tarball)}`)
  const inst = await $`npm install --no-audit --no-fund ${tarball}`.cwd(work).nothrow().quiet()
  if (inst.exitCode !== 0) {
    console.error(inst.stderr.toString())
    failures.push('npm install of the tarball failed (above) — this is what an npm adopter gets')
  } else {
    const installed = join(work, 'node_modules', pkg.name)
    const exp = pkg.exports
    const entries: { spec: string; types?: string }[] = []
    const targetsOf = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(targetsOf) : []
    const typesOf = (v: any): string | undefined =>
      v && typeof v === 'object' ? (typeof v.types === 'string' ? v.types : Object.values(v).map(typesOf).find(Boolean)) : undefined
    const map: Record<string, unknown> =
      exp == null ? {} : typeof exp === 'string' || !Object.keys(exp).some((k) => k.startsWith('.')) ? { '.': exp } : exp
    for (const [sub, target] of Object.entries(map)) {
      if (sub.includes('*')) continue
      for (const t of targetsOf(target)) {
        if (!existsSync(join(installed, t))) failures.push(`exports["${sub}"] → ${t} is not in the package`)
      }
      entries.push({ spec: sub === '.' ? pkg.name : `${pkg.name}/${sub.slice(2)}`, types: typesOf(target) })
    }
    if (entries.length === 0 && pkg.types) entries.push({ spec: pkg.name, types: pkg.types })
    const typed = entries.filter((e) => e.types)
    console.log(`✓ ${entries.length} entry point(s) resolved; typechecking ${typed.length}`)
    if (typed.length) {
      await $`npm install --no-audit --no-fund typescript@5`.cwd(work).nothrow().quiet()
      writeFileSync(
        join(work, 'smoke.ts'),
        typed.map((e, i) => `import type * as m${i} from '${e.spec}'\nexport type T${i} = typeof m${i}\n`).join('')
      )
      const tsc = await $`npx tsc --noEmit --strict --skipLibCheck false --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom,dom.iterable smoke.ts`
        .cwd(work).nothrow().quiet()
      if (tsc.exitCode !== 0) failures.push(`the package's types do not compile for a consumer (skipLibCheck off):\n${tsc.stdout.toString().trim().split('\n').slice(0, 15).join('\n')}`)
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

if (failures.length) {
  for (const f of failures) console.error(`❌ ${f}`)
  process.exit(1)
}
console.log(`✅ ${basename(tarball)} installs and holds up for a consumer`)
