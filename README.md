# tosijs coding practices

**Shared, agent-readable engineering practices for the tosijs / tjs-lang ecosystem.**

This repository is a single source of truth for how we build, test, review, deploy, and
release software across all of Tonio Loewald's projects. It is written to be consumed by
**both humans and LLM coding agents**. If you are an agent working in any project that
links here, read this file first, then read the specific practice doc(s) relevant to your
task.

> One index (this file) → a small set of focused practice docs. Nothing else to discover.

> **Every session: check your repo against [`practices/rollouts.md`](practices/rollouts.md)**,
> the ecosystem-wide changes every repo adopts, and adopt what is missing without being asked.

## The organizing idea: negative blast radius

Everything here — the tools, the practices, this repo — is trying to have **negative blast
radius**: to do a thing well in one place and propagate the improvement to everything downstream
for little or no cost. Blast radius has a *sign*. Positive is harm that spreads; zero is the
isolated, defensive ideal most code aspires to; **negative is reach that makes its environment
better** — which is precisely what a library is *for*. High amplitude is not the enemy; the wrong
sign is.

The mature move, visible across the stack, is the shift **from self-preservation to
environment-healing**:

- **tosijs-ui**'s build system went from *"don't let me explode"* to *"check whether anything is
  exploding."*
- **haltija** went from *"is the current version working?"* to *"are there signs of existing
  failure?"* — it retires stale servers and repairs the shared CLI it finds around it.
- **this repo** is the same idea applied to *knowledge*: a lesson learned once in one project (a
  footgun, a fixed bug, a better default) becomes a durable practice every other project inherits
  for free. It is collective, structured memory across projects — negative blast radius on what we
  know, not just on what we ship.

When you review or design, ask it of your own change (lens 9 in [`review.md`](practices/review.md)
makes this concrete): did it *capture* that leverage, or *leak* it? A local fix to a general
problem leaks it. Duplicated logic leaks it — worse, it severs the propagation path, so a fix
reaches no one.

The same sign test applies to **effort**. Laziness is a legitimate engine here — DRY is applied
laziness — but doing less work only counts if it saves everyone downstream work too, never if it
offloads it. No one should have long build loops; no one should put up with spam. And be
suspicious of friction that has become invisible through habituation — it accumulates exactly
where the person able to fix it has stopped noticing (see
[`practices/development.md`](practices/development.md) "Laziness with the right sign").

And on any claim that something works: **intention ≠ result.** Automated process beats
structure beats qualitative assessment — *does it work* beats *is it set up to work* beats
*does it look like it should work*. Ideas that demonstrate results get promoted up that ladder
toward structure and automation; ideas that don't get retired, however good the intention
(see [`CONTRIBUTING.md`](CONTRIBUTING.md) "The promotion ladder").

## How to use this (agents, read this section)

1. **Start here — fresh.** This README is the index; every practice lives in `practices/`.
   If you are reading a **local checkout** of this repo, `git pull --no-rebase` it before
   reading — a stale checkout silently serves last month's practices, and you cannot notice
   what you never fetched.
2. **Find your task's doc** in the map below and read it before acting.
3. **Honor the assumed stack** (`practices/00-stack.md`) unless the project you are in
   explicitly overrides it. Projects declare overrides in their own `CLAUDE.md`/`AGENTS.md`.
4. **Contribute back.** When you learn something durable that would help the next agent in
   *any* project — a gotcha, a fixed footgun, a better default — add it to the right doc
   per `CONTRIBUTING.md`. Practices earn their place by being reused, not by being clever.
5. **Treat these as living documents.** They are not graven in stone. Don't rewrite them
   unprompted in the middle of an unrelated task — but *do* speak up: **voice concerns, flag
   inconsistencies or anything that reads as wrong or out of date, and suggest improvements**
   as you work. Continuous improvement is the goal; silence when something looks off is the
   only real failure.

Precedence when guidance conflicts: **the local project's `CLAUDE.md`/`AGENTS.md` wins**
over this repo (it knows its own exceptions); this repo wins over generic model priors.

## Proposals under review

Ideas written up for critique before adoption, in `proposals/`. They are rung 1
(judgement) until evidence moves them — see the promotion ladder in
[`CONTRIBUTING.md`](CONTRIBUTING.md). Each carries its own retirement condition.

