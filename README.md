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
| Writing docs, or fighting doc drift | [`practices/development.md`](practices/development.md) "Agent-facing docs travel with the code" — deeper, **experimental** proposals in [`practices/documentation-surface.md`](practices/documentation-surface.md) (evidenced parts being promoted per `reviews/2026-09-practices-audit.md` D7) |
| Cutting a release / publishing | [`practices/releasing.md`](practices/releasing.md) |
| Packing a tarball because you can't publish (`file:` deps, stopgap builds) | [`practices/releasing.md#bypassing-the-publish-loop-where-local-tarballs-live`](practices/releasing.md) — one agreed directory, never a session scratchpad |
| Hitting npm's 2FA prompt on publish, or moving publishing to CI | [`practices/publishing-via-oidc.md`](practices/publishing-via-oidc.md) — **plan**, not yet implemented |
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
- **On every release, update your project's row** — it's the last step of the canonical flow
  in [`practices/releasing.md`](practices/releasing.md). Run the tool for the facts; write
  the Activity narrative yourself.
- **Any agent that notices a stale row should fix it** — same no-signoff carve-out as any
  practice edit; normal commit protocol (`git pull --no-rebase && git push`).
- **"As of" is per-row**: when the row's facts were last verified against reality (the tool
  only advances it for rows it actually verified — an unreachable repo keeps its old date).
  Local/private projects with no remote are hand-maintained and say so in the tool.

