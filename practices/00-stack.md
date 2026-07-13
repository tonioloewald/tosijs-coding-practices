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
- **tosijs-schema / tjs-lang / react-tosijs** — the **libraries themselves**; tosijs/tosijs-ui are devDeps or the thing being built, not runtime deps — they're building blocks other projects consume. tjs-lang deploys to **Firebase**; its `functions/` use **npm + Node 22**.
- **tosijs-3d / tosijs-product** — **Babylon.js / DOM-driven scroll engine** carry most state; little-to-no tosijs state store — simulation determinism / DOM-as-state fit the domain better than a generic store. tosijs-ui is a **build-time devDep** (doc-site tooling), not a runtime UI dep.
- **loewald-dot-com** — all Firestore access routed through **Cloud Functions RBAC** (`firestore.rules` deny-all); root Bun, `functions/` npm+Node 20 — the "PHP/LAMP simplicity via Firebase" thesis; the client never touches the Firestore SDK.
- **lukko** — **tjs-lang is central**: VM atoms double as capability tokens — the security model and tool/DSL system are unified (the project's thesis).
- **editor2 / kith-email / lukko / react-tosijs** — **plain TypeScript, no `.tjs`** — the TJS superset isn't needed for a standard component/integration library or (yet) these apps.
- **Nearly all** — **no CI**; local quality gates + a "Landing the Plane" push discipline substitute for it (see [`releasing.md`](releasing.md)). Exceptions: haltija (3 GitHub Actions incl. Docs-Drift), tosijs-ui (minimal tsc+test), tjs-lang (git pre-push hook).
- **Nearly all libraries** — **Prettier pinned to v2.8.8** — a deliberate/stale pin; upgrading would reformat the tree. Watch it before assuming Prettier 3 behavior.
