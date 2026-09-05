# Contributing to shared practices

This repo is only useful if it stays **true, concise, and reused**. Follow this protocol
whether you are a human or an agent.

## What belongs here

A practice belongs here when it is:

- **Durable** — it will still be true next month, not a one-off workaround.
- **Cross-project** — it helps, or could help, more than one project. Project-specific
  facts belong in that project's `CLAUDE.md`/`AGENTS.md`, not here.
- **Actionable** — it tells the reader what to *do*, not just what exists.
- **Traceable** — it comes from real usage. Cite the project(s) it was learned in.

If a "practice" is really a preference with no rationale, it does not belong here. Every
entry should answer *why*, so the next reader can tell when it stops applying.

## How to add or change a practice

1. **Find the right doc.** One topic per file under `practices/`. If it spans two, put it
   where a reader would look first and cross-link with a relative link.
2. **Write it as guidance**, not narrative. Prefer: *do X because Y; the trap is Z.*
3. **Attribute it.** End the entry with `— seen in: project-a, project-b`. This is how we
   tell a battle-tested pattern from a guess.
4. **Deduplicate — and grep for the parallel mention.** If it overlaps an existing entry,
   sharpen that entry instead of adding a parallel one. Contradictions are bugs — resolve
   them, don't stack them. In particular, **when you correct a project-specific entry, grep
   the cross-cutting docs for the same fact** (`deployment.md`, `performance.md`,
   `code-quality.md`, `00-stack.md` often restate a project detail from a broader angle) and
   fix every copy in the same change — a fix that leaves a stale twin is a new inconsistency.
5. **Keep the stack honest.** If a project legitimately diverges from the assumed stack
   (`practices/00-stack.md`), record the divergence and the reason under that doc's
   "Known divergences" — do not quietly rewrite the default.

## Evidence grades, compositions, and the right to retire

Adopted 2026-09-01, after an audit found the corpus at a 20:1 add:delete ratio with zero
entries ever retired — and found that the owner's own assertions entered as law with no review.

- **Grade K (constitutional):** some rules are justified structurally, not incidentally —
  the boundary rule, the practices-repo standing exception, append-only history,
  merge-never-rebase. Preventive rules never accumulate incidents *precisely when they
  work*, so grading them "decree" mislabels deterrence as folklore. Mark them K; they are
  exempt from incident-evidence expectations but **not** from composition review.
