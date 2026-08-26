# Dependencies & supply chain

How to decide what to depend on, and how to keep a dependency tree honest over time.

Most of this was learned building the dependency-audit gate in `tosijs-ui/site`
(`src/doc-system/site/audit-guard.ts`) — including the parts we got wrong first.

> For the **test-lane** variant of the gate (a dated `audit-exemptions.ts`, a lane that
> self-skips offline, `SKIP_AUDIT=1` for the fast loop) see
> [`testing.md`](testing.md#dependency-audit-gate-fail-on-high-exempt-with-a-clock).
> Same philosophy, different attachment point: a test lane gates the suite, a build
> gate gates the artifact. A library that publishes both wants the build gate, because
> it fires for adopters too.

---

## 0. An abstraction must out-stable what it abstracts

The decision *before* the audit gate: whether to take the dependency at all. A
middleware layer's whole pitch is insulation from platform churn — so it only earns its
keep if its own API surface is **more stable than the platform underneath**. Judge it by
trajectory and incentive alignment, not by liveness or market health: a commercially
thriving vendor whose customers aren't you will churn in directions you don't control.

The canonical cautionary tale: the original Manta (2010, Unity/UnityScript). Apple's
64-bit transition *should* have been Unity's finest hour — recompile and you're 64-bit
for free. But in the same period Unity deprecated UnityScript and rewrote APIs
repeatedly, so the platform transition became a middleware-forced rewrite, and the game
died. Native Obj-C — the "risky low-level choice" — would have been the stable surface.
The ecosystem's standing bets follow this criterion: the web platform (the most
backwards-compatible API surface in computing) over engines, Blender (foundation-owned,
tool-is-the-product) over vendor suites, own-the-seam libraries in between.

— seen in: manta-recon (the original game's death and the revival's stack choices)

## 1. A gate must never report a pass it did not earn

**This is the whole ballgame.** Every other rule here is negotiable; this one isn't.

The first version of our audit gate shelled out to `bun audit --json`, returned stdout,
and treated empty output as "clean tree." Measured behaviour on bun 1.3.14:

```
clean tree              → exit 0, stdout `{}`   (3 bytes — never empty)
advisories found        → exit 1, stdout `{...}`
no lockfile             → exit 1, stdout EMPTY
offline / registry
  refused / bun too old → exit 1, stdout EMPTY
```

Empty stdout **only** happens on failure. So anyone behind a proxy, on an
npm/pnpm/yarn lockfile, air-gapped, or on an older toolchain got
`✅ dependency audit clean` on every build, forever, with the registry never
contacted. A gate that reports an unearned pass is **worse than no gate**: no gate
leaves you with a known unknown, a lying gate converts it into false assurance and
stops anyone from looking.

Rules that follow:

- **Read the exit code before the output.** Always. A tool's exit status is its
  contract; parsing stdout while ignoring it is choosing the less reliable signal.
- **Distinguish "checked and found nothing" from "could not check."** These must be
  different states in your code (`ran: false` vs `ok: true`), different messages, and
  different colours in the log. Collapsing them is how the bug above happened.
- **Never infer success from absence.** Empty output, a missing file, a zero count —
  ask what *else* produces that, and assume the worst of the ambiguity.
- **The in-code comment is not evidence.** Ours claimed "any other exit is treated as
  couldn't-check via a parse failure below." No such check existed. The reviewer who
  found it re-derived the behaviour from the binary instead of reading the comment.

## 2. Fail open on inability, fail closed on findings

- **Cannot check** (offline, registry down, tool too old, timeout) → **warn and
  proceed**. An advisory you could not fetch must not ground someone on a plane.
- **Actually found something** → **block**.

Asymmetric on purpose: the first case is a gap in your information, the second is
information. Treating them alike either grounds people constantly or waves findings
through.

Bound anything that touches the network with a timeout, and treat the timeout as
"cannot check." A synchronous gate's real hazard is not slowness, it's a *hang*
(captive portal, VPN coming up, registry black-holing the connection).

## 3. Time-boxed exemptions, never allowlists

You cannot always patch today. The temptation is an ignore-list; the problem is that
an ignore-list is permanent by default and nobody re-reads it.

Require, per exemption: **the advisory id, a reason, and an expiry date.** After the
expiry the exemption stops working and the gate fires again. An exemption missing a
reason or a valid date is **invalid and does not suppress** — "gated" has to mean
*explicitly and specifically* gated.

Also report:

