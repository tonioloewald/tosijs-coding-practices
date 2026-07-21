# The assumed stack

These are the defaults. A project may override any of them in its own `CLAUDE.md`/`AGENTS.md`;
when it does, record the divergence under "Known divergences" below so the next agent isn't
surprised.

## Defaults

| Concern | Default | Notes |
| --- | --- | --- |
| Runtime / package manager | **Bun** | `bun install`, `bun run`, `bun test`, `bun build`. Not npm/yarn/pnpm/node unless a project says so. |
| Language | **TypeScript**, moving to **TJS** (`tjs-lang`) | TS strict mode. TJS adds runtime validation, safety boundaries, monadic errors, sandboxed VM. |
| State | **tosijs** | Path-based observant state (proxy observers). "Observant," not "reactive" — see below. |
| Web components | **tosijs-ui** | Standards-based custom elements; also ships the doc-site / live-example system. |
| Schema / validation | **tosijs-schema** | Type-by-example schemas; cross-language JSON Schema emission. |
| React interop | **react-tosijs** | Only where React is genuinely required. |
| Deployment | **GitHub Pages**, **Firebase**, or **Cloudflare Pages / R2** | Pick per project; see `deployment.md`. |

## Legacy naming: xinjs → tosijs

The core libraries were renamed **xinjs → tosijs**, **xinjs-ui → tosijs-ui**, and
**react-xinjs → react-tosijs** (repos renamed and npm packages deprecated 2026-07-20; the
final xinjs npm versions carry deprecation notices pointing at their successors). What this
means in practice:

- **Never install or depend on `xinjs*`** — they are frozen shells. If you find one in a
  lockfile or `package.json`, that's a migration miss: swap to the tosijs name.
- **Old references are the same lineage, not a different library.** Docs, issues, blog
  posts, and training-data memories about xinjs describe tosijs's ancestry — useful
  context, but version numbers and APIs may predate the rename; verify against the
  current package.
- **GitHub redirects the old repo URLs**, so stale links still resolve — don't "fix" a
  working xinjs link in third-party content you can't edit, but use tosijs names in
  anything we author. — seen in: react-tosijs (repo renamed after the npm package)

## Vocabulary that matters

- **Observant, not reactive.** tosijs uses observers/pub-sub. The UI is *not* `f(state)`;
  the DOM is a persistent structure wired by bindings, and observers surgically update
  bound nodes in place. This is unlike React/vdom and unlike Lit's render-rewrite. Say
  "observant." Do not describe tosijs as "reactive rendering." This is the single most
  important concept in the stack — [`observant-model.md`](observant-model.md) is its
  canonical explanation and required reading before component/binding work.
- **Boxed vs. raw.** tosijs exposes state through proxies; scalars can be "boxed" (carry
  `.value`/`.path`/`.observe`) or raw. See `state-and-schema.md`.
- **Safety boundaries.** In TJS, validate at public API edges (`safety inputs`) and drop
  safety in hot internals (`safety none`). See `tjs-lang.md`.

## Zero-dependency bias

The core libraries (tosijs, tosijs-ui, tjs-lang) aim for **zero runtime dependencies** and
small gzip footprints. Prefer web standards and small in-repo utilities over pulling a
package. A new runtime dependency in a core library is a decision to justify, not a default.

**Known divergence — tosijs-ui (as of 1.7):** 12 `@codemirror/*` packages are hard runtime
`dependencies`. CodeMirror can't be a naive optional peer — the editor, its language modes, and
the tjs extension must all share ONE `@codemirror/state` instance, and a separately-resolved
copy silently no-ops. **Do not "fix" this by demoting them to peers** (it breaks tjs
highlighting/autocomplete). The gate on a new runtime dep there is the printed gzip delta, not
the dependency count.

## Bun is mid-rewrite — pin it, treat a major bump as a migration

Bun **1.4.0 is a ground-up rewrite from Zig to Rust** (AI-generated, merged upstream). The whole
toolchain — runtime, test runner, bundler — assumes Bun, so this is the stack's single largest
upstream risk.

- **1.3.14 is the last Zig release; 1.4.0 is the first Rust build.** npm `latest` and `canary`
  are both frozen on the Zig line while the default branch churns — no incremental builds ship to
  npm, so 1.4.0 arrives as one big-bang discontinuity, not a canary-hardened rollout.
- **Pin Bun; treat the eventual `latest` bump as a major migration.** You won't float onto 1.4.x
  by surprise today (`package.json` / CI / `bun upgrade` resolve 1.3.14), but validate the full
  suite in isolation before adopting, and let others hit the edge cases first — the QA is
  contested (AI-generated at very high velocity; test-conformance is the only signal).
