# TJS (`tjs-lang`)

A type-safe JavaScript dialect: TypeScript-like source with **runtime validation**,
**safety boundaries**, **monadic errors**, inline tests, and a **fuel-metered sandboxed VM**
(AJS) for untrusted code. It transpiles to validated JS.

## When to use TJS — and the reality check

- New library modules where runtime validation at boundaries pays off.
- Anywhere untrusted input or code is evaluated (stored event handlers, dynamic queries,
  server-side/agent logic) — run it in the sandboxed, fuel-metered VM.
- **But most ecosystem projects still author `.ts`, not `.tjs`.** The tosijs 2.0 port is
  incremental and currently blocked on tosijs-ui 1.7 build seams; only a couple of files
  are `.tjs`. Check the target project's migration state (`TJS-PORT-DX.md`/`TODO.md`)
  before assuming `.tjs` authoring or attempting bulk conversion.
  — seen in: tosijs, tosijs-product
- **`tjs-lang` often appears as build-plumbing you never write.** Projects that consume
  `tosijs-ui/site` pull `tjs-lang` in only to transpile live doc examples — the source is
  plain TypeScript. Don't assume a dependency on `tjs-lang` means the project is written
  in TJS. — seen in: tosijs-ui, tosijs-product, tosijs-3d

## Syntax traps (read before touching TJS source)

- **A colon value is an EXAMPLE, not a type.** `function foo(x: 'default')` means a
  *required* param whose example is `'default'` (widens to `string`) — not a string-literal
  type. The example survives to runtime as a contract/test. This is called out as the single
  most common LLM mistake in the language. Full reference: `CLAUDE-TJS-SYNTAX.md`.
  — seen in: tjs-lang
- **Respect the `TJS ⊇ JS ⊇ AJS` invariant.** A richer layer may do more but must never
  make subset-legal code illegal; subset violations are bugs (`PRINCIPLES.md`). Native
  `.tjs` has all modes ON; `fromTS`/AJS/VM code gets modes OFF. Set the dialect explicitly
  via `tjs(src, { dialect: 'js' | 'tjs' })` or the `dialectForFilename` helpers
  (`.js`→js, `.tjs`→tjs, `.ts`→fromTS). — seen in: tjs-lang
- **Native `==` is footgun-free `===`**: it unwraps boxed primitives and treats
  `null == undefined`, but is NOT coercive or structural. — seen in: tjs-lang
- **AJS expression semantics differ from JS.** `null.foo` is safe (returns `undefined`,
  `?.` semantics); computed member access with a variable (`items[i]`) fails at transpile
  time — use `.map`/`.reduce` atoms instead. — seen in: tjs-lang

## Safety boundaries

- **`safety inputs`** at public API edges — validate what crosses the boundary.
- **`safety none`** in hot internals (proxy traps, touch queue, DOM update loops) — the
  boundary already validated; don't pay for revalidation on every internal hop.
- Push validation to the edge; keep the interior fast.

## Monadic errors

- Prefer returning **MonadicError** values over `throw` where the module's contract is
  throw-free. Callers handle the error as a value instead of unwinding the stack.
- This pairs with the "assignment strictness" idea in tosijs (`'off'|'warn'|'throw'`, and a
  planned monadic `'strict'` once assignment has a value-returning channel).
- **Ship throw vs. monadic as separate subpath exports** rather than a runtime flag:
  build `module.debug.js` (throws type errors) and `module.safe.js` (returns monadic errors)
  from twin entry files that differ only in `globalThis.__tjs` config. — seen in: tosijs

## The sandboxed VM (AJS): atoms, effects, capabilities

The VM is **capability-based (zero IO by default) and fuel-metered** — every atom has a cost.

- **Define capabilities/tools as atoms:** `defineAtom(op, inputSchema, outputSchema, fn, options)`
  where `options` carries `docs`/`timeoutMs`/`cost`. Wrap them in a `CapabilityRegistry`
  (with `locality: 'local'|'remote'|'both'` + category metadata) created once at startup and
  shared across requests. The `docs` string is surfaced to the LLM; `cost`/`timeout` meter
  execution. Atoms are the unit of both tooling and security. — seen in: tjs-lang, lukko
- **Tag `effects: 'io'`** on any atom touching capabilities, nondeterminism, or side effects
  (default is `'pure'`). Predicate-safety verification only lets predicates call pure atoms;
  a mis-tagged IO atom breaks the guarantee that compiles predicates to native JS. Core IO
  ops live in `EFFECTFUL_CORE_OPS` (runtime.ts); the invariant is guarded by
  `src/vm/atom-effects.test.ts`. — seen in: tjs-lang
- **Note the CLI gap:** `tjs run` does NOT inject the `expect` test harness — `test { expect(...) }`
  blocks only pass in the playground UI, not via the CLI. — seen in: tjs-lang

## Types & schema

- TJS is the source of truth for types; it can emit **JSON Schema** for cross-language use.
  Don't hand-maintain parallel type definitions in another language — generate them.
