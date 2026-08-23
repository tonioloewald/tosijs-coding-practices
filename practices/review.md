# Code review

## Tooling

- **`/code-review`** (Claude Code) reviews the current diff at a chosen effort level. Use it
  before committing anything nontrivial. `/code-review ultra` runs a deeper multi-agent
  cloud review of the branch or a PR — it is user-triggered and billed.
- **`/security-review`** for changes with a security surface (auth, capability VMs, network
  sync, untrusted input, deployment config).
- **CI is partial, and you must know exactly which lanes it covers.** This file used to say
  there was _"no CI — no `.github/` workflows anywhere in the ecosystem"_. That is false
  (tosijs-ui has `ci.yml`; tosijs has one too — a `unit` lane plus a Playwright `e2e` lane, `main` only; haltija has **four** workflows — unit-tests, test-qa, e2e, docs-drift;
  tjs-lang added `ci.yml` in 0.13.0; see `00-stack.md`), and the falsehood
  was load-bearing: a reader who believes there is no CI never asks **"which lanes does CI
  actually run?"** — which is the exact question that catches a rotted lane. tosijs-ui's CI runs
  the unit + e2e lanes and **not** the haltija doc-test lane, and that lane sat red for a month.
  It is also false that `bun run build` runs tests — in tosijs-ui it does not (see
  `releasing.md`). **Enumerate the lanes, check which are gated, and run the ungated ones by
  hand.** An ungated lane always rots.

  Two gates are not one gate twice. tjs-lang runs `test:fast` in Actions (no LLM, no
  benchmarks, no audit) and the FULL suite in `.githooks/pre-push`, but only on tag pushes —
  a deliberate split, and until 0.13.0 **nothing anywhere enumerated both**, which is the
  same gap in a newer disguise. If a project has more than one gate, say what each covers in
  the same place, or a reader will assume the stricter one runs everywhere.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, kith-email, react-tosijs

## Comprehensive pre-release review (minor & major)

Before any **minor or major** version bump, run a structured multi-lens review — not one
blended pass. Blending dilutes every lens; a reviewer told to "check everything" checks
nothing deeply. Run **lens 0 once** to establish what the project _is_, then the **nine lenses below as independent passes**, each scoped to the diff
since the last release (`git diff vLAST..HEAD`) plus the code it touches (for a **major**,
review whole affected subsystems, not just the diff).

**Security-subsystem escalation (applies to _minor_ bumps too).** When a release's diff
touches a security-critical subsystem — a sandbox/VM, capability or tool boundary, RBAC,
a URL/SSRF guard, a regex/ReDoS or other untrusted-input path — escalate **that subsystem**
to whole-subsystem review depth regardless of bump size. Security holes are latent: they sit
in already-shipped code, outside the diff, and diff-scoping structurally misses them. (Real
case: a minor bump's review found five VM-security blockers, four of them latent in the
_prior_ shipped release, not in the diff — caught only because the reviewer went to major
depth anyway. And a security release's own new guard shipped with a hole in exactly the input
type its one test didn't cover.) **The same escalation applies to verification _tiering_, not only to review depth.** A finding whose
subject is an **isolation, teardown, capability, or process-lifetime guarantee** gets adversarially
verified regardless of its reported severity. These share the property that makes tiering unsafe:
silent failure, a binary guarantee, and a cosmetic-looking symptom whose cause is not cosmetic —
"a stray tab on port 8700" was in fact a client connection to another project's server. Evidence:
three unverified single-reporter findings in one haltija cycle were all real (an EPERM treated as
process death, causing a mid-run self-kill; a `|| 8701` fallback leaking a private instance onto the
shared port; a silently-ignored empty config that disabled the routing it configured) — and the
leak's fix was **incomplete**, the same leak still live one layer up, found by the next review
rather than by the tiering. Record honestly what this argument is _not_: "0 of 3 refuted" is
statistically empty (P ≈ 0.70 at an 11% base rate). The real content is that the existing
mitigation's trigger is reviewer self-doubt, which an under-rated finding by construction does not
produce. — seen in: haltija

Corollary: extend lens 5's "never dismiss a finding as
pre-existing" rule — scoped to tests today — to security-critical subsystem code: a latent
vuln the diff happens to sit next to is in scope, not "not mine." **Scope that diff to source** —
`git diff vLAST..HEAD -- . ':(exclude)dist' ':(exclude)docs' ':(exclude)*.map'` — for every
lens _except lens 4_. A release that re-bundles a dependency can churn thousands of lines of
generated `dist/`/`docs/`, and feeding that bundle to nine lenses is pure cost: it is not a
change any of them review. Only **lens 4** reads the generated tree, and only to assert it
regenerates clean. This maps directly onto the tooling:
one focused `/code-review high` per lens, or `/code-review ultra` / a `Workflow` fan-out with
one reviewer agent per lens in parallel, then triage the union. Runnable version:
[`/pre-release-review`](../tools/README.md).

Lenses 1–6 look **at the change**, and lens 9 at **what the change touches beyond the repo**.
Lenses 7–8 look **outward and inward** — at the tools we depend on, and at our own practices.
Those two are the compounding ones: skipping them is how a stack quietly accretes workarounds
and a knowledge base goes stale.

**Scale to the bump:** patch → a quick correctness + docs pass. Minor → all nine. Major →
all nine plus a **completeness critic** ("what subsystem/claim/lens did we _not_ review?").

**Verify where the verdict changes the decision, not everywhere.** Adversarial verification is
the expensive part — in measured runs of the automated gate it was ~70% of total cost — and
spending it uniformly is waste. A finding's truth only matters when it _gates the release_: a
**blocker**'s truth decides whether you tag, so a false blocker costs a whole wasted fix cycle
— verify it. A **minor/nit** is a follow-up whether or not it's real, so verifying it changes
nothing. Measured refute rates make the point sharper still: refutation is _lowest_ on blockers
(~3%) and _highest_ on minor/nit (~11%) — i.e. verification is least necessary exactly where
it's most often spent. So: **always verify blockers; verify majors before a tag but skip them
while iterating; never adversarially verify minor/nit** — ship those reported-but-unverified and
clearly marked. Do **not** economize by cutting lenses instead: lenses are cheap and are where
the value is (blast-radius alone caught multiple release-blocking bugs). The knob is verification
depth, not lens count. — seen in: haltija (1.4.0 release gate)

**Key on the severity you'd _act_ on, not the label the finder typed.** The tiers above proxy
the real test — "does this finding's truth change the release decision?" — with the reported
severity, and that proxy has one blind spot: severity is assigned _before_ verification, in the
one direction the economics don't cover. Over-rating is self-correcting (a false major is cheap
to wave off, and finders rarely under-rate — the 3%-vs-11% asymmetry is exactly that). But a real
blocker mislabeled "minor" then never gets verified and sits in the follow-up pile forever, wrong
_and_ buried. So treat **"I'm not sure this minor isn't actually a blocker" as itself a trigger to
verify** — uncertainty about severity is a decision-changing question, which is the header's own
test. Verifying to _find out_ how bad something is costs the same as verifying to confirm it.
A second trigger of the same kind: **a lead that, if true, falsifies a guarantee stated in this
release's own docs/CHANGELOG is release-scoped regardless of its severity tier** — verify it or
reword the guarantee before tagging. Proof case: tosijs-schema v1.5.0's pattern-throw lead
shipped parked "(unverified major)" while falsifying the release's documented `true | Error`
contract; triage promoted it to a confirmed blocker. — seen in: tosijs-schema (v1.5.0 review)

