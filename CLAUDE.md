# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A documentation-only repository: the shared, agent-readable engineering practices for the
tosijs / tjs-lang ecosystem. There is no build, no tests, no lint — the artifact *is* the
prose. It functions as collective memory across projects: a lesson learned once in one
project becomes a durable practice every other project inherits.

**`README.md` is the index and canonical entry point** (`AGENTS.md` just points to it).
Each topic lives in exactly one file under `practices/`; `tools/` holds executable forms
of practices (currently the `pre-release-review` nine-lens workflow + skill).

## Git rules — this repo inverts the ecosystem norm

- **Merge, never rebase:** `git pull --no-rebase && git push`. Do NOT use
  `git pull --rebase` here even though `practices/releasing.md` prescribes it for code
  repos. A merge conflict here is the signal that two agents learned different things
  about the same practice — a rebase silently linearizes that collision away.
- **Append only:** never force-push, never rebase over published commits, never squash a
  merge that would swallow an intermediate edit. The `append-only-history` ruleset on
  `main` enforces this (rejects force-push and deletion). The inviolable history is what
  makes the no-signoff carve-out safe.
- **Commit directly to `main`, no PR or signoff needed** — writing practices back is the
  whole point. Commit rather than leaving a dirty tree. Recent commit style:
  `practices(topic): summary`, `fix: summary`.

## Editing practices (the CONTRIBUTING.md protocol, condensed)

- An entry belongs here only if it is **durable, cross-project, actionable, and
  traceable**. Project-specific facts go in that project's own `CLAUDE.md`/`AGENTS.md`.
- **Attribute every entry:** end with `— seen in: project-a, project-b`.
- **Sharpen, don't stack:** if a new lesson overlaps an existing entry, improve that
  entry instead of adding a parallel one. Contradictions are bugs — resolve them.
- **Grep for the parallel mention:** cross-cutting docs (`deployment.md`,
  `performance.md`, `code-quality.md`, `00-stack.md`) often restate the same fact from
  another angle — fix every copy in the same change.
- Stack divergences go under "Known divergences" in `practices/00-stack.md`; don't
  quietly rewrite the defaults.
- If you change review criteria in `practices/review.md`, keep
  `tools/pre-release-review.workflow.js` in sync (and vice versa).
- Style: terse; bullets over paragraphs; second person imperative ("Run `bun test`");
  relative links only; no dates in prose (version numbers are fine).

## Domain context you need to write good entries

- The stack's core UI model is **observant, not reactive** — static-by-default DOM with
  pin-point updates from observed state; no `UI = f(state)`, no re-render, no diff
  (`practices/observant-model.md`). React/Lit priors produce subtly wrong guidance;
  `practices/model-priors.md` lists the specific instincts that fight this stack.
- The organizing idea is **negative blast radius**: fix a general problem in the one
  place it propagates from, rather than patching locally and severing the propagation
  path.
- Assumed stack unless a project overrides: Bun, TypeScript/TJS, tosijs (state),
  tosijs-ui (components), tosijs-schema (validation) — `practices/00-stack.md`.
- Precedence when guidance conflicts: a local project's `CLAUDE.md`/`AGENTS.md` beats
  this repo; this repo beats generic model priors.