- **Upstream fixes may never reach a channel you consume.** Bun fixes the stack depends on
  (`Bun.build` arena oven-sh/bun#34054, test-runner OOM #34179) sit as open PRs against the
  now-legacy Zig tree. Don't wait on them; re-verify against 1.4.0 and re-file against the Rust
  tree if the bug survives. See [`cross-project.md`](cross-project.md).
- Same shape as the Prettier-v2 pin under "Known divergences," one tier down: the tool you build
  *on* can move under you, and a pin is a considered position, not neglect.
— seen in: the machine-killing bun OOMs (oven-sh/bun#34178) that motivated the tosijs-ui dev guard

## Deployment target by project

The "pick per project" choice, as actually made across the ecosystem:

| Target | Projects | Shape |
| --- | --- | --- |
| **GitHub Pages** (committed `docs/`) | tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs, editor2 | Static doc/library site built into `docs/`, served from the **`main` branch `/docs` folder** (not root), custom domain via `CNAME`. |
| **Firebase** (Hosting + Functions) | tjs-lang (playground), loewald-dot-com | Full-stack; Cloud Functions in `functions/` run **npm + Node**, separate from the Bun root. |
| **Cloudflare Pages / R2** | static-assets (primary), tosijs-3d (asset CDN `cdn.tosijs.net`) | Public asset CDN; free egress. Firebase Hosting kept as a byte-identical fallback. |
| **Tauri v2 desktop DMG** | kith-email, lukko | Rust/webview or Bun-sidecar backend; "deploy" = code-sign + notarize a DMG, no web host. |
| **npm package (+ Electron DMG)** | haltija, and every published library | Distributed as tooling/library; `npm publish` (mind `--tag beta` for pre-releases). |

## Known divergences

Where a project departs from the defaults, and why. Format: `project — what differs — why`.

- **kith-email** — defaults components to **light DOM**, not shadow DOM — tosijs path bindings don't work inside shadow DOM; shadow is reserved for true isolation (untrusted email HTML). Also: Tauri desktop, Rust/SQLite core (no tosijs-schema), no tjs.
- **haltija** — **no tosijs / tosijs-ui**; hand-rolled vanilla custom elements — the widget injects into arbitrary third-party pages, so it must be framework-free and non-disruptive. Uses only tosijs-schema. Mixed **Bun + Node** runtime (Playwright/CLI on Node).
- **static-assets** — **no stack at all**; pure Bun CLI tooling over binary assets — its job is to stage/convert/publish assets and generate host config, not render UI.
- **wobbly** — **no tosijs / tosijs-ui / tosijs-schema**, and **no build entry point at all** — it's a zero-runtime-dep Web Worker library (parallel `map`/`filter`/`reduce`/`forEach` over large arrays), so there's no UI for the observant model to apply to, and `index.ts` re-exports the source directly rather than building. Aligned on Bun + TS strict; no ESLint/Prettier yet. Note for the "ONE build/dev entry per repo" rule in [`development.md`](development.md): here the answer is genuinely *none* — don't go looking.
- **ariosto** — **no tosijs / tosijs-ui / tosijs-schema, and no UI at all** — it's a CLI narrative engine (an LLM turn-loop over an in-memory graph), so there is nothing for the observant model to apply to; browser play is an ambition, not built. Sole runtime dep is `@google/genai` (**Gemini**, not Claude — model hardcoded in `src/llm.ts`). Plain TS strict (`noUncheckedIndexedAccess`), no `.tjs`, no ESLint/Prettier. **Bun runs the app (`bun run play`) but tests run on Node's built-in runner** (`node --experimental-strip-types --test`) — no reason is recorded for the split; treat it as historical rather than a considered divergence from [`testing.md`](testing.md), and converge on `bun test` if nobody can name one.
- **falling-forward** — **a prose project, not software**: the story bible + serialized drafts of a hard-SF novel trilogy (Book 1: *Contingent*), wearing the thinnest possible tosijs-ui doc-system shell (`bin/site.ts`, `site.config.ts`, two package scripts). **No tests, no lint, no `tsconfig.json` — deliberate; don't invent them.** Work happens in two registers: *editorial* for the corpus (`chapters/`, `notes/`, `outlines/` — governed by its own `CLAUDE.md`, which wins over these practices), *engineering* for the shell (these practices apply). The doc-system's `book` manifest curates one markdown source into two outputs — the full working "iceberg" as a dev site with edit-in-situ, a chapters-only ePub re-emitted on every build — so the apparatus physically can't leak into the book. Not an abuse of the doc-system: see the design-intent note in [`web-components.md`](web-components.md) § doc-system.
- **tosijs-schema / tjs-lang / react-tosijs** — the **libraries themselves**; tosijs/tosijs-ui are devDeps or the thing being built, not runtime deps — they're building blocks other projects consume. tjs-lang deploys to **Firebase**; its `functions/` use **npm + Node 22**.
- **tosijs-3d / tosijs-product** — **Babylon.js / DOM-driven scroll engine** carry most state; little-to-no tosijs state store — simulation determinism / DOM-as-state fit the domain better than a generic store. tosijs-ui is a **build-time devDep** (doc-site tooling), not a runtime UI dep.
- **loewald-dot-com** — all Firestore access routed through **Cloud Functions RBAC** (`firestore.rules` deny-all); root Bun, `functions/` npm+Node 20 — the "PHP/LAMP simplicity via Firebase" thesis; the client never touches the Firestore SDK.
- **lukko** — **tjs-lang is central**: VM atoms double as capability tokens — the security model and tool/DSL system are unified (the project's thesis).
- **editor2 / kith-email / lukko / react-tosijs** — **plain TypeScript, no `.tjs`** — the TJS superset isn't needed for a standard component/integration library or (yet) these apps.
- **Nearly all** — **no CI**; local quality gates + a "Landing the Plane" push discipline substitute for it (see [`releasing.md`](releasing.md)). Exceptions: haltija (3 GitHub Actions incl. Docs-Drift), tosijs-ui (GitHub Actions: `tsc` + unit lane + a Chromium E2E job; Firefox/WebKit only in the manual local lane), tjs-lang (git pre-push hook).
- **Nearly all libraries** — **Prettier pinned to v2.8.8** — a deliberate/stale pin; upgrading would reformat the tree. Watch it before assuming Prettier 3 behavior.
