# Code review

## Tooling

- **`/code-review`** (Claude Code) reviews the current diff at a chosen effort level. Use it
  before committing anything nontrivial. `/code-review ultra` runs a deeper multi-agent
  cloud review of the branch or a PR — it is user-triggered and billed.
- **`/security-review`** for changes with a security surface (auth, capability VMs, network
  sync, untrusted input, deployment config).
- These projects have **no CI** — no `.github/` workflows anywhere in the ecosystem. Tests,
  lint, build, and publish are all local/manual. So review IS the gate: `bun run build`
  runs tests first and exits non-zero on failure — run it, don't assume a pipeline will.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, kith-email, react-tosijs

## Comprehensive pre-release review (minor & major)

Before any **minor or major** version bump, run a structured multi-lens review — not one
blended pass. Blending dilutes every lens; a reviewer told to "check everything" checks
nothing deeply. Run the **six lenses below as independent passes**, each scoped to the diff
since the last release (`git diff vLAST..HEAD`) plus the code it touches (for a **major**,
review whole affected subsystems, not just the diff). This maps directly onto the tooling:
one focused `/code-review high` per lens, or `/code-review ultra` / a `Workflow` fan-out with
one reviewer agent per lens in parallel, then triage the union.

**Scale to the bump:** patch → a quick correctness + docs pass. Minor → all six. Major → all
six plus a **completeness critic** ("what subsystem/claim/lens did we *not* review?").

Each lens returns **ranked findings with a concrete failure scenario**; a finding without a
repro is a question, not a defect. **Adversarially verify** before acting on or filing anything.

### 1. Correctness
- Observant correctness: new state paths actually observed/bound (no manual re-render sneaking
  in); `await updates()` around post-mutation assertions; id-path surgical updates intact.
- Boxed vs. raw: no proxy-on-proxy nesting; `===` on a BoxedScalar and `toDOM` getting raw
  values are silent traps.
- Component lifecycle: `content()` once vs `render()` structural-only; `value` not an
  `initAttribute`; boolean attrs default false; **light vs shadow DOM** (path bindings break in
  shadow); no `on<Event>` callback props.
- Edge cases, async settling, form-association, error/failure paths.
- **Done when:** the changed behavior has been **driven end-to-end** (see the next section),
  not just unit-tested.

### 2. Efficiency
- Surgical updates, not rebuilds; id-paths for in-place list mutation; bulk-mutate-raw-then
  `touch()`-once for large updates.
- Bundle size: gzip delta printed; **no new runtime dep in a core library**; peers `external`;
  never `sideEffects:false` on an element-registering lib.
- Hot paths: no revalidation in internals (`safety none` interior, validate at the edge);
  high-frequency handlers throttled/debounced; heavy deps lazy-loaded; big work off the main thread.
- **Done when:** bundle-size delta is known and no O(N) regression sits on a hot path.

### 3. DRYness (reuse & simplification)
- Duplicated non-trivial logic that should be one shared helper; reuse what the stack already
  provides (`dom.ts`, `throttle`/`debounce`, bindings, `StyleSheet()`/`vars` — never raw CSS
  strings) instead of reimplementing.
- New code that re-solves a solved problem, or a copy-paste that drifted.
- Over-abstraction is also a smell — DRY, not premature generalization.
- **Done when:** no copy-pasted logic remains and every new helper earns its place.

### 4. Documentation accuracy & up-to-dateness
- **Regenerate and diff-check generated docs**: `bun run build` (or the doc generator) then
  `git diff --exit-code` over `docs/`, `llms.txt`, `version.ts`, `examples.md`, `API.md` — a
  dirty tree means shipped docs are stale.
