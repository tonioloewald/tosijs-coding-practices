# Proposal: leanness as the driver

**Status:** proposal, rung 1. **Second draft** — the first was rejected in
substance by three critique agents and by the owner. What survived is the
purpose; the mechanism is replaced. Seeking critique.

## The purpose, stated correctly this time

> "The goal is to go from rapid growth, which usually leads to bloat and
> mismatched APIs, and then move towards simplification and economy." — owner
>
> "It only makes things leaner AFTER stuff is added. The goal here is to switch
> to leanness as the DRIVER, not as a counteraction to additive changes."

The first draft claimed no whole-codebase process existed. **That was false** —
`practices/review.md` defines Tier 3, whole-codebase scope, and `scope` in the
workflow already overrides the diff command. A critic was right to reject it.

But the correction does not rescue the objection, because every existing lens
is **reactive**: `dryness` asks *did this change duplicate something*, `dx` asks
*did this change make the surface bigger*, `efficiency` asks *did this change
cost bytes*. Each is triggered by an addition and scoped to it. **None has
removal as its purpose.** A process that makes things leaner only in proportion
to what was just added cannot drive a library toward economy; it can only
decelerate growth.

## The evidence: review is an accretion engine, and nothing consumes its output

The owner's observed pattern — *"you run the reviews, DX says little or
nothing, then security and so on whine about nits, which leads to aggregation
of fix code which never gets looked at through the DX/dryness/leanness lens
until a whole bunch more stuff has happened"* — is directly measurable in
tosijs 1.11.0, and the measurement is unambiguous.

Eight review rounds. Rounds 1–7 were `pre-minor` (correctness, security,
blast-radius, efficiency). Each produced blockers; each blocker produced
remediation code written under tag pressure. **`dryness` and `dx` did not run
in any of them** — they were in the lens pool and in no tier, so they were
unreachable without asking for them by name.

What accreted in `src/agent.ts` while nobody was looking:

| accretion | rounds to appear | found by |
| --- | --- | --- |
| the `fromDOM` harvest, written out **three times** | 4 (one copy per blocker) | `dryness`, round 8 |
| the upward walk, **four arms** (parent, label, form, shadow host) | 4 | never reviewed as a whole |
| `propagates`, a denylist with allowlist arms bolted on the front | 2 | — |

The three copies had already begun to disagree in their comments about what
`fromDOM` was for. That is tosijs-floorplan#4's own defect — the duplication
whose fix this release is named for — **reappearing inside the function that
fixed it**, because the process that would catch it was not reachable.

When `dryness` finally ran, in round 8, it found it immediately.

**So the intervention is not primarily a quarterly search.** It is that
**remediation must be seen by the leanness lenses while it is still
remediation** — not after N releases, when it has become architecture.

## What was wrong with the first draft's mechanism

Two critics dismantled it empirically. Both findings stand and are recorded
here so the next draft does not re-propose them.

**The measurement rule ("no number, no finding") is unsound.** Measured, not
argued:

- **gzip mis-scales per edit type — but less than the critique claimed, and in
  both directions.** Reproduced and committed as
  `tosijs/tools/compression-proxy.ts` (the original figures were never
  persisted, which is itself the finding — they do not re-derive):

  | edit | Δgz | Δbr | br/gz |
  | --- | --- | --- | --- |
  | duplicate a 400-char block ~58 kB away | +167 | +60 | **0.36** |
  | duplicate it ~100 chars away | +10 | +6 | 0.60 |
  | a NEW 100-char error string | +62 | +96 | **1.55** |
  | delete 400 chars | −154 | −171 | 1.11 |

  gzip's 32 kB window cannot see a distant repeat, so remote de-duplication —
  a leanness pass's commonest find — is over-valued **~2.8×**, not the 23×
  asserted. And the reverse error is real: a new error string costs a consumer
  **more** than gzip says (1.55), where the critique claimed it was over-taxed.
  Pearson r is **+0.895** excluding an incompressible blob, not −0.664. **The
  metric is directionally sound and per-edit-type mis-scaled** — which weakens
  "no number, no finding" for a subtler reason than the critique gave: the
  number is real, and it is not the number the consumer pays.
