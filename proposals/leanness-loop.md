# Proposal: the leanness loop

**Status:** proposal, rung 1 (judgement). Not adopted. Seeking critique.
**Proposed by:** owner, 2026-09-12. Drafted from the tosijs 1.11.0 release.

## The premise that makes this worth doing

> "tosijs and tosijs-ui are both at the point where they have very few more
> features needed, so it's a question of relentless polishing." — owner

Every review lens we have reviews **a diff**. That is the right shape while a
library is growing: the risk arrives with the change, so the gate sits on the
change. A feature-complete library inverts it. The remaining risk is not in
what arrives — it is in what accumulated and nobody revisited, and no process
we own ever looks at that.

This proposes a **search**, not a gate: no diff, no base ref, no release
attached. It reads the library as it stands and asks what could be smaller,
faster, or simpler.

## Three buckets, and the third is not a separate list

1. **Zero-cost leanness** — smaller or faster with no consumer-visible change.
2. **Zero-cost clarity** — a simpler or more obvious API with no break: a
   better default, a clearer error, a narrower type that still accepts every
   spelling people actually write.
3. **Worth-it breaks** — with an explicit benefit/cost, *fed into the existing
   `TODO.md` "2.0 — THE PURGE INVENTORY"* rather than a new list. That
   inventory exists because a previous purge happened without one; a second
   parallel list would reproduce the problem it was created to solve.

## The load-bearing rule: every finding carries a measurement

Without this the loop is a refactoring-suggestion generator, and on mature code
that is a **churn engine**.

We have direct evidence of the failure mode. tosijs 1.11.0 took **eight review
rounds**, and in three consecutive rounds the remediation introduced a defect
the previous round had not had — a straight trade on a label wrapper, a
permanent over-redaction from a containment guard, a leak reopened by a
narrowing. That happened with an *external defect forcing each change*. A loop
that goes looking for improvements has the same failure mode with nothing
forcing it.

So: a finding is not "this could be smaller." It is **"−N bytes gz / −N µs,
here is the diff, here is the test that still passes."** No number, no finding.

**Prerequisite, and it is missing:** tosijs has per-bundle gzip budgets and a
build-emitted delta table (both added 2026-09), so the *size* half is
measurable today. There is **no benchmark harness** — so every "more efficient"
claim is currently unfalsifiable. Building one is a precondition for half this
loop, not a nice-to-have.

## Reuse the machinery, do not build parallel machinery

This should be a **lens in the existing pre-release-review workflow**, not new
infrastructure. That workflow already has the lens pool, adversarial
verification, triage, report filing and follow-up routing. Two things are
genuinely missing:

- a **no-diff mode** (today `baseRef` is required and the prompt is built
  around `git diff`), and
- a **required measurement field** on findings from this lens.

Cadence: the `quarterly` tier, which already means "compounding, never
release-gating."

## Bias to record, not to act

Output is a **ranked inventory**, not a branch. A human picks what to do. Given
the churn evidence above, a loop that opens PRs on a mature library is a worse
idea than one that maintains a list somebody chooses from.

## Promotion and retirement

Rung 1 today (a judgement that this is worth doing). To promote:

- **→ structure:** a lens with a mandatory measurement field and a fixed
  bucket taxonomy.
- **→ automation:** the size half is already automatable — the build emits
  per-bundle deltas, so "what grew and why" could be generated rather than
  reviewed. Start there; it is the rung the corpus says to aim for.

**Retire if:** three consecutive runs produce no finding that survives the
measurement bar, or any finding it produced is later implicated in a defect.
Both outcomes are more informative than keeping it out of politeness.

## Which packages this is for

Not tosijs-specific. The trigger is **"feature-complete," not "important"** —
a package still growing should keep being reviewed on its diffs.

- **tosijs** — the case this was drafted from.
- **tosijs-ui** — same state per the owner; larger surface, more components,
  so the size half likely pays more.
- **tosijs-schema** — feature-complete, and the one where bucket 2 (clarity
  without a break) may matter most: its defect history is dominated by
  **fail-open** behaviour (1.5.x validators, `oneOf`/`exclusiveMinimum`
  silently ignored until 1.8.0, `maxProperties` a "ghost constraint" until
  1.9.0). A schema that quietly accepts what it should reject is a clarity
  defect with teeth, and `unenforcedKeywords()` already exists as the
  honest-enumeration answer — evidence this package responds well to this kind
  of pass.

## Open questions for reviewers

- Is "no diff" actually workable, or does an unbounded search fabricate? What
  bounds it — one subsystem per run? A file budget?
- Does the measurement requirement kill bucket 2? "Simpler API" has no unit.
- Is the churn risk real enough to justify record-only, or is that
  over-caution that makes the loop worthless?
