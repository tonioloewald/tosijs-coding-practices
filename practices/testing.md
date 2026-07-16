# Testing

Default runner: **`bun test`**. Test files: colocated `*.test.ts` (or `*.test.tjs`) next to
their source in `src/`. Configure via `bunfig.toml`. This is the baseline across the whole
ecosystem — every project that has a suite uses it.
— seen in: tosijs, tosijs-ui, tosijs-product, tosijs-3d, tosijs-schema, kith-email, lukko, editor2, tjs-lang, loewald-dot-com, haltija

## Run

```bash
bun test                    # everything
bun test src/foo.test.ts    # one file
bun test src/               # unit tier only (when integration lives elsewhere)
```

- `bun run build` runs `bun test` first and exits non-zero on failure — a red suite blocks
  the release build. Don't rely on separate CI; most repos here have none. — seen in: tosijs, haltija
- Capture noisy runs once, query many times: `bun test 2>&1 | tee /tmp/test-results.txt`
  then grep for failures. — seen in: tjs-lang

## DOM testing with Happy DOM

Web-component and DOM tests run under **Happy DOM**, registered via a `bunfig.toml` `[test]`
preload (`happydom.ts` / `test-setup.ts`). — seen in: tosijs, tosijs-ui, tosijs-product, editor2

Known limitations to design around (each one is a recurring, non-obvious time-sink):

- **No `:scope >` selector** — iterate children manually instead.
- **`offsetWidth`/`offsetHeight` return `0`** — mock when layout matters:
  `Object.defineProperty(el, 'offsetHeight', { value: 300, configurable: true })`.
- **Throttled/debounced handlers are unreliable** — call the underlying method directly
  (e.g. `lb.update()`) rather than dispatching an event and waiting.
- **DOM globals aren't auto-exposed under Bun** — a preload must instantiate the Happy DOM
  `Window`, patch missing error constructors (`SyntaxError`/`TypeError`/`RangeError`), and
  copy an explicit allow-list of DOM globals (`HTMLElement`, `customElements`,
  `MutationObserver`, …) onto `globalThis`, binding window methods (`getComputedStyle`,
  `requestAnimationFrame`, `fetch`). editor2's `test-setup.ts` is directly copyable.
  — seen in: editor2, tosijs

## Async state settling

After mutating observant state, wait for pending observers/DOM updates before asserting.
In tosijs: **`await updates()`**. Do not assert synchronously after a state change — `touch()`
is batched (setTimeout), so the DOM reflects changes on the next tick, not immediately.
— seen in: tosijs, tosijs-ui

- WebXR suspends `requestAnimationFrame`, which freezes tosijs's rAF-batched binding flush —
  `await updates()` **before** `enterXRAsync` or a stranded render flag freezes bindings for
  the whole session. — seen in: tosijs-3d

## Proxied vs. raw in tests

- List/array bindings need **proxied** arrays (they carry path metadata), not raw arrays —
  read them from the proxy (`xin['path.to.array']`), don't construct a bare `[]`. — seen in: tosijs
- `for…of` over a proxied array yields proxied items (mutations observe); `forEach`/`map`/
  `filter` pass raw items (mutations are silent — call `touch()`). — seen in: tosijs

## Test pure logic in isolation

The strongest testability discipline in the ecosystem: **extract non-trivial computation into
a pure, dependency-free, deterministic module and unit-test it headlessly.** Keep the engine /
browser / IPC / framework bridge in a separate file.

- Feed plain data in, assert data out — no `localStorage`, Tauri bridge, Babylon, DOM, or
  network. Advance time only via an explicit `dt`/`tick`, never `Date.now`/`Math.random`; mint
  ids from a counter. Determinism makes state models reproducible and lets a headless driver
  run them (the pure integrator that drives live behavior is the SAME one prediction/tests use).
- When source depends on browser/IPC globals, duplicate a pure copy of the algorithm (merge,
  unread counts, interpolation, gating) into the `*.test.ts` and test that.
