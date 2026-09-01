# Practices audit — folklore review & nine-lens economics

*2026-09-01. The audit the founder-audit demanded: every practice entry graded by evidence,
rule compositions checked, and the nine-lens review measured against its own output. Method:
two graders over all 16 practice files (every H2/H3 and major rule graded A incident-derived /
B decree / C untested-or-imported), one miner over 28 review runs across 6 releases (~1,100
findings). This document is the decision queue; verdicts belong to the owner.*

## Headline numbers

- **~445 entries graded: ~218 A (49%), ~174 B (39%), ~53 C (12%).** Half the corpus is
  decree or untested. Files range from `testing.md` (strongest evidence density) to
  `observant-model.md` (**zero attributions** — and it's the file everything else says to
  read first) and `dependencies.md` (one attribution in 496 lines).
- **Nine-lens: 28 runs, 27 BLOCK, 1 GO_WITH_FOLLOWUPS, 0 GO.** 4.7 review waves per gated
  release. Follow-up completion ~28% generous, ≤14.5% where the data is clean.
- **Blocker attribution (~55 attributable):** correctness ~28, docs ~7 (all mechanical),
  blast-radius ~6 (highest-consequence in the corpus), coverage 3 (all "the suite is red"),
  dx ~3 (all co-claimed), efficiency 2, dryness 1, ecosystem 1, **practices 0**.
  **~20% of all blockers were script-detectable.** Duplicate rate ~27%; one finding was
  independently reported by eight lenses.

## An honest caveat on the grades

**B ≠ wrong. B = untested.** And the method has a structural blind spot: *preventive* rules
never accumulate incidents precisely when they work — the boundary rule's zero-incident
record may be deterrence succeeding, not folklore (session evidence shows attempted
violations that were caught: "file it against haltija ffs"). The audit distinguishes poorly
between "never tested" and "tested by the absence of disasters." Proposed fix: a fourth
grade, **K (constitutional)** — rules whose justification is structural (the boundary rule,
append-only history, merge-not-rebase) rather than incidental. They still get composition
review; they stop being counted as folklore.

## Fixed outright (factual, verified against source)

- `performance.md` tosijs-schema entry: `{ fullScan: true }` → `{ strict: true }` (verified
  `schema.ts:602`); the "don't fix the skipped `maxProperties` check" instruction reframed as
  an open question — it contradicted `review.md`'s fail-open doctrine (D1 below).

## Decision queue

**D1 — `maxProperties` divergence (residual of the fixed defect).** Where validation is a
gate, a documented-but-unenforced keyword is fail-open by the KB's own doctrine. Options:
enforce it, make `strict` enforce it, or refuse at construction. Belongs as a tosijs-schema
issue. *Recommend: file it.*

**D2 — Nine-lens restructure** (the big one — full data in §Nine-lens below).
*Recommend adopting the four-tier split:*
- **Tier 0, script (free, every commit):** tests green · typecheck green · build succeeds ·
  CHANGELOG has an entry for `package.json.version` · not N commits stale · license present ·
  no unresolved `Verdict: BLOCK` report for a version ≤ current · **tag-without-publish
  divergence check** (land-the-plane, mechanized). Retires lenses 4 & 5 from the model tier
  (zero judgment-blockers between them; every blocker they found is on this list).
- **Tier 1, always-on (`depth: fast`, every substantive push/patch):** correctness +
  blast-radius (62% of all blockers, every high-consequence one) — **never keyed to the
  version letter** (two recorded gate-dodges came from letter selection).
- **Tier 2, pre-minor (`depth: full`, once, plus remediation-diff re-review only):**
  efficiency + **a new security lens** (four repos independently asked; better implied
  blocker record than dryness+dx+coverage+ecosystem+practices combined). DRY and DX fold
  into correctness/blast-radius as framings, not separate agents (27% duplicate rate; DX
  never originated a blocker). Lens 0 becomes a once-per-project recorded artifact.
- **Tier 3, quarterly standing job (off the release path):** ecosystem (7) + practices (8) —
  0 blockers in 28 runs, ~24% of finding volume, identical findings re-printed across
  consecutive reviews, ≤12.5% completion. Give them a deadline and an owner instead of a
  release to block.
