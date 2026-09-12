# Proposal: measured legibility

**Status:** proposal. **Rung 3 IN `tjs-lang` for instrument 1's method and
result; rung 1 going on 2 for the tosijs action it implies** — nothing is
measured here. Instrument 3 is **not new**: `practices/documentation-surface.md`
§3 already holds it, with a run. Corrected after a steward review found the
first version laundering a corpus's aggregate rigour onto its weakest
experiment.
Third draft — supersedes `grokkability-loop.md`, which was too narrow and cited
its evidence backwards. Seeking critique.

## The thing being proposed

Not "test whether the API is confusing." A **method**, with three instruments
that share it:

> Vary exactly one artifact we control. Measure what an agent *does*. Score
> against ground truth we already hold.

The last clause is what makes this different from a usability opinion, and from
the previous draft. Where ground truth is unambiguous — does the code run, is
that the right `file:line`, does the guess match documented behaviour — **there
is no interpretation step and no judgement guard**. The previous draft's
safeguard ("only act on failures that are explicable") was a decision tax
covering for a design that produced ambiguous results. Two of the three
instruments below do not need it.

> "This is the kind of thing I would DREAM of doing as a library developer, and
> basically it's all been guesswork up to now." — owner

It is not guesswork and it is not a dream: instrument 1 was run in July. Its
result has never been applied to tosijs.

## Instrument 1 — do our diagnostics cause a repair? (RUN; result unapplied)

`tjs-lang/experiments/agent-legibility/error-message-ab.ts`. Broken code plus
ONE message variant, ask for a fix, judge by transpiling and running. Message
text is the only independent variable. Its own framing is the proposal:

> *"Error messages are a product surface we fully control and have never
> measured. The question is not 'is the message accurate' (ours are) but 'does
> it cause a fix'. A diagnostic that correctly names the problem and leaves the
> model to guess the remedy is accurate and useless."*

| variant | repair rate |
| --- | --- |
| ours + a worked correction | **80%** |
| ours + prose telling you what to do | 50% |
| "that didn't work" | 0% |
| **what tjs ships today** | **0%** |

Per-defect: prose remedy **0/5**; the identical remedy shown as three lines of
code **5/5**. *Telling didn't work. Showing did.*

**tosijs has 92 diagnostics a user can hit** — 23 `console.warn`, 22
`console.error`, 47 `throw`, across 20 files, concentrated in `component.ts`
(17), `list-binding.ts` (9), `bind.ts` (8). None has been measured for anything
but accuracy.

**And tosijs supplies a fifth rung tjs's ladder does not have.**
`bin/bundles.ts` records that 1.9.0's deprecation messages *"told users to write
props keys that do not exist"* and that following one literally *"shipped a
permanently disabled button."* A message that scores **below silence** is a
category nobody has quantified, and we have shipped instances of it.

## Instrument 2 — do our diagnostics help you FIND the bug? (NEW; owner's)

> "Imagine we started measuring the effectiveness of our error messages by
> having agents try to track down a bug based on different error messages."

Distinct from instrument 1, and closer to the real developer loop. tjs measured
**repair** (here is the broken code, fix it). This measures **localization**
(here is a symptom, where is the cause?).

It suits tosijs specifically, because tosijs's characteristic failure is
**action at a distance**: a binding silently does nothing, a path does not
match, an element never updates. The symptom surfaces nowhere near the cause,
which is exactly where message quality should dominate — and exactly where
"is the message accurate?" tells you nothing, because all 92 are accurate.

**Design.** Give the agent the repo and a symptom; vary only the diagnostic.
Score: does it name the right `file:line`, and how many files did it open
first? Both are ground truth. No judgement guard.

## Instrument 3 — does a name carry its meaning? (NOT new: merge into `documentation-surface.md` §3)

**`practices/documentation-surface.md:91-118` already contains this instrument
and already has a run** — in haltija, *"three of four predicted naming bugs
were disproven… and the one confirmed case was unanimous and worse than
predicted"* — plus an operational rule this draft lacked: **keep it out of CI**.
Genuinely new below: the **warm arm** and the **wrongness × silence** ranking.
Those fold into that entry. Do not create a parallel one.

> "You could do that across the entire API surface as well. What do you think
> this would do? What would you guess this parameter means?"

A **prediction** task, not a task-completion one — and the cheapest of the
three: no repo checkout, no execution, no VM, no repair layer.

**Run it twice, and the GAP is the result:**

- **cold** — name and signature only
- **warm** — plus the doc block

Small gap, both high: the name carries its meaning. Small gap, both low:
neither name nor docs work. **Large gap: the docs are doing all the work and
the name is a trap** for everyone reading a call site six months later.

**A second signal on top:** where several models *disagree with each other* is
stronger evidence than uniform wrongness. Uniform wrongness can be a bad prior
fighting a good name; disagreement means the name genuinely underdetermines the
behaviour.

**Surface:** 160 runtime symbols, 129 exported types, **~112 fields inside
`Options`/`Props`/`Spec` bags**. Start with the option fields — that is where
misuse is *silent*. A wrong function call usually throws; a misunderstood
option quietly does something else.