| Project | What it is | Version | Activity | Links | As of |
| --- | --- | --- | --- | --- | --- |
| [tosijs](https://github.com/tonioloewald/tosijs) | path-based observant state | ⚠️ npm `latest` **1.10.0** · `package.json` **1.10.1** · tag **v1.10.0** | **⚠️ 1.10.1 sits in `package.json` with a dated CHANGELOG entry but is neither tagged nor on npm** — it fixes [#38](https://github.com/tonioloewald/tosijs/issues/38) (`withAttributes()`, 1.10.0's headline API, makes downstream `.d.ts` emit impossible: `tsc --noEmit` clean, `tsc --declaration` fails TS2742/TS2883 on every migrated class — this is what blocks tosijs-ui's migration) and four public types reachable from no entry. **1.10.0 published 2026-09-04 — the agent surface takes PROXIES, not just path strings, and `Component` no longer disables type checking for every component you write.** `agent.read(app.cart)` == `agent.read('app.cart')` everywhere, including `expose.roots`/`actions`; a non-path object is now REFUSED rather than `String()`-coerced, which was silently wrong two ways (a root named `"[object Object]"` matched nothing, so the MANIFEST was broken while every read refused blaming the reader — and for a boxed SCALAR `String()` yields the VALUE, so `read(app.filter)` read the path spelled by the data). Three review rounds over this release, and the pattern in all of them was **incomplete fixes**: the shadow-DOM secret leak took four attempts (light-DOM sweep → own shadow root → `[data-tosi-secret]` regions, which had never covered their subtree in light DOM EITHER → the binding on a component's HOST, where such a binding actually lives), and the first cut then OVER-redacted so badly that one password field marked a whole state root secret, permanently, because secret paths are append-only. `initAttributes` inheritance was fixed twice: it dropped the base map entirely, then survived exactly one level (a subclass declaring nothing fell back to a raw static lookup). Each miss shared a shape — **the test could not fail**: the shadow marker was on a wrapper rather than the host; the inheritance tests declared something at every level; a `describe()` test used an unwired `<div>` host so it examined nothing. `disable()` now REVOKES (it tore down the global and the observers and left the verbs live on the handle, so tightening a posture at runtime left the old WIDER surface fully usable). Also: `observe(actionProxy)` used to CALL the action on every settled touch, unaudited, because a boxed proxy over a function reports `typeof === 'function'`. Two release-process lessons written back here: **a tag is part of publishing, never a step ahead of it** (1.10.0/1.10.1/1.11.0 were all tagged with npm still on 1.9.2 — three numbers, nothing shipped), and **on disk is not in the commit** (the packaging gate used `existsSync`, went green over a commit whose bundles the browser lane had deleted, and the previous review had predicted that exact false pass in as many words). Filed upstream: tosijs-ui#129 (dev server serves stale live-example CODE — it impersonated an agent-surface security failure for a session; a second browser is the ten-second test), tosijs-ui#130 (`buildSite` does `rm -rf dist` on dev runs), tjs-lang#51 (`convert` silently DROPS an exported function depending on the text of a comment inside it). Closes #36. Prior 1.10.0 work: Its `[key: string]: any` index signature propagated to every subclass, so `this.definitelyNotAMethod()` compiled in any component anyone ever wrote — reported after five methods were lost to a mis-splice with the typecheck green and 312 tests green. **Type-only: tosijs-ui's 1230 runtime tests pass unchanged.** The root cause is that `initAttributes` is STATIC while it determines the INSTANCE shape, and TS cannot derive an instance type from a static in the same class — so the fix (the repo owner's idea) is `withAttributes({...})`, which takes the map as a VALUE and lets inference do it. It is a MOVE of the existing declaration, not an addition: tosijs-ui's month.ts went 44 errors -> 0, and 413 of its 415 errors are that one pattern. `initAttributes` is NOT deprecated — `withAttributes` emits it, so deprecating it would be the `bindList` category error again, and it is still the only way to add attributes to an EXISTING component class. Removing the signature also exposed THREE class/instance confusions inside the library, including two public spec fields typed as the instance while holding a constructor — invisible because `[key:string]: any` makes any object assignable to `Component`. Two traps worth stealing: a bare `foo?: () => void` field is NOT type-only (ES2022 class fields EMIT `undefined`, which tripped a runtime collision detector), and declaration merging — the obvious fix — is rejected by `tjs convert` (tjs-lang#49). **1.9.2 published 2026-09-03** — a held boxed proxy is a live view of its PATH, not a snapshot of the object it was created over (#35, from tosijs-3d-ensemble). `.value` resolved the path for SCALAR proxies and returned the captured target for OBJECT proxies, so two halves of one API disagreed — and because it presents as a failed *write*, the reporter wrote a passing test for the wrong hypothesis and "fixed" working code before suspecting the read. **The suite passed before AND after**, so the new tests are deliberately written to FAIL on 1.9.1: four do, and the two that pass are controls. That is what proved the change has exactly four observable effects, two of which nobody reported — a held proxy to a deleted key now reads `undefined`, and an INDEX path names a SLOT, so a held `rows[0]` silently reports a different item after a reorder (id-paths follow the item). Flagged in the CHANGELOG under its own **potentially breaking** heading: a bug fix people may have depended on. Follow-on filed: shared empty targets, whose real value is not the target slot but that it makes a proxy a pure function of its path and therefore CACHEABLE (measured: a 5-hop read allocates 10 objects / 0.55µs vs ~0 cached, and caching gives the stable proxy identity #17 wants) — needs TWO shared targets, `{}` and `[]`, because Array.isArray and JSON.stringify read the target, not the traps. **1.9.1 published 2026-09-02** — no `bind*` element-prop shortcut is deprecated any more. 1.9.0 had narrowed the deprecation to the *proxy* form on a sound rule ("deprecated iff a plain prop expresses it exactly"), but that left deprecation-ness depending on the VALUE, which TypeScript cannot express: the typings carried no `@deprecated` while the runtime still warned — **a typings/runtime mismatch introduced while fixing the previous one**, caught by tosijs-ui grepping the BUILT bundles of published 1.9.0, not the source. Removed rather than re-marked: the shortcut is the ONLY form that binds a path string, so the nudge was console spam in someone else's build for a stylistic preference. The trap in the fix: the tosijs#31 guard's positive control used `bindText` to prove its capture channel was live, so this change would have silenced the control itself — it now rings the bell directly. **1.9.0 published 2026-09-02 — `enableAgentInterface()` exposes NOTHING by default.** It used to mean read-only over the entire registry: every root, every value, every bound element on the page, on `globalThis` and published to any WebMCP host, from one unargumented call. Breaking, in a minor, deliberately — the surface is EXPERIMENTAL, five weeks old, and the break makes it *less* permissive; `expose: 'all'` restores the old behaviour in one word. **The reason it is a minor and not a patch is the interesting part:** four `describe()` secret leaks were patched across four review rounds of 1.8.3, and every one was reachable ONLY from that default. Closing the default made all four unreachable and demoted redaction from *the boundary* to defence in depth. Three further pre-tag review rounds then found the same invariant at three MORE addresses — `<a href>`/contenteditable/self-declaring components under a manifest, the structural tier, and `associatedLabel()` (which had no guard of any kind, and is the commonest naming idiom in HTML) — so the seventh fix replaced the per-site guards with ONE `ContentGuard` answering secrecy AND scope over a node and its subtree. Lesson written back to `practices/review.md`: **when N findings share one precondition, the finding IS the precondition**, plus the vacuous-fixture and environment-suppressed-assertion rules (a `wiring === []` assertion passed while four records leaked, because the fixture held only already-gated element types; happy-dom's zero geometry hid an entire tier from every test). Also: `read()` over a secret-bearing list was quadratic (686ms → 5.0ms at 800 rows, proven equivalent by a 54-query differential corpus, not by the suite); `exerciseContract()` returned a FALSE GREEN because it classified surface refusals by substring-matching their prose — refusals now carry `err.tosiRefusal`; and the `bind*` deprecation rule now applies uniformly and turns on the VALUE (a path string has no exact plain-prop equivalent, so it no longer warns — tosijs-ui reached this independently for `bindText`). Release step 8c run against the PUBLISHED TARBALL, which is what caught `isAgentRefusal` missing from the export surface: tosijs-ui 1230 tests + full doc-site build green. **1.8.2 published 2026-09-01** — the other **22 `Xin*` type names** become `Tosi*`, old spellings kept as `@deprecated` type-only aliases (zero runtime, zero bundle). 1.7.6 renamed five and nobody wrote down what else needed it, so 22 sat unconverted and **untracked for four releases** — including in the *documented* API (the component reference told you to type a stylesheet as `XinStyleSheet`). Two near-misses, both caught only by compiling a **consumer** rather than ourselves: the entry points use EXPLICIT export lists, so renaming silently REMOVED the old spellings from the public surface (invisible to our own `tsc`, since our code had already moved); and an alias must be *assignment-compatible*, not merely present. `TODO.md` now carries a single **2.0 purge inventory**, because a purge derived from grep-at-the-time misses whatever moved since. Also fixes the DOM-free gate, which blamed the *artifact* for an old `node` (`dist/state.js requires a DOM` — confident, specific, wrong) — found by running the new shared `release-doctor` Tier 0, whose own cry-wolf bug (an unmet precondition reported as FAIL) was fixed back upstream in the same sitting. **1.8.1 published 2026-08-31** — the attribute API everyone uses was INVISIBLE to agents: a component declaring `static initAttributes` (the terse form nearly every component uses, and the only one the component reference documented) appeared in `describe()` with no attribute description at all, while `contract.attributes` was fully described. So 1.8.0's headline feature systematically under-described real apps, and the population it under-described was the majority one. Found by *settling* a question rather than assuming one — two earlier probes read as "neither form works" because component self-declaration rides `wiring[].component`, not `describe().contract`, and an unbound element is dropped from the map entirely. Also: the two declaration forms now COMPOSE instead of throwing (the same two declarations already merged when split across a prototype chain — identical intent, opposite outcomes, decided by placement), and the contract API is flagged **🚧 IN FLUX** with an exit condition, so it can be steered to correctness without deprecation ceremony. Closes #28/#29. **1.8.0 published 2026-08-25** — the agent surface: `enableAgentInterface()` (describe/read/write/observe/call/changes/when/log, **read-only by default**, auto-registers WebMCP tools), contracts at app/component/element level and executable as tests, `auditAccessibility()` over the same records, `tosijs/core` and DOM-free `tosijs/state`, computed attributes, `bunx tosijs create`, Apache-2.0 relicense (§4(d) NOTICE duty is new) + 2.0 deprecations. Deviates from semver and says so; **not size-neutral** (+2.9 kB / +13.7% vs 1.7.9 for a non-agent app — measured, not claimed). Closes #18/#22/#23/#24/#27. **rc.2 is DEPRECATED on npm** — it shipped a secret-redaction regression (`agent.read()` returning values it promised to redact) found by review, not by tests. Four adversarial reviews; each of the last three found a blocker in code less than a day old, all of which passed the local suite | [site](https://tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-ui](https://github.com/tonioloewald/tosijs-ui) | web components + the doc-site system | 1.13.0 (repo · tag · npm all agree) | **1.13.0 published — repo, tag and npm `latest` agree; the 1.12.5 publish gap has cleared.** 1.8.0: build-failing `bun audit` dependency gate (on by default). 1.9.x: authenticated `bun run tunnel` dev-server sharing, **Node ESM import fix (≤1.9.0 won't resolve under Node)**, WCAG AA default palette, `tosi-table` natural sort + row grouping. 1.10.0: silent-failure sweep — table scroll preserved across re-render, magic links reusable 15 min, `docPaths` watched, concurrent-build lock, hydration bundle out of `dist/`. 1.10.1–1.12.4 all published (the 1.10.x publish gap has cleared). 1.12.4: `.tjs` source files documented again (#108). 1.12.5 fixed a narrow-screen nav regression shipped in 1.12.3 (tap a link, the nav stays up) and the `<p>`-wrapped lone custom element (#115, reported by tosijs-3d); 1.12.5–1.13.0 are all published | [site](https://ui.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-schema](https://github.com/tonioloewald/tosijs-schema) | type-by-example schema / validation | 1.9.0 (repo · tag · npm all agree) | **First non-owner issue in the ecosystem's history: [#10](https://github.com/tonioloewald/tosijs-schema/issues/10) (2026-09-02, by `anssip`) — `agentContract().check()` fails open on uncontracted paths.** Per `practices/releasing.md`, a non-owner human is the STRONGEST adoption instrument, and the 2026-08-25 baseline records zero of them ever; confirm whether this is the friend that baseline already names, then update it either way. 1.9.0 (#9, BREAKING): closes another fail-open — `maxProperties` now ENFORCED in every `validate` mode (was a strict-only "ghost constraint"); the count short-circuits at `max+1` so only schemas that declare it pay, and the "every ENFORCED_KEYWORD is enforced" drift guard now asserts the DEFAULT path too — the #8→#9 recurrence engine, now closed. Filed from the 2026-09 practices audit (D1). 1.8.1: `filter()` over `oneOf` scores retention by recursive node count, so branches differing only in nested structure resolve instead of tying into an `Error` (a loosening, non-breaking). 1.8.0 (#8, BREAKING): closes another fail-open — `oneOf` (exactly-one) + `exclusiveMinimum`/`Maximum` now ENFORCED (were silently ignored), and `unenforcedKeywords(schema)` exported so a consumer can WARN on the still-unenforced remainder (the allowlist→refuse→**enumerate** honesty pattern). Filed from tosijs-ui's `<tosi-schema-form>`; reversed the 4-day-old "no oneOf" note when its reconsider-if trigger fired. 1.7.0: `date-time`→RFC 3339 tightening + `format:'date'`. 1.6.0: `inferSchema` + `/infer` subpath. 1.5.x: fail-open validator fixes (GHSA for ≤1.4.0) + `agentContract` seam | [changelog](https://github.com/tonioloewald/tosijs-schema/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-floorplan](https://github.com/tonioloewald/tosijs-floorplan) | agent-surface map → floorplan SVG (pure, dependency-free renderer; **née tosijs-schematic**, renamed 0.3.0 over the tosijs-schema near-collision) | npm `latest` **0.3.0** · `package.json` **0.3.0** · **untagged** | 0.1.0→0.3.0 in three days, driven by the haltija convergence (issue #1: two independently-built renderers merged — `ref`/`flags`/`image`/wrapping in 0.2.0; legend + `href`/`value` + WCAG 2.5.8 target-size audit with the inline exception in 0.3.0). haltija becomes a producer at its 1.13; tosijs vendors the source file. Exported API keeps schematic-* names (multi-producer contract) | [changelog](https://github.com/tonioloewald/tosijs-floorplan/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tjs-lang](https://github.com/tonioloewald/tjs-lang) | TS dialect: runtime validation, safety boundaries, sandboxed VM | ⚠️ npm `latest` **0.13.11** · `package.json` **0.13.12** · tag **v0.13.12** | **0.13.12 is tagged but NOT published** (five defects of one class: a pass that misreads code merely *mentioning* the syntax it scans for — incl. #51, a comment containing `export ` swallowing the real one). 0.13.6 published 2026-08-26: **`defineAtom` now defaults to `effects: 'io'`** — `'pure'` skipped the capability membrane *entirely*, so a custom atom that didn't opt in handed host objects to guest code by reference; shipped as a patch on purpose, since gating a security fix behind a bump leaves the never-upgrading adopter exposed. 0.13.5 fixes two `asCompared` defects a post-release review found (a projection declared in one module silently changed another module's `if`) — 0.13.4 shipped without its tag pushed, so its full-suite pre-push gate never ran. `functions/` is on `firebase-admin ^14.3.0` now (last sweep's 3 criticals cleared, #30). 0.12.0 published (VM security review — SSRF, ReDoS). Earlier 0.13.0 work: `ci.yml` added and the two-gate split (fast lane in Actions, full suite in pre-push on tags) finally enumerated in one place; `demo/docs.json` drift fixed (twelve documents stale under a green build); review reports now land in `docs/reviews/`; benchmark harness repaired after 4.5 months broken | [playground](https://tjs-platform.web.app) · [changelog](https://github.com/tonioloewald/tjs-lang/blob/main/CHANGELOG.md) | 2026-09-05 |
| [react-tosijs](https://github.com/tonioloewald/react-tosijs) | React bridge for tosijs state | 1.2.1 (repo · tag · npm all agree) | 1.1.0–1.2.1 published 2026-07-20 (uSES rewrite, off-ramp positioning); extras shared with ngx-tosijs (react-tosijs#3) | [site](https://react.tosijs.net) · [changelog](https://github.com/tonioloewald/react-tosijs/blob/main/CHANGELOG.md) | 2026-09-05 |
| [ngx-tosijs](https://github.com/tonioloewald/ngx-tosijs) | Angular bridge for tosijs state (signals, zoneless-first) | 0.9.1 (repo · tag · npm all agree) | born 2026-07-21: 0.9.0 name-stake + 0.9.1 same-day blocker fix; two-frameworks-one-state demo | [site](https://angular.tosijs.net) · [changelog](https://github.com/tonioloewald/ngx-tosijs/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-3d](https://github.com/tonioloewald/tosijs-3d) | Babylon.js 3D components + doc site | 0.8.0 (repo · tag · npm all agree) | **0.8.0 published — the 0.7.3 publish gap has cleared; 0.7.3–0.8.0 are all on npm.** 0.7.0–0.7.2 published 2026-08-25 and the `next` dist-tag retired (the beta/rc drift in #33 has cleared). 0.7.3 was ⚠️ breaking: the biped moves to the GTA V control layout (right stick turns the body; `lookX`/`lookY` persistent), so it wants a deliberate publish, not a quiet one. A pre-tag review caught a live mkcert TLS **private key** (`tls/key.pem.bak`) staged for the release push; rewritten out while unpushed and `.gitignore` is an allowlist (`tls/*` + `!tls/.gitkeep`) now — verified absent from public history. 0.6.1–0.6.2: first-external-adopter fixes from manta-recon (chase-camera ordering #1, fly-by-wire zero-speed deadlock #2), volcanism ladder + authored landforms (volcano/crater/pad), and the systemic `frameDelta` bug that ran 14 subsystems at half/quarter speed. 0.7.0 betas: aircraft flight-model rework (**breaking** — `b3dPatch` removed, right stick = camera), `medium` primitive + medium-aware projectiles, pause/VR entry, ~15 manta-recon issues fixed | [site](https://3d.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-3d/blob/main/CHANGELOG.md) | 2026-09-05 |
| tosijs-3d-ensemble | the ensemble FORMAT + instantiator + a graphical editor for authoring them (extracted from manta-recon's prefab bench); local `~/tosijs-3d-ensemble` git repo | 0.1.0 (unpublished) | born 2026-08-21: scaffolded on `tosijs-ui/site`. Format, roles-as-presets, `validate` returning `{severity,code,message,path}`, a feature registry with **two-phase `bind`/`link`**, and `buildEnsemble` with dispose — 27 tests. **One package, editor tree-shakes away**, asserted by a bundle test rather than packaging. Editor chrome is tosijs-3d's **SVG UI** (a headset-capable divergence from the DOM-widget default); environment primitives (terrain/water/clouds/ambient/fog) are features with no mesh. 8 upstream asks recorded in its UPSTREAM.md, none filed yet | — | 2026-08-21 |
| manta-recon | revival of *Manta* (2010 Unity iPhone game) on tosijs-3d — the "tech demo → shipped game" proving ground; local `~/manta-recon` git repo | 0.1.0 (private) | **the manta flies again** — step 1 scaffold on tosijs-3d 0.6.0: VTOL takeoff, 75 m/s cruise, dive, surface skim, underwater flight (free fog/bubbles). Filed tosijs-3d#1 (camera race, worked around), #2 (fly-by-wire deadlock), #3 (underwater regime — Manta prototypes, then upstreams). Next: water passthrough + per-medium drag, immelman port | — | 2026-08-10 |
| [tosijs-product](https://github.com/tonioloewald/tosijs-product) | scroll-linked animation components | 0.7.0 (repo · tag · npm all agree) | 0.7.0 published (repo, tag and npm `latest` agree). 0.6.4 (supersedes never-published 0.6.3): first release on the tosijs-ui 1.7 line, lazy-loaded doc-site editor (known CDN-IIFE size regression; ESM path unaffected). 0.6.5: fixes 0.6.4's `files`-glob packaging blowout (13.7 MB→2.8 MB unpacked, 27→8 files) — **0.6.4 consumers should upgrade** | [site](https://product.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-product/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-timezone-picker](https://github.com/tonioloewald/tosijs-timezone-picker) | graphical timezone-picker web-component | npm `latest` **0.6.0** · `package.json` **0.6.0** · **untagged** | 0.6.0: published 2026-08-18, source pushed 2026-08-23 after the weekly sweep caught `main` still at 0.5.3 — published tarball verified content-identical to the pushed HEAD (`f013750`); **still untagged** (a `v0.6.0` tag at `f013750` is safe when wanted). Ships as a blueprint + eagerly-hydrated component; bespoke demo → tosijs-ui doc site; fixed NaN quarter-hour offsets and value/timezone desync | [site](https://timezones.tosijs.net) · [changelog](https://github.com/tonioloewald/tosijs-timezone-picker/blob/main/CHANGELOG.md) | 2026-09-05 |
| [haltija](https://github.com/tonioloewald/haltija) | browser control for AI agents | ⚠️ npm `latest` **1.12.8** · `package.json` **1.12.9** · tag **v1.12.9** | **⚠️ 1.12.9 is tagged but NOT published, and it carries four security fixes** — published 1.12.8's `apps/desktop/terminal.html` loads `cdn.babylonjs.com/babylon.js` at rolling latest with **no pin and no SRI** into the frame whose postMessage relay reaches `spawn('sh','-c')` (CSP is stripped globally, the iframe is unsandboxed); 1.12.9 pins v9.25.0 + `integrity`, default-denies the renderer relay's sender, requires a local origin on `/ws/terminal` + `/ws/agent`, and stops `HALTIJA_MACHINE_CHANNEL` leaking into spawned children. ✅ [#40](https://github.com/tonioloewald/haltija/issues/40) (unauthenticated `/terminal/*` + `/files/*`) is **fixed in published 1.12.8** — a `['/terminal/','/files/']` prefix default-deny sits ahead of the token check and all routing; the issue stays open only for restoring the desktop tabs over a non-TCP channel. 1.12.6: Electron 40.6.1→43.4.1 (two context-isolation bypasses), `apps/mcp` re-locked off the MCP SDK cross-client leak, `electron-builder` dropped as a dep (285 packages→14), plus the widget finally sending `X-Haltija-Token` and LAN/`wss://` fixes. 1.12.5 published 2026-08-21 (1.12.3/1.12.4 tagged, never published, superseded). 1.12.0 the **trustworthy-by-default** minor (silent-success purge: `hj find` returning the whole app, `hj test` exiting 0 on failure, iframe tab-clobber). 1.12.1: agent-reported fixes (#25/#27/#28/#29). 1.12.2: private-profile isolation (#31, 10× slow boots) + runner `drag`; a no-op `wait` is now an error. 1.12.4: `select`→`select-text` rename via deprecating alias (measured naming probe), docs-drift machinery, **20 MCP endpoints restored** (missing since January), coverage hole closed (3 bugs found) | [changelog](https://github.com/tonioloewald/haltija/blob/main/CHANGELOG.md) | 2026-09-05 |
| [wobbly](https://github.com/tonioloewald/wobbly) | Web-Worker parallel array ops (npm pkg **`wobbly-js`** — plain `wobbly` is someone else's) | ⚠️ npm `latest` **0.1.0** (`wobbly-js`) · `package.json` **0.6.0** · tag **v0.6.0** | `gm-demo` proves the thesis end-to-end | [changelog](https://github.com/tonioloewald/wobbly/blob/main/CHANGELOG.md) | 2026-09-05 |
| [tosijs-editor](https://github.com/tonioloewald/tosijs-editor) | rich-text editor component — no contentEditable (pkg `tosijs-styled-editor`, unpublished; KB attributions say `editor2`) | npm **unpublished** (`tosijs-styled-editor`) · `package.json` **0.2.0** · **untagged** | **back-burnered** — owner has switched to markdown for writing; revisit only if a rich-text editor is actually needed | — | 2026-09-05 |
| [lukko](https://github.com/tonioloewald/lukko) | capability-secured LLM agent middleware | `package.json` **0.1.0** · **untagged** | early. **⚠️ [#2](https://github.com/tonioloewald/lukko/issues/2) unfixed since 2026-08-23: 2 critical / 11 high advisories, all from ONE edge** — the `tjs-lang: ^0.3.0` pin locks `tjs-lang@0.3.0`, which carried `firebase@10.14.1` as a *runtime* dep (`protobufjs@7.5.4` RCE, `websocket-driver@0.7.4`, `@grpc/grpc-js`, `undici`). Current tjs-lang has firebase as a devDependency only, so `bun add tjs-lang@^0.13.11` deletes the whole subtree. `private: true`, so nothing ships — but it installs on the dev machine | — | 2026-09-05 |
| [loewald-dot-com](https://github.com/tonioloewald/tosijs-platform) | Firebase full-stack platform (repo: `tosijs-platform`) | `package.json` **1.0.6** · **untagged** | quiet since 2026-07-11 | — | 2026-09-05 |
| [kith-email](https://github.com/tonioloewald/kith-email) *(private)* | email client (Tauri desktop) | `package.json` **0.8.5** · **untagged** | quiet since 2026-07-11 | — | 2026-09-05 |
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
