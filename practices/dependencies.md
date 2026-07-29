# Dependencies & supply chain

How to decide what to depend on, and how to keep a dependency tree honest over time.

Most of this was learned building the dependency-audit gate in `tosijs-ui/site`
(`src/doc-system/site/audit-guard.ts`) — including the parts we got wrong first.

---

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
