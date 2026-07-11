# State & schema

State is **tosijs** (path-based, observant). Schema/validation is **tosijs-schema**
(JSON-Schema-first, type-by-example). This doc is the practical distillation; the libraries'
own docs are the reference.

## Mental model

- **Paths, not stores.** State is one registry addressed by paths: `'app.user.name'`,
  `'list[0]'`, id-paths `'list[id=123]'`. Observers subscribe to paths (string, RegExp, or
  filter fn) and fire on change.
- **Bidirectional propagation.** Touching `'app.user.name'` notifies observers on parent
  paths (`'app.user'`, `'app'`) *and* touching `'app.user'` notifies child observers.
  Mutations flow up and down the path tree.
- **Observant, not reactive.** tosijs is MVC with path-based bindings, not `f(state)`
  re-rendering. Bindings wire DOM to paths once; observers surgically update the bound nodes.
  Don't model UI as render-returns-UI — see `./00-stack.md`. — seen in: tosijs, kith-email

## Entry points

- **`tosi({ key: value })`** (alias `xinProxy`) — register state and get a typed boxed
  proxy back. The consistent idiom is `tosi({ app: initialState })`. This is the preferred
  entry point. — seen in: tosijs, lukko, tosijs-ui
- **`observe(path, cb)`** — react to changes.
- **`bind(element, bindings)`** — connect DOM to state (`toDOM` state→UI, `fromDOM` UI→state).
- **`touch(path)`** — force notification (batched via setTimeout).

## The three rules that prevent most state bugs

These recur in every app in the ecosystem. Internalize them.

1. **A proxy is a path, not a value — always read leaves through `.value`.**
   `app.user` is a handle for `'app.user'`; `app.user.name.value` is the string. Forgetting
   `.value` silently binds or compares the *proxy* instead of the data. Write leaves the same
   way: `app.count.value = 3`. — seen in: tosijs, tosijs-ui, kith-email, lukko
2. **Observer callbacks receive the PATH string, never the value.** `observe(path, (p) => …)`
   — read the current value explicitly inside the callback (`app.thing.value`). Assuming the
   callback gets a value is the #1 bug. — seen in: tosijs, kith-email
3. **Don't compare BoxedScalars with `===`.** `===` is strict identity by design and will
   surprise you. Use `==` (unwraps via `valueOf`) or compare `.value` explicitly. `toDOM`
   binding callbacks already receive raw values. — seen in: tosijs-ui, tosijs

## Arrays & bulk mutation

- **Replace arrays wholesale via `.value`:** `app.messages.value = [...]`. Reassigning the
  leaf notifies observers cleanly. — seen in: kith-email, lukko
- **Bind arrays with `listBinding`:** `array.listBinding((elements, item) => …, { idPath })`.
  The `idPath` enables surgical per-item DOM updates (no diffing). — seen in: tosijs-ui
- **Iteration is not uniform:** `for…of` on a proxied array yields *proxied* (observed)
  items; `forEach`/`map`/`filter` yield *raw* items whose mutations are silent. Choose
  deliberately. — seen in: tosijs
- **Batch-mutate raw, then `touch()` once.** For large updates, mutate data directly
  (bypassing per-write proxy notifications) and call `touch(path)` a single time. This is the
  sanctioned perf path, not a hack. — seen in: kith-email

## Boxed vs. raw, and the accessor

- **`xin`** returns raw scalars (`xin.foo.bar` is the string/number itself); **`boxed`**
  wraps everything, including primitives, so `boxed.foo.bar` has `.value`/`.path`/`.observe()`.
- For collision-free API access use the **accessor**: `tosiAccessor(proxy)` or
  `proxy[TOSI_ACCESSOR]` (symbol key, cannot be shadowed by data props). `.tosi.value` /
  `.tosi.path` are the non-deprecated convenience forms; bare `xinValue`/`tosiValue` are
  deprecated.

## Assignment strictness

- `settings.strictness` (`'off' | 'warn' | 'throw'`, default `'warn'`) fires when an
  assigned value's runtime type differs from the path's current type. Plain `.value = …` on a
  type change warns or throws.
- To intentionally change value **and** type, assign through the proxy's `.valueAndType`
  setter — the sanctioned escape hatch (see `src/strictness.test.ts`). — seen in: tosijs

## Footguns

- **Don't nest proxies.** Spreading a proxied object into state (`{ ...proxy }`) can smuggle a
  proxy in; the set/get handlers unwrap defensively but new code can defeat it. Store raw
  values.
- **Deeply async by default.** Set up bindings before data exists; data arriving later
  (fetch/websocket) flows to the UI automatically. Don't gate binding on data presence.
- **Light DOM vs. shadow DOM affects bindings.** tosijs components *default to shadow DOM*,
  but apps commonly default to **light DOM** and reserve shadow DOM for genuine CSS isolation
  (e.g. rendering untrusted email HTML). Rule of thumb: light DOM unless you need isolation.
  Full component conventions live in `./web-components.md`. — seen in: kith-email, tosijs

## Schema (tosijs-schema)

- **Schema-first and serializable, by contract.** Build schemas with the Proxy-based fluent
  builder `s` (`s.object`, `s.string`, `s.number.optional`, `s.any`); they are plain JSON
  Schema objects. TS inference is decoupled from runtime construction. This serializability is
  load-bearing — it's why you can store schemas *as data* and emit cross-language types from
  one source. — seen in: tosijs-schema, lukko, loewald-dot-com
