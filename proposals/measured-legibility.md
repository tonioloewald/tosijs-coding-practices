# Proposal: measured legibility

**Status:** proposal. **Rung 3 in `tjs-lang` — the method did not merely
measure, it DESIGNED a language** (two assumptions refuted, the language split
into a small-model surface and a large-model one). Rung 3 for instrument 1's
method and result — the effect sizes are significant at the n that was run
(p = 0.0007 for the comparison that matters) — **and rung 1 going on 2 for the
tosijs action it implies**, because nothing is measured here yet. Instrument 3 is **not new**: `practices/documentation-surface.md`
§3 already holds it, with a run. Corrected after a steward review found the
first version laundering a corpus's aggregate rigour onto its weakest
experiment.
Third draft — supersedes `grokkability-loop.md`, which was too narrow and cited
its evidence backwards. Seeking critique.

## The thing being proposed

Not "test whether the API is confusing." A **method**, with four instruments
that share it — and instrument 0 is the one that can invalidate a feature
rather than polish it:

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

## The precedent is not an experiment. It is a language that was DESIGNED this way.

I twice cited the weakest artifact in this corpus as its headline, and a review
agent did the same. The strongest evidence is not a repair rate — it is
`tjs-lang/ASSUMPTIONS.md`, a register of design hypotheses carrying **verdicts
from these probes**:

- **A4, REFUTED — *"it was never the syntax: state-threading beats mutation
  4:1."*** Recursive/threaded 80%, mutation 20%, **regardless of surface**;
  s-expressions and braces tied once the paradigm was held constant. Syntax
  choice, the thing language arguments are usually about, does not drive model
  comprehension. The paradigm does.
- **A7, REFUTED — small models revert to TypeScript even when told otherwise**,
  and emit hybrids the language quietly accepts. Consequence: **AJS is the
  small-model surface and TJS targets larger models.** The language was split
  in two because of what small models measurably did.
- **A6, qualified** — writable by a small model at ~67% *with a good cheat
  sheet*, and sensitive to the guidance; the dominant failure is reaching for
  `for` loops. (The lane's own one-shot rate is unrecoverable — see the gap
  below.)

**That is the claim worth making.** Not "we measured our error messages" but
**a language's architecture was decided by watching small models fail**, with
assumptions refuted rather than confirmed. The methodology is not speculative
here; it already produced a design.

And the corpus polices its own priors. The A4 write-up records the near-miss in
its own voice: the first reading was *"s-expressions win 80% vs 20% — Lisp
really is better for agents,"* which *"would have been wrong, and wrong in a
way that flattered a hypothesis we already"* held. That discipline — re-reading
a result against the prior you would like it to confirm — is the answer to
"models are not users." It is also the thing most likely to be dropped when
this is ported.

**One gap — and it just demonstrated itself.** The lane ran continuously
through AJS's development, one-shot, across hundreds of runs. Asked what the
pass rate was, the owner's recollection moved from two-in-three to *"might be 1
out of 3 actually"* within a minute — **not because the memory is poor, but
because none of those runs was persisted.** The only recorded figure is
`ASSUMPTIONS.md`'s A6, *"achievable (67% with a good cheat sheet)"*, which is
itself qualified by the guidance; the experiments directory records N=5, N=9,
N=10 and nothing about the lane.

So a methodology that **refuted two design assumptions and split a language in
two** cannot now report the rate it ran at. That is the argument for persisting
baselines in its strongest form: *persist the baseline* is not a statistical
nicety, it is the difference between a result and a memory — and the memory
degrades first on exactly the number you would want to cite.

Worth stating plainly for the port: **a one-shot pass rate of 1-in-3 on a
brand-new language from a minimal prompt is a strong result, not a weak one.**
The baseline for a language a model has never seen is approximately zero. And
the design decisions were driven by the *relative* figures — 80% vs 20% across
paradigms — which are far more robust to sample size than any absolute rate.

## Instrument 0 — does the surface work for its intended user? (UNMEASURED, and it is the thesis)

> "This was literally load bearing during early development. The whole point
> was agents that could improve themselves or write their own tools." — owner

