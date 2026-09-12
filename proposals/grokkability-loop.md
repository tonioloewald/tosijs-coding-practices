# Proposal: the grokkability loop

**Status:** proposal. **Rung 3 for the transferable findings** (measured in
`tjs-lang/experiments/agent-legibility/`), rung 1 for the tosijs-specific task
corpus. Seeking critique.
**Proposed by:** owner, 2026-09-12. Harness already exists in `tjs-lang`.

## Where this sits in the arc

> "Rapid growth usually leads to bloat and mismatched APIs; then move towards
> simplification and economy." — owner

Grokkability is how you **detect** mismatch from outside. From inside, four
spellings of one idea look like flexibility; to a reader with no context they
look like four things to learn, and the reader's failure is the measurement.
This loop and the leanness loop are the same programme: one finds incoherence
by measuring bytes and reading code, the other by watching someone fail.

## The problem nobody inside the project can see

API confusion is invisible from within. Everyone who touches tosijs has
context — the docs, the history, the reason a thing is shaped the way it is.
A confused newcomer is the one reader we never observe, and on a
feature-complete library their experience *is* the remaining product risk.

## The evidence base is far larger than one test file — and it already answers things

**Correction to the first draft of this proposal, which cited a single test file
and called the approach "not yet proven."** It is the most evidenced thing in
the ecosystem on this question. `tjs-lang/experiments/agent-legibility/` holds a
**717-line `FINDINGS.md`** plus five probe scripts with committed results, run
**2026-07-31 → 2026-08-31**: multiple rounds, two models, explicit replications
(`tjs_bare = 0/5 replicated across two models and three runs`), and confounds
found and corrected between rounds. Four model-based test files live in `src/`,
with `test:grok` and `test:llm` scripts, and `ASSUMPTIONS.md` records the
outcome against assumption A6.

This changes what the proposal should ask for. **We are not proposing to run a
study. The study has been run.** We are proposing to apply results that are
already measured, and to re-run only what is genuinely tosijs-specific.

### The transferable results, as measured

**1. Error messages that name the defect accurately do nothing.**
`error-message-ab.ts`, N=10 per variant, message text the only variable:

| variant | repair rate |
| --- | --- |
| ours + a worked correction | **80%** |
| ours + prose telling you what to do | 50% |
| "that didn't work" | 0% |
| **what tjs ships today** | **0%** |

> *"Our diagnostics perform identically to saying nothing. They are accurate …
> and they cause zero repairs. Accuracy without remedy is decoration."*

**2. Models repair from examples, not from rules.** Same defect, prose remedy
**0/5**; the identical remedy shown as three lines of code **5/5**. Called out
as the third independent experiment pointing the same way.

**3. Naming can do a comment's work — but only where there is no prior to
fight.** And a one-line inline rule moved a construct from 0% to 100%, while
*naming the language without stating the rule was worse than saying nothing*.

### What that implies for tosijs / tosijs-schema, before any new study

These are rung-3 results from a sibling project, not guesses, and each is a
cheap change here:

- **Audit every diagnostic for a worked correction.** tosijs's refusal messages
  are accurate and prose-only — the exact shape measured at 0%. This is message
  text, no behaviour change, with a measured 0% → 80% delta on the tjs corpus.
- **The first example in a doc block is load-bearing**, more than the prose
  around it. `CLAUDE.md` already documents cases where the first spelling a
  reader copies is the wrong one (`textContent: 'path'` sets literal text;
  `disabled: 'path'` is always truthy).
- **Prefer a name over a note** where no existing prior contradicts it.

## The harness design, which is the reusable part

Four properties of `ajs-grokkability.test.ts` are load-bearing:

- **ADVISORY.** Reports a success RATE against a bar. It never fails on the
  rate — "a small model having a bad run must not block a release; that is
  model variance, not a code regression."
- **PINNED.** A fixed floor model, so the number means "small models can do
  this," reproducibly. Skips if the pin is not loaded.