**When a gate/validator/boundary yields a fail-open finding, enumerate the whole class before
remediating** — walk every keyword, default, value shape, and branch of the same enforcement
path and ask "where else does this exact mechanism fail open?". Successive review waves each
finding one more member of the same class is the signature of instance-fixing: tosijs-schema's
v1.5.0 review took seven remediation waves (additionalProperties → prototype keys in data →
boolean schemas/typos → typeless nodes/value shapes → anyOf/const sibling deadness + filter
prototype pollution → enum-vs-null → prototype-named ROOT keys in the gate's own map) because
each wave fixed found instances instead of sweeping the class. The sweep costs one sitting; the
waves cost seven reviews. The class includes consciously
"documented" divergences: a spec behavior a gate's validator diverges from is fail-open no
matter how deliberately the divergence was noted (tosijs-schema's enum-vs-null nuance was
observed in wave 5, waved off as documented `.optional` semantics, and confirmed a gate
bypass in wave 7). At a gate, enforce or refuse at construction — never merely document.
— seen in: tosijs-schema (v1.5.0 review)

**The "clearly marked" on shipped-unverified findings is load-bearing, not a nicety — it is what
makes the economics work.** At an ~11% refute rate, roughly one in nine shipped nits is wrong; if
they don't read as _conspicuously unvetted_, the reader stops trusting the report and re-verifies
everything by hand, which spends exactly the cost the tiering just saved. Mark every unverified
finding as such at the point it appears (not only in a preamble), so a false one reads as "an
unchecked lead", never as "a vetted defect". (This is _adversarial_ verification — spawning
skeptics — that we're skipping; inline sanity-reading a finding as you triage it is free and still
expected. "Unverified" means "no skeptic ran", not "nobody looked.")

**The skeptic reads the artifact, not the author's narrative.** Verification is only
independent if the verdict is derived from the diff and the code — never from the implementer's
explanation, which anchors the reviewer into the very blind spot that produced the bug. The
harness already embodies this (verifiers are told to refute by inspecting the actual code);
preserve it when reviewing by hand — read the change before the PR description — and when
pairing an implementer agent with reviewer agents, hand the reviewers the diff and the standing
instruction "assume the code is wrong", nothing else. Corroborated at scale by bun's Zig→Rust
port, which ran 2+ diff-only adversarial reviewers per implementer across 1,448 files and
credits the pattern with catching a use-after-free and two eager-evaluation bugs the
implementers' framing had rationalized. — seen in: the pre-release-review harness; external:
bun.com/blog/bun-in-rust

**A refuted finding is not waste — it's a discoverability signal.** Feedback offered in good
faith is valuable even when it's literally wrong. When a careful reviewer (or user) claims "X is
broken" / "you can't do Y" and the claim is false, the usual reason they believed it is that the
truth is **undiscoverable** — a docs, naming, or surfacing gap. Rejecting the report because,
strictly speaking, it's wrong is worse than not reviewing at all: you've paid for the signal and
thrown it away. So for every refuted finding ask _"what would make a competent reader believe
this?"_ and file the second-order finding (usually a minor docs/DX fix) if there is one. Drop it
only when the reviewer simply erred and no gap exists — judgement, not a quota.

Each lens returns **ranked findings with a concrete failure scenario**; a finding without a
repro is a question, not a defect. Verify per the rule above before acting on or filing anything.
(That bar applies _inside the review harness_, where verification is cheap and structured — it is
**not** a certainty bar for telling another repo about a problem. For that, see
[`cross-project.md`](cross-project.md) "File even when you might be wrong": state your
uncertainty in the issue and file anyway.)

### 0. What KIND of thing is this? — the project's standing obligations

Ask first, because the answer tunes every lens that follows. Not "what changed?" (that is
lens 9, blast radius) but **"what is this project, and what does being that kind of thing
oblige us to?"** The answer is stable across releases; record it once per project and revisit
only when the project's nature changes.

The point is that some categories carry obligations the generic lenses never think to check:

- **Dev tooling and build systems** — they _see other projects_. They read source, configs
  and often secrets, and run with full developer privileges. A bug is therefore not confined
  to this repo: it is a supply-chain vector, and an insecure build tool exposes every project
  it touches. Review its handling of paths, globs, spawned processes and anything it reads
  from a workspace it does not own. — e.g. haltija, tosijs-ui's build system
- **A language, compiler or transpiler** — _everything written in it inherits its bugs_. A
  codegen defect is a defect in every consumer's shipped output, arriving without them
  changing anything. Its **semantics are a contract**: quietly changing what an operator
  means rewrites programs that already work. And it is usually self-applying, so a bug can
  hide behind itself. — e.g. tjs-lang
