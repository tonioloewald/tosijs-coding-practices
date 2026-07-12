# TODO — tosijs-coding-practices

## Make the repo INVARIANT — history is what makes the carve-out safe

[`practices/cross-project.md`](practices/cross-project.md) now lets an agent in **any** project
write a practice straight back into this repo **without signoff** — and the stated justification
is that *"a bad edit shows up plainly in the diff and is cheap to revert. Its history is the
safety net."* **That argument only holds if the history is genuinely inviolable.** So make it so:

- [ ] **Never rewrite history.** No force-push, no rebase over published commits, no squash that
      swallows an intermediate edit. **Append only.** Protect the default branch.
- [ ] **Preserve collisions instead of resolving them away.** Several agents, in several projects,
      *will* edit the same entry concurrently. That collision **is the signal**: two projects
      learned different things about the same practice — and per `CONTRIBUTING.md`,
      *"contradictions are bugs — resolve them, don't stack them."* You cannot resolve a
      contradiction you never saw. Prefer a **merge commit that records both sides** over a rebase
      that silently linearizes one of them out of existence.
- [ ] **Attribution must survive.** Entries carry `— seen in: project-a, project-b`; the commit
      should record which project (and agent) wrote it. A practice is only retirable if you can
      trace it back to the context that produced it — otherwise stale advice outlives its reason.
- [ ] **Tooling to enforce it, not just ask for it:** branch protection on `main`, reject
      force-push, and a check that every touched practice entry still carries a `— seen in:` line.

**Why this matters:** the worth of this repo is that it is *trustworthy* and *traceable* — it is
evidence, not opinion. If one agent can quietly overwrite or rebase away what another agent
learned the hard way, the history stops being evidence, and the no-signoff carve-out stops being
safe. The invariant *is* the permission.

— raised while writing back the `<tosi-slot>` parent-trap lesson from tosijs-3d
