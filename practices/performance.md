# Performance & monitoring

## The core philosophy: observant, surgical updates

The stack's performance model is *not* re-render-and-diff — it is
[observant](observant-model.md): the DOM is built once and observers update only the specific
bound nodes that changed. Performance here is a *consequence* of the model (cost is
proportional to what actually changed, not to what a render re-describes), so most of this
doc is about not defeating it. Observers update the specific bound DOM nodes that changed and
nothing else:

- **id-paths give surgical array updates.** A list binding with `idPath: 'id'` lets a
  mutation inside an item synthesize a targeted touch (`list[id=123].color`) so only that
  one element updates — no diffing, no reconciliation. Prefer id-paths for lists that
  mutate in place. — seen in: tosijs
- **Bindings, not renders.** Don't rebuild subtrees to reflect a value change; bind the
  node once and let the observer update it. Rebuilding is the slow path. — seen in: tosijs,
  tosijs-ui, kith-email
- **`touch()` is batched.** Updates coalesce on a tick. For synchronous needs during direct
  manipulation (drag), read/write the raw proxy and call `render()` yourself. — seen in: tosijs
- **Bulk-mutate raw, then `touch()` once.** Writing thousands of items through the proxy
  fires an observer per write (O(N)). For large updates, mutate the data directly
  (bypassing the proxy) and call `touch(path)` a single time — this is the sanctioned perf
  path, not a hack. — seen in: kith-email, tosijs

## Keep heavy work off the main thread

- **Push big computations out of JS / off the main thread.** Grouping thousands of items
  (e.g. emails into conversations) on the main thread stalls the UI. Move it to native
  (Rust) or a worker. — seen in: kith-email
- **Phase your startup.** Show cached/last-known state first, merge an initial working set
  (~thousands), then background-load the rest; sync in tiers (hot fast-priority + slower
  full). Don't block first paint on the full dataset. — seen in: kith-email
- **Make perf defaults device-aware, not hard-coded.** A single hard-wired number is always
  wrong for something (too heavy for a phone/Quest, too timid for a workstation). Declare
  the `initAttributes` default as a sentinel `0` (=auto) and resolve at use via a
  device-capability probe (`resolveBudget(attr, 'key')`); explicit author values (`>0`)
  always win. Cache setup-time budgets once. — seen in: tosijs-3d
- **Honor `prefers-reduced-motion: reduce`.** Skip child/decorative animations (fire only
  the essential callback). Build accessibility into the engine, don't bolt it on. — seen in:
  tosijs-product

## Bundle size

Treat bundle size as a budget: adding a dependency to a core library must be justified.
Core libraries target small gzip footprints and **zero runtime dependencies**.

- **Print gzipped size on every build/pack — it's the size-regression gate.** No CI means
  the printed kb is the only signal. Use the throwaway `show-size` pattern:
  ```bash
  gzip -9 -k dist/index.js && ls -lh dist/index.js.gz && rm dist/index.js.gz
  ```
  Wire it into the build (`zlib.gzipSync`) or the `prepublishOnly`/`pack` chain so numbers
  print unprompted. — seen in: tosijs-schema, tosijs-styled-editor, lukko, loewald-dot-com
- **Mark framework/peer deps `external` in `Bun.build`; never bundle a second copy.** Ship
  ESM with `tosijs`/`tosijs-ui`/`react` external so consumers don't get duplicate framework
  copies. Provide a self-contained IIFE (deps inlined) only for zero-build `<script>` /
  CDN use. — seen in: tosijs-product, react-tosijs, tosijs-styled-editor, lukko
- **Never set `sideEffects:false` in a component library that registers custom elements at
  import.** `elementCreator()` registers elements as an import side effect; `sideEffects:false`
  tree-shakes those registrations to zero. Keep per-component subpath entry points, and
  never point a `browser` export condition at the IIFE (it inlines the whole framework). —
  seen in: tosijs-ui
- **Lazy-load heavy deps and defer global injection to first use.** Dynamic-import bulky
  editors/engines (e.g. CodeMirror) rather than eagerly bundling them; inject shared
  styles/listeners on first use (`ensureMenu`/`ensureTooltipStyles`/`ensureFloatListeners`),
  not at import. — seen in: tosijs-ui
- **⚠️ A dynamic import is only lazy in a format that can CODE-SPLIT. `--format iife` cannot.**
  This entry used to cite tosijs-ui's CodeMirror import as the exemplar of the rule above — and
  tosijs-ui 1.7 is the counter-example. `import('./code-editor-cm')` is a real lazy chunk for ESM
  consumers (3.4KB) and is **flattened straight into the bundle** for the IIFE, which tripled:
  **121KB → 388KB gzip**, essentially all CodeMirror. The IIFE is the *most-loaded* artifact
  (every generated doc page, the CDN `<script>` path), so the regression landed on exactly the
  consumers the lazy import was supposed to protect.

  **So: measure the artifact your users actually load, not the one where the optimisation
  works.** An agent who checks the ESM entry sees a flat number and ships a 3.2x regression.
  Print the gzip delta for *every* emitted artifact, and treat a dynamic import inside an IIFE
  as eager until you have measured otherwise. — seen in: tosijs-ui 1.7
- Bun is the bundler. Ship ESM as the primary artifact; provide IIFE/CJS only where a
  consumer needs them.

## Measuring

