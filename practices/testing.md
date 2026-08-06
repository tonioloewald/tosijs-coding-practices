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

- **Never scope the unit lane with a `*.test.ts` glob** (`bun test src/*.test.ts`). A glob matches
  only the top-level files and silently skips every test in a subdirectory — no error, exit 0, a
  green run that never ran. A bare directory (`bun test src/`) or bare `bun test` **recurses**; use
  those. In tosijs-ui the glob form skipped ~126 tests across whole features. — seen in: tosijs-ui
- **Check whether `bun run build` runs the tests — in some repos it does and in others it does
  not, and assuming wrong means shipping a red suite.** `grep '"build"' package.json`, then read
  the script it points at.
  - **tosijs: yes.** `build` is `bun bin/site.ts --build`, and `bin/site.ts:49` runs
    `await $\`bun test src/\`` — a red suite blocks the release build.
  - **haltija: no.** `build` is `bun run scripts/build.ts`, which type-checks and bundles and never
    invokes a test runner. Its two `process.exit(1)` paths are an ownership-marker check and
    `node --check`. Running `bun run build` there tells you nothing about the tests.
  Do not substitute this check for CI either: haltija has **four** gated workflows, and tosijs and
  tosijs-ui each have `ci.yml`. See `releasing.md` step 3 (which calls the "build runs the tests"
  assumption "the most dangerous sentence in this file") and `review.md`'s lane enumeration.
  — seen in: tosijs (true), haltija (false)
- **An assertion that scrapes its own input must first assert the scrape found something.**
  Otherwise a format change turns it into `expect([]).toEqual([])` and it goes green forever. Two
  shapes seen in one haltija cycle: a parity check whose regex never matched the real output, and a
  flag-registry check whose regex found **zero** literals under `bun test` while working under
  `node` — Bun's transpiler re-emits single-quoted strings as double-quoted. Better still: import
  the authoritative data instead of re-deriving it from formatted output. — seen in: haltija
- **An error message almost always contains the identifier you searched for.** `toContain(name)` is
  satisfied by `"No commands matching 'name'."`, so assert the failure string is ABSENT too. In
  haltija this let a test certify the very bug its fix was written for. — seen in: haltija
- **Assert on the identifier the payload actually carries.** Two haltija tests asserted on a DOM
  `id` against JSON nodes that have never carried one; one of them passed under a mutation that
  deleted the guard entirely. — seen in: haltija
- **A fix's own test, written in the same sitting by the same author, inherits that author's
  misunderstanding.** Four vacuous assertions in one haltija cycle were found by mutation testing
  and none by re-reading. If a regression test has never failed, it is unproven: break the fix on
  purpose and watch the test go red before you trust it. — seen in: haltija
- **Never judge a run by a truncated tail.** `| tail -n` shows the summary and hides the failure
  lines above it; a pipeline's `$?` is the LAST command's, so `cmd | head` reports head's exit code.
  Assert on the failure/error count, or read the whole output. Three haltija commits merged on a red
  Playwright gate this way. — seen in: haltija
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
- E2E should **own its target**: a dedicated test port, `reuseExistingServer: false`, and any
  dev-only overlay disabled — so it never adopts (or asserts against) a differently-configured
  dev server a developer happens to have running. Tests reference `baseURL`, never a hard-coded
  port. — seen in: tosijs-ui (Playwright config spins up its own server on 8799 with the haltija
  dev overlay off; a reused shared server would inject a DOM CI never sees)
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

TJS supports inline `test '…' { }` blocks. Where a module is native `.tjs`, prefer its inline
test facility for unit-level checks; keep integration/DOM tests as `*.test.ts`. (The
`TjsEquals` directive this used to name is abolished as of 0.13.0 and now throws — a `.tjs`
file gets footgun-free `==` unconditionally; see `practices/tjs-lang.md`.) Caveat: the
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

## Test the environment adopters have, not the clean room

Suites almost always run **from nothing, in-repo, to nothing**: fresh state, one dev server,
nothing else installed. Adopters run on a machine that already has your tool on it, in some state.
Every bug that lives in that gap is structurally invisible to the suite — no amount of *depth*
finds it, because the missing variable is **context**, not coverage.

Two independent cases, same shape:

- **haltija** shipped a run of field bugs its (green) suite could not see: a server left running by
  another project silently swallowing a lane's commands; a server alive with **zero connected
  browser windows**, so "is it up?" answered yes and there was nothing to drive; an orphaned GUI
  child holding a singleton lock that blocked the *next* run; two projects on one shared port
  stealing each other's commands. Each needs a *dirty* machine to reproduce, and the suite always
  started clean.
- **tosijs-ui** shipped four packaging regressions that **all four** of its test lanes missed —
  every lane ran in-repo, from-repo, against one dev server. A pack-and-install lane found three of
  them within minutes of first being written.