**This is what the AJS lane actually was, and why it ran continuously.** Not a
usability test bolted on afterwards — the *existence proof for the product
thesis*. If a small model cannot write AJS, agents cannot write their own
tools, and the language has no reason to exist. So the lane **gated the
design**: A4 and A7 are not comprehension findings, they are answers to *does
this work for its intended user*, and the language was split in two when the
answer came back no.

**tosijs has the identical premise and has never tested it.** The agent
surface — the whole ONE USER INTERFACE claim — asserts that an agent can drive
an app through `describe`/`read`/`write`/`call`. Measured on HEAD:

- **No model touches the agent surface in any lane.** The only match for
  LLM-shaped terms across every test file is the string `llms.txt`.
- `agent.test.ts` has 361 assertions. About what the surface **refuses**
  (secret / expose / refusal): **~353**. About what an agent **achieves**
  (`.write`, `.call`): **~45**. A ratio of **7.8 : 1**.
- **`.call()` — invoking an action, the entire point of an agent interface —
  appears in 11 assertions.**

1.11.0 took **eight review rounds, four of them BLOCK, every one about
disclosure.** The surface has been exhaustively proven not to leak and never
once proven to work.

**The order is backwards, and it has a cost.** Round 6 found that a custom
element carrying an explicit `data-tosi-secret` is *weaker than the heuristic* —
the author declares a secret and is ignored. A real defect, found by a
secrecy lens. But nobody asked the prior question: **given `describe()` output,
can an agent tell what this app does and drive it?** If the answer is no, the
redaction work has been protecting a surface that does not deliver its premise.

### The instrument

The AJS shape, ported directly: give a model a tosijs app it has never seen and
`describe()` output, plus a goal — *add "milk" to the cart*, *filter the table
to overdue rows*, *change the theme* — and score whether it achieves the goal
through the surface. Ground truth is the app state. No rubric.

Then vary ONE thing, as A4 did: `describe()` with and without `styles: true`;
contracts declared vs absent; `initAttributes` vs `contract.attributes`;
exposure postures. **The relative figures are the finding** — A4 rode on 80 vs
20 across paradigms, not on any absolute rate, and relative comparisons are far
more robust to sample size.

**Run it before more secrecy work, not after.** It is the only instrument here
that can invalidate the feature rather than improve it, which is exactly why it
should go first — and exactly the property that made the AJS lane load-bearing
instead of advisory.

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
per result, not per corpus** — the two-model replication belongs to the
`switch` probe, not to instrument 1, which is n=10 on one 1.5B model,
single-shot.

**But that is the worst case BY DESIGN, and the effect sizes are separable at
that n.** Fisher exact, two-tailed:

| comparison | p |
| --- | --- |
| prose remedy 0/5 vs worked example 5/5 | **0.0079** |
| shipped 0/10 vs worked example 8/10 | **0.0007** |
| shipped 0/10 vs prose fix 5/10 | **0.0325** |
| prose fix 5/10 vs worked example 8/10 | 0.3498 |

Two review agents rejected this on "n=5 cannot distinguish 80% from 50%."
True — and it is the wrong objection, because the headline is **80 vs 0**. The
only non-separable pair is the *adjacent* one, which needs n≥38; that bound
applies to ranking `withFix` against `withExample`, not to the finding that
shipped diagnostics do nothing.

Two design objections are also backwards. **A small model with one attempt is a
FLOOR** — bigger models and retries can only raise the number, so both the 0%
and the 80% are informative; objecting that the stress test applied stress is
not a critique. And **iteration MASKS message quality**: with five retries a bad
diagnostic costs time rather than success, so single-shot is the *more*
sensitive instrument. Add iteration to measure a different thing (how many
attempts a bad message costs), not to fix this one.

**The comparison class both critiques used was an imagined perfect study. The
real alternative is taste** — which has a measured record here: the 1.9.0
`bind*` deprecation was a well-argued naming judgement that cost two releases
and shipped a data-destroying bug. This is `CONTRIBUTING.md`'s
"category reputation is middle-rung evidence" running in reverse: a bounded
real measurement graded against an imagined one, and losing.

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

## This is iterated discovery, not one-shot inference — which is what fixes the n argument