- **~39% of the policed bytes never reach a consumer.** A state-only consumer
  bundles 25 137 gz of `module.js`'s 44 549. "−300 gz in `agent.ts`" and
  "−300 gz in `xin.ts`" score identically under the rule and differ by
  infinity in value.
- **The largest available win is invisible to it.** The same five-line app is
  25 137 gz via `tosijs`, 16 180 via `tosijs/state` — **8 957 B, 55%, decided
  by the import specifier** — and produces zero delta on any published bundle.
- **It rejects the class that pays best.** Every growth event in
  `bin/bundles.ts` is a clarity or correctness fix that *cost* bytes: `bind`
  accumulating instead of silently dropping a binding; deprecation messages
  that stopped naming props keys which do not exist. Under the rule these are
  negative findings.
- **Its safety clause is the signal 1.11.0 falsified.** "Here is the test that
  still passes" — a fully green suite was present in *every round that shipped
  a blocker* (1015/0, 1028/0, 1033/0).

**Replacement, from the same critic:** a finding carries **a falsifiable
prediction and a named beneficiary** — the unit the beneficiary actually pays
(brotli, in a consumer bundle that imports X; and if you cannot name a consumer
whose bundle moves, the byte figure is *zero*, and say so) — plus **a
refutation condition** ("this is wrong if ⟨observable⟩"), which admits the
clarity bucket without weakening it, plus **a pre-registered test watched
failing first**.

**"Record, don't act" guarantees nothing happens.** Also measured:
`tosijs/TODO.md` went 47 → 2 183 lines since 2026-07-17, add:delete **3.8:1**,
largest single net reduction **7 lines**, 57% of lines ≥2 weeks untouched. Its
"2.0 refactoring candidates" block is dated **2026-04-16** — five months,
twelve releases — and it *already carries byte measurements*, i.e. it already
cleared the bar the first draft proposed. Worse, it has **decayed into
misinformation**: three of the eight symbols it lists lost their warning
wrappers in 1.9.1, so the recorded finding is now false, with a citation
attached. **An unactioned inventory is not neutral.**

## What to build instead

1. **Run `dryness` + `dx` on remediation, not after it.** The cheapest and
   best-evidenced change here. The `dx` tier now exists; make the re-review
   after a BLOCK include it rather than defaulting to correctness +
   blast-radius over the remediation diff.
2. **A canonical-spelling registry** (`API.md`), one row per **concept**, not
   per symbol, with the other spellings, each one's status, and the reason each
   is kept. Enforced by extending `src/type-surface.test.ts`, which already
   compiles probes against the built `.d.ts` and fails the build: every listed
   spelling still resolves; every row marked `warns` actually warns and every
   row marked `kept` does not; no doc claims a deprecation the registry lacks.
   Measured need: **18 non-deprecated spellings** for "bind text to a path",
   10 for reading a value, 7 for creating a proxy, 5 for declaring attributes —
   and `withAttributes`, the canonical form since 1.10.0, is **3 uses against
   156** across every consumer repo the maintainer owns.
3. **One DX-lens question, enforced at the point of addition:** does this diff
   introduce a spelling for a concept that already has a row? If so the row is
   updated in the same commit — a `reason kept`, or an existing spelling moved
   to a retirement tier. Paid by the person with the most context, not by a
   quarterly search by someone with the least.

## The class none of this catches, recorded honestly

`tosijs#32`: `rows[0].pw`, `rows.0.pw` and `rows[id=r1].pw` name one value and
had no string relation, so redaction missed every spelling but the one the
binding used, and `read('rows')` returned secrets in cleartext. **A pure
spelling-multiplicity defect with a security outcome** — no byte delta, no
confused reader, invisible to both loops as originally proposed. Whatever is
adopted should be able to say why it would or would not have found this.

## Retirement

If (1) is adopted and the next release's remediation still accretes unexamined,
the cadence fix failed and should be reverted rather than supplemented. If the
registry's gates never go red in two quarters, it is decoration.
