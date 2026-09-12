# Proposal: the grokkability loop

**Status:** proposal, rung 1 (judgement). Not adopted. Seeking critique.
**Proposed by:** owner, 2026-09-12. Harness already exists in `tjs-lang`.

## The problem nobody inside the project can see

API confusion is invisible from within. Everyone who touches tosijs has
context — the docs, the history, the reason a thing is shaped the way it is.
A confused newcomer is the one reader we never observe, and on a
feature-complete library their experience *is* the remaining product risk.

## The harness exists and its design is the valuable part

`tjs-lang/src/use-cases/ajs-grokkability.test.ts` (277 lines) already does this
for AJS. Four properties are load-bearing and should be copied verbatim in
spirit:

- **ADVISORY.** Reports a success RATE against a bar, PASS/WARN. It never fails
  on the rate. "A small model having a bad run must not block a release — that
  is model variance, not a code regression."
- **PINNED.** Runs against a fixed floor model, so the number means "small
  models can do this," reproducibly, rather than "whatever was loaded managed
  it once." Skips if the pin is not loaded.
- **OPT-IN.** Behind `RUN_GROK_TESTS`; a plain `bun test` never runs it.
- **THE RATE IS THE RESULT.** It replaced a harness whose `withRetry(1-of-3)`
  *passed on a 33% success rate* — it could not distinguish a healthy 90% from
  a degraded 35%. This is the single best idea in it.

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