- **A VM, sandbox or plugin host** — adversarial input is the _normal_ case, not an edge
  case, so "would a hostile caller…" belongs in every pass, not just the security one.
- **A published library** — API surface is a promise; a breaking change multiplies by the
  number of consumers, and the ones who notice last are the ones who trusted you most.
- **A hosted app or service** — data at rest, authentication, and anything that outlives a
  single run.

A project can be several at once, and the obligations compose rather than override. tjs-lang
is a language **and** a sandbox VM **and** a published library — three sets of standing
obligations, which is why its reviews need more than the generic nine.

> Write the answer down in the project's own docs. A standing obligation that lives only in
> a reviewer's head is rediscovered, at best, once per reviewer.

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
  in mind — that path works; the ones _adjacent_ to it are where the bug is. So enumerate every
  mode the feature can run in (http/https/both, headless/desktop, dev/prod) and every flag that
  can select or override it, and ask what the new code does in each. Two shapes recur:
  - **A default that is a lie in another mode.** A value that is only meaningful because the
    default path sets it — but the other path never does, and it keeps a stale default that is
    now _wrong_ rather than merely unset.
  - **A new message or check placed before the input it depends on.** Argument parsing, config
    merging and validation have an order; code inserted "near the top" can read a flag that
    hasn't been parsed yet and confidently say the opposite of what the run then does.
- **The instrument must not lie.** For any tool that does remote control, inspection, or
  measurement, the failure that costs the user the most is not an error or a timeout — it's a
  **plausible-but-wrong answer** returned with the same confidence as a right one. A backgrounded
  browser tab _answers_ `querySelectorAll(...).length` with `0` (rAF/timers frozen), which reads
  as "broken" when it means "asleep." A command routed by _focus_ looks identical to one routed by
  _your intent_. When a result can be right-looking and wrong, it must carry the caveat that makes
  it interpretable — distinguish "not mounted yet" from "broken," "focus chose this" from "you
  chose this" — and prefer an **attached warning over a bare value**. Two discipline points that
  keep the caveat honest: key it on a signal the subject actually reports (a tab's own
  `visibilitychange`, not a staleness proxy that also fires for an idle-but-healthy subject — a
  false caveat is its own lie); and don't _guess_ the right answer to avoid warning (ranking tabs
  by "origin looks like the cwd project" would pick confidently and wrongly — a warning you can
  justify beats a correction you can't).
  (The consumer-side counterpart is [`model-priors.md`](model-priors.md) #9: an honest caveat is
  worth nothing if a reader who distrusts the tool discards it — which is what happens when a
  component has been annoying lately, and is how a correct diagnosis gets read as noise.)
- **Fixing an instrument invalidates the results you got with the broken one.** This is the
  corollary of the rule above and it is the expensive half. When a diagnostic gains a signal it
  previously lacked — a console that finally reports uncaught exceptions, a check that finally
  measures contrast, a map that finally shows real wiring — every prior "that looked fine" was
  reached with the broken version and is now unverified. Nothing new broke; you just stopped being
  blind to it. So **budget for the backlog the fix uncovers, and re-run the checks that previously
  passed** rather than treating the green history as evidence. The upside is the same size: an
  improvement to a shared instrument propagates a wave of findings to every consumer at once — which
  is lens 9's blast radius pointing the _good_ way, and the strongest argument for investing in
  tools the whole stack looks through.
- **Done when:** the changed behavior has been **driven end-to-end** (see the next section),
  not just unit-tested — and driven in **more than one mode** if it supports more than one.

