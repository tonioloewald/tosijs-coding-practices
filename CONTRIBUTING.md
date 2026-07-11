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