| Proposal | What it asks for |
| --- | --- |
| [leanness-loop](proposals/leanness-loop.md) | leanness as the **driver** rather than a counteraction to additive change — with the measured evidence that review is an accretion engine nothing consumes |
| [observe-instead-of-bind](proposals/observe-instead-of-bind.md) | reaching past `bind` leaves an element **invisible to the agent map** — with one detector already refuted by testing it against real code |
| [react-brain-detectors](proposals/react-brain-detectors.md) | warn on React habits that tosijs silently mishandles (`key`, `className: []`, a returned `render()`), with **executable** replacements so the messages cannot go stale |
| [measured-legibility](proposals/measured-legibility.md) | one method, three instruments: do our diagnostics cause a **repair**, do they help you **locate** a bug, and does a **name carry its meaning** (cold vs warm prediction)? |

They share an observation: every lens we own reviews a *diff*, which is the
right shape for a growing library and the wrong one for a finished one. **They
are drafts, not practice** — a proposal not adopted or rejected by the review
batch after the one it was filed for is deleted; the journal keeps it.

## Stay in your repo

An agent working in project A **does not go make changes in project B** — no "quick fixes,"
no "while I'm here." If the fix belongs to another repo, **file an issue on it, don't fix it**
(and if it truly can't wait, **ask for signoff, don't assume**). See
[`practices/cross-project.md`](practices/cross-project.md).