- **expired** exemptions, with the original reason and how long ago they lapsed;
- **stale** exemptions that match no current advisory, so they get deleted.

The point is not to prevent accepting risk. It's to make accepted risk **come back
for review on a schedule** instead of decaying into permanent silence.

## 4. Block on everything; let the exemption absorb the false positives

Tempting refinement: only block on advisories in shipped runtime dependencies, since
a devDependency never reaches a consumer. **Resist it**, or at least don't ship it as
the default.

The asymmetry: with a working time-boxed exemption, a false *block* costs about two
minutes (add a gate entry with a reason and a date), while a false *pass* costs a
missed vulnerability. Those are not comparable. And a dev-only dependency still
executes on the developer's machine.

For build tooling specifically, note what the blast radius actually is. A build
system and a dev server are **not production infrastructure** — a gate there can
stop a build, but it cannot cause an outage, drop traffic, or corrupt data. The
bounded harm is "a developer must look at a security finding." Meanwhile shipping
unaudited artifacts is the only unbounded path. Fail-closed by default *removes*
risk rather than adding it.

**The universalization test is the strongest argument, and most security tooling
fails it.** Normally the adopter bears the cost and someone else reaps the benefit,
which is why "everyone should audit" stays aspirational — it's free-rider-shaped.
A gate in a *library's* build inverts that: each library that gates cleans its own
tree, and a clean tree is what its dependents inherit. The benefit flows downstream
automatically, so the more projects adopt it the less anyone needs the workarounds.
Note the corollary: most `overrides`/`resolutions` entries are downstream patches for
upstream negligence. Universalize the gate and most of them stop being necessary.

## 5. Classify the nature of a risk; never let the classification soften the verdict

You can determine the **category** of harm deterministically. An advisory's CVSS
vector states its impact triad, and it is machine-parseable:

- confidentiality or integrity impact (`C:` / `I:` at `L` or `H`) → can leak or alter
  data, up to code execution;
- availability only (`C:N/I:N/A:*`) → resource exhaustion, hang, crash.

Support **CVSS 3.x (`C/I/A`) and 4.0 (`VC/VI/VA`, plus subsequent-system `SC/SI/SA`)**;
they coexist in the wild.

You **cannot** determine the actual risk *to you*. CVSS scores the worst case,
context-free. "We only ever feed this our own globs" is the fact that makes a
high-severity ReDoS a non-issue in your project, and no field encodes it. That
judgment is human, and the time-boxed exemption is where it belongs.

So classification **annotates**; it never changes what blocks. Measured against a
real 44-advisory sample:

- **20% carried no CVSS vector at all** — and those skewed *severe* (4 high, 2
  critical, including a VM-context-escape → RCE). Anything that auto-softened on
  classification would have been blind on exactly the worst findings.
- **Availability-only scores understate escalatable CWEs.** One package had an `A:H`
  (DoS-only) advisory tagged CWE-1321 (prototype pollution) *and* a separate `C:H/I:H`
  advisory titled "code generation gadget **after** prototype pollution" — the
  escalation chain the first vector never encodes.

**Classification must therefore fail closed**: no vector, an unrecognised vector
shape, or an escalatable CWE ⇒ label it unclassified and treat it as worst case.
Annotating costs nothing when it cannot classify. Softening would have cost
everything.

## 6. Over-reporting is the failure mode that kills adoption

Bespoke audit gates over-report. Ours did, and so has every one we've built at work.

Auditors emit one entry per *(package, vulnerable-range)* pair, so a single advisory
against a package present at several versions in the tree arrives several times. On a
real project, **16 reported entries were 12 distinct advisories across 6 packages** —
one package printed 6 lines for 3 advisories. A count that overstates the workload by
a third trains people to skim, and skimming is how the important one gets missed.

- **Group by advisory**, listing the affected version ranges together.
- **State the honest shape**: "12 advisories in 6 packages, from 16 findings."
- **Sort worst-first** — severity descending, then by nature. Auditor output is in
  package order, which buried our lone `critical` (an RCE) at position six between
  ReDoS entries.
- **Show sub-threshold findings too, compactly.** One line each. A `moderate` today is
  a `high` the day someone re-scores it, and you want to have seen it coming. Ours
  were collected and never printed — invisible by accident.

## 7. Advisory count per package is a code smell

A single moderate advisory is noise. A dependency that **keeps** producing them is
telling you something no per-finding view can: this library is a liability.