- Concentrate coverage on the deterministic core (interpolation, clamping, easing, waypoints,
  ballistics) — full scroll/layout/render choreography is impractical to unit-test, so don't try.
— seen in: tosijs-3d, kith-email, tosijs-product, loewald-dot-com

## Keep test tiers separate; never mix runtimes

Unit, integration, and browser/E2E tests have different runners and must not bleed together.

- **Unit** (`bun test src/`, self-contained) vs **integration** (`bun test tests/`, needs a
  running server) — split via package.json scripts. — seen in: haltija
- **Never import Bun-only APIs into a Node/Playwright test.** Playwright runs on Node, not Bun;
  a leaked Bun import fails with `Cannot find package bun`. Gate Playwright by filename
  (`testMatch '**/*.playwright.ts'` / `tests/*.pw.ts`). This is the single most common source
  of test failures where it applies. — seen in: haltija, tosijs-ui
- **Skip-guarded integration tests pass vacuously** (`expect(true).toBe(true)`) when the
  emulator/server is down — a green suite does NOT mean they ran. Name them distinctly
  (`*.integration.test.ts`) and actually stand up the dependency to exercise them. — seen in: loewald-dot-com
- **Type-level tests are not runtime tests.** Keep them in a separate `*.types.ts` file checked
  only by `tsc --noEmit`, using `assertType<T>()` no-ops + `@ts-expect-error` (positive AND
  negative). Running that file under `bun test` is a category error — it asserts compile-time
  failures. — seen in: tosijs-schema

## Testing model-dependent code (LLMs): three lanes by what each proves

"LLM tests" tend to congeal into one slow, non-deterministic bucket that gets `SKIP`-ed
exactly when it matters — so the code you own goes untested and the model behavior you care
about goes unmeasured. Split them by **what each actually proves**:

1. **The client you own → deterministic, and in the normal loop.** Your HTTP/SDK wrapper —
   request shape, response parsing, error mapping — has nothing to do with what the model
   *says*. Test it against a **fixture server** (a real localhost socket returning canned
   responses; inject the base URL), so it's fast and needs no live model. Leaving this to run
   *only* when the model is up is backwards: it's the part most likely to break on an API-shape
   drift, and the part a model can't help you verify.
2. **A live smoke → the irreducible "still works against reality."** One or two tests that
   actually hit the model and assert **shape** (a non-empty string, a vector of plausible
   length), never content. This is the only thing that needs a live model in the gate; keep it
   tiny (share one audit/handshake across the cases).
3. **Model *behavior* → an advisory lane, measured as a rate, never a hard gate.** Whether the
   model can do the thing (write valid code, classify, follow the format) is non-deterministic
   and un-mockable — a mock just re-tests your parser. Run **N samples against a pinned model**
   and assert nothing on the rate: **report** a success rate vs a bar and let it inform, don't
   block. A bad model afternoon is variance, not a code regression, and a non-deterministic hard
   gate trains everyone to `--no-verify`.

**Anti-pattern to name and kill: the k-of-n retry mask.** `withRetry({ maxAttempts: 3,
minSuccesses: 1 })` "passes" at a **33%** success rate — it cannot tell a healthy 90% from a
degraded 35%. If you are retrying to hide flakiness, you have converted a measurement into a
coin flip. When the thing under test is inherently probabilistic, **measure the probability**
(lane 3) instead of retrying until it's green. — seen in: tjs-lang

## Integration / E2E needs a live target — start it yourself

Integration and browser tests do **not** auto-start their dependency:

- Spin up the real thing rather than mocking: spawn the actual binary on a dedicated test port
  and poll a status endpoint (`fetch('/status')`) until ready. Catches real wire/protocol
  regressions. — seen in: haltija
- Playwright tests need the **HTTPS dev server already running** — the config won't launch it,
  and it fails silently otherwise. — seen in: tosijs-ui
- Emulator-backed tests run **compiled** code — rebuild (`cd functions && bun run build`) and
  restart the emulator after editing, or you're testing stale output. — seen in: loewald-dot-com

