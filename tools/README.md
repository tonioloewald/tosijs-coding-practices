# tools/

Executable versions of the practices in this repo.

## `pre-release-review` — the nine-lens release-gate review

The runnable form of [`practices/review.md` → Comprehensive pre-release
review](../practices/review.md#the-lens-criteria-in-full). Two pieces:

- **`pre-release-review.workflow.js`** — a Claude Code `Workflow` harness. It fans out nine
  independent lens reviewers (correctness, efficiency, DRYness, docs, test coverage, DX, ecosystem health, practices self-review, blast radius) over
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
virta skill install pre-release-review
```

That writes a stub to `~/.claude/skills/pre-release-review/SKILL.md`. The stub runs
`virta skill run pre-release-review`, which prints the current published version and writes
the workflow file to a cache directory; the skill text's `{{skill-dir}}` is filled in with
that directory, so the `scriptPath` is always the published copy.

**There is one copy, and it lives here.** To change the tool, edit the files in this
directory, commit, and publish:

```bash
virta skill publish pre-release-review tools/pre-release-review.SKILL.md \
  tools/pre-release-review.workflow.js --note "<what changed>"
```

Never edit the cached copy: the next run replaces it. An improvement found during a release
run is a commit here, not an edit in place.

**Copies of this tooling must not pin model IDs.** The workflow's `agent()` calls deliberately
omit `model` so every reviewer inherits the session's current model — a copy that pins one
(observed: an adopter pinned `sonnet-4.6`, plausibly around a Vertex AI availability
constraint) silently freezes review quality at that generation and keeps paying the
constraint after it's gone. If a platform limitation genuinely forces a pin, record the
reason and a revisit condition next to it — an unexplained pin is drift, not configuration.
— seen in: a nine-lens adopter's copy, 2026-08

**The install used to be a second copy, and it diverged.** Real release runs improved the
installed copy in place while repo edits landed here: once four improvements were stranded
in the install, and once a whole `dx` tier, found by a critique agent rather than by anyone
diffing. A paragraph asking people to diff both ways did not prevent the second. Serving the
skill from the board removed the second copy (board #115).

### Use

```
/pre-release-review              # diffs against the last tag, asks for the bump level
/pre-release-review v1.6.8 minor # explicit base + bump
```

Or run the workflow directly:

```
Workflow({ scriptPath: "<the dir `virta skill show pre-release-review` names>/pre-release-review.workflow.js",
           args: { baseRef: "v1.6.8", bump: "minor" } })
```

### Tuning

Edit `pre-release-review.workflow.js` to add/remove lenses, change the verify strategy
(e.g. multi-vote for blockers), or set per-lens models. Keep it in sync with
`practices/review.md` — if you change the criteria in one, grep the other.