Tally advisories per package across *every* severity and print it when anything
repeats. Replacing a dependency with a long tail of quasi-flaky advisories is a
legitimate engineering decision — and it needs the aggregate, which is exactly what a
threshold-filtered report hides.

## 8. Remediate with the minimal fix

When you do patch:

- **Read the advisory.** Confirm the patched version genuinely fixes it and is
  published by the package's real maintainers — a fresh release is also how a hijacked
  package ships.
- **Prefer a targeted `overrides`/`resolutions` pin** to the patched version over a
  broad `bun update --latest`. Every extra package that moves is fresh supply-chain
  surface.
- **…but "minimal" is sometimes impossible, and then the big fix is the right one.**
  A real case: the only unaffected `brace-expansion` is `5.0.8` (the advisory marks
  every earlier version affected), so the pin is mandatory — and `brace-expansion@5`
  breaks `eslint@8`'s bundled `minimatch@3` with `expand is not a function`. The
  one-line pin forces an eslint 8 → 10 migration. Do not read that as a failure of
  discipline: **check the per-package tally before concluding a pin is minimal.** In
  that case the tally had already fingered the stale eslint glob stack, and replacing
  it cleared the entire `minimatch`/`js-yaml`/`flatted` cluster at once. When a pin
  cascades, the cascade is usually pointing at the actual problem.
- **Treat large churn in a "patch" as itself suspicious.** Review what moved.
- **Verify the tool sees your override.** Confirm the finding actually clears after
  pinning. (`bun audit` reads *resolved* versions, so it does — but other ecosystems
  have shipped the bug where audit reads declared manifest ranges and reports a
  vulnerability you already fixed, forcing a bogus exemption. Keep a check on it.)
- If you cannot patch now, **gate it with a reason and a near-term expiry** — don't
  silence it.

## 9. Guards live in libraries; libraries don't kill their callers

If the gate ships inside a library others build with:

- **Return a result; never `process.exit`.** An adopter's
  `await buildSite(cfg); await publishToS3()` must not be killed from inside a health
  check they never asked for. The *application* decides what a failure means. (A
  long-running process that already owns a server is the one exception — stopping it
  can be the entire point of the guard.)
- **Own your invariants in one place.** "Audit once per process, never on a watch
  rebuild" was enforced by three call sites each remembering a flag — i.e. owned by
  nobody, and our own documented adopter pattern already violated it, putting a
  network call in every keystroke rebuild. Memoize inside the function instead.
- **A default-on gate that can fail an adopter's build is a MINOR version bump**, not
  a patch — and the changelog entry leads with it, naming every escape hatch verbatim.
  It is not dangerous, but it is a visible behaviour change.
- **Never let a guard flake.** A guard that fails a healthy build gets disabled
  globally in someone's shell profile, and then it is gone everywhere. False positives
  are not a nuisance, they are how the guard dies.

## 10. Automate the part humans forget

An audit at build time only catches advisories that exist *when you build*. Advisories
get published against an unchanged lockfile constantly. Add **Dependabot (or
equivalent)** so the tree is re-checked on a schedule, not only when someone happens
to run a build.

---

## 11. Stay current on minors — drift is a debt that compounds

An audit gate tells you when a dependency has become *dangerous*. It says nothing about
one quietly going stale, and stale is how you arrive at a dangerous upgrade you cannot
take.

The pattern is consistent and worth naming, because it is invisible until it isn't:

- A project sits on `eslint@8` for a couple of years. Nothing breaks; nothing prompts.
- An advisory lands on `brace-expansion`, and the only unaffected version is `5.0.8`.
- `brace-expansion@5` breaks `eslint@8`'s bundled `minimatch@3`
  (`expand is not a function`).
- The one-line security pin is now an **eslint 8 → 10 migration**, flat config and all —
  under time pressure, because the alternative is shipping a known advisory.

Nobody chose that. It accumulated. Two years of skipped minors turned a five-minute fix
into an afternoon, and the deadline arrived from outside.

**So: take minor and patch upgrades on a schedule, not on an incident.**

- **Cadence over completeness.** A monthly-ish sweep of `bun update` (respecting semver
  ranges), run through the project's full gate, beats a heroic annual catch-up. Small
  diffs are reviewable; a 40-package jump is not.
- **Majors are a decision; minors are hygiene.** Majors get read, planned and scheduled.
  Minors should be boring — and if a minor is *not* boring, that is itself the signal
  that the dependency is drifting away from you.