— seen in: haltija (1.4.0: an https-only server kept `PORT`'s http default and advertised a
port it wasn't listening on; a new warning was emitted before `--port` was parsed, so
`hj --port N` told the user to use `--port`. 1.5.0: a hidden tab and a focus-chosen tab each
returned a confident wrong answer until the result was made to carry a warning — #2/#3)

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
- Over-abstraction is also a smell — DRY, not premature generalization (the design-time
  version of this rule is [cross-project.md "Adopters before abstraction"](cross-project.md#adopters-before-abstraction)).
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
- **Security-relevant fixes name the affected shipped versions** (releasing.md step 2) — "was
  fail-open" without "in ≤ X.Y.Z" leaves consumers unable to tell if they're exposed. — seen
  in: tosijs-schema (v1.5.0 review passed this checklist while missing exactly that).
- Deprecations warn once and name their replacement.
- **Discoverability, not just accuracy.** For every new public surface — endpoint, CLI command, env
  var, config file, flag, warning string — name the consumer-facing doc it appears in, and check
  that the error or warning a user hits _when they have the problem it solves_ actually names it.
  Regenerating clean proves the docs match the code; it proves nothing about whether the feature
  exists to a reader. Evidence: at haltija v1.11.3 the headline feature `.haltija.json` /
  `HALTIJA_ORIGINS` appeared in **no** consumer-facing surface (absent from README, DOCS.md,
  llms.txt, API.md, CLAUDE.md and both `--help`s; `plugins/` was not in `files`, so the agent skill
  was unreachable on npm), and the warning that fires on exactly that problem offered only
  `--window <id>`. The two diagnostics the skill names as the first response to "wrong page" both
  `return`ed before reaching the code that would have mentioned it. 24 `HALTIJA_*` vars existed;
  CLAUDE.md documented 11. The bullet above ("README / CLAUDE.md / AGENTS.md reflect the change")
  would have passed here — it is too narrow, and its Done-when is accuracy-only. Copyable mechanism:
  a CONCEPTS table asserting each named concept appears in each consumer-facing doc
  (haltija's `src/docs-coverage.test.ts`). — seen in: haltija (at least the fifth recurrence)
- **Done when:** docs regenerate clean, the public-API surface is documented, AND every new surface
  is reachable from a doc a consumer actually reads.

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
- **Done when:** changed lines are covered, criticals hit target, and the suite is green — verified
  by RUNNING it. Do not infer this from a clean build: whether `bun run build` runs the tests is
  per-repo (true in tosijs, false in tosijs-ui and haltija — see `testing.md`), and this Done-when
  previously asserted it as universal, in the one place a reviewer would rely on it.

### 6. Developer experience (DX)

- API ergonomics: emitted types are accurate (no required→optional `.d.ts` drift), inference is
  good, and no re-introduced footgun (`on<Event>`, `value`-as-attribute, boolean-defaulting-true).
- Error messages are actionable; assignment-strictness / monadic errors used where apt.
- **Output is signal, not narration — flag log/console spam.** Breadcrumb / happy-path logs
  (`entering handler`, `processing item`, `reached here`), leftover debug output, and repeated or
  unaddressed deprecation / retry warnings in the diff. The test for a line: _does it change what
  a reader would DO?_ If not, it's spam — cut it (keep receipts for destructive/rare actions).
  Worth raising even though it reads as cosmetic: **spam is almost always a symptom** — a debug
  log left from a bug hunt, a deprecation nobody fixed, retry noise from a flaky dependency — so
  complaining about it in review drives the _underlying cause_ to be fixed. And output is the real
  UI you debug through: noise trains the team to stop reading it, so the one real line scrolls past
  unseen (the cry-wolf failure, worn in daily). — seen in: legacy-codebase triage (spam reduction
  as the first move, because it doubles as recon)
- Conventions honored: `handle<Event>` callbacks; deprecations keep old names working + warn once.
- **Breaking changes are justified, documented, and migratable.** If this release removes or
  changes public API, all four must hold: (1) the break **buys something a deprecation
  couldn't** — an _incidental_ break, made because the old API was in the way of a refactor, is
  the kind consumers resent; (2) the **version** reflects it; (3) there is a **CHANGELOG entry
  naming exactly what broke** — _a release that removes public API with no CHANGELOG entry is a
  trap_; (4) there are **migration notes** telling a consumer precisely what to change,
  before → after, **and reachable from the artifact they installed** — a `Migration.md` in
  `docPaths` for the sites, the tarball for a library, wherever `--help` points for a CLI.
  Test it as a consumer with only what they installed: no repo checkout, no site visit.
  Prefer the deprecation path; if you break, say why. See
  [releasing.md](releasing.md#breaking-changes-justify-document-migrate) for the full form, including the check that
  relative links resolve **in the packed artifact** rather than in the repo.
  — seen in: tosijs (`Migration.md`), tosijs-ui (1.7 dropped `<tosi-code>`'s pre-1.7 ACE
  props), tjs-lang (shipped an index with 29 of 43 links 404 inside the tarball)
- **A deprecation alias is the wrong answer when the old name was a knob whose setting became
  unconditional.** Keeping it working then means it silently does nothing — worse than
  removing it, because it carries a compatibility promise it cannot keep. Make it an error
  that names the replacement, and add a guard test that nothing keeps recommending it. See
  [code-quality.md](code-quality.md#tombstones). — seen in: tjs-lang (nine mode directives)
- The "point an agent at it and it works" test: `CLAUDE.md`/`AGENTS.md` current, gotchas
  written down, and `bun install` → `bun start` / `bun test` / `bun run build` succeed from a
  **fresh clone** (TLS certs, single lockfile).
- **Done when:** a new dev or agent could adopt the change from the docs alone.

### 7. Ecosystem & abstraction health — the tools we depend on, _and the ones that depend on us_

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
- **Action — file, don't fix.** You do **not** go edit the owning repo (see
  [`cross-project.md`](cross-project.md)). File a **GitHub issue on the owning repo** —
  that's the channel — and mirror it in this repo's `UPSTREAM.md` with the issue URL. An
  `UPSTREAM.md` entry with no filed issue is a complaint nobody will ever read. Silently
  working around the gap is exactly the failure this half exists to catch.
- **Done when:** every workaround in the diff is either justified or **filed upstream as an issue**.

#### 7b. Incoming — what have our consumers filed against _us_?

**Enumerate, don't glance.** This half is not a footnote; it is half the lens.

```bash
gh issue list -R tonioloewald/<this-repo> --state open
```

- **Give every open issue a disposition.** For each one, say which: **fixed by this release**
  (→ close it naming the version, _and put it in the release notes_), **still open** (→ say so),
  or **stale** (→ close it). An issue this release silently closes can **reframe what the
  release is** — e.g. a CodeMirror migration that also happens to unblock a downstream port is
  not a CodeMirror migration, and the notes should say so.
- **Cross-check every workaround from 7a against the issue list.** _Is there already an issue
  for this?_ **A test loosened, or complexity added, to route around a bug we filed against
  ourselves is the signature failure of this half** — 7a will flag the _shape_ of it and not
  connect it to the open issue unless you deliberately do.
- **Glance at the consumer footprint on a breaking or tightening change.** When the release
  breaks something (a validation tightening, a removed/renamed API), the "who breaks / how far
  does this propagate" reasoning must be grounded in the *actual* downstream base, not assumed.
  Look at npm downloads and GitHub dependents so the blast-radius claim is quantitative:

  ```bash
  curl -s https://api.npmjs.org/downloads/point/last-month/<pkg>   # download trend
  gh api "/repos/tonioloewald/<repo>" --jq '.stargazers_count'      # + the repo's "Used by" page
  ```

  A policy of breaking-toward-correctness in minors often rests on "no significant external
  consumers" (see [`releasing.md`](releasing.md) "Versioning philosophy"). This is where that
  assumption gets *validated* rather than restated — a footprint that has quietly grown flips the
  calculus, and you want to notice before a break bites someone, not after. — seen in:
  tosijs-schema (breaking-in-a-minor twice; the assumption held, but nothing was checking it).
- **Done when:** every open incoming issue has a stated disposition, every workaround found
  in 7a has been checked against the issue list, and a breaking release has looked at who
  actually consumes the package.

— seen in: tosijs-ui 1.7 review (which found #10 was closed _by_ the release, #5/#7 fixed long
ago and left open, and a loosened `title` assertion routing around our own open #6)

### 8. Practices & process self-review — are _we_ still right?

The review reviews itself. Practices are living documents, and a release is when they get
tested against reality.

- Did this release **contradict, outdate, or vindicate** a documented practice? A practice
  that didn't match reality is a **bug in the knowledge base** — fix it (with attribution),
  don't route around it.
- What did we learn that **would have saved time if it had been written down**? Add it.
- Did the **process** hold? Did a lens miss something that bit us; is a lens dead weight; did
  the gate work? Adjust the lenses and criteria — including this list.
- Are this project's own `CLAUDE.md` / `AGENTS.md` still accurate after the change?
- **Run the read direction too.** The bullets above ask whether this release outdated the
  practices; also ask whether **the practices moved under this project**:
  `git -C <practices-checkout> log --oneline --since=<last release date>` (pull the checkout
  first), and disposition each change that touches how this project works — *adopted*,
  *already compliant*, or *deliberately diverging* (→ record under "Known divergences" in
  `00-stack.md`). The last release date is a marker that already exists, so staleness is
  checkable without new bookkeeping — the commit-range rule below, pointed the other way.
- **Done when:** the shared practices are updated, or explicitly confirmed still correct, and
  any process gap is filed — **and the write-back NAMES THE COMMIT RANGE it covers**
  (`<base>..<sha>`), where `<sha>` is the reviewed repo's HEAD at the time of writing. If
  anything lands after it, the write-back is stale: re-run lens 8 or amend it, and say
  which. Without the range, staleness is something a person has to *notice* rather than
  something that can be *checked* — and it is not noticed. Observed twice in one cycle:
  a write-back landed at 11:46 and the repo landed "clears both blockers from the re-review"
  at 14:14, while `TODO.md` carried a checked `[x] Lens-8 write-back complete` describing a
  state that had stopped being true two and a half hours earlier. The first review of that
  cycle proposed exactly this amendment; the round that was supposed to apply it added a
  different paragraph instead, and the failure recurred within 48 hours. — seen in: tjs-lang
  (0.13.0)
  The write-back must postdate the LAST blocker-remediation wave
  (each wave can supersede earlier lessons — tosijs-schema v1.5.0's wave-2 denylist lesson was
  itself the wave-4 defect). And check push state: if the practices checkout is ahead of
  origin (pushes being human-gated), name the pending push on the release checklist and report
  it as part of this lens — the hosted KB is what every AGENTS.md cites as authority. — seen
  in: tosijs-schema (v1.5.0 review, KB 4 commits ahead at wave 5).

### 9. Blast radius — what does this change PROPAGATE outside the repo, cost _or_ benefit?

Lenses 1–6 review the code. This one reviews the **footprint**: everything the change writes,
spawns, binds, or kills that outlives the process and is shared with software we don't own.
That state has no test suite, no code review, and no rollback — and it is where a tool stops
being wrong _in its own repo_ and starts being wrong _on the user's machine_.

**Blast radius has a sign, and the amplitude multiplies whichever sign it has.** A change with
wide reach is not automatically bad — reach _is_ leverage. A bug in a widely-used library is
catastrophic for the exact same reason an improvement in it is enormously valuable: the
amplitude is large either way. So this lens runs in **two directions** (like lens 7):

- **Positive blast radius — harm that propagates.** The default worry, and the rest of this
  lens: state mutated outside the repo, processes touched, the machine changed. Interrogate it
  with the checklist below.
- **Negative blast radius — benefit that propagates.** _This is what a library is for:_ do a
  thing well in one place and every consumer gets it for free on the next update. Ask whether
  the change **captured** that leverage or **leaked** it. A local fix to a general problem is a
  leak — the next consumer re-hits it. **Duplication is a leak too, and worse than untidy: it
  severs the propagation path.** When the same logic lives in two places, a fix reaches only
  one; if the _tested_ copy is the one that doesn't ship, improvements propagate to _nobody_.
  That is the real cost DRY (lens 3) is guarding — not repetition, but the loss of the very
  propagation that justifies having a shared thing. Also weigh **propagation cost**: a benefit
  consumers get by merely updating is true negative blast radius; one that demands every
  consumer change their code (a breaking change, a migration) is leverage with friction — ask
  whether it could have been delivered without the friction.

— seen in: haltija (1.4.0 fixed "ask, don't infer" once, in extracted tested modules → correct
everywhere; but the cwd-routing rule duplicated into `bin/hj.mjs` is a live leak — the tested
copy in `src/sessions.ts` ships to no one)

**A tool you RUN can heal what it touches — negative blast radius you GENERATE, not just
propagate.** A library's negative blast radius is passive: fix it once, consumers get it on
update. A build / dev-server / review tool has an active form, and it is the higher aspiration:
every run _encounters_ the rest of the stack — the bundler, the framework, the machine, other
projects' processes — and each encounter can leave that thing better than it found it. **The goal
is that using the tool makes the whole system less fragile.** Two moves turn an encounter into
that:

- **Surface and route; don't absorb.** When the tool hits a defect in something it doesn't own,
  the reflex is a local workaround — which buries the signal and guarantees the next consumer
  re-hits it. Instead file it upstream and keep the workaround _until the fix ships_, then delete
  it. A worked-around dependency bug is a leak; a filed-and-fixed one is a repair that reaches
  everyone.
- **Feed the lesson back into the shared guard.** When a build or review catches a bug, encode
  the _class_ of it where the tool will re-apply it automatically — a lens prompt, a preflight
  check, a KB entry — so the next run anywhere catches it without anyone remembering to look. A
  one-off catch helps one release; a hardened guard helps every release after, in every project.

— seen in: tosijs-ui 1.7 — running the doc-site build surfaced the `Bun.build` native-arena leak
(oven-sh/bun#34053, filed, fix in flight); adopting the components surfaced the `parts`-proxy
poisoning (tosijs#13 → fixed in 1.6.9, so the bug is now impossible for _every_ tosijs component,
and both our hand-rolls were deleted); and the review that caught `killStrayServer` SIGKILLing
connected clients fed that exact port-to-pid trap into the pre-release-review tool's own
blast-radius lens — so the next review of any project catches it by construction.

**Machine scope is not automatically a smell — and this lens is not a campaign to eliminate it.**
Some problems are _intrinsically_ machine-scoped: "which version of this shared CLI does every
shell on this box run?" cannot be answered by a per-project fix, and a tool that refuses to look
outside its own directory simply leaves that problem unsolved. Acting at machine scope is then a
**feature**, and scoping it down to look tidy is the actual bug. A build that checks the
machine's health rather than only its own is doing more, not overreaching.

So don't ask _"does this touch global state?"_ — ask **"is this done right?"** Done right means:

1. **Scoped to real harm.** Act only on what is actually causing the problem, identified
   positively — never "everything that matches," never "everything older than me."
2. **Ask before you take.** If the thing you want to stop can be _asked_ to stop, ask it. Prefer
   a request over a signal, a version query over a byte-compare. Every place we _inferred_
   (a pid from a port, a version from file size) turned out to be a bug; every place we _asked_
   was correct by construction.
3. **Self-terminating.** Key the rule on the condition that makes something harmful, so it stops
   firing once that condition is gone. A rule keyed on "older than me" never terminates.
4. **Never clobber a deliberate choice.** A symlink, a pinned version, a hand-edited config: a
   human put that there on purpose.
5. **Reversible, with an opt-out** that is documented where the _affected_ person will see it.
6. **Accountable — the one people skip.** Leave a receipt: an append-only log of every
   machine-scope action, with timestamp, version, and **the directory of the project that
   triggered it**, and announce on **stderr** (harnesses swallow stdout). This matters most when
   your tool is a **transitive dependency**: someone runs _another_ project's test script, that
   spawns you, and you touch their machine — and they have never heard of you, never read your
   README, and never ran your `--help`. There must always be an answer to _"what did this thing
   do to my machine, and which project caused it?"_ Unaccountable global action is the thing to
   forbid; global action is not.

— seen in: haltija (1.4.0 installs a shared `hj` and stops other haltija servers, both machine-scope
by design; `src/machine-log.ts` is the receipt)

**Fast exit:** if the diff writes nothing outside the repo, spawns nothing, binds nothing, kills
nothing, and **deletes nothing**, say so in one line and return no findings. Do not manufacture findings. On a
pure library change this lens is cheap and quiet, and that's correct.

Otherwise, enumerate the footprint and interrogate each item:

- **Global binaries & `PATH`** (`~/.local/bin`, `/usr/local/bin`, shell rc files). One binary,
  every project. If N versions of the tool can each install it, ask _which one wins_ — "last
  process to boot" is a race, not a policy. Never clobber a symlink: it is a deliberate install
  and overwriting it reverts someone's tooling under them.
- **Home-directory & XDG state** (`~/.config/*`, `~/.cache/*`, app dotdirs, registries, lockfiles).
  Does it survive uninstall? Can a stale entry outlive the process that wrote it, and what
  reads it afterwards?
- **Deletion & retention — files the tool removes, not just the ones it writes.** Ask of any
  pruning, expiry, cache-eviction or cleanup path exactly what you ask of killing a process:
  **state the predicate, and does it self-terminate?** _Whose_ files match it, and is the answer
  still right when two versions of the tool, or two projects, share the directory?
  `tmpdir()` reads as "safe, ephemeral" and so lands on nobody's list — but a tool that hands
  those paths back to a user has made them **deliverables**, and a retention policy is then a
  promise about someone else's data. A retention rule is authored and reviewed as a write-path
  nicety, which is why the question never gets asked.
  Watch specifically for: production prune defaults reachable from the **test suite**; a cap
  (`keep: N`) that is a _combined_ total across every instance on the box; an upgrade that
  relocates a directory and prunes the new one while orphaning the old.

— seen in: haltija 1.12.0 — `bun test src/` ran `pruneArtifacts` with production defaults against
the developer's real `<tmpdir>/haltija-screenshots` and deleted their captures older than 24h. The
existing test-suite guidance ("point it at a temp dir") was **already satisfied** by the state that
destroyed the data: the suite's own temp isolation didn't cover a path computed inline in
production code. The reviewer who found it declined to run the suite at all — the correct response
to a test that destroys data, and precisely the wrong position to put a reviewer in.
- **Other processes** — anything spawned, signalled, or killed. **Killing is a policy, not a
  fix: state the predicate.** "Older than me" is almost always the wrong one — it never
  terminates, and two peers on adjacent versions will kill each other forever. Key the rule on
  _what makes the other process harmful_ (a version below the release that fixed the harm), so
  it self-terminates once the harmful population is gone. And when it can't act, it must
  **complain rather than fail silently** — an unfixed hazard the user doesn't know about is
  worse than a loud one.
- **Ports and sockets.** A well-known default port is shared state; squatting or reclaiming it
  affects whoever else wanted it.
- **THE TEST SUITE'S OWN FOOTPRINT.** Ask explicitly: _does running the tests write to any of
  the above?_ A spawned process re-reads the real config path — an in-process `dir` option or
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
registering spawned servers into the developer's _real_ registry, where they out-ranked the
developer's own dev server and hijacked their CLI)

### Cross-cutting checks — run alongside the nine

Not lenses in their own right so much as questions each lens should ask. All four were
derived from defects that shipped in a real repo, not from a checklist.
— seen in: tjs-lang

**"Where else?" (sibling sites).** The single highest-yield check. A fix lands in one copy
and its structural twin keeps the bug — six instances in one day in tjs-lang, including a
capability membrane where the object branch was fixed in the morning and the array branch
was still executing accessors that afternoon.

> For every behavioural fix in the diff, enumerate the other sites that do the same _kind_
> of thing and say explicitly whether each was checked. "Fixed in X" is not an answer;
> "fixed in X, and Y/Z don't have this shape because…" is.

**Comment-vs-code.** Prose doesn't execute. A validator commented _"matches declarations at
statement level (not inside strings/comments)"_ did no such thing — the claim was in the
comment, not the code, and a keyword inside a template literal made a legal file
unbuildable.

> Find comments asserting a property — "not inside", "always", "never", "only" — and check
> the code actually has it. A false comment is worse than none: it stops the next reader
> from looking.

**Generated-artifact freshness.** Where build outputs are _committed_, a source fix doesn't
reach users until they're regenerated — and nothing fails meanwhile. A docs bundle taught
nine removed language features in a live playground for days after the source was rewritten.

> For every committed generated artifact, confirm it was regenerated if its sources changed
> in this diff — **and that the sources it bundles were themselves reviewed.** Freshness is
> not correctness: a bundle can be perfectly up to date with a stale input.

**That second clause was added because the first one passed and the bug shipped anyway.**
In the tjs-lang 0.13.0 review, `demo/docs.json` _was_ regenerated and _was_ current with its
sources — and it was still serving a section headed "Death to Semicolons (`TjsStandard`)" in
the live playground, for a directive that had become a hard error. The bundler had faithfully
picked up `PLAN.md`, which nobody had reviewed because it wasn't in the diff.

The general shape: **a freshness check verifies a relationship between two artifacts, and
both can be wrong together.** When the generated thing aggregates content (a docs bundle, a
site index, an llms.txt), enumerate what it aggregates and spot-check the _content_, not just
the timestamp.

Three more from the same review, all in committed artifacts, all silent because nothing
type-checks data and nothing runs a grammar:

- Generated TextMate grammars that **could never match anything** — `\\\\b` in a template
  literal produces a literal backslash. Every rule in both grammars was inert since the day
  they were written. The generator's tests checked the generator, not the grammar. **Drive
  the artifact against the thing it describes**: `new RegExp(rule.match).test(realSource)`.
- A grammar regenerated on every build and **referenced by nothing** — no language
  contribution, no file association. Freshness is meaningless for an artifact nothing loads.
  Ask what consumes it.
- A keyword model derived by subtracting one hand-maintained list from another, encoding the
  **wrong language's** restrictions: 41 of 42 tokens it painted red were legal. Two lists
  that must agree, and no test that they do, is the same defect as two scanners.

**"Prove it".** For each behavioural claim in the diff, ask what test fails if it stops
being true. If nothing does, either add one or move the claim somewhere that doesn't read
as a guarantee. Invariants currently held by _remembering_ are the target — those are the
ones that regress silently.

### Triage & gate

- Dedupe the union of findings and rank by severity.
- **Unresolved correctness (and security) findings block the release.** Efficiency / DRY / DX /
  coverage findings that are not regressions may be filed to `TODO.md` and scheduled — but say
  so explicitly; a silently-dropped finding reads as "reviewed and fine."
- **File the report FIRST, before acting on any finding.** Copy the harness output to
  **`reviews/<version>-<slug>.md` at the repo ROOT**. A report living at a
  session-scratch path is one cleanup away from gone, and it is the only artifact recording
  what was found and *not* fixed. Observed: a second-round report sat at
  `/private/tmp/.../tasks/*.output` — 892 lines, present by luck — while the durable record
  of fourteen unworked majors was a five-line paraphrase, and the instruction to copy it was
  prose rather than a checkbox, so no open-items sweep would surface it. — seen in:
  tjs-lang (0.13.0)

  ⚠️ **NOT `docs/reviews/`,** which this doc used to prescribe. In every
  `tosijs-ui/site` project `docs/` is the **generated site root**: wiped on every build and
  **served publicly**. It destroyed a tosijs-3d 0.7.0 report about ninety seconds after it
  was written, and the alternative outcome was worse — publishing a "Verdict: BLOCK" report
  that named an adopter to the open web. `tjs-lang`, where this practice originated, is the
  one repo where `docs/` happens to be safe, which is exactly why the hazard went unnoticed.

  Excluding the directory from the npm tarball (`"!docs/reviews"` in `files`) is still worth
  doing — one repo shipped 258KB of review reports because its `files` allowlist included
  `docs` wholesale — but it addresses PACKAGING, not publication. **Check the path against
  both `files` and the site's `docPaths`/output dir before committing.**
- **Route by lens — these findings do not all belong in the same place:**
  - **Lenses 1–6 and 9** → fix now, or file to this repo's `TODO.md`. (Lens 9 findings that
    touch the user's machine — a global binary, a kill policy — are correctness findings for
    triage purposes, not nits: they block.)
  - **Lens 7** → a **GitHub issue on the owning repo** (the channel), mirrored in this repo's
    `UPSTREAM.md` with the issue URL. Never a direct edit to the owning repo — see
    [`cross-project.md`](cross-project.md).
  - **Lens 8** → a change to `tosijs-coding-practices` (and grep the cross-cutting docs for
    parallel mentions — see `../CONTRIBUTING.md`). **A direct edit, not an issue.**
    `cross-project.md`'s file-don't-fix rule protects CODE repos and names this one *a
    standing exception*; filing here is a deferral, not a write-back. Observed: a queue at
    8 open / 0 closed, the oldest four weeks, while the same repo took 78 non-merge commits
    in that window — direct edits happen freely; only review write-backs silt up. — seen
    in: tjs-lang (0.13.0)
- **Lenses 7 and 8 rarely block a release** — they compound instead. Treat "no findings" from
  either with suspicion: it usually means nobody looked.
- Record anything durable back into the practice docs so the next release starts ahead.

**A BLOCK is not a followup — it restarts the clock.** When remediation of a BLOCK is itself
release-sized (new modules, changed public behaviour, a diff comparable to or larger than the one
reviewed), the remediation gets its own full pass. The anti-treadmill rule below governs
GO-with-followups, not BLOCK. The test is the size and shape of the fix diff, not the number of
laps. Real case: a BLOCK whose remediation ran to eight commits, ~2000 insertions, five new source
modules, ~60 new tests, and behaviour changes in three endpoints. — seen in: haltija

**…and here is the exit, because "restarts the clock" on its own has none.** Stated without a
termination condition the rule is a treadmill with worse economics than the one below it: each
release-sized remediation earns another full pass, which finds more, which earns another. What
actually happens is that the rule gets skipped — and the skipping is not uniform. **The scrutiny
inverts.** Wave-one code accumulates passes while the newest code, written specifically to satisfy
the reviewer, ships with none. That is exactly backwards: the least-examined code in the release is
the code with the least time in it.

So the exit condition is **not another pass — it is a release candidate.** When remediation is
release-sized and a further full review would only restart the clock, tag an `-rc`, put it in front
of real use, and treat that use as the next reviewer. An RC is an honest stopping state in a way a
skipped review is not: it says "this has not been fully reviewed, and here is how we are finding
out" rather than pretending the pass happened. Cut the final only after the RC has been exercised.

Two guards that make it honest rather than a loophole:

- **The last wave gets a targeted pass before the RC** — the lenses that cover what it touched, over
  its diff only. Not the full nine; enough that the newest code is not the least-read code.
- **Say in the RC's notes what has NOT been reviewed**, by name. "Release candidate" with no
  statement of which parts are unproven is just a version suffix.

— seen in: haltija 1.12.0, where the largest user-visible change (a rewritten schematic renderer,
~6 commits) landed entirely after the last review, and its one real regression — hidden `display:
none` text leaking into the affordance map — was caught by CI, not by any review pass. The RC went
out saying so.

**One review per release; re-review only the delta.** The review runs _once_, against
`vLAST..HEAD`. Fixing its findings produces new diff — and re-running the whole review over that
diff is a treadmill with no fixed point: each fix draws fresh nits, which you fix, which is fresh
diff. Making each pass cheaper just spins the treadmill faster. So: a fix's own correctness is
checked **inline** (you wrote it, you read it), and any _new_ nit it surfaces is the **next**
release's input — filed to `TODO.md`, not fed back into this gate. Re-run a lens only when a
**blocker** fix materially reshaped the subsystem that lens covers, and then only over that fix's
diff. **`GO-with-followups` is a stopping state, not a lap counter:** taking it — file the
non-blockers, tag — _is_ the discipline. Re-reviewing instead of shipping is the anti-pattern this
rule exists to kill, and it is the specific reason a slow review gets abandoned: a gate that never
declares itself done gets skipped entirely, which is strictly worse than a gate that ships with
followups. — seen in: tosijs-product (0.6.x)

— seen in: tosijs, tosijs-ui, tjs-lang (release discipline); tooling: `/code-review`, `/code-review ultra`

## Verify end-to-end — don't approve on tests + typecheck alone

- **Drive the real flow before you call it done.** Happy-DOM unit tests can't see real
  layout, scroll metrics, `offsetWidth`, `:scope >`, or rAF timing, so a green suite still
  hides runtime breakage. Get agent eyes on the running HTTPS dev page.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs
- **A printed or documented remedy is a testable claim — drive it.** When code or docs tell the
  user "do X to fix this" (an escape-hatch flag, a fallback command, a "use `--window`" hint),
  run X _in the exact shape the message gives it_, in the mode that triggers the message. The
  remedy rots silently: it's the path nobody exercises because it only appears when something's
  already wrong. — seen in: haltija (the `hj --window <id>` escape hatch the docs pointed at was
  itself broken for releases; the fix landed the same release that started printing "use
  `--window`" — a near-miss caught only by driving the printed remedy)
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
  **file an issue on that repo** instead of quietly coding around it — that is the channel —
  and mirror it in an **`UPSTREAM.md`** at your repo root: newest at top, each entry
  `Context` + concrete `Suggestion` + the **issue URL**, marked `✅ RESOLVED` with the fixing
  version once landed. Creates a durable, actionable backlog and stops the same integration
  trap being rediscovered. **File first, then mirror** — an `UPSTREAM.md` row without an
  issue URL is a complaint nobody will ever read, and `to file` is not a status. See
  [`cross-project.md`](cross-project.md) → "The three artifacts".
  — seen in: tosijs-product, tosijs-3d

## Review posture

- Report faithfully. If tests fail, say so with output. Don't claim "done and verified"
  without having driven it.
- Findings should be actionable and ranked by severity. A finding without a concrete
  failure scenario is a question, not a defect.
- Work isn't done until it's pushed: per "Landing the Plane", `git push` succeeding (and
  `git status` clean vs origin) is the definition of done; file follow-ups in `TODO.md`.
  — seen in: tosijs, tjs-lang

- **Ask an idle agent "anything you'd like to double-check?"** Executing a plan and auditing
  a plan are different frames: while executing, the question is "what's next?"; this flips it
  to "what did the plan not cover?" — which is where misses live, because a plan can't
  contain its own blind spots. Counterintuitively it's _most_ productive when nothing
  obvious is left, since that's the signal the named work is done and the remaining defects
  are the ones no task named. In one tjs-lang session it surfaced a stale generated artifact,
  an unfixed sibling of a just-fixed security bug, and a quota bypass in code shipped hours
  earlier — all after "ready to tag". — seen in: tjs-lang

## Project-specific practices

### tosijs-3d

- `RELEASING.md` is an agent-scoped release runbook: stop dev server → clean-tree check
  (ignoring `docs/` churn) → bump → build → verify → commit → tag, and the agent STOPS —
  `npm publish` and `git push` are human-only. Worth mirroring where releases are agent-run.

### tjs-lang

- **Lens 0 answer:** tjs-lang is a **language + a sandbox VM + a published library**, so all
  three sets of standing obligations apply at once. Concretely: a codegen bug ships into
  every consumer's output without them changing anything; the _semantics_ of operators are a
  contract, so escapes must exist before a rule tightens (`unsafe`, the `Legacy*` bridges);
  adversarial input is the normal case for the VM; and it compiles itself, so a defect can
  hide behind itself — which is why the dogfood corpus is pinned at 100%.
- Run `docs/review-lenses.md` alongside the nine. Four of its five are the cross-cutting
  checks above; the fifth is **adversarial** and is genuinely project-specific: AJS is an
  AST interpreter rather than a sandboxed realm, so published sandbox escapes have no direct
  analogue — there's no `Function` to reach. The value is in TRANSLATING them ("what is the
  AJS equivalent of this CVE?"), which is what surfaces undefended classes.

### tosijs-product

- Before building a tosijs-ui/site project, verify no `docPaths` entry overlaps `outputDir`
  (`docs/`) — `buildSite` does `rm -rf docs/` first without validating overlap, so an
  overlapping source path is silently destroyed and the build "succeeds" empty.
