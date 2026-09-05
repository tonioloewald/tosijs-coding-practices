---
name: pre-release-review
description: Run the tiered pre-release review over a substantive diff — Tier 0 is the mechanical `release-doctor` script, then independent adversarially-verified lens passes (always-on: correctness + blast radius; pre-minor adds efficiency + security; quarterly: ecosystem, practices and the structural audit) ending in a GO / GO-with-followups / BLOCK recommendation. Trigger on the WORK, not the version letter: run it for any substantive change, and before cutting any tag. Use when preparing a release, cutting a version, after remediating a BLOCK, or when the user asks for a release review / pre-release check. Part of the shared tosijs-coding-practices process (practices/review.md).
---

# Pre-release review

A structured, multi-lens release-gate review. It runs independent lens reviews over a diff,
**adversarially verifies** the decision-changing findings, and returns a triaged report with a
**GO / GO_WITH_FOLLOWUPS / BLOCK** recommendation.

**The lens set is chosen by `tier`, not by the version letter** (see step 5). Measured over 28
runs / ~1,100 findings: correctness + blast-radius produced 62% of blockers and every
irreversible one; ecosystem + practices produced **0** blockers in 28 runs at ~24% of finding
volume; the duplicate rate across lenses was 27%. So the cheap always-on tier is two lenses, the
pre-tag tier is four, and the compounding-but-never-blocking lenses moved to a standing
quarterly job. Full data: `reviews/2026-09-practices-audit.md`.

Canonical process doc: `tosijs-coding-practices/practices/review.md` → "The tiered review
structure". This skill is the executable version of it.

## When to use

**Trigger on the work, not the version letter.** Two recorded gate-dodges came from choosing the
letter first and inheriting a weaker gate; the version number follows the narrative
independently (`releasing.md`).

- **Any substantive diff** — `tier: "always-on"`, `depth: "fast"`. Cheap enough to be routine.
- **Before cutting any tag** — `tier: "pre-minor"`, `depth: "full"`. Once per coherent body of
  work, whatever the bump turns out to be. A patch is not exempt: 0.6.5 was a patch that
  shipped a broken tarball.
- **After remediating a BLOCK** — re-run scoped to what each blocker named, which defaults to
  correctness + blast-radius **over the remediation diff only**. Re-reading the whole span is
  where review waves come from. A blocker whose fix is mechanical needs nothing beyond Tier 0.
- Whenever the user asks to "review before release", "do the release review", "pre-release
  check", etc.

**Before any model review, run Tier 0** — `bun tools/release-doctor.ts` from the project root.
It is free and mechanical, and ~20% of all blockers were script-detectable.

**Check the diff basis before any lens runs.** A dirty working tree means the lenses will review
the wrong thing: one recorded run reviewed a 13-line committed diff while the entire release sat
uncommitted, so nothing that shipped was reviewed. And reproduce any red suite from a **fresh
install** before treating it as a code defect — a stale `node_modules` has faked one twice.

## How to run it

1. **Confirm you're in the target git repo** and the working tree is committed (the review
   diffs against a release tag; uncommitted work should be committed or stashed first so the
   diff is meaningful).

2. **Determine the base ref** (what to diff against — the last release):
   ```bash
   git describe --tags --abbrev=0 2>/dev/null || echo main
   ```
   Use that tag as `baseRef`. If the user named a base, use theirs.

3. **Determine the bump level** — `patch`, `minor`, or `major`. Infer from the intended
   version if known, otherwise ask the user. `major` adds a completeness-critic pass and
   widens review beyond the diff to affected subsystems.

4. **Sanity-check there's something to review:**
   ```bash
   git diff --stat <baseRef>...HEAD
   ```
   If empty, tell the user there's nothing to review and stop.

5. **Run the harness** — invoke the **Workflow** tool with the bundled script:
   ```
   Workflow({
     scriptPath: "/Users/tonioloewald/.claude/skills/pre-release-review/pre-release-review.workflow.js",
     args: { baseRef: "<tag>", bump: "<patch|minor|major>", depth: "full" }
   })
   ```
   It fans out the selected tier's lens reviewers in parallel, verifies the decision-changing
   findings adversarially, then triages. Runs in the background; notifies you when done.

   **`depth` controls cost, and it's the knob to reach for when iterating.** Verification is
   ~70% of the run, so within a tier it scales by how much it verifies, not by cutting
   lenses:
   - `depth: "fast"` — verify **blockers only**; majors and below ship reported-but-unverified.
     ~60% cheaper. This is the **every-iteration** check: "am I about to embarrass myself?"
   - `depth: "full"` (default) — verify **blocker + major**. The **pre-tag** gate. ~35% cheaper
     than the old verify-everything behavior; minor/nit are never adversarially verified.

   **`tier` selects the lens set** (reviews/2026-09-practices-audit.md D2). Run
   `bun tools/release-doctor.ts` (Tier 0, free, mechanical) before ANY model review:
   - `tier: "always-on"` + `depth: "fast"` — correctness + blast-radius, for any substantive
     change; never keyed to the version letter.
   - `tier: "pre-minor"` (default) + `depth: "full"` — adds efficiency + security; the
     once-per-coherent-body-of-work gate. Re-reviews after remediation scope to the
     remediation diff only, per each blocker's stated re-review scope.
   - `tier: "quarterly"` — ecosystem + practices dispositions; a standing job with a
     deadline, never a release gate. The structural audit (redundant code paths, examples
     audit, style conformance, render-creep) runs at this cadence too, as does the **AAR
     pattern review** — reading the short after-action reports each release appends to
     `reviews/AAR.md` (releasing.md step 10) for patterns and opportunities. Per-release
     reviews record facts; this pass does the analysis, in one bounded batch — process
     changes originate here only, and each batch names what it retires.

   A run you're going to repeat several times during a release should be `fast`; the one right
   before you cut the tag should be `full`. If cost is making you skip the review entirely, use
   `fast` — a cheap review that runs beats a thorough one that doesn't.