- **OPT-IN.** Behind `RUN_GROK_TESTS`.
- **THE RATE IS THE RESULT.** It replaced a harness whose `withRetry(1-of-3)`
  *passed on a 33% success rate* and could not tell healthy from degraded.

And one warning the corpus repeats in its own headings — *"the apparatus failed
closed and looked like a result"*, *"the apparatus trap, again, in a new
costume"*, two runs lost to it. **The failure mode of this method is the
harness, not the model.**

## What has to change for tosijs

tjs asks **"can a small model PRODUCE valid AJS?"** — one task, one format.
tosijs must ask **"can a model with no context USE this API correctly?"**,
which is many tasks against a large surface. That needs a **task corpus**,
and the corpus is the real design work.

Ranked by where confusion costs most, not by where it is likeliest:

1. **The agent surface and its exposure ladder.** A grokkability failure here
   produces a **security outcome**, not a bug — someone exposes more than they
   meant. This is also the newest and least-worn API. 1.9.0 changed the default
   to expose nothing precisely because the old default was easy to get wrong.
   Start here.
2. **Binding.** `bindText` vs `textContent` with a proxy; the `bind*`
   shortcuts. `CLAUDE.md` already documents that `textContent: 'path'` sets
   literal text and `disabled: 'path'` is always truthy — silent wrong
   behaviour, which is exactly what a naive agent would walk into.
3. **Components.** `content()` vs `render()`; `initAttributes` vs
   `withAttributes`.
4. **The dual proxy.** `app.name = 'Ada'` vs `app.name.value = 'Ada'`. Known to
   confuse TypeScript; worth learning whether it confuses readers.

## What a finding looks like

A **failed task with a transcript**, not an opinion. "4 of 5 attempts bound a
literal string instead of a path, and the doc block's first example is the one
they copied." That is actionable: it names the fix (the example), not a vibe.

Outputs split the same way as the leanness loop: zero-cost (error message,
doc-block opening, an export renamed before anyone depends on it) and worth-it
breaks (→ the 2.0 purge inventory).

## The guard this needs and tjs's version does not

A model is not a user. Its confusion is **evidence, not proof** — small models
fail for reasons that have nothing to do with our API (context limits,
formatting drift; tjs's harness carries `fixCommonMistakes` for exactly that).

**Only act on a failure that is explicable** — where you can point at the thing
that misled it, and that thing is ours. "The model guessed wrong" is not a
finding. "The model did what our first example shows, and our first example is
wrong" is.

## Promotion and retirement

Rung 1. To promote: **→ structure** as a pinned task corpus with a recorded
baseline rate per API; **→ automation** as an opt-in script run on a cadence,
reporting rate movement rather than absolute pass/fail — the thing tjs already
proved works.

**Retire if:** the rates never move, or every failure it reports turns out to
be model variance rather than an explicable API defect.

## Which packages this is for

- **tosijs-schema is arguably the best first target, ahead of tosijs.** It has
  the ecosystem's only non-owner issue ([#10](https://github.com/tonioloewald/tosijs-schema/issues/10),
  `anssip`, 2026-09) — an actual outside reader, which is the population this
  loop simulates. Schema APIs also fail *silently and permissively*: the
  package's own history is a run of constraints that were accepted and not
  enforced. "Did the model write a schema that validates what it thinks it
  validates?" is a sharp, checkable task, and wrong answers are invisible
  without exactly this kind of probe.
- **tosijs-ui** — components are the surface a newcomer meets first.
- **tosijs** — the agent surface, per the ranking above.

## Open questions for reviewers

- Is a small local model a good proxy for a confused human, or a different
  distribution whose failures mislead us?
- The corpus is the expensive part and it will rot as the API changes. What
  keeps it honest — is it generated from the doc blocks?
- Should this run against the **published docs** (what a newcomer actually
  reads) rather than against source, since the doc site is the real front door?
