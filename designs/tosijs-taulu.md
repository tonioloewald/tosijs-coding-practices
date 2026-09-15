# tosijs-taulu — the task surface

*Design document, 2026-09-15. Working name (taulu = board; npm `tosijs-taulu` and `taulu`
both free, no GitHub collision, checked 2026-09-15). Lives here until the project repo
exists, then moves with it — this copy becomes a pointer.*

## What it is

One place where the ecosystem's tasks **live and die**, replacing five sources of truth
(GitHub issues, per-repo `TODO.md`, `UPSTREAM.md`, the scoreboard's warnings, reviews'
deferred-findings lists) with one store plus one gateway. Easy for agents to talk to,
pleasant for a human to manage, and a showcase of the architecture: the same store rendered
as an agent API, a boring-fast 2D board, and a whimsical 3D/VR task-world on the unified
2d/3d panels.

It is also **the first third-party consumer of tosijs-services** — the universal endpoint's
adopter-before-abstraction — and the acceptance test for the install system
([tosijs-platform#5](https://github.com/tonioloewald/tosijs-platform/issues/5)).

## Decisions (owner, 2026-09-14/15)

1. **Authority.** Tasks live and die here. GitHub is an I/O **adapter** — where external
   issues are raised and updated for external visibility — never a peer store. Internal
   stores migrate wholly and are deleted. Every task carries its authority as a tag; agents
   never guess which side wins.
2. **Model: tags.** Bare keys or `key:value` (`owner:tosijs-ui`, `status:freezer`,
   `project:manta`). **Boards are saved filters** — no board schema, arbitrary board sets,
   multi-project by construction. Tasks carry comments and attachments.
3. **Upstream tasks: one task, two relationships.** Owned by the repo responsible,
   subscribed to by the repo that raised it. Retires the UPSTREAM.md mirror apparatus;
   state changes notify subscribers instead of being polled (converts review lens 7b's
   cross-check chore into an event).
4. **Store: append-only events**, current state as a view. Audit trail, agent-friendly
   diffs, cycle-time instrumentation free. **Stable short IDs** citable in commit messages
   (the `#38` convention must survive migration).
5. **Delivery: a blueprint/component instance** pointed at a host URL carrying the
   endpoint, authenticated against it.
6. **Auth: scoped capability tokens — auth identity IS provenance.** Tokens per
   agent-context (machine × repo): read all, write owned/subscribed, no delete/admin. The
   token is the `owner:`/`From:` identity — attribution becomes a property of the
   credential. Bootstrap: device-style flow, human approves once per context in the board
   UI; token lands in `~/local-secrets/`. Cloud sandboxes get tokens via routine config
   (fixing "cloud agents can't write to GitHub"). Direct datastore access structurally
   denied (deny-all rules; the endpoint is the only door); break-glass writes are visibly
   anonymous in the event log.
7. **Install: one manifest** — declared logical **collections** (schema'd, tosijs-schema
   validating at the write boundary) + **stored functions** (sandboxed tjs) + capability
   requests, granted by the **configurator** (the in-system reflection of substrate
   ownership). "Or whatever" is load-bearing: collections are logical; the adapter maps to
   Firestore today, Postgres tomorrow, manifests unchanged.
8. **Build order: agent API → 2D board → GitHub adapter → 3D/VR task-world.** The showcase
   is a view of the same store and never gates the utility.

## Data model (sketch)

```
task:    { id, title, body, tags: string[], createdBy(token), events: -> }
event:   { taskId, at, byToken, kind: created|tagged|untagged|commented|attached|closed…, payload }
comment: an event (kind: commented) — no separate store
board:   { id, name, filter: tag expression }        # boards are data too
token:   { id, context: machine×repo, verbs, status } # credentials are tasks/board-visible
```

Tag filter grammar: conjunction of `key`, `key:value`, and negation is enough to start;
boards compose the rest. Resist a query language until a board can't be expressed.

## The GitHub adapter

Inbound: external issues mirror in as tasks (`source:github`, `authority:github`), comments
follow. Outbound: status changes on github-authoritative tasks post back as comments/closes
so external reporters see progress — the anssip loop, automated. Internal tasks never touch
GitHub. Conflict policy: the authority tag decides, always; the adapter never merges.

## Milestones

- **M1 — the spine.** Manifest installs on a dev host (exercises platform#5); agent API
  (create/update/comment/query/subscribe) behind token auth; CLI device-flow bootstrap.
  *Accept:* an agent on this machine files, tags, and closes a task with its own identity.
- **M2 — the board.** Boring-fast 2D board (blueprint instance, host URL + auth); boards as
  saved filters; token management as a board.
  *Accept:* owner triages a real week's tasks in it without touching GitHub or TODO.md.
- **M3 — the collapse.** GitHub adapter both directions; migrate ONE repo's TODO.md +
  UPSTREAM.md and delete them; scoreboard warnings become a board.
  *Accept:* five sources → one for that repo; an external issue round-trips.
- **M4 — the showcase.** 3D/VR task-world on the unified panels; the whimsy.
  *Accept:* same store, no new verbs, works in 2D untouched.

Then: practices migration in one deliberate pass (releasing.md issue-settling,
cross-project.md channel, review routing, From:-convention retirement).

## Scope flags (named, not solved)

- **Attachments** = the platform's first blob-storage story — sequence deliberately.
- **Load-bearing risk**: when the store is down, agents are blind → periodic read-only
  snapshot agents can consume (format TBD; a JSON dump in a known location beats nothing).
- **Notification transport** for subscriptions is OPEN: push to where? (Candidates: a
  digest task per repo the gap-checkpoint reads; webhooks later. Start with poll-on-
  checkpoint — it's already in the loop.)
- **Final name** is not settled; nothing below the manifest name depends on it.

## Filed on the platform side

- [tosijs-platform#5](https://github.com/tonioloewald/tosijs-platform/issues/5) — the
  install system (configurator, manifests, claim ceremony).
- [#6](https://github.com/tonioloewald/tosijs-platform/issues/6) — CLI/agent auth: scoped
  capability tokens + device-flow bootstrap (gates M1).
- [#7](https://github.com/tonioloewald/tosijs-platform/issues/7) — logical collections:
  schema'd, substrate-agnostic adapter.
- [#8](https://github.com/tonioloewald/tosijs-platform/issues/8) — blob/attachment
  capability (gates attachments, not M1).
- [#9](https://github.com/tonioloewald/tosijs-platform/issues/9) — read-only degradation
  snapshot (the safety condition for M3's source-of-truth collapse).
