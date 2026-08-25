# tosijs coding practices

**Shared, agent-readable engineering practices for the tosijs / tjs-lang ecosystem.**

This repository is a single source of truth for how we build, test, review, deploy, and
release software across all of Tonio Loewald's projects. It is written to be consumed by
**both humans and LLM coding agents**. If you are an agent working in any project that
links here, read this file first, then read the specific practice doc(s) relevant to your
task.

> One index (this file) → a small set of focused practice docs. Nothing else to discover.

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
| Setting up or working in a project day-to-day | [`practices/development.md`](practices/development.md) |
| Writing or debugging tests | [`practices/testing.md`](practices/testing.md) |
| Linting, formatting, type-safety, naming | [`practices/code-quality.md`](practices/code-quality.md) |
| Worrying about speed, bundle size, or monitoring | [`practices/performance.md`](practices/performance.md) |
| Adding a dependency, or building/using a security gate | [`practices/dependencies.md`](practices/dependencies.md) — a gate must never report a pass it didn't earn |
| Reviewing code (a diff, a PR, or the nine-lens pre-release review) | [`practices/review.md`](practices/review.md) |
| Writing docs, naming things, or fighting doc drift **(PROPOSAL — comment welcome)** | [`practices/documentation-surface.md`](practices/documentation-surface.md) |
| Cutting a release / publishing | [`practices/releasing.md`](practices/releasing.md) |
| Packing a tarball because you can't publish (`file:` deps, stopgap builds) | [`practices/releasing.md#bypassing-the-publish-loop-where-local-tarballs-live`](practices/releasing.md) — one agreed directory, never a session scratchpad |
| Hitting npm's 2FA prompt on publish, or moving publishing to CI | [`practices/publishing-via-oidc.md`](practices/publishing-via-oidc.md) — **plan**, not yet implemented |
| Shipping to a host | [`practices/deployment.md`](practices/deployment.md) |
| Managing state or schemas | [`practices/state-and-schema.md`](practices/state-and-schema.md) |
| Building web components | [`practices/web-components.md`](practices/web-components.md) |
| Writing TJS / safety boundaries / monadic errors | [`practices/tjs-lang.md`](practices/tjs-lang.md) |

## Project scoreboard

The projects linked to this knowledge base, at a glance. **Keep it fresh:**

- **On every release, update your project's row** — it's the last step of the canonical flow
  in [`practices/releasing.md`](practices/releasing.md).
- **Any agent that notices a stale row should fix it** — same no-signoff carve-out as any
  practice edit; normal commit protocol (`git pull --no-rebase && git push`).
- **"As of" is per-row**: when the row was last verified against reality, not when the
  project last changed. A row untouched for a month is a row to re-check.