## Live browser testing with Haltija

For agent-driven, real-browser inspection of a running dev page, use the **`hj` CLI against a
private named Haltija server**, not the Claude-in-Chrome extension.

- Run a project-scoped instance with `--name`/`--port` (e.g. `bun run haltija`, `HALTIJA_NAME=<x>`)
  so concurrent projects don't collide on the default port. Never run bare `haltija` (grabs the
  shared port + its own browser) and never `bunx haltija@latest` (version is pinned). The process
  boundary — one server per project — is the isolation primitive.
- Enable serve-time injection via `haltijaDev: true` in the site config (localhost-gated, never
  bundled) so an agent can `hj navigate/eval/screenshot` the live page.
— seen in: kith-email, tosijs-3d, tosijs-ui, haltija

## Doc / live-example tests

Projects built on `tosijs-ui/site` can run tests as inline ` ```test ` blocks inside `/*# … */`
doc comments; they execute in a real browser and POST results to `/report`, annotated by source
line via `//# sourceURL`. Assertion discipline for these live examples:

- Use **count-based** assertions, not presence/absence — other examples leave DOM behind.
- **Combine dependent assertions into one `test()` call** — calls within a block run concurrently.
- **Give each `js` block its own imports** — blocks are separately-scoped async functions, no
  cross-block sharing.
- **Never mix `html` + `js` blocks that both create the same element** — you get double-render bugs.
— seen in: tosijs-ui

## TJS inline tests

TJS supports inline tests and `TjsEquals`. Where a module is native `.tjs`, prefer its inline
test facility for unit-level checks; keep integration/DOM tests as `*.test.ts`. Caveat: the
`tjs run` CLI does **not** inject the `expect` harness — `test { … }` blocks only pass in the
playground UI, not via CLI. — seen in: tjs-lang

## What to test

- Behavior at the public API edge and the known-hard cases (async settling, id-path surgical
  updates, form-association, boxed/raw boundaries, sandbox/security paths) — not framework
  internals. — seen in: tosijs
- **Reproduction-first.** Write the failing case BEFORE fixing a bug or refactoring trusted
  logic; when porting, characterize the current code as the oracle first. Cross-repo regressions
  get a repro test in the *library that owns the behavior*. — seen in: tjs-lang, loewald-dot-com
- Keep security-critical surfaces at high coverage against a written audit, not a blanket
  percentage — target the sandbox/RBAC/validation slices explicitly. — seen in: tjs-lang, loewald-dot-com, tosijs-schema
- Not every project has a suite: pure demo/bridge libraries verify by running the demo app in
  the browser. If a repo has no `*.test.ts`, that's the intended workflow, not an omission.
  — seen in: react-tosijs

## Project-specific practices

### tjs-lang
- Normal loop is `bun run test:fast` (`SKIP_LLM_TESTS=1 SKIP_BENCHMARKS=1`); full `bun test`
  needs a local LM Studio chat+embedding server. Attack scenarios live in `src/use-cases/`
  (e.g. `malicious-actor.test.ts`); aim ~98% lines on `src/vm/runtime.ts`, 80%+ overall.
- The model-dependent tests follow the three-lane split above: deterministic client coverage
  (`src/batteries/llm-transport.test.ts`, fixture server, in `test:fast`); a live smoke
  (`models.integration.test.ts`, in the gate); and AJS grokkability as an advisory rate lane
  (`bun run test:grok`, behind `RUN_GROK_TESTS`, pinned model, never blocks).

### tosijs-schema
- Keep an explicit `src/coverage.test.ts` targeting hand-audited edge cases (`s.null` vs
  `s.undefined`, `x-tjs-undefined`) alongside a written `COVERAGE.md`, rather than trusting a
  line-coverage number.

### loewald-dot-com
- Prefer emulator-free tests that feed `(data, existing, userRoles)` and assert the outcome —
  they dissolve the skip-guarded-integration-test problem for the validate/write/provenance path.