So add lanes that reproduce the adopter's context. They're cheap, and each one maps to a bug class:

- **Something already running** when the lane starts — with state, and in a half-dead state
  (process alive but not actually serving).
- **Two consumers at once**, in different working directories, each expecting its own.
- **Install the built artifact and run it from outside the repo** (pack-and-install), not from
  source with the repo's own resolution.
- **A stale-but-satisfying version in the package cache.** A range like `^1.5.0` is satisfied by a
  cached 1.5.0 that predates the fix your pin exists to get. Bumping the floor doesn't protect you —
  only a lane that *runs with such a cache* catches the next instance.

The bar is not "more tests"; it is **one lane per assumption the clean room silently makes**.
— seen in: haltija (issues #1/#7/#8/#11), tosijs-ui (four packaging regressions, four blind lanes)

## Dependency-audit gate: fail on high+, exempt with a clock

> This section is the **test-lane** shape of the gate. For the wider supply-chain
> practice — how to build the gate so it can't report a pass it never earned, how to
> classify and report findings, and how to choose dependencies at all — see
> [`dependencies.md`](dependencies.md).

Gate the suite on `bun audit` (or `npm audit`) at **high+ severity**, but make the exemption
mechanism time-limited so it can't rot into a permanent silence. A plain "ignore this advisory"
list is where audit discipline goes to die — nobody ever revisits it. Instead:

- **A dated exemption file** (`audit-exemptions.ts`): each entry is `{ ghsa, package, reason, until }`.
  The `reason` says why it's acceptable *today* and what the fix path is; the `until` date is a
  hard clock. **On/after `until`, the exemption lapses** and the advisory fails the gate again —
  forcing a re-fix or a renewed, re-justified exemption. Quarterly (`until` ≈ +3 months) is a
  sane default for an upstream-transitive advisory with no fix yet.
- **A test lane** that runs `bun audit --json`, collects high+ advisories, and fails on any not
  covered by a *live* (non-expired) exemption. It also **warns when an exemption is dead** (the
  advisory is no longer reported — upstream fixed it or the dep was dropped) so the list stays
  honest, and **self-skips offline** (a network blip must not red the suite).
- **Runs in the full pre-tag gate, skipped by the fast loop** (`SKIP_AUDIT=1`) — same tiering as
  the other network/slow lanes. Enforce it at tag time (a pushed tag runs the whole suite).

The framing that makes exemptions honest: only exempt what genuinely has no clean path *today*,
and record *why it doesn't reach a consumer*. Most residual advisories are dev/deploy-only
transitive (lint/build/deploy tooling) — the **shipped** package's runtime deps usually carry
none, so consumers were never exposed; say so in the reason. Often the bigger win is upstream of
the gate: a `bun audit` list is also a prompt to **delete an unused dependency** entirely (a
vestigial `vitest` alongside `bun:test`, a lib used in one compile-only file) — which removes a
whole vulnerable chain and sometimes uncovers dead code. — seen in: tosijs-ui (build-gated),
tjs-lang (test-lane + `audit-exemptions.ts`)

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
- **Every documented/marketed guarantee is a test obligation — pin the REFUSED input, not just
  the accepted one.** `additionalProperties: false` was documented since 1.0 and enforced only
  in 1.5.0; the suite even had a test codifying the bug ("Actually passes - validator doesn't
  check this"). — seen in: tosijs-schema (v1.5.0 review, repeated fail-open blockers of this
  one class).
- **The fix for an enforcement mirror is an ALLOWLIST exported from beside the enforcement
  walk, gated at the boundary's construction — not a denylist plus a drift test.** A denylist
  of "known unenforced" keywords fails open by construction on typos (`minumum`), unknown spec
  keywords, and everything added later; tosijs-schema's v1.5.0 wave-4 deleted its denylist for
  exactly this reason. Pair the allowlist with a table-driven test proving every member
  genuinely enforced with a passing AND failing case (src/schema.test.ts's ENFORCED_KEYWORDS
  table is the copyable template). Prototype-named keys (`constructor`, `toString`,
  `__proto__`) belong in every gate's refused-input tests — key membership must use
  `Object.hasOwn`, since `in` walks the prototype chain. Boolean schemas are legal JSON Schema
  and ignoring them fails open on `properties: {k: false}`. And a documented `true | Error`
  surface means internal throws (e.g. `new RegExp(userPattern)`) are contract bugs — fail
  closed. — seen in: tosijs-schema v1.5.0 waves 3-5.

### loewald-dot-com
- Prefer emulator-free tests that feed `(data, existing, userRoles)` and assert the outcome —
  they dissolve the skip-guarded-integration-test problem for the validate/write/provenance path.