- Inline `/*# … */` doc-comments match the changed public API; live-example fences still valid
  (only `html`/`css`/`js`/`test` execute — a stray ` ```js ` for a non-runnable snippet runs).
- `CHANGELOG.md` has an entry for this version; README / `CLAUDE.md` / `AGENTS.md` reflect the
  change; if a **durable cross-project practice** changed, update the shared KB (and grep the
  cross-cutting docs for parallel mentions — see `../CONTRIBUTING.md`).
- Deprecations warn once and name their replacement.
- **Done when:** docs regenerate clean and the public-API surface is documented.

### 5. Test coverage
- New behavior has tests; every bug fix ships a **failing-first regression test**.
- Right tier: pure logic extracted and unit-tested; DOM via Happy DOM with `await updates()`;
  integration/E2E actually starts its target; type-level tests in `*.types.ts` under `tsc`.
- Security-critical code (VM/runtime, capability registry, RBAC) held to its high coverage bar.
- No skip-guarded tests passing vacuously (green ≠ ran); no Bun-only imports leaked into Playwright.
- **Done when:** changed lines are covered, criticals hit target, and the suite is green
  (the release build runs tests and exits non-zero on failure).

### 6. Developer experience (DX)
- API ergonomics: emitted types are accurate (no required→optional `.d.ts` drift), inference is
  good, and no re-introduced footgun (`on<Event>`, `value`-as-attribute, boolean-defaulting-true).
- Error messages are actionable; assignment-strictness / monadic errors used where apt.
- Conventions honored: `handle<Event>` callbacks; deprecations keep old names working + warn once.
- The "point an agent at it and it works" test: `CLAUDE.md`/`AGENTS.md` current, gotchas
  written down, and `bun install` → `bun start` / `bun test` / `bun run build` succeed from a
  **fresh clone** (TLS certs, single lockfile).
- **Done when:** a new dev or agent could adopt the change from the docs alone.

### Triage & gate
- Dedupe the union of findings and rank by severity.
- **Unresolved correctness (and security) findings block the release.** Efficiency / DRY / DX /
  coverage findings that are not regressions may be filed to `TODO.md` and scheduled — but say
  so explicitly; a silently-dropped finding reads as "reviewed and fine."
- Record anything durable back into the practice docs so the next release starts ahead.

— seen in: tosijs, tosijs-ui, tjs-lang (release discipline); tooling: `/code-review`, `/code-review ultra`

## Verify end-to-end — don't approve on tests + typecheck alone

- **Drive the real flow before you call it done.** Happy-DOM unit tests can't see real
  layout, scroll metrics, `offsetWidth`, `:scope >`, or rAF timing, so a green suite still
  hides runtime breakage. Get agent eyes on the running HTTPS dev page.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs
- **Use haltija + the `hj` CLI** to navigate/eval/screenshot the live page (`hj eval` to
  inspect component state, `hj screenshot` to see it), not the Claude-in-Chrome extension.
  Enable per-project with `haltijaDev: true` in the site config (localhost-gated, never
  bundled). Address one server per project by `--name`/`--port` — bare `haltija` grabs the
  default port and its own browser, so tests hit the wrong head.
  — seen in: tosijs-ui, tosijs-3d, kith-email
- A finding you couldn't reproduce on the running page is a question, not a defect.

## What to look for (stack-specific)

- **Observant correctness:** are new state paths actually observed/bound, or did someone
  reach for a manual re-render? Is `await updates()` used where a test asserts post-mutation?
- **`content()` vs `render()`:** bindings belong in `content()` (runs once); `render()` is
  for structural attribute-change updates only. Imperative DOM patching in `render()` or
  conditional logic in `content()` produces stale/duplicated UI. — seen in: tosijs, tosijs-ui,
  kith-email, tosijs-3d, tosijs-product
- **`on<Event>` callback trap:** `elementCreator()`/`elementSet` treats ANY `on*`-prefixed
  prop as an `addEventListener` target, so a callback prop named `onFoo` silently never
  fires — no error. Flag it: use `handle<Event>` (component members) or non-`on` names
  (`drive`, `whenDestroyed`); set a real function prop via the `apply(el){ el.onFoo = fn }`
  escape hatch. — seen in: tosijs, tosijs-3d, tosijs-product
- **Boxed vs. raw leaks:** proxies must not nest (proxy-on-proxy). Watch spreads of proxied
  objects into state; the stack unwraps on set/get but new code can defeat it. `===` on a
  BoxedScalar and `toDOM` callbacks getting raw values are common silent misbehaviors.
- **id-path sanitization:** reject id-path values containing `[`, `]`, `/`, or spaces —
  they break path parsing and corrupt bindings. Sanitize with
  `str.replace(/[\[\]\/\s]/g, '_')`. — seen in: kith-email
- **id-path opportunities:** list code that rebuilds instead of using surgical updates.
- **Component conventions:** `static preferredTagName` (survives minification); `value` is a
  property, never an `initAttribute`; boolean attributes default false.
- **Shadow vs. light DOM:** path bindings do NOT work inside shadow DOM, so apps default
  components to LIGHT DOM (`role` in `initAttributes`) — contradicting the library's own
  shadow-DOM default. Rule of thumb: shadow DOM only when you truly need CSS isolation
  (e.g. rendering untrusted email HTML); otherwise light DOM. — seen in: kith-email,
  tosijs-3d, tosijs-product
- **TJS boundaries:** validation at public edges, not smeared through hot paths; throws
  converted to monadic errors where that's the module's contract.
- **No accidental reformatting** of `.prettierignore`'d or unrelated files — notably
  `src/xin-types.ts` (hand-curated layout). Generated `dist/`/`docs/` diffs are expected on
  a build; don't revert or hand-edit them.

## Feed rough edges upstream, don't work around them silently

- When you hit a sharp edge in an in-house dependency (tosijs / tosijs-ui / tosijs-schema),
  log it in an **`UPSTREAM.md`** at the repo root instead of quietly coding around it:
  newest at top, each entry `Context` + concrete `Suggestion`, marked `✅ RESOLVED` with the
  fixing version once landed. Creates a durable, actionable backlog and stops the same
  integration trap being rediscovered. — seen in: tosijs-product

## Review posture

- Report faithfully. If tests fail, say so with output. Don't claim "done and verified"
  without having driven it.
- Findings should be actionable and ranked by severity. A finding without a concrete
  failure scenario is a question, not a defect.
- Work isn't done until it's pushed: per "Landing the Plane", `git push` succeeding (and
  `git status` clean vs origin) is the definition of done; file follow-ups in `TODO.md`.
  — seen in: tosijs, tjs-lang

## Project-specific practices

### tosijs-3d

- `RELEASING.md` is an agent-scoped release runbook: stop dev server → clean-tree check
  (ignoring `docs/` churn) → bump → build → verify → commit → tag, and the agent STOPS —
  `npm publish` and `git push` are human-only. Worth mirroring where releases are agent-run.

### tosijs-product

- Before building a tosijs-ui/site project, verify no `docPaths` entry overlaps `outputDir`
  (`docs/`) — `buildSite` does `rm -rf docs/` first without validating overlap, so an
  overlapping source path is silently destroyed and the build "succeeds" empty.