- **Every entry has a provenance, and it matters.** Incident-derived entries (a named project,
  what happened, the consequence) are the gold standard. **Owner decrees** ("rule set by the
  owner") are legitimate but *provisional* — they get the same eventual scrutiny as any agent's
  claim, because the founder is the one contributor nothing else audits. **External/imported**
  entries (marked `external:`) are hypotheses until an ecosystem incident vindicates them.
- **Review rules in composition, not just in isolation.** Two individually-sound rules can
  compose into a bad incentive (observed: version-by-narrative × nine-lens-on-every-minor →
  minors became expensive → everything ships as patches → version numbers stop meaning what
  the narrative rule promised). When adding a rule, ask what it multiplies against.
- **The corpus must be able to shrink.** A knowledge base that only grows taxes every reader
  and eventually gets skimmed instead of followed — the same failure as a noisy gate. Audits
  should retire or merge at least as much as they confirm, or say explicitly why not.
  Retirement is an edit like any other: append-only *history* is the safety net that makes
  deletion of *current* text safe.

### The promotion ladder — intention does not equal result (owner, 2026-09)

We do things to accomplish goals, and the corpus records the doing — but **intention ≠
result**, and an entry's existence is an intention. The evidence hierarchy, strongest first:

> **Automated process beats structure beats qualitative assessment.**
> *Does it work* beats *is it set up to work* beats *does it look like it should work.*

Every idea in the corpus sits on one rung — a vibe/judgement ("keep the scoreboard fresh"),
a structure (a numbered release step, a cascade gate, a template), or an automation (a
script, a test, a generated artifact) — and the grades above tell it which way to move:

- **Promote what works, up the ladder.** An entry that keeps earning its keep (fires in
  AARs, catches real defects) should climb: judgement → cascade gate or checklist step →
  script. Lived examples: scoreboard freshness went vibe → release step 9 → `scoreboard.ts`;
  land-the-plane went incident → rule → `release-doctor` check. The top rung is the goal
  because a script is never skipped, never re-litigated, and its failure is a fact.
- **Retire what doesn't.** An entry that never fires, or whose observed effect contradicts
  its intent (a gate that changed what it measured, a fix whose test couldn't fail), is
  retired or reframed — not kept because the intention was good. The AAR loop's periodic
  pass is where both moves happen, in bounded batches (review.md "the series must
  converge").
- **Never confuse the rungs when assessing.** "It looks like it should work" (plausible
  prose, a sensible-sounding rule) is the weakest claim; "it is set up to work" (the check
  exists, the step is documented) is the middle — and this corpus has repeatedly caught
  checks that were *set up* and did not *work* (vacuous fixtures, wrong-scope gates,
  never-seen-red checks). Only an observed result — the check seen red, the defect caught,
  the friction measurably gone — is the top claim, and it is the only one that justifies
  promotion.
- **Category reputation is middle-rung evidence, even for consecrated practices** (owner).
  TDD is supposed to improve quality; what it measurably does is reduce velocity — it *can*
  improve quality, but that is not a given. TypeScript is supposed to reduce bugs; the
  measured results are unconvincing. This corpus holds both directions locally: a full green
  suite coexisted with 7/7 release blockers and an emitter stripping `new` from every class
  (898 tests exercised `src/`, not the artifact), while the small tests that *assert a
  specific promise* (peer floors, Node-resolvable imports, failing-first regressions) have
  caught nearly every real defect; a typecheck stayed green while an `any` index signature
  swallowed five lost methods, while `withAttributes()` took a consumer from 413 type errors
  to 0. The unit of evaluation is the **specific mechanism in this ecosystem**, never the
  category — which is why imports enter as hypotheses and why "everyone does it" promotes
  nothing.

## Committing here: merge, never rebase

**This repo inverts the ecosystem's usual git advice, and it matters.**
[`practices/releasing.md`](practices/releasing.md)'s "landing the plane" says
`git pull --rebase && git push`. **Do not do that here.**

```bash
git pull --no-rebase    # merge, so a collision surfaces
git push
```

A rebase replays your commit *on top of* whatever landed while you were writing — silently
**linearizing away the collision**. But in this repo a collision **is the signal**: two agents,
in two projects, learned different things about the same practice. Per the rules above,
*contradictions are bugs — resolve them, don't stack them* — and **you cannot resolve a
contradiction you never saw.** A merge commit (or an honest conflict you have to look at) is the
mechanism that shows it to you. See [`TODO.md`](TODO.md) — the history invariant is what makes
the no-signoff carve-out safe, and **the invariant *is* the permission.**

Likewise: **never force-push, never rebase over published commits, and never squash a merge that
would swallow an intermediate edit.** Append only.

## Style

- Terse. Bullets over paragraphs. Code fences for commands and snippets.
- Second person, imperative. "Run `bun test`," not "one can run `bun test`."
- Link with **relative paths** so the docs work checked-out anywhere.
- No dates in prose unless load-bearing; version numbers are fine and welcome.

## Living documents — speak up

These docs are a living, evolving body of practice, not a fixed spec. The expectation for
every agent that reads them:

- **Don't rewrite them unprompted** in the middle of an unrelated task — that's noise, and it
  can quietly change guidance others rely on.
- **But never stay silent when something looks wrong.** Voice concerns, flag inconsistencies
  or contradictions, note anything stale or that fights your actual experience in the code,
  and propose improvements. Surface it to the human, or open a change following the protocol
  above — either is welcome; saying nothing is not.
- **Disagreement is signal.** If a practice here didn't match reality in a project, that gap
  is exactly what this repo exists to capture. Record it (with attribution) rather than
  working around it silently.

## The self-improving loop

Agents finishing substantive work in any linked project should ask: *did I learn something
that would have saved me time if it had been written here?* If yes, add it (or raise it). That
single habit — plus the willingness to say "this doc is wrong" — is the entire point of this
repository.