- `settings.perf` / `settings.debug` flags exist in tosijs to surface performance/debug
  info — use them rather than adding ad-hoc logging. — seen in: tosijs
- **Benchmark against real competitors on every pack.** For a library whose selling point
  is speed/size, keep a `bench.ts` that runs the same workloads through you and the
  baselines (e.g. Zod, TypeBox) so regressions vs. the field surface immediately. — seen in:
  tosijs-schema
- **Benchmarking a footgun-pave: three tiers, and correct baselines must be PROVEN
  equivalent before you time anything.** When a feature replaces a hand-rolled pattern,
  a single "vs the old way" number is meaningless because "the old way" is really two
  ways. Report the full cost story:
  1. **The status quo** — the fast-but-wrong idioms the feature exists to kill (e.g.
     shallow spread that drops nested defaults; `Object.assign(defaults, …)` that
     corrupts the shared default object). Time them, but **label them incorrect and
     demonstrate the wrongness by test** in the same file — their speed is what "just
     accepting the footgun" buys, and the demonstrated breakage is what it costs.
  2. **The clean, correct hand-roll** — what a careful developer writes (fresh-output
     per-shape merge, corruption-proof overlay). This is the real bar: the feature's
     premium over THIS number is the honest price of paving.
  3. **The feature itself.**
  Before timing, assert tiers 2 and 3 produce **identical results on every workload** —
  a baseline only counts if it does the same job, and the agreement check itself finds
  bugs (in tjs-lang it exposed payload keys named after `Object.prototype` members
  dodging validation via `in`). The deliverable is one honest sentence: "costs X ns vs
  the footgun's Y and the careful hand-roll's Z — and buys validation + incorruptible
  defaults." — seen in: tjs-lang (dictionary-defaults Spike B)
- For web-page performance (Core Web Vitals, LCP/INP/CLS, render-blocking, layout shift),
  measure before optimizing. Don't guess at hotspots.
- **Hunting a leak in a build/CLI process: watch RSS, not the JS heap.** Native memory (Bun's
  bundler, happy-dom, `@resvg/resvg-js`, any FFI) is invisible to `heapUsed` and to every JS heap
  profiler, so a heap snapshot will tell you everything is fine while the process eats the
  machine. Loop the suspect step N times, call `Bun.gc(true)` each iteration (so anything left is
  genuinely retained), and print `process.memoryUsage().rss` — a leak shows as monotonic RSS
  growth with a flat heap. Then bisect by running the suspect step in a child process: if the
  parent goes flat, you've found it. That is exactly how the `Bun.build()` leak
  ([oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053)) was located after it took a
  machine down at 136GB RSS. — seen in: tosijs-ui
- **Long-lived processes need a memory ceiling.** A per-iteration leak that is harmless in a
  one-shot CLI is fatal in a watch/dev server that runs for days. Sample RSS at each iteration and
  exit with the growth-per-iteration when it crosses a ceiling — a dev server is one keystroke to
  restart; a swap-thrashed laptop is not. Distinguish *growth* (a leak worth reporting) from a
  baseline that simply exceeds the ceiling (raise the ceiling) — the advice is opposite, and
  guessing wrong sends the next person the wrong way. — seen in: tosijs-ui (`memoryLimitMb`)

## Throttle & debounce

Rate-limit high-frequency handlers (scroll, resize, input) with the stack's `throttle()`/
`debounce()`. Remember throttled handlers are unreliable to *test* — see [testing.md](./testing.md).
— seen in: tosijs

## Project-specific practices

### tosijs-schema
- **Allocation-free, O(1) validation via "prime-jump" sampling.** Arrays/dicts over 97
  items are checked at prime-stride intervals unless `{ fullScan: true }`. `maxProperties`
  is documented but intentionally *not* enforced at runtime. Don't "fix" the skipped check
  or add per-item scanning — it's a deliberate hot-path tradeoff.

### tosijs-3d
- **WebXR suspends `window.requestAnimationFrame`, freezing tosijs's rAF-batched binding
  flush.** `<tosi-b3d>` shims `window.rAF` via `_installXrRafPump`; you must `await updates()`
  before `enterXRAsync` or a stranded per-element render flag freezes bindings for the whole
  session.
- Load heavy engine deps (jolt-physics) at runtime via an importmap rather than bundling —
  they have Node-only branches / `import.meta.url` that Bun's browser target won't parse.

### kith-email
- Never build id-path values containing `[ ] /` or spaces; sanitize with
  `str.replace(/[\[\]\/\s]/g, '_')` — those chars break path parsing and corrupt bindings.
- Merge large collections through a persistent index (`Map`) helper, not
  `app.x.value = [...]`, to preserve the O(new) merge invariant.

### lukko
- Set `idleTimeout: 255` on `Bun.serve` (the default 10s kills long-lived SSE/agent
  streams) and flush any remaining SSE buffer when `reader.read()` returns `done:true` or
  you drop the final turn.

### static-assets
- Cache expensive derivation (e.g. Blender conversions) keyed by an input signature
  (`size + mtime +` the spec) into `.cache/`, and hardlink included files into `public/`
  instead of copying so re-runs are near-instant and cost no extra disk.

### tosijs-product
- Encode mosaic-grid metadata in asset filenames (`name_COLSxROWS_TOTAL.webp`) so the
  component auto-parses layout with zero config and asset/config can't drift apart.
