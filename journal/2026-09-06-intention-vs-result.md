# Intention ≠ result — the day the process reviewed itself

*2026-09-06. Outcome review due ~2026-09-20 — predictions below are the grading sheet.*

## What happened

The owner stated the organizing principle: **intention does not equal result; automated
process beats structure beats qualitative assessment** — *does it work* beats *is it set up
to work* beats *does it look like it should work* — and ideas move on that ladder: promote
what demonstrably works toward structure and automation, retire what doesn't. Recorded in
CONTRIBUTING as "The promotion ladder," with the corollary that **category reputation is
middle-rung evidence even for consecrated practices** (TDD measurably trades velocity for
non-guaranteed quality; TypeScript's measured bug reduction is unconvincing; the unit of
evaluation is the specific mechanism in this ecosystem).

The testing corpus was rebuilt around it: **red-when-right is the same defect as
green-when-wrong** (the echo taxonomy: promise / detail / echo, with Google's golden
testing as the zero-information endpoint and its one-click updater as the
chore-streamlined-instead-of-questioned cautionary tale); the **UI streetlight** (easy to
measure ≠ the promise; ARIA/roles are contracts, div-nesting is not); the owner's coverage
confession (**coverage was chased as a goal**) recorded with its corroboration and the
instrument hierarchy (eyeballing the doc system > browser/Haltija lanes > promise-pinning
tests > coverage-shaped tests); then the correction — **the mesh is not worthless**: an
echo's information lives in its scope, out-of-scope reds are the tripwire product, and
that is the real justification for "every failing test is in scope."

The review process got the same treatment, applied to itself:

- **Measured against its consumer** (the owner: "at least as cumbersome as the old one"),
  the tier redesign optimized the wrong term — lenses per run fell 9→4 but rounds per
  release are unchanged (3–4), round-1 BLOCK probability ≈ 1.0 across 11 reports, and
  Tier 1 always-on has never actually been run. Filed as data, not action
  (`reviews/2026-09-06-review-cost-measurement.md`).
- The wave cause was rediagnosed twice: first as clearance-by-judgement (queued question:
  named acceptance checks — "cleared when X passes" — instead of default re-review), then
  deeper by the owner: **remediation happens in appeasement mode, not development mode** —
  fixes shaped like the finding's wording, compliance tests that can't fail. New norm: a
  blocker is a bug report entering the normal loop; reproduce first, ask the class question
  at fix time, and check the third rung — **a repeated blocker is a review of the design,
  not of the fixes** (the redaction series ended at the design level, not the class fix).
- The quarterly batch now **opens by auditing its own previous batch** against consumer
  evidence (lens-8 dispositions + AAR lines — channels that already existed), regress
  bounded by construction.
- Reviewers were pointed at the code's identity: **review it as what it IS**, not as
  deficient React/TypeScript — the review channel is a re-entry vector for rejected prior
  art; findings must ground in a failure here or a principle here, and divergence isn't
  self-justifying either.

Also: tokens classified by capability not pattern (the Mapbox pk. paranoia dissolved into
"anti-freeloading housekeeping"), and the communication norm — **reports carry facts, not
blame or credit**: what happened / why it matters or doesn't / what to do / what needs
deciding and what's at stake.

## Predictions — grade each good / bad / meh at the revisit

1. **AARs exist.** Any release cut after 09-06 has a `reviews/AAR.md` section. If releases
   happened and no AARs did, step 10 failed "does it work" and gets reworked or retired.
2. **Round count drops.** The next BLOCK cycle under the development-mode norm closes in
   ≤2 rounds (baseline: 3–4). If rounds persist, the appeasement diagnosis was wrong or
   the norm doesn't transmit through a prompt.
3. **Tier 1 always-on gets run at least once mid-development** — and if it does, the
   subsequent pre-tag round-1 is *not* an automatic BLOCK. If it still never runs, the
   tier exists on paper only: redesign or delete it.
4. **Scoreboard stays accurate with zero hand-edits** (`--check` clean or tool-refreshed).
   Any hand-edited fact cell = the tool failed its adoption test.
5. **release-doctor's new checks fire or stay silent honestly** — a shipped-imports or
   prefer-online catch on a real repo is promotion evidence; silence is fine; a false
   positive is a defect to fix, not mute.
6. **Cascade prompts: sharper or just longer?** AAR friction lines mentioning review
   length/quality decide; no signal = meh, revert candidates per "a cascade must shorten."
7. **Prior-art rule observable**: at least one refuted prior-art-conformance finding, or
   zero occurrences (fine) — but if reviewers still grade against React/TS conventions,
   the prompt placement failed.
8. **Communication texture drops** — owner's subjective grade; the norm is cheap to keep
   either way, but "meh" means the memory/practice wording needs teeth.
