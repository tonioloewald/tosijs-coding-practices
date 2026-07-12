# tools/

Executable versions of the practices in this repo.

## `pre-release-review` — the eight-lens release-gate review

The runnable form of [`practices/review.md` → Comprehensive pre-release
review](../practices/review.md#comprehensive-pre-release-review-minor--major). Two pieces:

- **`pre-release-review.workflow.js`** — a Claude Code `Workflow` harness. It fans out eight
  independent lens reviewers (correctness, efficiency, DRYness, docs, test coverage, DX, ecosystem health, practices self-review) over
  `git diff <last-tag>...HEAD`, adversarially verifies every finding, and triages the survivors
  into a `GO` / `GO_WITH_FOLLOWUPS` / `BLOCK` report. Reviewers are read-only.
- **`pre-release-review.SKILL.md`** — a `/pre-release-review` skill that wraps the harness:
  figures out the base tag and bump level, runs the workflow, presents the report, and applies
  the gate (block on blockers, then **route follow-ups by lens** — `TODO.md` for lenses 1–6,
  `UPSTREAM.md` / the upstream repo for **ecosystem** findings, the shared practices repo for
  **self-review** findings).

Lenses 1–6 review the change. **Lenses 7–8 are the compounding ones**: *ecosystem &
abstraction health* asks whether work is happening in the wrong layer (are we hand-rolling
around a missing seam upstream? nascent anti-patterns? friction we've normalized?), and
*practices self-review* asks whether this release contradicted or outdated our own documented
practices. If they return nothing, be suspicious — it usually means nobody looked.

### Install (per developer, user-level so it works in every repo)

```bash
mkdir -p ~/.claude/skills/pre-release-review
cp tools/pre-release-review.workflow.js  ~/.claude/skills/pre-release-review/pre-release-review.workflow.js
cp tools/pre-release-review.SKILL.md      ~/.claude/skills/pre-release-review/SKILL.md
```

Then in `~/.claude/skills/pre-release-review/SKILL.md`, make sure the `scriptPath` in the
"Run the harness" step points at the installed workflow (i.e.
`$HOME/.claude/skills/pre-release-review/pre-release-review.workflow.js` — the shipped copy
uses an absolute path; adjust it to your home directory).

### Use

```
/pre-release-review              # diffs against the last tag, asks for the bump level
/pre-release-review v1.6.8 minor # explicit base + bump
```

Or run the workflow directly:

```
Workflow({ scriptPath: "~/.claude/skills/pre-release-review/pre-release-review.workflow.js",
           args: { baseRef: "v1.6.8", bump: "minor" } })
```

### Tuning

Edit `pre-release-review.workflow.js` to add/remove lenses, change the verify strategy
(e.g. multi-vote for blockers), or set per-lens models. Keep it in sync with
`practices/review.md` — if you change the criteria in one, grep the other.