- `tsc --declaration` gotcha still applies to TS interop: exported classes must be named.
- **For predicate-backed schema, import from `tjs-lang/schema`**, which re-exports the full
  `tosijs-schema` surface with `$predicate` support pre-wired (auto-registers the predicate
  evaluator on import). Do not register the evaluator yourself, and don't duplicate it — the
  bundle externalizes `tosijs-schema` so there is a single global evaluator.
  Requires `tosijs-schema@^1.4.0`. — seen in: tjs-lang

## Tooling & integration

- **`tjs(source)` returns an OBJECT** `{ code, types, metadata, testResults }`, not a string —
  use `.code` for the transpiled JS. — seen in: tjs-lang
- **Pin a known-good `tjs-lang` version** and bump deliberately — parser regressions have
  shipped in point releases. When a consumer hardcodes the version (e.g. `TJS_VERSION` in
  tosijs-ui's `code-transform.ts`), bump it in lockstep with the dependency or live-example
  loading breaks. Keep any bundled tjs CodeMirror extension **bundled, not external**, so it
  shares the editor's single `@codemirror/state` instance (a separate copy silently no-ops).
  — seen in: tjs-lang (existing doc), tosijs-ui
- **Keep a cross-project repro test file in the `tjs-lang` repo** so regressions are caught at
  the language, not rediscovered per consumer. Always write the reproduction test BEFORE
  fixing a bug. — seen in: tjs-lang
- **`.tjs`-on-import loader:** wire `src/bun-plugin/tjs-plugin.ts` via `bunfig.toml` preload
  AND pass it to `Bun.build` so `.tjs` and `.ts` mix freely and transpile at import time.
  This is the reusable template for any incremental TJS port. — seen in: tosijs
- **The `tjs-lang` import alias only works inside its own repo** (via `bunfig.toml`). Scripts
  in `/tmp` or outside the tree resolve to `node_modules` instead — a silent trap. Use
  absolute `src/...` paths for outside experiments. — seen in: tjs-lang

## Code in markdown (doc examples transpiled by TJS)

- **Prettier mangles bare-expression JS blocks** in markdown — it ASI-collapses lines like
  `'5' == 5`. Add `<!-- prettier-ignore -->` above the fence, or tag it `tjs`/`ts`/`text`.
  — seen in: tjs-lang
- **Never alias an identifier to an ALL-CAPS name and then reassign it in a callback.** The
  transpiler rewrites reassignment of an all-caps identifier to `const`, shadowing a
  module-level `let` so it reads `null` elsewhere. Pass it as a parameter or use a lowercase
  alias. — seen in: tosijs-3d
- When doc examples import from a custom library context the checker can't see, set
  `checkExamples: false` in the tosijs-ui/site config so the build-time example check doesn't
  fail on symbols it can't resolve. — seen in: tosijs-3d

## Inline tests

- TJS modules can carry inline tests and use `TjsEquals`. Use them for unit-level checks close
  to the code; keep DOM/integration tests as separate `*.test.ts`.
- Framework is `bun:test` (describe/it/expect). Gate slow/LLM-dependent tests behind env
  flags (e.g. `SKIP_LLM_TESTS=1 SKIP_BENCHMARKS=1` for the fast loop) and keep
  security-critical VM coverage high (target ~98% on the sandbox executor). — seen in: tjs-lang

## Project-specific practices

### tjs-lang (the language repo itself)

- Full build is `bun run make` (rm dist, format, grammars, editors, tsc declarations, esbuild
  bundles). **Never add a `build` script** — `bun build` is a Bun builtin, so `bun build` and
  `bun run build` would diverge; the clean-build task is deliberately named `make`.
- Browser TS→TJS transpilation only works via **esm.sh** for the TypeScript compiler
  (jsDelivr/esm.run time out on the ~10MB CJS bundle, skypack is dead);
  `DEFAULT_TYPESCRIPT_URL = https://esm.sh/typescript@5`.
- Playground examples are markdown-with-code-blocks under `guides/examples/{tjs,ajs}/`, not
  raw `.tjs` files — after editing run `bun run docs` and commit the regenerated
  `demo/docs.json`.
- Deploy the playground with **`bun run deploy:hosting`** (hosting only — demo→`.demo/`, then
  `firebase deploy --only hosting`). Use `bun run deploy` **only when Cloud Functions changed** —
  it additionally runs `functions:deploy`, so a bare `deploy` needlessly redeploys functions on
  every site refresh. Cloud Functions self-host TJS (`functions/src/*.tjs` emitted via `tjs emit`).

### lukko

- Keep all Node/Bun APIs (fs, path, Bun.spawn) server-side; the browser bundle must be pure
  UI talking to the server via fetch + SSE, or `Bun.build`'s browser target breaks.
- Set `idleTimeout: 255` on `Bun.serve` and flush the remaining SSE buffer when
  `reader.read()` returns `done: true`, or long agent streams die at the 10s default and drop
  the final turn.
