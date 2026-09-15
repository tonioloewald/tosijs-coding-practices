# TODO — tosijs-coding-practices

## Due ~2026-09-20: outcome review of the week-35 process batch

Grade the 2026-09-05/06 changes good/bad/meh against the predictions in
[`journal/2026-09-06-intention-vs-result.md`](journal/2026-09-06-intention-vs-result.md)
(AARs exist · round count · Tier 1 actually run · scoreboard zero hand-edits ·
release-doctor checks · cascade sharpness · prior-art rule · communication texture), plus
the accretion-audit follow-ups: enforce the retirement quota on the batch (15.4:1 measured
since the quota — it is not working), and measure whether meta-layer churn
(README/review/releasing commits per week) fell after the AAR loop. Baselines in
[`journal/2026-09-06-accretion-audit.md`](journal/2026-09-06-accretion-audit.md).

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

## The task surface — where tasks live and die (design record, 2026-09-14)

Supersedes/absorbs the navigation-hub plan below: the scoreboard becomes a **live surface**
— a board in a task system — rather than a generated markdown table. Decisions (owner):

- **Authority: tasks live and die in the new system.** GitHub is an I/O **adapter** — the
  place external issues get raised and updated for external visibility — never a peer
  store. Internal stores (`TODO.md`, `UPSTREAM.md`, deferred-findings lists) migrate wholly
  and are **deleted**, collapsing five sources of truth to one + one gateway.
- **Model: tags** — bare keys or `key:value` (`owner:id`, `status:freezer`,
  `project:tosijs`); **boards are saved filters** (one-substrate: every view and agent
  query is a reader of tags that already exist). Comments + attachments on tasks.
- **Upstream tasks: one task, two relationships** (owner, 2026-09-14). An upstream ask is
  **owned by the repo responsible** for it and **subscribed to by the repo that raised it**
  — which retires the UPSTREAM.md mirror-with-URL apparatus entirely, and converts lens
  7b's "cross-check every workaround against the issue list" from a per-review chore into
  an event: the origin repo is notified on state change instead of polling.
- **Store: append-only events** under the hood, current state as a view — audit trail,
  agent-friendly diffs, and cycle-time instrumentation for free. **Stable short IDs**
  citable in commits (the `#38`-in-a-commit convention must survive migration).
- **Backend: universal endpoint** — the first third-party consumer of tosijs-services
  (adopters-before-abstraction satisfied by construction). Bonus: reachable from cloud
  agent sandboxes where GitHub's write API is not.
- **Build order: agent API → boring-fast 2D board → whimsical 3D/VR task-world** (unified
  2d/3d panels showcase). The showcase is a *view* of the same store and must never gate
  the utility.
- **Delivery: a blueprint/component instance** pointed at a host URL carrying the endpoint,
  authenticated against it (the timezone-picker delivery shape, plus credentials).
- **Auth: scoped capability tokens, because auth identity IS provenance** (2026-09-15).
  Tokens minted per agent-context (machine × repo) with narrow verbs (read all; write
  owned/subscribed; no delete/admin) — the token is the `owner:`/`From:` identity, making
  attribution a property of the credential instead of a body-text convention. Bootstrap:
  device-style flow, human approves once per context in the board UI, token lands in
  `~/local-secrets/` (the haltija `X-Haltija-Token` pattern). Cloud sandboxes get tokens
  via routine config — which also fixes "cloud agents can't write to GitHub." Direct
  datastore access is structurally denied (the loewald-dot-com posture: deny-all rules,
  the endpoint is the only door); admin credentials are break-glass and a bypass write is
  visibly anonymous in the event log, never blended in.
- **Scope flags, named**: attachments = the platform's first blob-storage story (sequence
  deliberately); the store becomes load-bearing for ALL work — needs a degradation story
  (periodic snapshot agents can read when the service is down); and the design surfaced a
  **tosijs-services gap — no install system** for privileged endpoint/capability
  provisioning (filed:
  [tosijs-platform#5](https://github.com/tonioloewald/tosijs-platform/issues/5) — install
  as a write not a deployment, manifests as capability requests, new-capability upgrades
  re-trigger the human GO).
- **Practices migration** (after the system proves itself in one repo): releasing.md's
  issue-settling, cross-project.md's channel, review routing (TODO.md/UPSTREAM.md rows) all
  re-point. The From:-provenance convention dissolves into a native source tag.

## The navigation hub — scoreboard as front end (approved direction)

The site plan, in the order it should happen (this is downstream of manta/ariosto — it must
not schedule the pyramid):

- [ ] **`tools/scoreboard.ts` first** — regenerate the README scoreboard table from live
      registry/GitHub metadata (`npm view --prefer-online`, repo activity). Kills the
      staleness chore this week for ~50 lines; no site required. The markdown table remains
      the artifact — the tool writes it, humans stop having to remember it.
- [ ] **Then the site**: a tosijs-ui self-hosted demo. Scoreboard rows become the hub —
      cards linking each project's docs site, repo, npm page, open issues. The books it
      vends are the practices + journal ("The Blind Polymath").
- [ ] **Adopt the demo-site branch from day 0** (RFC #10) — never track a generated file on
      `main`. This repo volunteered as first adopter:
      https://github.com/tonioloewald/tosijs-coding-practices/issues/10 (greenfield proves
      the config; tosijs-ui's migration proves the repoint — don't confuse the two).
- [ ] **Settle deploy-branch history semantics before the first deploy** (foresight-rpg's
      caveat applies to us verbatim): site HTML is disposable, vended book artifacts (ePubs)
      are durable and need history or a separate durable home.

**Design principle (Tonio):** *expose what we write, and write what we expose — set up the
metadata correctly and nothing rots.* The markdown is the single source; the site is a pure
view over it; anything factual (versions, dates, activity) is generated at build time, never
hand-maintained. A second copy of a fact is where rot starts.

**Implementation split (Tonio): two natural pieces.**

- **Policies — this repo.** What the metadata *is* and *means* (the scoreboard fields, the
  project list, fact-vs-prose division), the site-branch policy as RFC #10 lands (deploy
  output disposable, vended artifacts durable, the secrets rule), the content itself
  (practices, journal, books, AAR conventions), and what the hub is allowed to display.
- **System — tosijs-ui.** The machinery that consumes the metadata: the site scaffold,
  `deployBranch` support (the config line every other repo then inherits), hub/scoreboard
  components, build-time fact fetching, the book/ePub pipeline.

The seam is the metadata contract, and the discipline at the seam is the usual one: this repo
consumes tosijs-ui like any other project, so every missing seam the hub build surfaces is a
**filed issue on tosijs-ui** (lens 7a — file, don't fix), which makes the practices site a
real consumer exercising the system half rather than a special case inside it. Policy work
can proceed now (scoreboard tool ✓, RFC adjudication pending); system work rides tosijs-ui's
roadmap.
