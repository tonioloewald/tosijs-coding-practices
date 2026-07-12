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