- **`validate` returns a boolean; it never throws, never coerces, never mutates.** Do **not**
  port Zod `.transform()`/`.coerce()`/`.refine()` idioms into it — those add un-serializable
  closures and break the contract. Validate data as-is. — seen in: tosijs-schema, loewald-dot-com
- **Split validation at the schema-vs-relational boundary.** Use tosijs-schema for
  intra-document shape and field-whitelisting; put relational rules (depends on other docs,
  existing state, privileges) in a `validate()` callback, not the schema. — seen in: loewald-dot-com
- **Make the schema the single source of truth.** One definition should drive request
  validation, router dispatch, self-documenting responses, MCP tool defs, and generated docs —
  one edit propagates everywhere instead of drifting across surfaces. Pair with a
  fingerprint/CI-drift check so generated artifacts stay in sync (see below). — seen in: haltija,
  loewald-dot-com, lukko
- **Validation gotchas:** `maxProperties` is emitted but ignored at validation time;
  collections >97 items are only *stochastically sampled* unless you pass `{ fullScan: true }`.
  In `schema.ts`, `validate` is attached to the builder via closure after `create` — runtime is
  fine but reordering the functions can reintroduce a hoisting bug. — seen in: tosijs-schema
- Pair schema validation with TJS safety boundaries (`./tjs-lang.md`) at public API edges.

## Sync

- `share.ts` — cross-tab sync via `BroadcastChannel` + IndexedDB (delta `{path, value}`).
- `sync.ts` — network sync via a pluggable `SyncTransport` (throttled batching, echo
  prevention). Same delta pattern. Reach for these instead of hand-rolling sync.

## Reusable tooling worth standardizing

- **Docs-drift CI:** re-run the schema/docs generator (`bun run build`) in CI and fail via
  `git diff --exit-code` on the generated files — cheap enforcement that committed artifacts
  stay in sync with their source schema. — seen in: haltija
- **`.claude/tosijs-notes.md`:** a distilled cheat-sheet of tosijs / tosijs-ui /
  tosijs-schema gotchas — copy it into any tosijs project as an agent primer. — seen in:
  loewald-dot-com
- **Extract pure-function copies of stateful logic into `bun:test` files** to unit-test
  algorithms without browser/localStorage/IPC dependencies. — seen in: kith-email

## Project-specific practices

### tosijs-3d
- Split engine-driven simulation into three files by role: a logic-free boundary-types file
  (`world-contract.ts`), a pure deterministic store (`world-store.ts` — Babylon-free, ids from
  a counter, no wall-clock/random), and a disposable one-way view (`world-view.ts`, store→mesh
  reconciliation). One-way data flow means the render layer can never desync the sim, and the
  store is fully unit-testable / headless-drivable. Bake hard rules into the types.

### react-tosijs
- Bridge tosijs into React with a hook mirroring `useState` exactly:
  `const [value, setValue] = useTosi(path)` — observe/unobserve in `useEffect`, write back via
  `xin[path] = value`. Accepts a string path or a xinProxy (resolved via `xinPath`). Note:
  `useTosi`'s `useEffect` has no dependency array, so it re-subscribes every render — deliberate,
  don't "optimize" it blindly.

### tjs-lang
- Import schema from `tjs-lang/schema`, not tosijs-schema directly — it re-exports the full
  surface and auto-registers `createPredicateEvaluator()` (`$predicate` support) on import.
  Batteries-included and side-effectful; don't register the evaluator yourself. Requires
  `tosijs-schema@^1.4.0` (the `setPredicateEvaluator` hook).

### loewald-dot-com
- Register a collection by assigning to the `COLLECTIONS` map
  (`COLLECTIONS.post = { schema, unique, validate, access }`) **and** adding a side-effect
  `import './<name>'` in `functions/src/index.ts`. Configs self-register on import; a config
  never imported silently doesn't exist (deny-by-default → silent 404s). Easy to forget the import.
- Never put system-owned provenance fields (`_lastWriteRole`, `_modifiedBy`, revision trails)
  into any role's writable field set — the write atom stamps them, and policies read them for
  access decisions. If the subject can write a field the policy reads, the lock is forgeable.
- The `CollectionConfig` pattern (schema + unique + cacheLatencySeconds + `validate(data,
  roles, existing)` + role→FieldAccessMap) is a reusable server-side, field-level RBAC model
  over Firestore.

### haltija
- Define every REST endpoint once in `src/api-schema.ts` via the `s` builder + `endpoint()`
  helper; the same schema drives validation, router, self-documenting GET, MCP tools, and docs.
  A `SCHEMA_FINGERPRINT` tracks API changes for cache invalidation. Deprecate an endpoint by
  prefixing its summary `[Deprecated]` and starting its description `Deprecated: Use X instead`
  (the router auto-adds deprecation headers).

### lukko
- Define atom input/output schemas with the `s` builder; atoms validate I/O through
  tosijs-schema adapters. `defineAtom` + `CapabilityRegistry` (locality/category/cost/timeout)
  is a reusable schema-validated, capability-token tool system for any LLM agent app.
