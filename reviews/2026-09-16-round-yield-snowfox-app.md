# Round-yield measurement — the instance-fixing signature, from outside the ecosystem

**Status: DATA.** Independent corroboration of the appeasement-mode / incomplete-fix
diagnosis in [`2026-09-06-review-cost-measurement.md`](./2026-09-06-review-cost-measurement.md),
from a different project, a different reviewer, and a different unit of work. The one
practice change it carries — read the *curve* of findings per round, not the count — is
folded into [`practices/review.md`](../practices/review.md) as a sharpening of the existing
class-sweep entry, not a new rule.

Source: **snowfox-app** — a closed-source TypeScript monorepo, not in the scoreboard —
reviewed by GitHub Copilot on pull requests rather than by the nine-lens gate on releases.
Cited by PR number for traceability; no code or customer data reproduced here, and none of
the durable content needs any.

## Why it matters that this is a second project

Everything in the corpus on class-vs-instance fixing traced to **one** review of **one**
project (tosijs-schema v1.5.0, seven waves). Per CONTRIBUTING's evidence grades that is thin
for a rule this load-bearing. This is an independent second observation with no shared cause:
different reviewer (an LLM code reviewer, not our own lenses), different cadence (per-PR, not
per-release), different domain, different people. The prior held.

It also answers, from outside, the question that file left open — *does the remediation side
need the structural fix more than the review side needs further tuning?* Here there was **no**
review-side tuning to blame and the same pathology appeared anyway.

## The measurement

PR #1396: 41 findings over 14 review rounds in two days, still open at the time of counting.
Findings per round, in order:

```
4  2  4  4  1  3  3  1  1  1  4  6  3  4
```

PR #1392, same project: 39 findings over 11 rounds — `2 3 3 4 7 3 2 1 2 2 1`.

Both are **flat**; both peak late (round 12 and round 5). This is the readable form of "each
wave finds one more member of the same class." A converging series decays because each sweep
removes a population; a flat series means every round is sampling an undrained pool.

## The decomposition

41 findings ≈ 4 root causes:

| root cause | findings |
| --- | --- |
| a rule-identity key function that was not injective | 9 |
| a widened type whose readers were never swept | ~17 |
| duplicated logic, each defect reported once per copy | 4 defects → 8 findings |
| localization key/lifecycle | 6 |

Three of the four are already named in the corpus. The **type-widening** one generalizes the
existing gate/validator framing and is worth stating plainly: *widening a type is a breaking
change to every reader of it* — `optional`, `oneOrMany`, and `T | T[]` all invalidate code
that assumed the narrow shape, and the compiler catches only some of it (a `.includes()`
that still typechecks against `string | string[]` has silently become substring matching).
The readers are mechanically enumerable from the type diff; this PR discovered them one
review round at a time instead. Its stated purpose was to stop the types lying about
production data — so the fix list *was* derivable from its own thesis up front.

The **duplicated logic** one is lens 9's severed propagation path, observed from the review
side: when the same logic exists in two surfaces, a competent reviewer reports the same defect
twice and a remediating agent fixes it once. Findings-per-file is the cheap detector.

## Rival explanations, tested and rejected

Both are the reflex reads, and neither survives the numbers. Detail folded into
`practices/review.md` under the round-count rule:

- **"The PRs are too big."** Findings/kloc runs *inversely* to size across 30 merged PRs
  (0.12 at 66k lines; 4.8 at 2k lines; six rounds on a 198-line single-file PR).
- **"It's nit-class noise."** Localization — the suspected culprit — was 3 of ~104 findings
  across nine PRs, and the author confirmed nearly every finding as a genuine defect. (On
  #1396 it reached 6 of 41, but only because that PR reworked a settings UI; it is a local
  cluster, not a systemic tax. And the findings were real: editing a display string to fix
  its punctuation silently orphans the existing translation.)

Worth keeping because both reflexes are *actionable-looking* and both point away from
remediation mode. An agent that reaches for either will reorganize the work and keep the
pathology.

## Open question for the next batch

The 09-06 file logged that the class question, asked out loud, worked immediately — the
failure is transmission, not ideation. That intervention is wired into the skill's
remediation step. **Is the yield curve the cheaper transmission channel?** It needs no
questioner present, it fires from data already in the review thread, and it is a number
rather than a judgement — the promotion ladder's middle rung instead of its bottom one.
Grade it where the wired question has no owner in the room.
