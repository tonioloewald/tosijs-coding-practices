# Accretion audit — 57 days of the corpus, measured

*2026-09-06. Companion to the two entries preceding it; input to the ~09-20 outcome review.*

## The shape

220 commits, 2026-07-11 → 2026-09-06. Corpus: 7,839 lines across 16 practice docs +
README + CONTRIBUTING. 320 `seen in:` attributions. Weekly commit rate ran steady at
~14–24 for eight weeks — then **week 35 (this week) hit 63**, ~3× the norm, driven by the
process conversations themselves.

Churn concentrates in the meta-layer: README (59 commits), review.md (56), releasing.md
(50) — versus observant-model.md (6), model-priors.md (8), tjs-lang.md (8). **Domain
knowledge is stable; process knowledge thrashes.** The convergence problem lives almost
entirely in three files.

## Evidence of outcomes (the ladder observed working)

- **Tag/publish reconciliation** climbed the full ladder: incident (tosijs triple-tag,
  2026-08) → rule ("land the plane") → script (release-doctor), which then caught
  haltija's 10-of-16 unpublished tags. The clearest promote-what-works case in the record.
- **Scoreboard freshness**: recurred as a chore for weeks (rows re-fixed at least four
  times) → automated 09-05 (`scoreboard.ts`), first run caught real drift (tosijs-editor
  0.2.0 vs claimed 0.2.1; floorplan untagged). Rot converted to structure.
- **The correction loop is fast and real**: 18 correction/reversal commits in 57 days.
  Sharpest case — the shipped-imports check added 09-05 **false-positived on correct code
  09-06 morning** (regex matched `import` inside a string; URL specifiers read as
  packages) and was fixed the same day *with a red run and a positive control*, i.e. the
  corpus's own recorded-red-run and honest-gate rules steered the repair of the corpus's
  own tool. Also: the check ran on a real repo within 24h of landing (prediction 5 of the
  09-06 entry already has data).
- **The founder audit's discoveries held**: the composition failure
  (version-by-narrative × review-tax) and the 48h-automation evidence both reshaped
  practice and have not been contradicted since.

## Evidence of rot

- **The retirement quota is not working.** Historical add:delete ratio 18.4:1; since the
  quota landed (09-01): **15.4:1** — statistically the same curve. The quota is "set up to
  work" and measurably not working; either it gets teeth (audits refusing to close without
  retirements) or it gets retired as decoration.
- **Rot flags are sparse**: 5 `as-of`/`UNVERIFIED`/`reconsider-if` markers across 18
  files. The fullScan→strict incident (a stale API claim served for weeks) shows unflagged
  staleness happens; five flags in 7,839 lines means most external claims carry no
  freshness marker at all.
- **The uncomfortable one, stated plainly**: this week's conversations about *reducing*
  process weight produced the largest accretion week in the repo's history. The repo
  warning about divergent series is currently its own biggest divergent term. The ~09-20
  outcome review is the designed correction — it should grade this week's additions
  against their own predictions and retire hard, per the quota it must also start
  enforcing.

## What the ~09-20 review should do with this

Grade the week-35 batch (predictions in the intention-vs-result entry), enforce the
retirement quota on it, and check whether meta-layer churn (README/review/releasing
commits per week) actually fell after the AAR loop — that number is the convergence
measurement, and it now has a baseline.
