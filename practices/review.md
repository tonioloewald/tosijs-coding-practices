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
nothing deeply. Run the **nine lenses below as independent passes**, each scoped to the diff
since the last release (`git diff vLAST..HEAD`) plus the code it touches (for a **major**,
review whole affected subsystems, not just the diff). This maps directly onto the tooling:
one focused `/code-review high` per lens, or `/code-review ultra` / a `Workflow` fan-out with
one reviewer agent per lens in parallel, then triage the union. Runnable version:
[`/pre-release-review`](../tools/README.md).

Lenses 1–6 look **at the change**, and lens 9 at **what the change touches beyond the repo**.
Lenses 7–8 look **outward and inward** — at the tools we depend on, and at our own practices.
Those two are the compounding ones: skipping them is how a stack quietly accretes workarounds
and a knowledge base goes stale.

**Scale to the bump:** patch → a quick correctness + docs pass. Minor → all nine. Major →
all nine plus a **completeness critic** ("what subsystem/claim/lens did we *not* review?").

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
- **Walk the mode & flag matrix.** New behavior gets verified on the happy path its author had
  in mind — that path works; the ones *adjacent* to it are where the bug is. So enumerate every
  mode the feature can run in (http/https/both, headless/desktop, dev/prod) and every flag that
  can select or override it, and ask what the new code does in each. Two shapes recur:
  - **A default that is a lie in another mode.** A value that is only meaningful because the
    default path sets it — but the other path never does, and it keeps a stale default that is
    now *wrong* rather than merely unset.
  - **A new message or check placed before the input it depends on.** Argument parsing, config
    merging and validation have an order; code inserted "near the top" can read a flag that
    hasn't been parsed yet and confidently say the opposite of what the run then does.
- **Done when:** the changed behavior has been **driven end-to-end** (see the next section),
  not just unit-tested — and driven in **more than one mode** if it supports more than one.

— seen in: haltija (1.4.0: an https-only server kept `PORT`'s http default and advertised a
port it wasn't listening on; a new warning was emitted before `--port` was parsed, so
`hj --port N` told the user to use `--port`)

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
- **Run the suite and read the output** — reviewing coverage without running it is guessing.
- **Every failing or skipped test is in scope — never dismiss one as "pre-existing," "flaky,"
  or "not caused by this change."** A change easily slips out of context and causes a
  downstream failure that then gets waved away as someone else's. Fix it if easy; if not,
  flag it (failing test + suspected cause) and **still schedule the fix** in `TODO.md` — lower
  priority is fine, dropping it is not.
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
- **Breaking changes are justified, documented, and migratable.** If this release removes or
  changes public API, all four must hold: (1) the break **buys something a deprecation
  couldn't** — an *incidental* break, made because the old API was in the way of a refactor, is
  the kind consumers resent; (2) the **version** reflects it; (3) there is a **CHANGELOG entry
  naming exactly what broke** — *a release that removes public API with no CHANGELOG entry is a
  trap*; (4) there are **migration notes** (ecosystem convention: a `Migration.md` shipped in
  `docPaths`) telling a consumer precisely what to change, before → after. Prefer the
  deprecation path; if you break, say why. — seen in: tosijs (`Migration.md`), tosijs-ui (1.7
  dropped `<tosi-code>`'s pre-1.7 ACE props)
- The "point an agent at it and it works" test: `CLAUDE.md`/`AGENTS.md` current, gotchas
  written down, and `bun install` → `bun start` / `bun test` / `bun run build` succeed from a
  **fresh clone** (TLS certs, single lockfile).
- **Done when:** a new dev or agent could adopt the change from the docs alone.

### 7. Ecosystem & abstraction health — the tools we depend on, *and the ones that depend on us*

This lens runs in **two directions, and both halves are mandatory.** Agents reliably do the
outgoing half and skip the incoming half — **do not.** Run 7a and 7b as separate passes and
report both.

#### 7a. Outgoing — are we paying for someone else's missing seam?

Look up and out. Lens 6 asks "is the DX we **provide** good?" — this asks "is the DX we
**consume** good, and is this code quietly paying for it being bad?"

- **Is work happening in the wrong layer?** Boilerplate or workarounds that exist here only
  because an upstream tool (tosijs, tosijs-ui, tjs-lang, tosijs-schema, the site builder,
  haltija) lacks a seam. If several consumers each hand-roll the same thing, that is **one
  missing library affordance, not N local problems** — fix it upstream.
- **Nascent anti-patterns.** A clever workaround that's one copy-paste away from becoming
  convention; a pattern spreading because the right way is too hard; code fighting the
  observant model (reaching for a re-render because a binding was awkward to express).
- **Compensating complexity.** Defensive unwrapping, sanitizing inputs the upstream should
  have handled, indirection that exists to route around a limitation, a version pin that
  dodges a bug instead of fixing it.
- **Normalized friction.** Loop steps we've stopped noticing because we're used to them:
  manual regeneration, port collisions, cert setup, two lockfiles, a script renamed to dodge
  a builtin. Familiarity is not the same as fine.
- **Action — file, don't fix.** You do **not** go edit the upstream repo (see
  [`cross-project.md`](cross-project.md)). File a **GitHub issue on the upstream repo** —
  that's the channel — and mirror it in this repo's `UPSTREAM.md` with the issue URL. An
  `UPSTREAM.md` entry with no filed issue is a complaint nobody will ever read. Silently
  working around the gap is exactly the failure this half exists to catch.
- **Done when:** every workaround in the diff is either justified or **filed upstream as an issue**.

#### 7b. Incoming — what have our consumers filed against *us*?

**Enumerate, don't glance.** This half is not a footnote; it is half the lens.

