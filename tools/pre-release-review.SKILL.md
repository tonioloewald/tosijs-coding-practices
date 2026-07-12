---
name: pre-release-review
description: Run the eight-lens comprehensive pre-release review before a minor or major version bump — correctness, efficiency, DRYness, documentation accuracy, test coverage, developer experience, ecosystem/abstraction health, and practices self-review — as independent adversarially-verified passes over the diff since the last release, ending in a GO / GO-with-followups / BLOCK recommendation. Use when preparing a release, cutting a version, or when the user asks for a release review / pre-release check. Part of the shared tosijs-coding-practices process (practices/review.md).
---

# Pre-release review

A structured, multi-lens release-gate review. It runs **eight independent reviews** over the
diff since the last release, **adversarially verifies** each finding, and returns a triaged
report with a **GO / GO_WITH_FOLLOWUPS / BLOCK** recommendation.

**Lenses 1–6 look at the change:** correctness, efficiency, DRYness, documentation accuracy,
test coverage, developer experience.

**Lenses 7–8 look outward and inward** — and they are the compounding ones:
- **Ecosystem & abstraction health** — is work happening in the wrong layer? Are we hand-rolling
  around a missing seam in tosijs / tosijs-ui / tjs-lang / the build system? Nascent
  anti-patterns, compensating complexity, friction we've normalized.
- **Practices & process self-review** — did this release contradict or outdate our own
  documented practices? What did we learn that belongs in the knowledge base?

Canonical process doc: `tosijs-coding-practices/practices/review.md` → "Comprehensive
pre-release review". This skill is the executable version of it.

## When to use

- Before any **minor or major** version bump (patches get a lighter correctness + docs pass).
- Whenever the user asks to "review before release", "do the release review", "pre-release
  check", etc.

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
     args: { baseRef: "<tag>", bump: "<patch|minor|major>" }
   })
   ```
   It fans out eight lens reviewers in parallel, verifies each finding adversarially, then
   triages. It runs in the background and notifies you when done.

6. **When it completes, present `reportMarkdown`** to the user verbatim (it's the deliverable),
   then state the `recommendation` plainly.

## Acting on the result

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
| **ecosystem & abstraction health** | this repo's `UPSTREAM.md` (Context + Suggestion) and/or a fix/issue in the **upstream** repo (tosijs, tosijs-ui, tjs-lang, …) |
| **practices & process self-review** | a change to the shared **`tosijs-coding-practices`** repo (and grep its cross-cutting docs for parallel mentions), and/or this repo's `CLAUDE.md`/`AGENTS.md` |

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
- Scale: `patch` → run it but expect a light pass; `minor` → all eight lenses; `major` → all
  eight + completeness critic + subsystem-level (not just diff) review.
- To tune cost/depth, edit the bundled `pre-release-review.workflow.js` (lens list, verify
  strategy, models).