**This repo is the exception — no signoff needed to write a practice back into it.** Recording
what you learned, from whichever project taught it to you, is the whole point. The rule above
protects *code* repos (tests, release gates, API seams you haven't read); none of that exists
here — it's prose under git, so a bad edit is obvious in the diff and cheap to revert. Just
follow [`CONTRIBUTING.md`](CONTRIBUTING.md) (sharpen an existing entry rather than stacking a
parallel one; cite where you learned it) and **commit it here** rather than leaving a dirty tree.

## Core model — read this first

tosijs is **observant, not reactive.** The DOM is static-by-default and updated by pin-point
changes from observed state and user events — there is no `UI = f(state)`, no re-render, no
diff. If you carry a React/Lit mental model into tosijs, you will write subtly wrong code.
**[`practices/observant-model.md`](practices/observant-model.md) is required reading before
any component or binding work.**

## Know what you'll get wrong — read this second

Some of what you "know" is actively wrong here, and **not because it's stupid** — because it's
well-earned advice from a dominant paradigm that this stack considered and rejected.
`onFoo={fn}` silently becoming an event listener, reflexive shadow DOM, `sideEffects: false`,
"that test was already failing." **[`practices/model-priors.md`](practices/model-priors.md)**
lists the priors that fight this codebase and how to catch yourself.

## The assumed stack

Unless a project says otherwise, assume: **Bun** (runtime, test runner, bundler),
**TypeScript / TJS** (`tjs-lang`), **tosijs** (state), **tosijs-ui** (web components),
**tosijs-schema** (schema / validation), and deployment to **GitHub Pages**, **Firebase**,
or **Cloudflare Pages / R2** as appropriate. Full detail: [`practices/00-stack.md`](practices/00-stack.md).

## Practice map

| When you are… | Read |
| --- | --- |
| Building UI at all (the core mental model) | **[`practices/observant-model.md`](practices/observant-model.md)** |
| About to trust an instinct (React/web-components/bundler lore) | **[`practices/model-priors.md`](practices/model-priors.md)** — what you will get wrong here |
| About to blame a dependency for a bug | **[`practices/model-priors.md#9`](practices/model-priors.md)** — trust sets how *long* you look, not *whether* you read what it says |
| Hitting a problem that belongs to *another* repo | **[`practices/cross-project.md`](practices/cross-project.md)** — file, don't fix |
| Filing or tracking a task (your repo may be on the virta board) | [`practices/cross-project.md`](practices/cross-project.md) "If your repo is on the task board" — if `virta brief` prints something here, tasks live on the board |
| Setting up or working in a project day-to-day | [`practices/development.md`](practices/development.md) |
| Writing or debugging tests | [`practices/testing.md`](practices/testing.md) |
| Linting, formatting, type-safety, naming | [`practices/code-quality.md`](practices/code-quality.md) |
| Worrying about speed, bundle size, or monitoring | [`practices/performance.md`](practices/performance.md) |
| Adding a dependency, or building/using a security gate | [`practices/dependencies.md`](practices/dependencies.md) — a gate must never report a pass it didn't earn |
| Reviewing code (a diff, a PR, or the nine-lens pre-release review) | [`practices/review.md`](practices/review.md) |
| Writing docs, or fighting doc drift | [`practices/development.md`](practices/development.md) "Agent-facing docs travel with the code" — deeper, **experimental** proposals in [`practices/documentation-surface.md`](practices/documentation-surface.md) (evidenced parts being promoted per `reviews/2026-09-practices-audit.md` D7) |
| Cutting a release / publishing | [`practices/releasing.md`](practices/releasing.md) |
| Packing a tarball because you can't publish (`file:` deps, stopgap builds) | [`practices/releasing.md#bypassing-the-publish-loop-where-local-tarballs-live`](practices/releasing.md) — one agreed directory, never a session scratchpad |
| Checking whether your repo is missing an ecosystem-wide change | **[`practices/rollouts.md`](practices/rollouts.md)** — the standing list; adopt what is missing |
| Publishing a release, or moving a repo's publishing to CI | [`practices/publishing-via-oidc.md`](practices/publishing-via-oidc.md): **adopted** (OIDC + staged publishing, maintainer approves with 2FA; piloted on tosijs-ui 1.15.3) |
| Shipping to a host | [`practices/deployment.md`](practices/deployment.md) |
| Managing state or schemas | [`practices/state-and-schema.md`](practices/state-and-schema.md) |
| Building web components | [`practices/web-components.md`](practices/web-components.md) |
| Writing TJS / safety boundaries / monadic errors | [`practices/tjs-lang.md`](practices/tjs-lang.md) |

## Project scoreboard

The projects linked to this knowledge base, at a glance. **The fact columns are generated;
the prose columns are written** (expose what we write, write what we expose — a
hand-maintained fact is where rot starts):

- **Version and "As of" are machine-written** — run `bun tools/scoreboard.ts` to refresh
  them from the registry and GitHub (`--check` reports staleness without writing). Don't
  hand-edit those cells; fix the source of truth they mirror, or the tool's metadata list.
- **Activity is 2–5 short highlights, newest first — a dashboard, not a ledger** (owner,
  2026-09-10). Headlines and standing warnings (⚠️) only; the story lives in the linked
  changelog and the project's `reviews/`. **On release: replace, don't append.** Git
  history keeps every superseded cell.
- **On every release, update your project's row** — it's the last step of the canonical flow
  in [`practices/releasing.md`](practices/releasing.md). Run the tool for the facts; write
  the Activity highlights yourself.
- **Any agent that notices a stale row should fix it** — same no-signoff carve-out as any
  practice edit; normal commit protocol (`git pull --no-rebase && git push`).
- **"As of" is per-row**: when the row's facts were last verified against reality (the tool
  only advances it for rows it actually verified — an unreachable repo keeps its old date).
  Local/private projects with no remote are hand-maintained and say so in the tool.

- **One project, several names — the service layer.** **service-compris** is the settled name
  (npm-staked 2026-09-16) for what has also been called **loewald-dot-com**, **tosijs-platform**
  and **tosijs-services**. It has two rows below only because the tool tracks two sources of
  truth: `service-compris` is the npm package, and `loewald-dot-com` is the GitHub repo, which
  is still named `tonioloewald/tosijs-platform`. Older issues, TODOs and design notes use all
  four names. Read them as the same thing, and use **service-compris** in anything new.

