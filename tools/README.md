# tools/

Executable versions of the practices in this repo.

## `pre-release-review` — the tiered release-gate review

The runnable form of [`practices/review.md` → Comprehensive pre-release
review](../practices/review.md#the-lens-criteria-in-full). Two pieces:

- **`pre-release-review.workflow.js`** — a Claude Code `Workflow` harness. It fans out
  independent lens reviewers over `git diff <base>...HEAD`, adversarially verifies the
  findings that change the release decision, and triages the survivors into a `GO` /
  `GO_WITH_FOLLOWUPS` / `BLOCK` report. Reviewers are read-only. The `tier` argument picks
  the lenses:
  - `always-on` — correctness, **security**, blast radius. Every substantive change.
  - `pre-minor` — adds efficiency and docs. Once per coherent body of work, before its tag.
  - `dx` — dx, docs, coverage, dryness. `idiom` — tosijs idiom. `quarterly` — ecosystem
    and practices.
  Tier 0, `tools/release-doctor.ts`, is a mechanical script that runs before any of them.
- **`pre-release-review.SKILL.md`** — a `/pre-release-review` skill that wraps the harness:
  figures out the base and the tier, runs the workflow, presents the report, and applies the
  gate.

Older copies describe **nine lenses** (correctness, efficiency, DRYness, docs, coverage, DX,
ecosystem, practices, blast radius). That version had **no security lens**: security was a
framing inside correctness plus a separate `/security-review`. The dedicated lens arrived
with the tiers, and now runs on every substantive change. A copy that still says "nine lens" should be replaced with this one.

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
