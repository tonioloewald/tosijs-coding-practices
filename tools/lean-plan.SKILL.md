---
name: lean-plan
description: Take a long, hard look at a whole repo and write a two-phase plan to make it leaner, cleaner and easier to learn. Phase 1 removes no functionality (dead code, one implementation per behaviour, robustness, structure, docs); phase 2 removes redundant ways of doing the same thing (one obvious spelling per task, via deprecate → migrate → delete). Defects found on the way are listed first, as fixes. Produces a plan, changes no source. Use when the owner asks for a cleanup, simplification, dedupe or "leaner" plan, or a whole-library review aimed at the API rather than a release. Part of the shared tosijs-coding-practices process (practices/review.md, Tier 3).
---

# Lean plan

A whole-repo review whose output is a **plan**, not a diff. It is Tier 3's structural audit
([`practices/review.md`](../practices/review.md)) aimed at one question: how does this
library get leaner, cleaner, more robust, and easier to learn and use?

**Change nothing in `src/` to produce it.** Throwaway scripts that prove a claim are fine;
don't commit them.

## Before you start

- **The basis:** the commit and version you read. Line numbers refer to it.
- **What's already settled.** Read `DECISIONS.md`, the repo's `CLAUDE.md`, any purge or
  deprecation inventory, and the board's open cards for this repo. A settled decision isn't
  re-proposed. It goes under "Not proposing", with where it was settled.
- **The consumers.** List the repos that depend on this one (on this machine, or the
  ecosystem's). Their usage is the evidence for phase 2.
- **The breaking-change policy:** what a minor may do, what waits for a major.

## Read everything, and say how

- Read every non-test module. On a large repo, read the core yourself, line by line, and
  give other areas to a second reviewer. **Check every finding of theirs you quote against
  the file.**
- **Mark what you ran.** ✔ means executed (a unit check, a browser run against the
  published bundle), not inferred. A claim you only read is labelled as read.
- **Line up the copies.** For every behaviour implemented more than once, diff the copies
  (review.md DRYness cascade, step 4). This is where the defects come from.

## The plan's shape

Write it to `reviews/lean-plan-<yyyy-mm>.md` in the repo, in this order. Lead with what the
owner must know.

1. **In brief:** the handful of things worth reading if nothing else is. Live defects come
   first, then the size of each phase and the single best lever.
2. **How to read the evidence:** what was read and by whom, what ✔ means, and what the
   usage counts can and can't prove. Counts show which spelling won. They don't prove a
   removal is safe: namespace imports dodge a grep, and outside users are invisible.
3. **The numbers that frame it:** lines (code, doc, comment), the largest files, runtime
   exports, exports any consumer actually imports, payload against its budget, and **ways
   to do the most common task** (for example "ways to read a proxy's value: 11").
4. **Fix first: defects found on the way.** They are neither cleanup nor redundancy. Give a
   table of the defect, its evidence (✔ with the exact reproduction), where it is, and its
   card. Then a short sketch of each fix. Group defects that share a cause and name the
   cause. Say which ones are worth a patch release on their own.
5. **Phase 1: no functionality removed.** Open with **the guard** every package must pass:
   - the suites, including the browser lane;
   - a type-surface test;
   - a snapshot of each entry's runtime exports, taken once before starting and unchanged
     after;
   - a diff of the declaration files that shows only internals deleted on purpose.

   Then the packages, each with file:line evidence:
   - **Delete what nothing uses.** Check `src/`, the tests and every entry point. Public
     exports are phase 2 or "unused, but not redundant", never phase 1.
   - **One implementation each.** The merge is the union of every guard and the better
     optimisation (DRYness step 4). Check that it isn't a router in disguise (step 5).
   - **Declarations derived from the data they describe,** not written twice.
   - **Teardown and caches:** what grows forever, and what is never released.
   - **Structure,** with no behaviour change, one file per change.
   - **Tests and build:** repeated harness code, and the tests the merges need.
   - **Docs, without changing the API:** examples that throw, advice that's wrong today, a
     teaching order that puts the second-best spelling first.
6. **Phase 2: one way to do each thing.**
   - **Finish what's already promised.** Re-derive the existing deprecation or purge
     inventory against today's code, and list what it is missing.
   - **New candidates.** Use a table with these columns: the task, the redundant spelling,
     what it's the same as, uses across the consumers, and notes. Prove "same as" (✔). A
     spelling with a capability the survivor lacks isn't redundant.
   - **Not proposing.** List what looks redundant but stays, each with its reason: settled
     by the owner, a different job, or not worth a break by itself.
   - **Unused, but not redundant.** Exports nobody calls that duplicate nothing. This list
     is information, not a recommendation. Name the few that need a decision.
   - **How to run it:**
     1. A minor deprecates and breaks nothing. Each spelling warns once and names its
        replacement, and the docs teach only the survivor.
     2. Migrate the consumers, with a codemod per row.
     3. A major deletes, one commit per category.
7. **Order of work:** steps, what each contains, and which release carries it.
8. **What this did not cover:** vendored code, what was only sampled, consumers counted
   but not read, usage outside the ecosystem, and anything not prototyped.

## Rules

- **Phase 1 is inside the standing go-ahead; phase 2 is the owner's.** Anything that
  removes or renames something a consumer can reach waits for their yes, row by row.
- **File the defects as cards now** (cross-project.md routing). File phase 1 packages as
  cards once the owner has read the plan. Phase 2 rows become cards only when approved.
- **Owner decisions go out with a recommendation.** Name each one in the brief ("F13 is a
  decision before it is a fix").
- **No byte estimates you didn't measure.** Each deletion lowers the bundle budget; the
  build's size table says by how much.
- **Report the plan's path and the "In brief" section to the owner.** The plan is the
  deliverable; don't paste it into chat.

— asked by: Tonio (owner) · seen in: tosijs (`reviews/lean-plan-2026-11.md`, 1.10.12:
thirteen defects found by lining up copies, eleven ways to read a value reduced to three)