| Project | What it is | Version | Activity | Links | As of |
| --- | --- | --- | --- | --- | --- |
| [tosijs](https://github.com/tonioloewald/tosijs) | path-based observant state | 1.8.0 | **1.8.0 published 2026-08-25** — the agent surface: `enableAgentInterface()` (describe/read/write/observe/call/changes/when/log, **read-only by default**, auto-registers WebMCP tools), contracts at app/component/element level and executable as tests, `auditAccessibility()` over the same records, `tosijs/core` and DOM-free `tosijs/state`, computed attributes, `bunx tosijs create`, Apache-2.0 relicense (§4(d) NOTICE duty is new) + 2.0 deprecations. Deviates from semver and says so; **not size-neutral** (+2.9 kB / +13.7% vs 1.7.9 for a non-agent app — measured, not claimed). Closes #18/#22/#23/#24/#27. **rc.2 is DEPRECATED on npm** — it shipped a secret-redaction regression (`agent.read()` returning values it promised to redact) found by review, not by tests. Four adversarial reviews; each of the last three found a blocker in code less than a day old, all of which passed the local suite | [site](https://tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs/blob/main/CHANGELOG.md) | 2026-08-25 |
| [tosijs-ui](https://github.com/tonioloewald/tosijs-ui) | web components + the doc-site system | 1.10.0 | 1.8.0: build-failing `bun audit` dependency gate (on by default). 1.9.x: authenticated `bun run tunnel` dev-server sharing, **Node ESM import fix (≤1.9.0 won't resolve under Node)**, WCAG AA default palette, `tosi-table` natural sort + row grouping. 1.10.0: silent-failure sweep — table scroll preserved across re-render, magic links reusable 15 min, `docPaths` watched, concurrent-build lock, hydration bundle out of `dist/` | [site](https://ui.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md) | 2026-08-17 |
| [tosijs-schema](https://github.com/tonioloewald/tosijs-schema) | type-by-example schema / validation | 1.8.0 | 1.8.0 (#8, BREAKING): closes another fail-open — `oneOf` (exactly-one) + `exclusiveMinimum`/`Maximum` now ENFORCED (were silently ignored), and `unenforcedKeywords(schema)` exported so a consumer can WARN on the still-unenforced remainder (the allowlist→refuse→**enumerate** honesty pattern). Filed from tosijs-ui's `<tosi-schema-form>`; reversed the 4-day-old "no oneOf" note when its reconsider-if trigger fired. 1.7.0: `date-time`→RFC 3339 tightening + `format:'date'`. 1.6.0: `inferSchema` + `/infer` subpath. 1.5.x: fail-open validator fixes (GHSA for ≤1.4.0) + `agentContract` seam | [changelog](https://github.com/tonioloewald/tosijs-schema/blob/main/CHANGELOG.md) | 2026-08-24 |
| [tosijs-floorplan](https://github.com/tonioloewald/tosijs-floorplan) | agent-surface map → floorplan SVG (pure, dependency-free renderer; **née tosijs-schematic**, renamed 0.3.0 over the tosijs-schema near-collision) | 0.3.0 | 0.1.0→0.3.0 in three days, driven by the haltija convergence (issue #1: two independently-built renderers merged — `ref`/`flags`/`image`/wrapping in 0.2.0; legend + `href`/`value` + WCAG 2.5.8 target-size audit with the inline exception in 0.3.0). haltija becomes a producer at its 1.13; tosijs vendors the source file. Exported API keeps schematic-* names (multi-producer contract) | [changelog](https://github.com/tonioloewald/tosijs-floorplan/blob/main/CHANGELOG.md) | 2026-08-17 |
| [tjs-lang](https://github.com/tonioloewald/tjs-lang) | TS dialect: runtime validation, safety boundaries, sandboxed VM | 0.12.0 | 0.12.0 published (VM security review — SSRF, ReDoS). **0.13.0 in flight, unpublished** (163 commits past v0.13.0-beta.1): `ci.yml` added and the two-gate split (fast lane in Actions, full suite in pre-push on tags) finally enumerated in one place; `demo/docs.json` drift fixed (twelve documents stale under a green build); review reports now land in `docs/reviews/`; benchmark harness repaired after 4.5 months broken | [playground](https://tjs-platform.web.app) · [changelog](https://github.com/tonioloewald/tjs-lang/blob/main/CHANGELOG.md) | 2026-08-17 |
| [react-tosijs](https://github.com/tonioloewald/react-tosijs) | React bridge for tosijs state | 1.2.1 | 1.1.0–1.2.1 published 2026-07-20 (uSES rewrite, off-ramp positioning); extras shared with ngx-tosijs (react-tosijs#3) | [site](https://react.tosijs.net) · [changelog](https://github.com/tonioloewald/react-tosijs/blob/main/CHANGELOG.md) | 2026-08-17 |
| [ngx-tosijs](https://github.com/tonioloewald/ngx-tosijs) | Angular bridge for tosijs state (signals, zoneless-first) | 0.9.1 | born 2026-07-21: 0.9.0 name-stake + 0.9.1 same-day blocker fix; two-frameworks-one-state demo | [site](https://angular.tosijs.net) · [changelog](https://github.com/tonioloewald/ngx-tosijs/blob/main/CHANGELOG.md) | 2026-08-17 |
| [tosijs-3d](https://github.com/tonioloewald/tosijs-3d) | Babylon.js 3D components + doc site | 0.6.2 (`latest`) · 0.7.0-beta.6 (`next`) | 0.6.1–0.6.2: first-external-adopter fixes from manta-recon (chase-camera ordering #1, fly-by-wire zero-speed deadlock #2), volcanism ladder + authored landforms (volcano/crater/pad), and the systemic `frameDelta` bug that ran 14 subsystems at half/quarter speed. 0.7.0 betas: aircraft flight-model rework (**breaking** — `b3dPatch` removed, right stick = camera), `medium` primitive + medium-aware projectiles, pause/VR entry, ~15 manta-recon issues fixed | [site](https://3d.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-3d/blob/main/CHANGELOG.md) | 2026-08-17 |
| tosijs-3d-ensemble | the ensemble FORMAT + instantiator + a graphical editor for authoring them (extracted from manta-recon's prefab bench); local `~/tosijs-3d-ensemble` git repo | 0.1.0 (unpublished) | born 2026-08-21: scaffolded on `tosijs-ui/site`. Format, roles-as-presets, `validate` returning `{severity,code,message,path}`, a feature registry with **two-phase `bind`/`link`**, and `buildEnsemble` with dispose — 27 tests. **One package, editor tree-shakes away**, asserted by a bundle test rather than packaging. Editor chrome is tosijs-3d's **SVG UI** (a headset-capable divergence from the DOM-widget default); environment primitives (terrain/water/clouds/ambient/fog) are features with no mesh. 8 upstream asks recorded in its UPSTREAM.md, none filed yet | — | 2026-08-21 |
| manta-recon | revival of *Manta* (2010 Unity iPhone game) on tosijs-3d — the "tech demo → shipped game" proving ground; local `~/manta-recon` git repo | 0.1.0 (private) | **the manta flies again** — step 1 scaffold on tosijs-3d 0.6.0: VTOL takeoff, 75 m/s cruise, dive, surface skim, underwater flight (free fog/bubbles). Filed tosijs-3d#1 (camera race, worked around), #2 (fly-by-wire deadlock), #3 (underwater regime — Manta prototypes, then upstreams). Next: water passthrough + per-medium drag, immelman port | — | 2026-08-10 |
| [tosijs-product](https://github.com/tonioloewald/tosijs-product) | scroll-linked animation components | 0.6.5 | 0.6.4 (supersedes never-published 0.6.3): first release on the tosijs-ui 1.7 line, lazy-loaded doc-site editor (known CDN-IIFE size regression; ESM path unaffected). 0.6.5: fixes 0.6.4's `files`-glob packaging blowout (13.7 MB→2.8 MB unpacked, 27→8 files) — **0.6.4 consumers should upgrade** | [site](https://product.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-product/blob/main/CHANGELOG.md) | 2026-08-17 |
| [tosijs-timezone-picker](https://github.com/tonioloewald/tosijs-timezone-picker) | graphical timezone-picker web-component | 0.6.0 | 0.6.0: published 2026-08-18, source pushed 2026-08-23 after the weekly sweep caught `main` still at 0.5.3 — published tarball verified content-identical to the pushed HEAD (`f013750`); **still untagged** (a `v0.6.0` tag at `f013750` is safe when wanted). Ships as a blueprint + eagerly-hydrated component; bespoke demo → tosijs-ui doc site; fixed NaN quarter-hour offsets and value/timezone desync | [site](https://timezones.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-timezone-picker/blob/main/CHANGELOG.md) | 2026-08-23 |
| [haltija](https://github.com/tonioloewald/haltija) | browser control for AI agents | 1.12.2 | 1.12.0 the **trustworthy-by-default** minor (silent-success purge: `hj find` returning the whole app, `hj test` exiting 0 on failure, iframe tab-clobber). 1.12.1: agent-reported fixes (#25/#27/#28/#29). 1.12.2: private-profile isolation (#31, 10× slow boots) + runner `drag`; a no-op `wait` is now an error. **1.12.3 tagged but never published**; 1.12.4 in flight: `select`→`select-text` rename via deprecating alias (measured naming probe), docs-drift machinery, **20 MCP endpoints restored** (missing since January), coverage hole closed (3 bugs found) | [changelog](https://github.com/tonioloewald/haltija/blob/main/CHANGELOG.md) | 2026-08-17 |
| [wobbly](https://github.com/tonioloewald/wobbly) | Web-Worker parallel array ops (npm pkg **`wobbly-js`** — plain `wobbly` is someone else's) | 0.6.0 (repo; npm `wobbly-js` still 0.1.0) | `gm-demo` proves the thesis end-to-end | [changelog](https://github.com/tonioloewald/wobbly/blob/main/CHANGELOG.md) | 2026-08-17 |
| [tosijs-editor](https://github.com/tonioloewald/tosijs-editor) | rich-text editor component — no contentEditable (pkg `tosijs-styled-editor`, unpublished; KB attributions say `editor2`) | 0.2.1 | **back-burnered** — owner has switched to markdown for writing; revisit only if a rich-text editor is actually needed | — | 2026-07-23 |
| [lukko](https://github.com/tonioloewald/lukko) | capability-secured LLM agent middleware | 0.1.0 | early | — | 2026-07-20 |
| [loewald-dot-com](https://github.com/tonioloewald/tosijs-platform) | Firebase full-stack platform (repo: `tosijs-platform`) | 1.0.6 | quiet since 2026-07-11 | — | 2026-07-20 |
| [kith-email](https://github.com/tonioloewald/kith-email) *(private)* | email client (Tauri desktop) | 0.8.5 | quiet since 2026-07-11 | — | 2026-07-20 |
| [static-assets](https://github.com/tonioloewald/static-assets) *(private)* | mirror source for `cdn.tosijs.net` | — | quiet since 2026-07-11 | — | 2026-07-20 |
| [ariosto](https://github.com/tonioloewald/ariosto) *(private)* | LLM narrative engine | 0.1.0 | v0.1 POC done; findings recorded | — | 2026-07-20 |

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
