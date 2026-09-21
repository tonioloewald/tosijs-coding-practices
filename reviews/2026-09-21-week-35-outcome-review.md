# Week-35 process batch — outcome review (due 2026-09-20, run 2026-09-21)

Grading the 2026-09-05/06 changes against their own predictions
(`journal/2026-09-06-intention-vs-result.md`). Evidence gathered from the sibling repos'
`reviews/` directories and this repo's history. **This review is itself a batch** (the
series must converge): its proposals are at the end, each with what it retires.

## Grades

| # | Prediction | Evidence | Grade |
|---|---|---|---|
| 1 | AARs exist for post-09-06 releases | tosijs (2 entries), tosijs-ui (5), tosijs-editor (3) have `reviews/AAR.md`; **schema, haltija, tjs-lang, tosijs-3d released without one** (1.10.x, 1.12.9, 0.13.12, 0.8.1) | **MEH** — works where adopted; transmission failed to half the fleet |
| 2 | Round count drops to ≤2 under the development-mode norm | tosijs 1.11.0 reached **round 12** (plus 2 dx rounds) — worse than the 3–4 baseline | **BAD** — the diagnosis strengthened (snowfox corroboration, flat curves) but the prose norm did not bite |
| 3 | Tier 1 always-on actually runs | `tosijs/reviews/1.10.3-always-on.md` exists; the dx tier was also invented and run (found a blocker seven pre-minor rounds missed) | **GOOD** — and the tier system grew a tier from lived evidence |
| 4 | Scoreboard stays accurate, zero hand-edits of fact cells | Tool ran repeatedly, caught real drift (editor 0.4.2, platform reset, publishes); kilpi added cleanly by another agent; no hand-edit incidents | **GOOD** |
| 5 | release-doctor checks fire honestly | shipped-imports false-positived on day 2 (regex-in-string), was fixed same day *with a red run and positive control*, then scanned real repos clean | **GOOD** — the honesty machinery worked on its own tool |
| 6 | Cascades sharpen reviews | No direct signal; rounds went up (see 2), no AAR friction line names the cascades | **UNKNOWN → watch** |
| 7 | Prior-art rule observable | Not measured (needs reading verify verdicts across repos) | **UNKNOWN** |
| 8 | Communication texture drops | Owner-endorsed in session; norm referenced by other agents' write-backs | **GOOD** (subjective) |

**Meta-measurements:** commits/week fell 63 → 42 → 30 (converging, not converged);
meta-file churn (README/review/releasing) still 15–19/week — the three-file concentration
persists. Add:delete since 09-07 = **4.5:1** (was 15.4:1 pre-mass-retirement, 18.4:1
lifetime) — the quota now bends the curve **only when someone runs a retirement pass**;
it still doesn't self-enforce.

## The headline finding

Predictions 2 vs 3 tell one story: **structure transmitted, prose didn't.** The tier that
exists as a workflow argument (`tier: "always-on"`, `tier: "dx"`) got used and paid;
the norm that exists as paragraphs (remediate-in-development-mode) was ignored by the very
repo whose waves inspired it, while an outside project (snowfox) independently confirmed
the diagnosis. This is the promotion ladder's own claim, measured on the batch that stated
it: the middle rung ("set up to work" as prose) underperforms the top rung every time.

## Proposals for the owner (each names its retirement)

1. **Promote the AAR step to Tier 0**: release-doctor gains "an AAR entry exists for the
   version being released" (WARN, not FAIL, first season). *Retires:* nothing yet — it
   converts step 10 from prose to check, per the headline finding.
2. **Stop tuning the remediation norm with more prose.** The queued named-clearance-check
   idea (BLOCK states "cleared when X passes") is the structural form; adopt it or drop
   the prediction. *Retires:* the expectation that the two-why prose changes behavior.
3. **Predictions 6/7 get one more season** with explicit AAR prompts, then retire
   unmeasured rules per the death-condition policy.
4. **Virta integration** (separate section in TODO): most of this file's subject matter —
   scoreboard freshness, AAR capture, issue dispositions — becomes virta surfaces; the
   next process batch should be planned as virta-M3 wiring rather than more markdown
   machinery. *Retires (on M3):* scoreboard hand-rules, step-9 ceremony, UPSTREAM
   apparatus remnants, the From: convention.
