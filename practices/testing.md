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
- **A CHECK YOU HAVE NOT WATCHED FAIL IS NOT A CHECK.** The mutation rule above
  is stated for tests; it applies at least as hard to **gates** — build steps,
  publish hooks, CI lanes — because a gate is written once and then trusted
  forever, and unlike a test nobody re-reads it. Six gates written in a single
  tosijs release week reported safety they had never established:

  | the gate | why it was vacuous |
  | --- | --- |
  | "every `exports` target exists" | used `existsSync` — the **working tree**, not the commit. Went green over a commit whose bundles a dev run had deleted. |
  | "every public type is importable" | regex-scanned a file that turned out to be a **24-line re-export stub**; compared two near-empty sets and still passed after the type was deliberately deleted. |
  | same gate, v2 | *used* each type rather than importing it — arity errors on generics, so it failed for a reason unrelated to the thing under test. |
  | "all non-markdown files are idempotent" | ran from the wrong directory: **"checked 0 files, unstable: 0."** |
  | `exerciseContract()` (shipped, public) | classified refusals by substring-matching their prose; a message rewrite made a suite of pure counterexamples return `{passed: 2, failed: 0}`. |
  | three new regression tests | fixture placed where the code under test never looked; a class chain where every level exercised the same branch; an element that was never wired, so the assertion examined nothing. |

  Three corollaries, each of which cost real time:

  - **Assert on the artifact a consumer resolves**, not a convenient proxy —
    `git ls-files` not `ls`; the built `.d.ts` not the source compiling.
  - **Any check with a scope query needs a floor assertion**
    (`expect(filesChecked).toBeGreaterThan(50)`). "Scope is a silent
    parameter" — seen independently in tosijs-3d-ensemble, whose peer-range
    check guarded one of three peers and said nothing about the other two.
  - **Prefer `test.skipIf` to an early `return`.** A silent skip is the one
    form of skip nobody notices.

  And the inverse failure, which is just as disabling: **a gate that cannot go
  green.** `prettier --check` on a file whose printer is not idempotent is
  unsatisfiable — `--write` then `--check` still fails — so it reports "not
  formatted" when the truth is "cannot be formatted", and whoever meets it
  disables it. Verify a new gate goes **both** red and green before trusting
  it. — seen in: tosijs (1.10.x), corroborated in tosijs-3d-ensemble

- **Findings deserve the same standard as gates: verified by observation, not
  by inspection.** A pre-release review reported that nothing executed tosijs's
  live ` ```js ` doc fences. False — the doc runner emits an implicit
  `example loads without error` per fence, which is why the test total exceeded
  the ` ```test ` fence count. Proved in ninety seconds by injecting an
  undefined call and watching both engines go red; acting on the finding would
  have meant building a second lane duplicating the first. The finding came
  from reading a source comment rather than running the thing. — seen in: tosijs

- **Never judge a run by a truncated tail.** `| tail -n` shows the summary and hides the failure
  lines above it; a pipeline's `$?` is the LAST command's, so `cmd | head` reports head's exit code.
  Assert on the failure/error count, or read the whole output. Three haltija commits merged on a red
  Playwright gate this way. Recurred in tosijs: gates and the commit were run as
  one command, the test tail read as green, and a commit landed with eslint red.
  — seen in: haltija, tosijs
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
- When source depends on browser/IPC globals, **extract the pure algorithm into its own
  module and import it from both the source and the test** (the tosijs-3d three-file split is
  the reference shape). Copying the algorithm *into* the test file — the old form of this
  rule, retired by the 2026-09 audit — is the severed-propagation defect lens 9 exists to
  catch: when the tested copy isn't the shipping copy, fixes reach nobody (the recorded
  instance: `bin/hj.mjs` drifting from the tested `src/sessions.ts`). A copy-in-test is
  acceptable only as a spike, with extraction as the recorded follow-up.
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
- **A dedicated port must be dedicated across the whole ECOSYSTEM, not just within one repo.**
  The bullet above is right and still let two repos collide: tosijs and tosijs-ui both defaulted
  their Playwright lane to **8799**, so a lane running in one made the other fail — and it
  failed as `NS_ERROR_CONNECTION_REFUSED` on every test, which reads like a broken dev server,
  not like a port conflict. (Playwright's own "port is already used" check only fires when the
  neighbour is up at *launch*; start after it and you get the confusing failure instead.) Give
  sibling repos distinct defaults, or let the config pick a free port, and always honour an
  `E2E_PORT` override so a human can escape without editing config. — seen in: tosijs, tosijs-ui

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
  internals. A suite written at this edge is also what *survives a rewrite*: bun's Zig→Rust
  port kept ~60k behavioral tests unchanged as the ground truth across the language swap —
  tests of internals would have died with the internals. — seen in: tosijs; external:
  bun.com/blog/bun-in-rust