```bash
gh issue list -R tonioloewald/<this-repo> --state open
```

- **Give every open issue a disposition.** For each one, say which: **fixed by this release**
  (→ close it naming the version, *and put it in the release notes*), **still open** (→ say so),
  or **stale** (→ close it). An issue this release silently closes can **reframe what the
  release is** — e.g. a CodeMirror migration that also happens to unblock a downstream port is
  not a CodeMirror migration, and the notes should say so.
- **Cross-check every workaround from 7a against the issue list.** *Is there already an issue
  for this?* **A test loosened, or complexity added, to route around a bug we filed against
  ourselves is the signature failure of this half** — 7a will flag the *shape* of it and not
  connect it to the open issue unless you deliberately do.
- **Done when:** every open incoming issue has a stated disposition, and every workaround found
  in 7a has been checked against the issue list.

— seen in: tosijs-ui 1.7 review (which found #10 was closed *by* the release, #5/#7 fixed long
ago and left open, and a loosened `title` assertion routing around our own open #6)

### 8. Practices & process self-review — are *we* still right?
The review reviews itself. Practices are living documents, and a release is when they get
tested against reality.

- Did this release **contradict, outdate, or vindicate** a documented practice? A practice
  that didn't match reality is a **bug in the knowledge base** — fix it (with attribution),
  don't route around it.
- What did we learn that **would have saved time if it had been written down**? Add it.
- Did the **process** hold? Did a lens miss something that bit us; is a lens dead weight; did
  the gate work? Adjust the lenses and criteria — including this list.
- Are this project's own `CLAUDE.md` / `AGENTS.md` still accurate after the change?
- **Done when:** the shared practices are updated, or explicitly confirmed still correct, and
  any process gap is filed.

### 9. Blast radius — what does this touch *outside* the repo?
Lenses 1–6 review the code. This one reviews the **footprint**: everything the change writes,
spawns, binds, or kills that outlives the process and is shared with software we don't own.
That state has no test suite, no code review, and no rollback — and it is where a tool stops
being wrong *in its own repo* and starts being wrong *on the user's machine*.

**Fast exit:** if the diff writes nothing outside the repo, spawns nothing, binds nothing, and
kills nothing, say so in one line and return no findings. Do not manufacture findings. On a
pure library change this lens is cheap and quiet, and that's correct.

Otherwise, enumerate the footprint and interrogate each item:

- **Global binaries & `PATH`** (`~/.local/bin`, `/usr/local/bin`, shell rc files). One binary,
  every project. If N versions of the tool can each install it, ask *which one wins* — "last
  process to boot" is a race, not a policy. Never clobber a symlink: it is a deliberate install
  and overwriting it reverts someone's tooling under them.
- **Home-directory & XDG state** (`~/.config/*`, `~/.cache/*`, app dotdirs, registries, lockfiles).
  Does it survive uninstall? Can a stale entry outlive the process that wrote it, and what
  reads it afterwards?
- **Other processes** — anything spawned, signalled, or killed. **Killing is a policy, not a
  fix: state the predicate.** "Older than me" is almost always the wrong one — it never
  terminates, and two peers on adjacent versions will kill each other forever. Key the rule on
  *what makes the other process harmful* (a version below the release that fixed the harm), so
  it self-terminates once the harmful population is gone. And when it can't act, it must
  **complain rather than fail silently** — an unfixed hazard the user doesn't know about is
  worse than a loud one.
- **Ports and sockets.** A well-known default port is shared state; squatting or reclaiming it
  affects whoever else wanted it.
- **THE TEST SUITE'S OWN FOOTPRINT.** Ask explicitly: *does running the tests write to any of
  the above?* A spawned process re-reads the real config path — an in-process `dir` option or
  DI seam does **not** contain it. This is the sharpest edge on this lens: it silently corrupts
  the developer's own environment, so it presents as "my tools got weird," never as a red test.
  Every path a test can write to must be redirectable by env var, and pointed at a temp dir.

Ask of each: **who else can this surprise, and can they undo it?** Prefer additive and
reversible; where you can't, be loud. A change that is correct in-repo and hostile on the
machine has not passed review.

- **Done when:** the footprint is enumerated, each item has an owner and a policy, and the test
  suite provably touches none of it.

— seen in: haltija (1.4.0 installs a shared `hj` into `~/.local/bin`, keeps a registry in
`~/.haltija/`, binds a well-known port, and kills legacy servers; its test suite was silently
registering spawned servers into the developer's *real* registry, where they out-ranked the
developer's own dev server and hijacked their CLI)

### Triage & gate
- Dedupe the union of findings and rank by severity.
- **Unresolved correctness (and security) findings block the release.** Efficiency / DRY / DX /
  coverage findings that are not regressions may be filed to `TODO.md` and scheduled — but say
  so explicitly; a silently-dropped finding reads as "reviewed and fine."
- **Route by lens — these findings do not all belong in the same place:**
  - **Lenses 1–6 and 9** → fix now, or file to this repo's `TODO.md`. (Lens 9 findings that
    touch the user's machine — a global binary, a kill policy — are correctness findings for
    triage purposes, not nits: they block.)
  - **Lens 7** → a **GitHub issue on the upstream repo** (the channel), mirrored in this repo's
    `UPSTREAM.md` with the issue URL. Never a direct edit to the upstream repo — see
    [`cross-project.md`](cross-project.md).
  - **Lens 8** → a change to `tosijs-coding-practices` (and grep the cross-cutting docs for
    parallel mentions — see `../CONTRIBUTING.md`).
- **Lenses 7 and 8 rarely block a release** — they compound instead. Treat "no findings" from
  either with suspicion: it usually means nobody looked.
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