> "Tognazzini said you almost never need more than 3 usability tests, because
> after three you have more obvious failure than you know what to do with. Fix
> it and repeat. Whining about n=10 forgets that WE ARE ITERATING
> CONSTANTLY." — owner

Both review agents graded this as a **study**: one run, must establish an
effect size, therefore n≥38. It is an **instrument in a loop that runs every
release**. Those ask different questions and need different n.

**Q1 — what the loop actually asks: does this message fail at all?**

| true failure rate | P(seen ≥1 in n=5) | across 3 runs of 5 |
| --- | --- | --- |
| 50% | 96.9% | 100% |
| 30% | 83.2% | 99.5% |
| 20% | 67.2% | **96.5%** |
| 10% | 41.0% | 79.4% |

**Q2 — what the critiques demanded: is variant A better than variant B?**
n≥38 — but *only* for ranking two options that already work (50% vs 80%).
Broken-vs-good (0% vs 80%) is separable at the n already run: p = 0.0007.

**The same 15 samples buys one ranking as a single study, or three fix cycles
as three iterations** — with ≥96% detection of anything failing 20% of the time
or worse. For a library that ships continuously, the second is obviously the
better purchase.

**And the two critiques already agree, without noticing.** The
record-vs-act critique measured `tosijs/TODO.md` at add:delete 3.8:1 with a
five-month-old entry that decayed into misinformation — *the constraint is the
drain, not the discovery.* Tognazzini says you will find more obvious failure
than you can act on. Both point the same way: **optimise for cheap detection
plus immediate fixing, not for statistical rigour on findings you will not get
to.** Spending budget to rank two good messages while a 0% message sits
unfixed is backwards.

**So the requirement is not "raise n." It is "close the loop."** n=5 per
variant, fix what reads 0, re-run. Escalate to n≥38 only when the remaining
question is genuinely which of two working messages is better — which is a
question you have earned the right to ask.

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
- **n and the PASS/WARN bar are different questions — keep them apart.** n=5
  is right for discovery (see above). But a *threshold* at n=5 is genuinely
  unstable: at a 0.6 bar a degraded 35% passes 23.5% of runs, and four tasks
  at a healthy p=0.8 throw a false alarm 21.2% of runs. **Fix that by
  reporting the rate and the interval rather than a PASS/WARN verdict** — the
  lattice point is the problem, not the sample size. A number that moves is
  actionable; a bar that flickers trains people to ignore it.
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

## The harness is the RESIDUE, not the starting point — so do not start with it

> "The grokkability harness was the generalization of this approach. It was
> adopted precisely because the idea had been tested along the way there." —
> owner

This is the ladder followed correctly, over months, and it runs in the opposite
direction from how this document first described it:

1. **Ad-hoc probes during AJS development**, load-bearing, gating design
   decisions in real time (rung 1 → immediately producing results).
2. **They worked** — two assumptions refuted, the language split into a
   small-model surface and a large-model one (rung 3: an observed result).
3. **Only then** generalised into a named, pinned, opt-in lane (rung 2 as
   *structure*, earned by the rung-3 result that preceded it).

The harness is not a speculative tool hoping to prove itself. **It is the
crystallised form of a method that had already changed a language.** A review
that grades it as an unproven instrument is grading the residue and missing the
programme — which is what happened here, twice, including by me.

**The direct consequence for tosijs: do not build a harness first.** Start with
throwaway probes on the load-bearing question — instrument 0 — let them drive
or kill decisions, and generalise only what earns it. Building the harness
first inverts the ladder: it is *structure before result*, which
`CONTRIBUTING.md` grades as the weaker claim ("is it set up to work" sits below
"does it work"). A tosijs grokkability lane built before a single probe has
told us anything would be a rung-2 artifact with no rung-3 behind it — the
exact shape of the entries this corpus keeps having to retire.

## Sequencing

0. **Probe the thesis first, ad hoc.** Instrument 0, by hand, on one app: can a
   model that has never seen it achieve a goal through `describe()`? No
   harness, no lane, no CI. If the answer is no, that outranks everything else
   in this document.
1. **Apply instrument 1's existing result** — audit the ~92–107 diagnostics for
   a worked correction. Pure message text, no behaviour change, measured
   0% → 80% elsewhere. Needs no harness and no model.
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