- **Reproduction-first.** Write the failing case BEFORE fixing a bug or refactoring trusted
  logic; when porting, characterize the current code as the oracle first — and for the duration
  of the port the suite is the *contract*: **zero tests skipped or deleted**, with the assertion
  count tracked as the meter (a shrinking count is silent scope loss — the invisible-skip
  failure at migration scale). Cross-repo regressions
  get a repro test in the *library that owns the behavior*. — seen in: tjs-lang, loewald-dot-com;
  the suite-as-contract invariant external: bun.com/blog/bun-in-rust ("0 tests skipped or
  deleted" across a 535k-line port, ~1.38M assertions counted per platform)
- Keep security-critical surfaces at high coverage against a written audit, not a blanket
  percentage — target the sandbox/RBAC/validation slices explicitly. — seen in: tjs-lang, loewald-dot-com, tosijs-schema
- Not every project has a suite: pure demo/bridge libraries verify by running the demo app in
  the browser. If a repo has no `*.test.ts`, that's the intended workflow, not an omission.
  — seen in: react-tosijs

## A test that fails when the code is right is a defect in the test

The lived pattern (owner): you establish the code works — by dogfooding, by driving it — and
now the suite fails, and updating it is a chore. Name what that red actually is: the test is
not reporting a broken promise, it is demanding bookkeeping for its own stale copy of the
implementation. **Red-when-right and green-when-wrong are the same defect class** — in both,
the test is not measuring the promise — and red-when-right is the more corrosive over time:
every ritual "test failed → update test" session trains the reflex of making tests agree
with code *without asking which one is right*, and the suite decays from oracle to echo.
(The reflex has fired both ways here: one reporter wrote a passing test for the wrong
hypothesis and "fixed" working code — tosijs#35.)

When a change you have verified working turns tests red, classify each red test **before**
touching it:

1. **A promise broke** — the test caught a real regression, or a deliberate break. Keep the
   test; fix the code, or accept the break explicitly (changelog, migration). This is the
   test doing its job.
2. **An implementation detail legitimately changed** — the test asserted the *how*, not the
   promise. Defect in the test: rewrite it against the promise it should have asserted.
   Do not just re-record the new *how* — that's the echo reflex.
3. **The test was only ever an echo** — snapshots, exact output strings, DOM-structure
   asserts. These can only fail on legitimate change (any behavior change just re-records
   them), so they have no oracle value: replace with a promise-level assertion or delete.

Two amplifiers:

- **Mass failure on one legitimate change is a coupling measurement**, same signal as rebase
  pain: the tests were written against the wrong seam. Don't update forty tests — move the
  assertion to the seam that was stable.
- **The chore is friction — log it.** A recurring test-update chore belongs in the AAR
  friction bullet, and the periodic pass promotes it into action (rewrite that suite region
  against promises). Quietly paying the chore forever is how a suite becomes a tax that
  buys nothing — the measured local record is that *small tests asserting a specific
  promise* age well and catch nearly everything real, while echo-tests only ever cost.

— seen in: owner (recurring, cross-project); tosijs-3d-ensemble (promise-asserting tests as
the only ones that ever caught defects); tosijs#35 (the echo reflex inverted)

## Testing A→B and B→C does not test A→C

A pipeline with stages invites a specific, quiet gap. You test the first stage, you test
the second stage, both are green — and the composition is never exercised, because each
stage was tested against inputs **somebody chose**.

The reason it bites is not laziness about coverage. It is that **a generator's output is a
different population from what a human writes.** The hand-written fixtures for stage two
are, by construction, the intermediate forms someone thought of. The ones a generator emits
in corner cases are the ones nobody did — and those are exactly the inputs that stage two
has never seen.

Worked example (tjs-lang, 2026-08). The compiler's `ts → js` path was implemented as a
shortcut through tsc's own emission rather than as `ts → tjs → js`. `ts → tjs` was tested.
`tjs → js` was tested. But `tjs → js` was only ever tested against TJS a person had
authored, so anything the converter emitted that no one would write by hand went straight
through unexercised.

The bug that surfaced it downstream is the shape to remember: a transform stripped `new`
from locally-declared classes. That is **correct** for hand-written source (the emitter
wraps such a class so it is callable) and **wrong** for generated source (plain semantics,
no wrap, so the `new` is load-bearing). Right for the authored population, wrong for the
generated one — and only a consumer of the generated path ever saw it. It shipped in four
releases.

### How to close it

- **Feed stage one's real output to stage two's real tests.** Not a fixture that resembles
  it — the actual artifact. If stage two's suite contains only hand-authored inputs, then
  stage one's output is an untested input, whatever the coverage number says.
- **Run the ORIGINAL suite against the TRANSFORMED code.** For a source-to-source tool this
  is unusually cheap and unusually strong: stage the transformed modules, point the existing
  tests at them, and any behavioural divergence shows up as a failure written by someone who
  was not thinking about the transform. tosijs did this for its TJS port — 35 test files
  against 53 converted modules, **872 of 898 passed, and all 26 failures were staging
  artifacts** (tests hardcoding `import.meta.dir`, or a cache-busting import with an
  explicit extension), not behavioural differences. That is a real result about the
  converter, obtained in an afternoon, from tests nobody wrote for it.
- **Beware the shortcut that makes the composition look tested.** The `ts → js` path
  *existed* and *passed*. It just was not the composition it claimed to be. A pipeline stage
  implemented as a shortcut is worth an explicit comment saying so, because otherwise its
  green tests are read as covering the path they bypass.

Same family as the artifact-execution rule in
[`dependencies.md`](dependencies.md) §12 — the suite tests the source, the bug lives in the
emitter, and only running the built thing finds it.

## Examples are load-bearing — audit that they *exemplify*, not just run

The doc-example discipline above proves examples still execute; the examples **audit**
(Tier 3, quarterly — see review.md's tier structure) asks the stronger question: does the
sample code teach *current* best practice? An example that runs but emits deprecation
warnings, uses a retired API shape, or contradicts the style guide is anti-documentation —
it trains every reader (human and agent) to write yesterday's code, and agents especially
copy examples verbatim. Observed: tosijs-ui's doc-site examples emitting deprecation
warnings on load, releases after the deprecations shipped. Check: load the doc site with a
console open (zero warnings expected — see the log-spam discipline), and diff each example
against what you'd write today. An example you wouldn't write today gets updated or deleted.
— raised by the repo owner 2026-09-01; observed in tosijs-ui

## A regression test you wrote *after* the fix must be seen to fail

"Reproduction-first" above assumes you write the failing case first. Often you can't: you find the
bug *by* fixing it, and the test gets written against code that already works. That test has never
been observed failing, so nothing yet distinguishes "it catches the bug" from "it passes for an
unrelated reason."

**So put the bug back and watch it go red.** Revert the fix (or mutate just the guard — `if (false
&& …)` is enough), run the one test, confirm the failure message names the thing you fixed, restore.
Two minutes, and it converts a plausible test into an established one.

Worth the ceremony because the false-pass is invisible and looks exactly like success:

- A test for "a framed widget must not steal the tab's window id" passed **without the fix**. The
  harness built its page with `page.setContent`, whose `about:blank` document has no usable
  `sessionStorage` — so every widget minted a fresh id anyway and the collision under test could not
  occur. Rewritten against a real http origin, it failed correctly (expected 2 windows, got 1).
- In the same session a second test was unrepresentative in a subtler way: it created the element
  with the *parent* document's constructor, so the code under test saw the parent's `window` rather
  than the frame's. It exercised a situation that cannot arise in production.

Both would have shipped as green. The mutation is what found them — reading the test did not, twice.

Corollary: **assert that the mutation applied.** A `replace(x, '', 1)` that silently matched the
wrong occurrence produces a "test still passes" result that reads as a vacuous test when in fact
nothing was mutated. If the harness can't prove it changed the code, the run proved nothing.

### And if the FIX breaks no tests, the suite has a hole

One step earlier than the above. When you change behaviour and the whole suite stays green, that is
evidence about the **suite**, not about the change: nothing in it was watching the thing you just
altered. The move is to add the tests the fix *would* have broken, then confirm they fail against
the old code.

Seen in tosijs, fixing a proxy discontinuity (leaf proxies were empty and path-resolving, object
proxies still wrapped their target, so a held object box's `.value` was frozen — tosijs#35). The fix
broke nothing, so tests were written that it would break; making *all* proxies empty then broke
almost nothing else, with one real finding — array proxies must wrap an empty array, or
`Array.isArray` fails. A green suite would have reported "no impact" and hidden both the hole and
that constraint. — seen in: tosijs

**A test that reads through the same broken accessor as the code proves nothing.** The consumer-side
half of the same bug: I asserted "the write did not land", wrote a test, and it *passed* — because it
read the value back through the very accessor that was stale. That confirmed my wrong theory, and I
went on to "fix" a line that was already correct. What broke it open was reading the same state two
different ways (`box.tosi.value` vs `box.n.value`) and finding them disagree. When a test and the
code under test share a dependency, agreement between them is not evidence.
— seen in: tosijs-3d-ensemble

## A ratchet measures a RATE, not a count

A "floor" test — *this number must not go down* — is the standard way to stop a metric
regressing while you improve it. Written against an absolute **count** it does the opposite
of its job the moment the corpus grows.

tjs-lang ratchets self-hosting: how many of its own files convert, compile, and graduate.
The floors were counts, and the corpus went 287 → 336 files as the language got *better*.
Every added file that did not yet convert pushed the count down, so a run that improved the
language reported a regression — and the reflex fix ("lower the floor") destroys the ratchet
entirely.

**Store the rate; assert on the rate.** `passing / total`, with the raw counts in the failure
message so a human can see both. Then corpus growth is neutral by construction: adding ten
files that convert and ten that do not leaves the rate where it was, which is the honest
reading.

Pair it with a **promote-check**: when the rate exceeds the recorded floor by more than
noise, FAIL with "raise the floor to X". Otherwise a ratchet only ever protects the number
it was set at, and the gap between actual and asserted widens silently until the test is
guarding nothing. — seen in: tjs-lang (`92fc22e`)

## Documentation snippets are code, so compile them

Fence-tag hygiene (`code-quality.md`, `web-components.md`) stops a snippet from *running*
when it should not. It does nothing about the opposite failure: a snippet that is never checked at
all and quietly stops being true.

**Compile every fenced snippet in the reference docs as part of the suite.** In tjs-lang,
182 blocks across nine documents surfaced four stale claims — three of them the *same wrong
fact* in the three documents a reader opens first. One taught a construct that had become a
compile error; another documented a syntax that was never implemented. A 3,400-test suite
had not noticed, because no test read prose.

Two details make it work rather than merely sound good:

- **Unmarked means real.** The default is "this is a program"; every exemption is an
  annotation visible in the markdown source. A skip nobody can see is how a "checked"
  document ends up mostly unchecked.
- **`expect-error` is the load-bearing half.** A snippet demonstrating a *rejection* is also
  a claim, and it rots in the opposite direction — silently starting to compile. Assert both
  directions or you have only checked the easy one.

Beware the escape hatch. Bulk-annotating fragments is tempting on first adoption, and in
tjs-lang two blocks teaching a rejected construct were marked `fragment` by that pass — so
the harness looked away from exactly the defect it was built for, in the same release. If
you must bulk-annotate, re-triage afterwards by compiling each exemption and reading the
ones that fail for a *rejection* reason. — seen in: tjs-lang (`ac2b297`, `3cad86c`)

### A result comment is an assertion — run it, or don't write the arrow

Compiling a snippet proves it *parses*. It says nothing about the claim written beside it:

```js
place({ x: 1, z: 9 })  // -> {x: 1, y: 0}
```

That arrow is **wrong** — the real result carries `z` through. The snippet compiles, the
gate is green, and the documentation teaches a false fact with a passing test standing
behind it. In tjs-lang the snippet suite was 193 pass / 0 fail with that line in it.

> **A `// →` result comment is an assertion.** Either run the snippet and compare, or don't
> write the arrow.

The framing matters more than the tooling: the arrow is doing the work of an `expect()`
while being invisible to every gate, and a reader cannot tell the difference. The cheapest
enforcement is a `run` mode that executes snippets whose comments contain `// →` / `// ->`
and compares — but even unenforced, the rule tells a reviewer what to look for.

**Check the corpus list too.** The same suite's `DOCS` array did not include `CLAUDE.md`,
the single most-read file in the repo. A snippet gate with a gap in its *input* is the same
failure one level up. — seen in: tjs-lang (0.13.0)

### A skip flag names exactly what it skips

A slow *correctness* gate folded into a flag named for a different category disappears.

tjs-lang has two dogfood ratchets — *can the toolchain convert its own source and its own
test suite?* — guarded by `if (process.env.SKIP_BENCHMARKS)`. `test:fast` sets that flag.
CI runs `test:fast`. So neither ratchet had **ever** run in CI, and both were invisible to
every automatic signal.

Two measured costs:

- the pre-tag suite stayed **red through an entire round of blocker fixes** while every
  automatic signal was green;
- the known-failure list sat at **eleven** entries, six annotated "undiagnosed" for weeks.
  Given a CI lane, it dropped to **two** — nine of them were one defect, already fixed. A
  ratchet nobody runs cannot invite that connection.

The flag's *name* was the whole problem: nobody reading `SKIP_BENCHMARKS` in a `test:fast`
definition thinks "this also disables two correctness gates."

> **A skip flag names exactly what it skips, and nothing rides along.** If a slow
> correctness check needs excluding from the fast lane, give it its own flag and its own
> lane. When you add a check to an existing flag, re-read the flag's *name* and ask whether
> the check belongs to that category or merely shares its runtime cost.

"Slow" was a real reason to exclude them; "benchmark" was never the right name for it. The
fix was a separate `test:dogfood` script and its own CI step — deliberately *not*
un-gating them in the fast lane, since tripling the inner loop is how a fast lane stops
being used. — seen in: tjs-lang (0.13.0)

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
