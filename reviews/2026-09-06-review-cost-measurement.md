# Review-cost measurement — consumer feedback on the tier redesign

**Status: DATA for the next process batch (per "the series must converge" — no process
change rides with this file).** Owner report, 2026-09-06: *"the new review process has been
at least as cumbersome as the old one thus far."* Measured against the artifacts, the report
is corroborated.

## Numbers (from reviews/ commit timestamps in tosijs and tosijs-ui)

| release | process | rounds | first report → last | round-1 verdict |
| --- | --- | --- | --- | --- |
| tosijs-ui 1.13.0 (09-03) | new tiers | 4 | 08:08 → 14:05 (~6h) | BLOCK |
| tosijs 1.10.0 (09-04) | new tiers | 3 | 08:55 → ~19:49 (~11h) | BLOCK |
| tosijs 1.10.1 (09-06) | new + cascades | 3 | 10:12 → 16:24 (~6h) | BLOCK |
| tosijs 1.9.0 (09-02) | old nine-lens | 3 | 21:39 → 23:17 | BLOCK |
| tosijs 1.8.3 (09-02) | old | 4 | — | BLOCK |

Not measurable from artifacts: per-run token cost (probably did drop — fewer lenses,
scoped verification). But that is the term the owner does not feel.

## Findings

1. **The tier redesign optimized the non-dominant term.** Lenses per run went 9→4;
   rounds per release are unchanged (3–4, before and after). Release wall-clock is set by
   the review→remediate→re-review cycle and by the human reading a 20–30KB report per
   round — neither changed.
2. **Round-1 BLOCK probability ≈ 1.0** (10 of 11 reports in the window are BLOCK; every
   first-round review blocked). A gate whose first red is certain carries little
   information per firing and guarantees every release pays ≥2 further rounds. The
   always-on tier (fast, during development) was designed to drain this pool before the
   gate — the record suggests it is not being run; releases meet their first review cold.
3. **Rounds 2–3 are mostly remediation-introduced findings** ("four majors, all mine";
   "three blockers from the remediation re-review — all three were mine") — the
   incomplete-fix / blocker-cycle class. This is where the hours are, and it is already
   the AAR machinery's declared target.

## Live confirmation, same day (2026-09-06 evening)

A tosijs agent cleared a blocker and requested Tier 0 + cut. Asked by the owner *"did you
solve the blocker problem writ large or simply fix what failed?"*, it answered: *"I just
fixed what failed. I didn't apply the class-level solution I've thought of."* Three
readings, all data for prediction 2: (a) the appeasement-mode diagnosis confirmed in the
wild hours after being recorded; (b) the failure is **transmission, not ideation** — the
class solution existed unprompted; (c) the intervention is one question and it worked
immediately, so it is now wired into the skill's remediation step (the cheapest possible
fix — grade at the revisit whether the wired question fires without the owner present).

## Questions for the batch (not answers)

- Would actually running Tier 1 always-on during development turn round-1 BLOCK from
  certain into informative — or does it just relocate the same cost?
- Can re-review rounds be made cheaper to *read* (delta-reports: only what changed since
  the last round), since report-reading is a per-round human cost the tier cut untouched?
- Does the remediation side need the structural fix (fix-the-class + a test that can fail,
  per the two why-questions) more than the review side needs any further tuning?
