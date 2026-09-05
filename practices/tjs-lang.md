# TJS (`tjs-lang`)

A type-safe JavaScript dialect: TypeScript-like source with **runtime validation**,
**safety boundaries**, **monadic errors**, inline tests, and a **fuel-metered sandboxed VM**
(AJS) for untrusted code. It transpiles to validated JS.

## Why TJS exists: TypeScript does not describe JavaScript

Stated first because it is the root, and the rest follows from it.

**A TypeScript signature is not a description of the function. It is a policy
imposed on call sites**, written in the grammar of a description. In tosijs:

```
declared:  debounce(origFn: VoidFunc, minInterval = 250)
actual:    debounce("not a fn", 10)  -> returns a function, no complaint
           throttle(fn, null)        -> returns a function, no complaint
```

A JS function has no parameter types. It has behaviour under arbitrary input.
"Accepts a function and a number" is therefore false *about the function*; the
failure surfaces later and elsewhere, when the returned callable is invoked.

The instructive contrast in the same codebase: `touch` **is** truthfully
declared — because someone hand-wrote `if (invalid) throw`. So **a signature is
true only where the programmer independently made it true at runtime.** That is
the whole thesis: TJS makes the signature *be* the check, rather than a claim
sitting beside one that may or may not exist.

**Three ways the vocabulary fails to reach the language**, in rising severity:

1. **Simple cases: it lines up promises.** Declaration is checked against
   declaration. Nothing is checked against the program.
2. **Complex cases: imperative requirements must be expressed in a declarative
   algebra with no equivalent construct.** "Reads give a proxy, writes accept
   the raw value" is a fact about a `set` trap; there is no way to say it.
3. **It refuses a base reality of the language: a member can differ on the left
   and right of an assignment.** JS has this natively (accessors, Proxies). TS
   expresses it on a hand-written interface and then **declines it in mapped
   types** — so `{ [K in keyof T]: … }` over arbitrary `T` cannot say it, and
   widening to a union poisons every read. This is not a feature gap TS has yet
   to reach; it is a refusal to model what the language does.

### The consequence: a wrong declaration is invisible to BOTH lanes

The suite exercises the runtime. `tsc` exercises the declaration. **Nothing
compares them.** So a declaration describing the opposite of the runtime is
checked rigorously, passes, and every call site is verified against a lie:

| declared | actual |
| --- | --- |
| `observe: (path: string) => void` | takes a **callback**, returns an unsubscribe — the working call was a type error and the type-prescribed call *threw* |
| `ElementPart` excludes proxies | a bare proxy is a **live** bound text child, the most-used spelling |
| `TosiProps` has no `tosiBinding` | present at runtime on both proxy kinds |

Four shipped. None was detectable by type-checking, which cannot ask whether a
type is *true* — only whether the code agrees with it. Measured alongside:
**118 type assertions** (`as any`, `as unknown as`) in ~40k lines of one
library's non-test source, including the public return type of its flagship
API. Assertions are unchecked by construction; at least one of them was false in
production for two releases.

### Where static analysis IS authoritative, stated fairly

Types are a source of truth about **one** thing: themselves. `.d.ts` emit is the
seam between packages, and there the type *is* the artifact. `tsc --declaration`
from a scratch consumer caught a mixin whose return type made downstream emit
impossible — 34 files that would have shipped without types, with no runtime
moment at which it manifests.

**So: static analysis for the contract you publish; execution for the behaviour
you wrote.** Neither is "the safety argument", and a process treating one as
such will keep being surprised.

### The operational rule

**When `tsc` and the runtime disagree, establish which is wrong before changing
anything, and never rewrite working code to satisfy the checker.** A repo whose
types are a lossy projection of a JS-first design should say so out loud — see
tosijs's `CLAUDE.md`, *"TypeScript is autocomplete, not a source of truth"* —
otherwise every future contributor, human or agent, reads a red squiggle as a
defect and "fixes" it.

**And a caveat that keeps this honest:** code is truth about *what happens*, not
automatically about *what was meant*. A fix in the same corpus did exactly what
its author intended — fail closed — and permanently over-redacted an entire
state root. The value of executable signatures is not that runtime beats
compile-time; it is that **intent gets written somewhere it can be falsified.**
— seen in: tosijs (1.10.x); framing set by the owner

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
  make subset-legal code illegal; subset violations are bugs (`PRINCIPLES.md`). Set the
  dialect explicitly via `tjs(src, { dialect: 'js' | 'tjs' })` or the `dialectForFilename`
  helpers (`.js`→js, `.tjs`→tjs, `.ts`→fromTS). — seen in: tjs-lang
- **The file extension is the gate; opt-outs are per-construct.** As of tjs-lang **0.13.0**
  all nine mode directives are **abolished and now throw** — `TjsEquals`, `TjsClass`,
  `TjsDate`, `TjsNoeval`, `TjsNoVar`, `TjsStandard`, `TjsDictDefaults`, `TjsSafeEval`,
  `TjsSafeAssign`. A `.tjs` file gets every rule unconditionally, the way ESM made
  `"use strict"` implicit. `TjsCompat` and `TjsStrict` survive but set **dialect** (which
  language is this?), not rules.

  Migration is **per-construct, not per-file** — and that is strictly better, because a
  modes-off file also silenced the _next_, accidental use:

  | You want back                         | Write                                          |
  | ------------------------------------- | ---------------------------------------------- |
  | `new Date()` / `var` / `eval()`       | `unsafe new Date(x)`, `unsafe var x = 1`       |
  | …in TypeScript source (`tsc` parses it) | `/* @tjs-unsafe */`                          |
  | JavaScript's coercing `==` / `!=`     | `DangerousLegacyEquals` / `DangerousLegacyNot`  |
  | JavaScript's `===` / `!==`            | `LegacyExactly` / `LegacyNotExactly`            |
  | JS atomic parameter default           | `f(args = LegacyDefault({ x: 0 }))`             |
  | JS semantics for a whole file         | `dialect: 'js'` or `TjsCompat`                  |

  The coercing pair is named "Dangerous" because `==` invokes `valueOf()`/`toString()` on
  any object and can therefore throw or run arbitrary code; the strict pair is not, because
  `===` cannot. — seen in: tjs-lang
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
- **Capability returns cross a structured-clone membrane — return plain data only.** Every
  `effects: 'io'` atom's return is deep-copied through `structuredClone` before it reaches
  guest state, so a capability cannot hand the guest a live host reference (an object with
  callable methods it could invoke, or a shared object it could mutate under you). Return
  **structured-cloneable data** — normalize e.g. a `fetch` `Response` to `{ ok, status, body }`,
  never the live object; functions / method-carrying objects are rejected with a `MonadicError`
  (`Capability boundary rejected the return of '<op>'`). A budgeted pre-walk also rejects
  oversized returns before the copy allocates (`membraneMaxBytes` run option, default 4MB) —
  the capability boundary is where guest payload size is capped. Relatedly, guest `methodCall`
  is **allowlist**-based (standard built-in methods only), not blocklist. In tests, **mock
  capabilities must return plain data too** — a `Response`-shaped stub with `.json()`/`.text()`
  is rejected by the membrane; return `{ ok, status, body }`. — seen in: tjs-lang
  (0.12.0 adversarial VM review)
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

- TJS modules can carry inline `test '…' { }` blocks. Use them for unit-level checks close
  to the code; keep DOM/integration tests as separate `*.test.ts`. (Native `==` is already
  footgun-free in a `.tjs` file — the `TjsEquals` directive that used to enable it is
  abolished and now throws. See "Syntax traps" above.)
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