- **Let the tally pick the target.** The advisories-per-package view (§7) is also a
  staleness view: a package generating repeated findings is usually one you are several
  versions behind on.
- **Automate the noticing, not the deciding.** Dependabot (or equivalent) opens the PR;
  a human still reads what moved. The goal is that nothing goes un-noticed for a year,
  not that upgrades land unattended.
- **Backfill deliberately.** When adopting this on an existing project, do one pass to
  get current *before* setting a cadence — otherwise the first scheduled sweep is the
  heroic catch-up you were trying to avoid, and it will be blamed on the practice.

The test: if a security advisory landed on your oldest dependency tomorrow, could you
take the fix in an afternoon? If not, the debt is already there — it just has not been
called in yet.

## 12. Sometimes the correct pin is the deprecated one — and a toolchain bump is validated by executing the artifact

§11 says take your minors. This is its necessary counterpoint, because the two get
confused: **currency is the default, not the rule.** A version can be simultaneously the
newest, the only non-deprecated one, and wrong for you.

Worked example (tosijs, `bc4d446..3c4fb43`). Bumping the build host from
`tjs-lang@0.10.1` to `0.13.4` looked routine — the hold that had kept us on 0.10.1 was
satisfied, and 0.13.4 was the only version npm did not flag as deprecated. But 0.13.x's
`convert` strips `new` from every class declared in the module it is converting, so the
converted module throws `Cannot call a class constructor without |new|` — at *import*
time when the call site is a static field initialiser. Fifteen call sites across four
modules, one of them a security guard's `Error` subclass.

Three transferable things.

**A toolchain bump is validated by EXECUTING THE PUBLISHED ARTIFACT, not by running the
suite.** All 898 unit tests passed under the broken toolchain, because they exercise
`src/` — and the bug lives in the *emitter*, downstream of everything the suite can see.
The only thing that caught it was a build gate that imports each published bundle and
asserts every export is defined. Any project whose build transforms its source (a
transpiler, a codegen step, a bundler plugin) has this blind spot, and the suite will
report green across it every time. The gate has to run the thing you ship.

**Bisect before you file.** Six installs (`0.10.1, 0.11.0, 0.12.0, 0.13.0, 0.13.1,
0.13.4`) against a ten-line repro turned "the new version broke our build" into
"regressed in 0.13.0, here is the minimal input and the exact output." That is the
difference between a complaint and a fixable issue, and it costs about five minutes.
Script the loop; do not do it by hand.

**When you pin backwards, write the reason where the pin is read.** We pinned to
`0.12.0` — the last version whose `convert` was correct, and *itself npm-deprecated*, so
every `bun install` printed a deprecation notice. Left unexplained, that notice is an open
invitation for the next session to helpfully bump it and re-introduce the bug. The note
belongs in `CLAUDE.md`/`AGENTS.md` next to the version, and it must say the deprecation is
**expected**, why its stated reason does not reach your use, and what has to happen before
the pin moves.

**Epilogue, which is the real payoff: the backward pin lasted one day.** The bisected
issue was filed with a ten-line repro, fixed upstream within hours, and we took the new
version the same day. That is the argument for the paragraph above — a *good* issue is
usually cheaper than the workaround it replaces, and a backward pin is best understood as
a **holding position with an exit condition**, not a settled state. Write the exit
condition down (here: "when issue #N closes"), because a pin with no stated exit becomes
permanent by default. Two habits fall out of this:

- **Re-check a held pin when its upstream moves.** Ours was revisited because someone
  mentioned a new release, not because anything watched for one. That is luck, not
  process.
- **State a fix's cost when you report it fixed.** The correct output was ~340 gzipped
  bytes larger, which pushed a bundle to *seven bytes* under its budget ceiling. A gate
  that passes by seven bytes will fail next week on something unrelated and teach whoever
  hits it to raise the number without reading it — so raise it deliberately, in the same
  commit, with the reasoning written where the number is.

**And correct your own report when you were wrong about part of it.** The same filing
flagged a second symptom as "possibly the same emitter bug." It was not — that one lived
in the tool's *test-runner harness*, the emitted module parsed and imported fine, and it
predated the regression by several minor versions. Saying so on the issue costs a comment;
not saying so sends a maintainer chasing a bug that does not exist, in the exact area they
have just changed.

The general shape: **a pin is a claim, and a claim needs a measurement.** This same file
previously carried the *opposite* failure — a pin justified by "that version peers a
range we cannot satisfy," which nobody had checked and which turned out to be false of
every version involved. It propagated into three files and cost two releases of
duplicated config. Whether you are pinning forward or backward, the reason has to be
something you verified, written where it will be read, with the condition for revisiting
it stated.

