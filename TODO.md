# TODO — tosijs-coding-practices

## Make the repo INVARIANT — history is what makes the carve-out safe

[`practices/cross-project.md`](practices/cross-project.md) now lets an agent in **any** project
write a practice straight back into this repo **without signoff** — and the stated justification
is that *"a bad edit shows up plainly in the diff and is cheap to revert. Its history is the
safety net."* **That argument only holds if the history is genuinely inviolable.** So make it so:

- [x] **Never rewrite history.** No force-push, no rebase over published commits, no squash that
      swallows an intermediate edit. **Append only.** — **Enforced:** the `append-only-history`
      ruleset on `main` rejects `non_fast_forward` (force-push) and `deletion`. Verified against
      GitHub's own evaluation of the branch.
- [x] **Preserve collisions instead of resolving them away.** Several agents, in several projects,
      *will* edit the same entry concurrently. That collision **is the signal**: two projects
      learned different things about the same practice — and per `CONTRIBUTING.md`,
      *"contradictions are bugs — resolve them, don't stack them."* You cannot resolve a
      contradiction you never saw. Prefer a **merge commit that records both sides** over a rebase
      that silently linearizes one of them out of existence.
      **Done:** `CONTRIBUTING.md` now mandates `git pull --no-rebase` here — this repo is an
      explicit **exception to `releasing.md`'s "landing the plane"**, which prescribes
      `git pull --rebase` and would have linearized collisions away. (That contradiction was live:
      ~8 rebase-pulls had already been run on this repo; nothing was lost only because there was a
      single writer.)
- [ ] **Attribution must survive.** Entries carry `— seen in: project-a, project-b`; the commit
      should record which project (and agent) wrote it. A practice is only retirable if you can
      trace it back to the context that produced it — otherwise stale advice outlives its reason.
      *(Convention, upheld by review — see the note on tooling below.)*
- [x] **Tooling to enforce it, not just ask for it:** branch protection on `main`, reject
      force-push. — **Done** (ruleset above). Deliberately **no PR requirement**: agents must be
      able to push directly, or the no-signoff carve-out breaks. The ruleset blocks **rewrites,
      not writes**.

### Deliberately not doing: a hard CI gate on `— seen in:`

Rejected on purpose. It would false-positive on structural edits (headings, `README`, this file),
and **a check that fails for bad reasons trains everyone to dismiss it** — which is exactly
[`model-priors.md`](practices/model-priors.md) #5, the "already failing, not mine" reflex we
wrote down. A brittle guard is worse than none. Attribution stays a **review-upheld convention**;
if we automate it later, it should **warn, not block**.

**Why this matters:** the worth of this repo is that it is *trustworthy* and *traceable* — it is
evidence, not opinion. If one agent can quietly overwrite or rebase away what another agent
learned the hard way, the history stops being evidence, and the no-signoff carve-out stops being
safe. The invariant *is* the permission.

— raised while writing back the `<tosi-slot>` parent-trap lesson from tosijs-3d