**Rank by failure mode, not by wrongness** — otherwise 400 symbols produce a
flood. A misunderstood name that fails *loudly* is cheap. Rank by
**wrongness × silence**.

**It would have caught what we already know, years earlier.** Each of these was
found by accident, months apart:

| symbol | what a cold reader would guess | what it does |
| --- | --- | --- |
| `isInteractive(el)` | a DOM predicate | takes a `SchematicRecord`; returns `true` for any live `<a href>` and `false` for a fully wired button |
| `xinProxy` vs `tosi` | aliases | different proxies — `CLAUDE.md` asserted the alias and contradicted itself 200 lines later |
| `static initAttributes` / `initAttributes()` | one thing | a static and an instance method, same class |
| `styleSpec` | one meaning | *shadow* as a static, *light* as a creator option |
| `disabled: 'path'` | binds to the path | an always-truthy string; permanently disables the control |

**And it is the only instrument that produces a RATCHET.** With per-symbol
baselines, a rename becomes an **A/B you run before shipping**: propose
`isInteractiveRecord`, measure the cold rate against `isInteractive`, keep the
winner. Library authors have never had that — naming has been taste and
argument, and taste is precisely what the 1.9.0 `bind*` deprecation was: a
well-argued naming judgement that cost two releases and shipped a
data-destroying bug.

## What the corpus already settled — do not re-derive

From `FINDINGS.md` (717 lines, 2026-07-31 → 2026-08-31). **Read the provenance
per result, not per corpus:** the two-model replication belongs to the `switch`
probe, not to instrument 1, which is **n=10, one 1.5B model, single-shot** and
carries its own limitation — *"this is single-shot, and real coding iterates…
the iterated version is the more honest experiment."* The method is what
transfers; the number is bounded.

1. **Models repair from examples, not rules.** Third independent experiment
   pointing the same way. *"Every place we currently spend prose — guides,
   diagnostics, docs — is a candidate for 'replace the paragraph with three
   lines of code'."*
2. **A good name does a comment's work — where there is no prior to fight.**
   A one-line inline rule moved a construct 0% → 100%; naming the language
   *without* stating the rule was **worse than saying nothing**.
3. **The failure mode of this method is the APPARATUS, not the model.** The
   corpus says so in its own headings — *"the apparatus failed closed and
   looked like a result"*, *"the apparatus trap, again, in a new costume"*,
   two runs lost to it.

## Requirements, from the falsifiability critique

Non-negotiable, because the existing harness violates several:

- **Instrument the repair layer before trusting any rate — ALREADY DONE
  UPSTREAM, and better than this requirement asked.** When first read, the
  harness silently applied `fixCommonMistakes` before scoring. `tjs-lang`
  `8f804d2` (2026-09-12 17:07, *during* the conversation that produced this
  document) deleted it: *"these used to be applied silently before measuring,
  which made the reported number a post-repair rate wearing a raw rate's
  label."* Two of three repairs were **dead** — the language grew bare
  type-name support, so the harness was repairing something already fixed and
  *"the improvement never showed up in the number it was supposed to
  improve."* The third is narrower than its name: `` [^`$]* `` excludes `$`,
  so an interpolated template — the case that matters — was always counted a
  miss. The rate is now RAW, with each repair reporting what it would have
  recovered. **Adopt that shape; do not re-derive it.**
- **n = 5 is a demo.** At a 0.6 bar, a degraded 35% passes 23.5% of runs; a
  0.90 → 0.60 regression is missed 68.3% of the time; four tasks at a healthy
  p=0.8 produce a false alarm 21.2% of runs. For movement detection: **n ≥ 25
  per variant**, and report intervals, not lattice points.
- **Check the code's SHAPE, not only the output value.** A value-checking
  harness asked "is the control disabled?" scores `disabled: 'path'` a PASS —
  the library's flagship confusion, graded correct.
- **Persist baselines.** The current report is `console.log`'d and discarded;
  without a baseline file there is no trend and nothing to promote.
- **Do not put the answer in the prompt.** The AJS tasks state "The factorial
  of 5 is 120" and then check `=== 120`.

## What this does NOT catch

`tosijs#32`: `rows[0].pw`, `rows.0.pw` and `rows[id=r1].pw` name one value, had
no string relation, and redaction missed every spelling but the one the binding
used — `read('rows')` returned secrets in cleartext. **No confused reader, no
failed task, a security outcome.** Machine-visible only. It belongs to the
coherence registry in `leanness-loop.md`, not here.

## Sequencing

1. **Apply instrument 1's existing result** — audit the 92 diagnostics for a
   worked correction. Pure message text, no behaviour change, measured 0% → 80%
   elsewhere. This needs no new harness and no model.
2. **Instrument 3 cold/warm over the ~112 option fields.** Cheapest new build,
   largest surface, ranked by wrongness × silence.
3. **Instrument 2** last — it needs a repo harness and a scoring rule for
   localization.

## Retirement

Instrument 1: if the rewritten diagnostics do not move the repair rate on
tosijs's own corpus, the tjs result did not transfer — say so and stop.
Instruments 2 and 3: if the cold/warm gap never identifies a symbol whose
rename measurably improves the cold rate, the instrument is describing models
rather than the API.