## 13. Price the disposal tax, because nobody else does

Everyone evaluates **adoption cost**: how hard is it to get this in? Almost nobody
evaluates **disposal cost**: three years from now, how hard is it to get this *out*?
The maintainer's name for the second one is the **disposal tax**, and it is worth
adopting because having a name makes it askable.

Note what the question is *not*. "Can I revert the file I converted this morning?" is
`git checkout` — not a feature and not the risk. The case that matters is a hundred files
and three years in, when the reason to leave is that the team changed, the project was
abandoned, or the thing simply did not work out. That is when the bill arrives, and it is
never the moment you have budget for it.

**The counterexample proves the rule.** Languages and frameworks compete loudly on
adoption — drop it in, migrate incrementally, works with your existing code — and
essentially never on exit. Exit cost gets priced for data formats (export your data), for
cloud (egress), for licensing, and almost never for tools. The exception is **TypeScript,
whose disposal tax is close to zero: strip the annotations and you have JavaScript.** That
may be the single biggest reason it beat CoffeeScript (which compiled to output you would
not want to inherit), Flow, and Dart. Its real pitch was *you can always leave* — and it is
almost never stated that way, which is exactly the point.

**The uncomfortable corollary: value and lock-in are usually the same feature.** Everything
a tool gives you over the thing it replaces is, by construction, something the replaced
thing cannot express — and therefore something that cannot trivially come back. A
mechanical, feature-free adoption has zero disposal tax *and* zero value. A deeply
idiomatic one has real value *and* real disposal tax. They move together, necessarily. So
the bar is not *value* — it is **value net of disposal tax**.

### How to actually price it

Not a vibe. Write the degradation table for the specific thing you are adopting, row by
row, before you adopt:

| what it carries | what it comes back as | lossy? |
| --- | --- | --- |
| … the things it stores or expresses … | … their form in the world without it … | … |

Then sort the rows. **Mechanical** rows are free — a reverse transform exists. **Verbose**
rows are payable — the result is ugly but correct. **Semantic** rows are the real tax:
control flow, error propagation, guarantees that have no expression in the target. A tool
whose rows are mostly mechanical is cheap to leave regardless of how deeply you use it.

Two design patterns that pay the tax up front, both worth copying:

- **The escape hatch is part of the syntax.** tjs-lang's `wasm { … } fallback { … }` cannot
  be written without also writing the portable version — so the disposal payment is made
  at authoring time, by construction, whether or not that was the intent.
- **Refuse rather than silently degrade.** An exit path that quietly turns monadic errors
  into `throw`, or drops the tests it cannot re-home, is worse than no exit path: it
  produces something that compiles and lies. Name what would be lost and require an
  explicit `--accept-loss`.

### And if you are the one being adopted

Say it in the README. **"Here is how you leave, and here is exactly what it costs"** is a
stronger adoption argument than any migration guide, because it is the one objection that
actually stops people — *what if this doesn't work out?* — and nobody else answers it. For
anything pre-1.0, competing with an incumbent, it is close to the only answer that matters.

Adoption tax is what everyone optimises. Disposal tax is what everyone pays and nobody
quotes.

## Choosing a dependency in the first place

The cheapest supply-chain fix is the dependency you didn't add.

- **Prefer zero runtime dependencies in a library.** Every one becomes your
  consumers' problem — their audit output, their overrides, their install size.
- **Gate a new dependency on a measured number**, not a vibe. For a browser library
  that is the printed gzip delta. "It's only one package" is not a measurement.
- **A justified exception must be written down.** `tosijs-ui` takes 12 CodeMirror
  packages as real runtime dependencies because the editor, its language modes, and
  the tjs extension must share one `@codemirror/state` instance — a naive optional
  peer silently no-ops. That reasoning lives in the project's `CLAUDE.md` so nobody
  "fixes" it later.
- **Watch for duplicate-instance hazards.** Where a package must be a *singleton*
  (CodeMirror state, a framework runtime), a second copy nested under a dependency
  will typecheck-fail or, worse, silently no-op at runtime. A stale `node_modules`
  plus an incremental install is enough to produce nine copies of one package; a
  clean reinstall (`rm -rf node_modules <lockfile> && install`) is the fix, and
  `find node_modules -path '*/<pkg>/package.json'` is how you see it.