6. **When it completes, present `reportMarkdown`** to the user verbatim (it's the deliverable),
   then state the `recommendation` plainly.

## Acting on the result

- **File the report FIRST, before acting on any finding**: copy `reportMarkdown` to
  **`reviews/<version>-<slug>.md` at the repo ROOT** and commit it. A report at a
  session-scratch path is one cleanup away from gone, and it is the only artifact recording
  what was found and *not* fixed.

  ⚠️ **NOT `docs/reviews/`.** In every `tosijs-ui/site` project `docs/` is the generated
  site root: it is wiped on each build and served publicly. That path destroyed a 0.7.0
  report about ninety seconds after it was written, and the alternative outcome was worse —
  publishing a "Verdict: BLOCK" report naming an adopter to the open web. Excluding it from
  the npm tarball does not address that; publication is the exposure, not packaging.

  Before committing, confirm the chosen path is outside both `files` (npm) **and**
  `docPaths`/the site's output dir (the web).
- **BLOCK** → do not cut the release. Walk the blockers; fix them (or get the user to), then
  re-run.
- **GO_WITH_FOLLOWUPS** → the release can proceed, but **file every follow-up** before moving
  on. Never let a deferred finding evaporate — "reviewed and fine" and "reviewed, deferred,
  tracked" are different outcomes and the user must see which.
- **GO** → proceed to the release flow (`practices/releasing.md`).

**Route follow-ups by lens — they do not all go to `TODO.md`:**

| Lens | Destination |
| --- | --- |
| correctness, efficiency, DRYness, docs, coverage, DX | fix now, or this repo's `TODO.md` |
| **ecosystem & abstraction health** | a **GitHub issue on the upstream repo** (`gh issue create -R tonioloewald/<target>`), mirrored in this repo's `UPSTREAM.md` with the issue URL. **Never edit the other repo** — file, don't fix. Also close any incoming issue this release fixes, naming the version. |
| **practices & process self-review** | a **direct edit** to the shared **`tosijs-coding-practices`** repo (it is the standing exception to file-don't-fix — filing an issue there is a deferral, not a write-back; grep its cross-cutting docs for parallel mentions), and/or this repo's `CLAUDE.md`/`AGENTS.md`. The write-back must **name the commit range it covers** (`<base>..<sha>`, `<sha>` = the reviewed repo's HEAD at write time) — without the range, staleness has to be noticed instead of checked, and it is not noticed |

Lenses 7–8 rarely block a release — they **compound**. If they returned no findings, be
suspicious: it usually means nobody looked. Surfacing "we are working around a missing seam in
tosijs-ui" is often the most valuable output of the whole review.

## Non-negotiable: failing tests are never dismissed

Every red or skipped test the review surfaces is **in scope**, even if it looks unrelated to
the change. A change easily slips out of context and causes a downstream failure that then
gets waved away as "pre-existing" or "not mine." Treat every failing test as a finding:

- **Fix it if it's easy** — do it now.
- **If it's not easy, flag it explicitly** (failing test + suspected cause) **and still
  schedule the fix** in `TODO.md`. Lower priority is fine; dropping it is not.

## Notes

- The reviewers are read-only (they run tests/builds only to observe; they never edit or
  commit). All fixing happens after the review, deliberately.
- **Stay in this repo.** Ecosystem findings are **filed as issues on the upstream repo**, never
  fixed by editing it. Wandering into another repo needs a specific reason and human signoff.
- **`bump` does not select the gate — `tier` does.** `bump` is passed through for the report's
  framing only. The completeness critic (which names what was *not* reviewed, starting with
  whether the diff basis is even the change about to ship) runs on `tier: "pre-minor"` — the
  pre-tag gate, whatever letter the release ends up wearing. It used to be gated on
  `bump === "major"`, which put the strongest pass behind a decision the release had already
  made about itself.
- To tune cost/depth, edit the bundled `pre-release-review.workflow.js` (lens list, verify
  strategy, models).