| Project | What it is | Version | Activity | Links | As of |
| --- | --- | --- | --- | --- | --- |
| [tosijs](https://github.com/tonioloewald/tosijs) | path-based observant state | 1.10.3 (repo · tag · npm all agree) | **1.10.3 published** (09-19): the #41 security note recommended something that does not work — marking the *control* returns cleartext in all three uncovered shapes; the reliable form is **mark the element carrying the BINDING, or any ancestor**, since discovery works outward from the control • **1.10.2** (09-14): redaction is not deletion — a secret link vanished from the agent map instead of appearing redacted; *never decide an element's fate by reading a record you just redacted* • ⚠️ open security: #43 (an unknown prop is assigned as a DOM property, so untrusted props reach `innerHTML`), #41/#32 (secret paths still return cleartext) | [site](https://tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-ui](https://github.com/tonioloewald/tosijs-ui) | web components + the doc-site system | 1.15.4 (repo · tag · npm all agree) | **1.15.4** — `libraryBundle`: a library build Node can load (#169); tag colours on chips + menu lozenges (#173); tag-list fixes (#189); first release dry-run before tagging • **1.15.3** — first release via OIDC + staged publishing (#178); dialog Escape + veto (#183); `<tosi-md sanitize>` opt-in (#179) • **1.15.2** — tjs-lang peer admits 0.14.x (#182) | [site](https://ui.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-schema](https://github.com/tonioloewald/tosijs-schema) | type-by-example schema / validation | 1.10.2 (repo · tag · npm all agree) | 1.10.1 (#11): builder return types (`Obj`/`Str`/`Num`/`Arr` + the helpers inside them) were declared but never exported, so any library re-exporting a schema failed declaration emit with TS4023 — invisible to apps, fatal to publishers. 1.10.0 (#10, BREAKING): `agentContract` gained `affectedRoots()` + `{ unknownPath: 'refuse' }` so the fail-closed posture over UNCONTRACTED paths is expressible, and two construction fail-opens closed (a stray `schema` key built an accept-all gate; a non-boolean `strict` built a sampling gate). **Five review passes** — a regex path-canonicalizer was built during remediation and REVERTED before shipping (each pass found another bypass; the regex was quadratic on the gate's least-trusted input). The matcher's real limit is documented and pinned by tests instead; a tokenizer is the tracked fix. Prepublish smoke lane now packs the real tarball, installs it into a scratch consumer, and asserts the published `.d.ts` both typechecks AND survives a consumer's own declaration emit. 1.9.0 (#9), 1.8.0 (#8), 1.5.x: the fail-open sweep (GHSA-3qw7-pvr3-2gpq for ≤1.4.0) | [changelog](https://github.com/tonioloewald/tosijs-schema/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-floorplan](https://github.com/tonioloewald/tosijs-floorplan) | agent-surface map → floorplan SVG (pure, dependency-free renderer; **née tosijs-schematic**, renamed 0.3.0 over the tosijs-schema near-collision) | 0.5.0 (repo · tag · npm all agree) | **0.5.0 published** (09-12) — the adoption-feedback release: all nine issues from tosijs's adoption of 0.4.0 (#7–#15) in one batch; the predicates now reproduce an audit's verdicts without consumer-side normalization, retiring tosijs's private `auditView` workaround (#13) • born of the haltija convergence (#1: two independently-built renderers merged); haltija becomes a producer at its 1.13; tosijs vendors the renderer; API keeps schematic-* names (multi-producer contract) | [changelog](https://github.com/tonioloewald/tosijs-floorplan/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tjs-lang](https://github.com/tonioloewald/tjs-lang) | TS dialect: runtime validation, safety boundaries, sandboxed VM | ⚠️ npm `latest` **0.13.13** · `package.json` **0.14.0** · tag **v0.13.13** | **0.14.0 in flight** — `package.json` is 0.14.0, `0.14.0-rc.0` is on the `rc` dist-tag (correctly staged, `latest` untouched); docs review ran 09-25 and BLOCKED (1 blocker, 1 major) • ⚠️ open: #55 — published `fromTS` still dynamic-imports the unpinned `esm.sh/typescript@5` into the consumer's page, and a test pins that exact string • **0.13.13 published** (09-13) — `unsafe var` / `unsafe eval` now refused outright, a takeaway named up front because a patch normally cannot take anything away • 0.13.12: cleared the five defects of one class (passes misreading code that merely *mentions* their target syntax, #51) • 0.13.6: `defineAtom` defaults `effects:'io'` — capability-membrane security fix, shipped as a patch deliberately • 0.12.0: VM security review (SSRF, ReDoS) | [playground](https://tjs-platform.web.app) · [changelog](https://github.com/tonioloewald/tjs-lang/blob/main/CHANGELOG.md) | 2026-09-26 |
| [react-tosijs](https://github.com/tonioloewald/react-tosijs) | React bridge for tosijs state | 1.2.1 (repo · tag · npm all agree) | 1.1.0–1.2.1 published 2026-07-20 (uSES rewrite, off-ramp positioning); extras shared with ngx-tosijs (#3) | [site](https://react.tosijs.net) · [changelog](https://github.com/tonioloewald/react-tosijs/blob/main/CHANGELOG.md) | 2026-09-26 |
| [ngx-tosijs](https://github.com/tonioloewald/ngx-tosijs) | Angular bridge for tosijs state (signals, zoneless-first) | 0.9.1 (repo · tag · npm all agree) | born 2026-07-21: 0.9.0 name-stake + 0.9.1 same-day blocker fix; two-frameworks-one-state demo | [site](https://angular.tosijs.net) · [changelog](https://github.com/tonioloewald/ngx-tosijs/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-3d](https://github.com/tonioloewald/tosijs-3d) | Babylon.js 3D components + doc site | 0.8.3 (repo · tag · npm all agree) | **0.8.3 published** — galaxy billboarding moved to the vertex shader (3.19 ms → ~0.02 ms CPU/render), the sun runs a northern arc and keeps the right time, cloud lighting faces the sun; visible-not-breaking, so scenes tuned by eye will look different • **0.8.1 — plane landed** • 0.7.3 was breaking (GTA V biped controls) • pre-tag review caught a staged TLS **private key**, rewritten out while unpushed • 0.6–0.7 line: manta-recon first-adopter fixes, flight-model rework, systemic `frameDelta` fix | [site](https://3d.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-3d/blob/main/CHANGELOG.md) | 2026-09-26 |
| tosijs-3d-ensemble | the ensemble FORMAT + instantiator + a graphical editor for authoring them (extracted from manta-recon's prefab bench); local `~/tosijs-3d-ensemble` git repo | npm `latest` **0.2.0** · local repo (hand-maintained) | 0.2.0: `buildEnsemble`'s documented link phase actually implemented (found by a consumer, #2) • converted its browser lane to test fences and wrote the promotion RFC (tosijs-ui#142) • peer-floor + Node-import + tree-shake promise tests are the measured defect-catchers here | — | 2026-09-10 |
| manta-recon | revival of *Manta* (2010 Unity iPhone game) on tosijs-3d — the "tech demo → shipped game" proving ground; local `~/manta-recon` git repo | 0.1.0 (private) | **the manta flies again** — VTOL, 75 m/s cruise, dive, surface skim, underwater flight on tosijs-3d • filed the first-adopter issues (#1–#3) • next: water passthrough + per-medium drag, immelman port | — | 2026-08-10 |
| tosijs-virta | task surface — where tasks live and die (`<tosi-virta>`, CLI, MCP); private repo `github.com/tonioloewald/tosijs-virta`, deploys are the distribution | 0.5.2 (tag local; private) | **0.5.2 (2026-09-24):** sign-in works end to end on `virta.tosijs.net` — the domain fronts the API, bare `virta login` defaults to it (four consumer-found login bugs closed); dark mode and a redesigned project settings panel; review fixes for the changes since 0.5.1. **Open upstream:** platform error responses CDN-cached across credentials (tosijs-platform#27) | app: virta.tosijs.net · design: `DESIGN.md` in-repo | 2026-09-24 |
| service-compris | the services layer (née tosijs-services / tosijs-platform / loewald-dot-com — see the names note above; the repo is the `loewald-dot-com` row): RBAC, write pipeline, role resolution — the universal endpoint's decision layer | npm `latest` **0.1.0** (name-staked 2026-09-16; hand-maintained row) | **working through blockers** (install system, agent auth, logical collections, blobs, snapshot — tosijs-platform#5–9) • ⚠️ `v0.2.0-beta.3` and `v0.2.0-beta.4` are tagged but the `beta` dist-tag is still `0.2.0-beta.2` — publish or record the hold before beta.5 | [npm](https://www.npmjs.com/package/service-compris) | 2026-09-17 |
| [tosijs-product](https://github.com/tonioloewald/tosijs-product) | scroll-linked animation components | 0.8.0 (repo · tag · npm all agree) | **0.8.0 published** (09-12, BREAKING): the CDN IIFE no longer registers tosijs-ui's eight doc-authoring elements — 578 kB → 145 kB gzip, because those modules were 77% of the barrel; load them from `tosijs-ui/doc-browser` / `tosijs-ui/live-example` if you relied on them • 0.7.0: first-ever review ran here (report in `reviews/`) • 0.6.5 fixed 0.6.4's `files`-glob packaging blowout (13.7→2.8 MB) — **0.6.4 consumers should upgrade** • role: the ecosystem's scroll-story landing-page engine (tosijs-3d / ariosto showcases planned) | [site](https://product.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-product/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-timezone-picker](https://github.com/tonioloewald/tosijs-timezone-picker) | graphical timezone-picker web-component | npm `latest` **0.6.0** · `package.json` **0.6.0** · **untagged** | 0.6.0 published; **still untagged** (a `v0.6.0` tag at `f013750` is safe when wanted) • the weekly sweep caught `main` unpushed at 0.5.3; published tarball verified content-identical to HEAD | [site](https://timezones.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-timezone-picker/blob/main/CHANGELOG.md) | 2026-09-26 |
| [haltija](https://github.com/tonioloewald/haltija) | browser control for AI agents | ⚠️ npm `latest` **1.12.9** · `package.json` **1.13.0** · tag **v1.12.9** | **1.12.9 published (2026-09-12) — the four security fixes are live** (Babylon CDN pin+SRI, renderer-relay default-deny, local-origin WS gates, env-leak stop); Snowfox was pinned to 1.12.8 awaiting exactly this • #40 auth default-deny shipped in 1.12.8 • 1.12.6: Electron bump past two isolation bypasses, 285→14 packages • Dependabot enabled 2026-09-12 | [changelog](https://github.com/tonioloewald/haltija/blob/main/CHANGELOG.md) | 2026-09-26 |
| [wobbly](https://github.com/tonioloewald/wobbly) | Web-Worker parallel array ops (npm pkg **`wobbly-js`** — plain `wobbly` is someone else's) | ⚠️ npm `latest` **0.1.0** (`wobbly-js`) · `package.json` **0.6.0** · tag **v0.6.0** | ⚠️ repo 0.6.0 vs npm `wobbly-js` 0.1.0 — publish or record the hold • `gm-demo` proves the thesis end-to-end | [changelog](https://github.com/tonioloewald/wobbly/blob/main/CHANGELOG.md) | 2026-09-26 |
| [tosijs-editor](https://github.com/tonioloewald/tosijs-editor) | rich-text editor component — no contentEditable, no execCommand, no browser selection APIs (pkg `tosijs-styled-editor`) | 0.5.0 (repo · tag · npm all agree) | 2026-09-25 **0.5.0**: tracked changes as content (`<tosi-ins>`/`<tosi-del>`, live typing/delete/cut/paste, accept-reject leaves no residue) + LLM proofreading round-trip, queryable spell check with a user dictionary, self-renumbering footnotes, word-sticky drag selection — +3.4 kB gz • gated by a 9-lens review and **four** remediation re-reviews; three of the four found blockers introduced by the previous round's fix, every one with a green suite • 0.4.5: sanitizer extracted as [`tosijs-kilpi`](https://www.npmjs.com/package/tosijs-kilpi) (18× smaller than DOMPurify, parity on its 223 fixtures) • click-to-character is Range measurement now, not spanification — no reflow, Arabic shaping intact | [site](https://tonioloewald.github.io/tosijs-editor/) · [changelog](https://github.com/tonioloewald/tosijs-editor/blob/master/CHANGELOG.md) | 2026-09-26 |
| [lukko](https://github.com/tonioloewald/lukko) | capability-secured LLM agent middleware | `package.json` **0.1.0** · **untagged** | ⚠️ [#2](https://github.com/tonioloewald/lukko/issues/2) unfixed since 2026-08-23 (**33 days**; repo HEAD untouched since 2026-03-04): 2 critical / 11 high advisories, all from the `tjs-lang ^0.3.0` pin — `bun add tjs-lang@^0.13.13` deletes the whole subtree • private, nothing ships, but it installs on the dev machine | — | 2026-09-26 |
| [loewald-dot-com](https://github.com/tonioloewald/tosijs-platform) | Firebase full-stack platform — **becoming a load-bearing pillar: the ecosystem's service layer** (repo: `tosijs-platform`; now named **service-compris** — the npm package is the `service-compris` row) | `package.json` **0.2.0-beta.5** · tag **v0.1.0** | ⚠️ **in production, and `storage.rules` still reads `allow read: if true` on `/users/{userId}/**`** — [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) has asked "confirm this is deliberate" for 33 days; four rules share the shape, so it is the bucket's posture • `functions/` has no lockfile and pins `firebase-admin ^12.7.0` against a registry latest of 14.5.0 (#2, whose "3 critical / 41 high" no longer reproduces) • **very active**: the "three legs" thesis — this repo is the service layer, and that is its product • access-lattice / authority redesign (root of trust = datastore access; write **schemas** over role checks; fail-open F1 now DENIES) • security fixes: unpublished posts were listed publicly, drafts advertised to crawlers • shadow-parity verification surfaced three bugs the never-run integration suite hid • `DECISIONS.md` ledger; SSR-is-public enforced structurally | — | 2026-09-26 |
| [kith-email](https://github.com/tonioloewald/kith-email) *(private)* | email client (Tauri desktop) | `package.json` **0.8.5** · **untagged** | quiet since 2026-07-11 | — | 2026-09-26 |
| [kilpi](https://github.com/tonioloewald/kilpi) | tiny HTML sanitizer for rich-text paste paths — denylist, zero deps, ~0.8 kB gzipped (pkg `tosijs-kilpi`); passes DOMPurify's published 223-fixture corpus with zero executable residue | 1.0.1 (repo · tag · npm all agree) | ⚠️ **now load-bearing: tosijs-ui 1.15.3 makes it `<tosi-md sanitize="on">`, the 1.16 default** — and [#2](https://github.com/tonioloewald/kilpi/issues/2) says the denylist passes custom elements through (`is=` too), so a nested `<tosi-md>` in sanitized content re-renders raw HTML on upgrade; an unwrap/drop option or allowlist mode should land before that default flips • #1: SECURITY.md does not say which release lines get fixes • 2026-09-17: extracted from tosijs-editor after three adversarial review rounds; DOMPurify's corpus vendored as a hard publish gate — it caught a bypass 33 hand-written vectors missed | [security model](https://github.com/tonioloewald/kilpi/blob/master/SECURITY.md) | 2026-09-26 |
| [static-assets](https://github.com/tonioloewald/static-assets) *(private)* | mirror source for `cdn.tosijs.net` | — | quiet since 2026-07-11 | — | 2026-07-20 |
| [ariosto](https://github.com/tonioloewald/ariosto) *(private)* | LLM narrative engine | 0.1.0 | writing-room architecture landed (`writing-room.md`: ledger / room / stage / screening — mechanism where prompting failed) • milestone 1: re-run the murder experiment under it • also reshaping how the owner thinks about AI (journal: below-ground) | — | 2026-07-20 |

## Repository layout

```
README.md            ← you are here (the index)
AGENTS.md            ← pointer so agent tooling auto-discovers this README
CONTRIBUTING.md      ← the write-back protocol: how to add/change a practice
practices/
  00-stack.md        ← the assumed stack + when to override it
  observant-model.md ← observant vs reactive — the core UI mental model
  model-priors.md    ← priors that fight this stack (read adversarially)
  cross-project.md   ← file-dont-fix: how projects talk to each other
  development.md
  testing.md
  code-quality.md
  performance.md
  dependencies.md
  review.md
  documentation-surface.md  ← PROPOSAL — docs as build artifacts; comment welcome
  releasing.md
  publishing-via-oidc.md
  deployment.md
  state-and-schema.md
  web-components.md
  tjs-lang.md
tools/               ← executable forms of practices (pre-release-review workflow + skill)
```

## Status

Bootstrapped from the tosijs ecosystem's accumulated conventions and enriched by
per-project surveys. Every practice should be traceable to real usage in at least one
project. See `CONTRIBUTING.md` for how entries are added and kept honest, and
[`TODO.md`](TODO.md) for open work on the repo itself — chiefly **making the history
invariant**, since the no-signoff carve-out above rests on it.
