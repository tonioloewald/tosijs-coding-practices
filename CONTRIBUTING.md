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
4. **Deduplicate.** If it overlaps an existing entry, sharpen that entry instead of adding
   a parallel one. Contradictions are bugs — resolve them, don't stack them.
5. **Keep the stack honest.** If a project legitimately diverges from the assumed stack
   (`practices/00-stack.md`), record the divergence and the reason under that doc's
   "Known divergences" — do not quietly rewrite the default.

## Style

- Terse. Bullets over paragraphs. Code fences for commands and snippets.
- Second person, imperative. "Run `bun test`," not "one can run `bun test`."
- Link with **relative paths** so the docs work checked-out anywhere.
- No dates in prose unless load-bearing; version numbers are fine and welcome.

## The self-improving loop

Agents finishing substantive work in any linked project should ask: *did I learn something
that would have saved me time if it had been written here?* If yes, add it. That single
habit is the entire point of this repository.
