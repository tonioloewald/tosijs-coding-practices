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

1. **Start here.** This README is the index. Every practice lives in `practices/`.
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
| Hitting a problem that belongs to *another* repo | **[`practices/cross-project.md`](practices/cross-project.md)** — file, don't fix |
| Setting up or working in a project day-to-day | [`practices/development.md`](practices/development.md) |
| Writing or debugging tests | [`practices/testing.md`](practices/testing.md) |
| Linting, formatting, type-safety, naming | [`practices/code-quality.md`](practices/code-quality.md) |
| Worrying about speed, bundle size, or monitoring | [`practices/performance.md`](practices/performance.md) |
| Reviewing code (a diff, a PR, or the nine-lens pre-release review) | [`practices/review.md`](practices/review.md) |
| Cutting a release / publishing | [`practices/releasing.md`](practices/releasing.md) |
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
| [tosijs](https://github.com/tonioloewald/tosijs) | path-based observant state | 1.7.0 | 1.7.0 released & published (built on tosijs-ui 1.7.0-rc.1 as host) | [site](https://tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs/blob/main/CHANGELOG.md) | 2026-07-20 |
| [tosijs-ui](https://github.com/tonioloewald/tosijs-ui) | web components + the doc-site system | 1.7.0 | 1.7.0 released (CodeMirror 6, first-class tjs, inline WASM); validated as tosijs 1.7.0's build host; tjs-lang 0.12.0 | [site](https://ui.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md) | 2026-07-20 |
| [tosijs-schema](https://github.com/tonioloewald/tosijs-schema) | type-by-example schema / validation | 1.4.0 | quiet since 2026-07-11 | — | 2026-07-20 |
| [tjs-lang](https://github.com/tonioloewald/tjs-lang) | TS dialect: runtime validation, safety boundaries, sandboxed VM | 0.12.0 | 0.12.0 published — VM security review (SSRF, ReDoS); adopted by tosijs-ui (zero-friction) | [playground](https://tjs-platform.web.app) · [changelog](https://github.com/tonioloewald/tjs-lang/blob/main/CHANGELOG.md) | 2026-07-20 |
| [react-tosijs](https://github.com/tonioloewald/react-tosijs) | React bridge for tosijs state | 1.2.1 | 1.1.0–1.2.1 published 2026-07-20 (uSES rewrite, off-ramp positioning); extras shared with ngx-tosijs (react-tosijs#3) | [site](https://react.tosijs.net) · [changelog](https://github.com/tonioloewald/react-tosijs/blob/main/CHANGELOG.md) | 2026-07-21 |
| [ngx-tosijs](https://github.com/tonioloewald/ngx-tosijs) | Angular bridge for tosijs state (signals, zoneless-first) | 0.9.1 | born 2026-07-21: 0.9.0 name-stake + 0.9.1 same-day blocker fix; two-frameworks-one-state demo | [site](https://angular.tosijs.net) · [changelog](https://github.com/tonioloewald/ngx-tosijs/blob/main/CHANGELOG.md) | 2026-07-21 |
| [tosijs-3d](https://github.com/tonioloewald/tosijs-3d) | Babylon.js 3D components + doc site | 0.5.0 | docs & tooling polish | [site](https://3d.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-3d/blob/main/CHANGELOG.md) | 2026-07-20 |
| [tosijs-product](https://github.com/tonioloewald/tosijs-product) | scroll-linked animation components | 0.6.3 | changelog corrections | [site](https://product.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-product/blob/main/CHANGELOG.md) | 2026-07-20 |
| [haltija](https://github.com/tonioloewald/haltija) | browser control for AI agents | 1.5.2 | 1.5.x: `--private` isolated automation instances (+ misc tweaks) | [changelog](https://github.com/tonioloewald/haltija/blob/main/CHANGELOG.md) | 2026-07-20 |
| [wobbly](https://github.com/tonioloewald/wobbly) | Web-Worker parallel array ops | 0.6.0 | `gm-demo` proves the thesis end-to-end | [changelog](https://github.com/tonioloewald/wobbly/blob/main/CHANGELOG.md) | 2026-07-20 |
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
  review.md
  releasing.md
  deployment.md
  state-and-schema.md
  web-components.md
  tjs-lang.md
```

## Status

Bootstrapped from the tosijs ecosystem's accumulated conventions and enriched by
per-project surveys. Every practice should be traceable to real usage in at least one
project. See `CONTRIBUTING.md` for how entries are added and kept honest, and
[`TODO.md`](TODO.md) for open work on the repo itself — chiefly **making the history
invariant**, since the no-signoff carve-out above rests on it.