- **Structural, regardless of tiers:** re-review the *remediation diff*, not the whole span
  (four runs found blockers introduced by the previous wave's own fixes); estimated
  ~50–65% cost reduction preserving ~95% of historical blocker yield.

**D3 — Version-by-narrative** (B: its only citation is an application, not an incident; one
half of the known corruption composition). *Recommend: keep the narrative rule, but adopt
D2's decoupling so the review gate never keys on the letter — that dissolves the composition
without relitigating the rule.*

**D4 — "Responsibility scales with the MEASURED user base."** Keep the instruments verbatim
(A-grade). Re-derive the disposition policy: as written it pre-grades the ecosystem's
most-recurring defect class (publish-integrity) as bookkeeping, and it's self-fulfilling —
unlanded releases prevent the consumers that would raise the grade. *Recommend: severity
scales with audience, but* sequencing *doesn't — land-the-plane outranks the calibration; a
publish-integrity divergence always blocks further version work on that package (Tier-0
check makes this mechanical).*

**D5 — model-priors #9 trust hierarchy** ("tosijs and b8r are beyond question"). Instructs
agents to exclude the most-depended-on library (17 manifests) from the hypothesis space;
`dependencies.md` §12 is a worked counterexample. *Recommend: rewrite as "check last, but
check — and to claim the source is wrong, measure the source."*

**D6 — Constitutional grade.** Adopt grade K (above) for: boundary rule + standing
exception, append-only history, merge-not-rebase, the three-artifacts taxonomy.
*Recommend: adopt; ends the "folklore protecting folklore" ambiguity by naming what the
constitution is.*

**D7 — documentation-surface.md** (PROPOSAL banner, six C entries, five open questions —
routed by README as the canonical answer). *Recommend: promote the two evidenced parts
(generate-from-source w/ the tosijs-schema coverage incident; the naming-harness method with
its honest 3-of-4-predictions-wrong result) into development.md; mark the rest explicitly
experimental; fix the README routing.*

**D8 — Retirement batch 1** (the quota — this audit confirms ~218 entries; it should retire
comparably or say why not; here's the why-not for most and the batch for the rest):
- **Essays → the journal/book.** The disposal-tax essay (~80 lines, all-external evidence),
  observant-model's theory sections ("one substrate," the trust dial), and the small-API
  asymmetry essay are *good thinking in the wrong container*. The book the site will vend is
  the natural eviction path: practices stay operational, essays keep their value. *This is
  the structural answer to the 20:1 ratio.*
- **Delete/stamp stale facts:** Cloudflare-skills bullet (names products no project uses);
  `00-stack.md` Bun-mid-rewrite (stamp `as-of` or delete); editor2 deploy-shape row (verify
  against the repo, fix the stale twin); "no CI" framing (review.md already killed it —
  finish the job in 00-stack and releasing's opening); model-priors #7 rewritten against
  shipped 1.8.x rather than "2.0".
- **Dedupe the six recorded DRY violations** (bundle-size ×2, idleTimeout ×2, deprecation
  ×3, content/render ×3, light-vs-shadow ×3, haltija-live-testing ×2): one canonical home
  each, links elsewhere.
- **Local-tarball apparatus** (six rules from one observation, never used): collapse to two
  sentences + keep the three A-grade traps.
- **review.md cost-adders with no observed payoff** (refuted-finding second-order analysis,
  instrument-invalidation re-runs, completeness critic, 7b footprint glance, lens-8 read
  direction): demote from obligations to "worth asking when the situation arises" — D2's
  tiering absorbs the rest.

**D9 — testing/state-and-schema "duplicate a pure copy into the test file"** directly
prescribes what lens 9 flags as the severed-propagation defect (and the KB's one recorded
instance — `bin/hj.mjs` vs tested `src/sessions.ts` — is exactly this shape). *Recommend:
rewrite to "extract the pure module and import it from both" (the tosijs-3d pattern), with
the copy-into-test form allowed only as a spike.*

**D10 — tosijs-product has never been reviewed** (no reviews dir, TODO with zero
checkboxes). Either the control group or the gap. *Owner call; if control group, say so in
the scoreboard row — it's actually useful data.*

## Nine-lens: the evidence in brief

Value concentration: correctness + blast-radius ≈ 62% of blockers and all of the
irreversible-consequence ones (TLS private key staged for release, out-of-tree file
overwrite reporting success, destructive deploy, SIGKILL of stranger processes). Docs and
coverage blockers: 100% mechanical. Practices lens: 0 blockers ever; its and ecosystem's
findings re-print verbatim across consecutive reviews ("10 open issues, 0 dispositions" ×3
runs unchanged). Recorded route-arounds in shipped artifacts: tosijs-ui 1.9.9 (letter-dodge,
caught only by a human), haltija's session surface ("capability ships as a patch… minors are
for when the nine-lens gate has run" — stated plainly), two tag-before-review incidents,
one publish-before-gate-cleared. The skill's own text anticipates abandonment ("a cheap
review that runs beats a thorough one that doesn't"). No token/duration costs recorded
anywhere — worth instrumenting in the Tier-1 harness from day one.

## Verdicts (owner, 2026-09-01)

**All recommendations accepted** (D1–D9, including the DRY amendment to D2). **D10: tosijs-product
gets reviewed** — not a control group; schedule it under the new tiers.

Three additions from the verdict discussion:

- **Examples audit** (per project, part of Tier 3): does the sample code exemplify current best
  practices? Observed failure: tosijs-ui's examples emit deprecation warnings on load — examples
  teaching deprecated API are anti-documentation. Connects to the existing doc-example test
  discipline (testing.md); the audit extends it from "examples run" to "examples exemplify."
- **Style guide**: a general "what does good code look like here" distillation (code-quality.md
  owns it), with per-project deltas living in each project's CLAUDE.md (link-don't-paraphrase).
  Tier 3 checks conformance drift.
- **Render-creep measurement** (Tier 3, tosijs component projects): the philosophy says the DOM
  stays static by default and `render()` should rarely be needed, yet render-heavy code creeps
  into component leaves. The owner's hedge is recorded: it may be judicious. So the check is a
  *characterization*, not a presumption — count and classify `render()` usage in leaves
  (judicious vs drift), report the distribution, and only then argue.

## What this audit retired, added, and still owes

Added: grade K proposal, the security lens proposal, this document. Fixed: one factual
defect. Retirement owed: batch D8 awaits verdicts — the audit's own quota rule applies to
it, and the journal/book path means retirement need not mean deletion.
