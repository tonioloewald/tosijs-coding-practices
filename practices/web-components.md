# Web components

Built with **tosijs** element factories + the **tosijs-ui** `Component` base. Standards-based
custom elements — no JSX, no virtual DOM, no transpile requirement. The mental model: the DOM
is **persistent terrain wired to state**, not a `render(state)` output. Bindings update bound
nodes in place; there is no re-render cycle.

> **tosijs is observant, not reactive** — read [`observant-model.md`](observant-model.md)
> first. It is why `render()` is often unnecessary (or only does surgical structural updates)
> and why `content()` builds the DOM once. Bringing a React/Lit `UI = f(state)` habit here is
> the number-one source of bugs below.

## Defining a component

Configure via **static properties**, never constructor args. The enforced pattern across the
ecosystem:

- **`static preferredTagName`** — set the tag explicitly. Survives minification; the
  derived-from-class-name fallback does not. Always set it.
- **`static initAttributes`** — attributes synced to properties; type is inferred from default
  values (string/number/boolean).
- **`static shadowStyleSpec`** / **`static lightStyleSpec`** — see [Styling](#styling).
- **`elementCreator()`** — takes no args; configure via static properties. Passing
  `{ tag, styleSpec }` still works but warns (deprecated in favor of `preferredTagName` /
  `lightStyleSpec`).
- **Export both** the class (`TosiFoo`) *and* a camelCase factory
  (`export const foo = TosiFoo.elementCreator()`), and **register** it — in a library, add the
  file to `src/index.ts`. A component not exported/registered isn't part of the library;
  `elementCreator()` registers the custom element eagerly at import time.
- Confirm the **actual tag name** from the `elementCreator({ tag })` call before writing markup
  — class name, file name, package name, and tag frequently diverge.

— seen in: tosijs, tosijs-ui, tosijs-product, editor2, lukko

## `content()` vs `render()`

The single most-repeated rule in the ecosystem:

- **`content` runs once** at construction/hydration. Build the *entire* element tree and set up
  all bindings here. Never put dynamic/conditional logic in it.
- **`render()` runs on attribute/value changes.** Use it only for *structural* updates (toggle
  `hidden`, set `textContent`, `replaceChildren`) — never rebuild `content` imperatively and
  never re-assign `innerHTML`.
- **Build both UI states in the DOM and show/hide them** rather than conditionally
  re-rendering. There is no virtual DOM; treating `content()` like a React render function
  produces stale UI.
- Drive content changes through **bindings**, not manual DOM walking in `render()`.

— seen in: tosijs, tosijs-ui, kith-email, tosijs-product, loewald-dot-com, lukko, haltija

## Shadow DOM vs Light DOM — contradiction, read this

The stack disagrees on the default, and the reason matters:

- tosijs core: components **default to shadow DOM**; setting `shadowStyleSpec` opts in.
- Apps (kith-email, and the norm in practice): **default to Light DOM** — **path bindings do
  NOT work inside shadow DOM**, so a shadow-DOM default silently breaks tosijs data binding.

**Rule of thumb:** author in **Light DOM by default**; reach for shadow DOM only when you truly
need CSS/DOM isolation (e.g. rendering untrusted email HTML, which is also DOMPurify-sanitized).
Set `role` in `initAttributes` to opt into light DOM. In light DOM, use `xinSlot()` (a bare
`slot()` silently becomes `<xin-slot>`/`<tosi-slot>`); use `slot()` only in shadow-DOM
components.

— seen in: tosijs (shadow default), kith-email (light default, binding reason), tosijs-ui (slot vs xinSlot), tosijs-3d

## Attributes & properties

- **`value` is special** — a property, not an attribute. Don't put it in `initAttributes`;
  setting it fires `change` and calls `render()`.
- **Boolean attributes default to `false`** (HTML rule). A boolean `initAttribute` defaulting to
  `true` is an error in current tosijs.
- **Initialize every property to a non-`undefined` value** (including `null`). Properties left
  `undefined` are not passed through by `elementCreator()`, so the value silently never reaches
  the element. — seen in: loewald-dot-com
- Attributes set between `createElement` and a synchronous append are queued and drained at the
  base `connectedCallback`; a subclass reading `getAttribute()` before `super.connectedCallback()`
  must account for the drain order.

## Styling

- **Never write CSS as raw strings, `var()` strings, `document.createElement('style')`, or
  per-element inline styles.** Use `StyleSheet()`/`XinStyleSheet` with `vars.*` and
  `varDefault.*` from tosijs (scaled variants like `vars.spacing50`; `_foo` defines `--foo`),
  plus `vars`/`initVars` for theming. Namespaced CSS variables drive dark mode and color-math by
  recomputing from a few brand colors — raw strings bypass dedup and the theming system, and are
  untyped/untraceable. Treat CSS as code: no magic numbers.
  — seen in: tosijs-ui, tosijs-3d
- **`static shadowStyleSpec`** — styles into shadow DOM (opts the component into shadow DOM).
  `static styleSpec` is a deprecated alias — pick light vs shadow explicitly.
- **`static lightStyleSpec`** — global styles appended to `document.head`; `:host` is rewritten
  to the tag name.

## Callback naming — the `on<Event>` trap

`elementCreator()` / the element factory treats **any `on<Capital>`-prefixed prop as a DOM
`addEventListener` target**. Assign a function to `onInput`/`onProgress`/`onDeath` and the class
field stays `null` — the callback silently never fires, no error. This bit multiple projects for
hours.

- **Use non-`on` names** for callback props: `drive`, `whenDestroyed`, `handleResize`, etc.
  `handle<Event>` is the established component-callback convention; the base warns once per class
  when a subclass defines an `on<Event>` member.
- If you must set a function/object prop, use the **`apply(el){ el.onProgress = fn }`** escape
  hatch in the element spec, which bypasses the attribute/event-listener path.

— seen in: tosijs, tosijs-3d, tosijs-product

## Parts & event handlers

- Reference sub-elements only through the typed **`parts`** system: mark with `{ part: 'name' }`,
  declare a `PartsMap`/`Parts` interface, read via `this.parts.name`. **Never query the shadow
  DOM manually** — it breaks the parts contract.
- **Declare arrow-property event handlers BEFORE `content`.** Class fields initialize
  top-to-bottom and `content()` runs at construction, so a handler declared after `content` is
  `undefined` when `content()` wires it. Use arrow properties (not methods) so `this` survives
  being passed as a callback.

— seen in: tosijs-ui, editor2

## Other conventions & footguns

- **`static formAssociated = true`** enables form integration via `ElementInternals`; validate
  with `validateAgainstConstraints()`.
- **Avoid native `confirm()`/`alert()`/`prompt()`** in component/UI code — they fail silently in
  Tauri async/menu contexts and are poor UX in-app. Use a tosijs dialog
  (`TosiDialog.confirm/alert/prompt`) instead. — seen in: kith-email, lukko
- **`_elementCreator` / `_tagName` inherit via prototype chain** — the registration check uses
  `hasOwnProperty` so each subclass registers its own. Don't rely on a subclass reusing a
  parent's registration.
- Prefix the main component file with a `/*# … */` markdown doc-comment (usage, how-it-works) —
  tosijs's source-documentation convention feeds the generated docs.

## Doc-site live examples (tosijs-ui doc-system)

- In `/*# … */` doc blocks, only fences tagged ` ```html `, ` ```css `, ` ```js `, or ` ```test `
  become live interactive examples; consecutive tagged fences are grouped into one example.
- **Never use ` ```js ` for non-runnable snippets** — it will execute. Use a bare ` ``` ` fence
  or ` ```typescript ` for static code.
- Opening delimiter is `/*#`, closing is just `*/`. Numbered headings control ordering;
  `parent`/`order` metadata builds the nav tree.

## Project-specific practices

### react-tosijs

- Consume custom elements in JSX via the **`reactWebComponents` Proxy**:
  `reactWebComponents.xinLottie` renders `<xin-lottie>`. It maps camelCase→kebab-case and caches
  by tag name so `.fooBar` and `['foo-bar']` resolve to the same component — no per-element
  wrappers.

### tosijs-3d

- Centralize custom-element lifecycle in ONE base class with a **pull model**: children override
  only a domain hook (`sceneReady`/`sceneDispose`), never `connectedCallback`/
  `disconnectedCallback`, and on connect call `owner.whenReady(cb)` rather than the parent
  guessing timing. Parent-orchestrated readiness races tosijs's deferred attribute application.
- **WebXR suspends `window.requestAnimationFrame`**, freezing tosijs's rAF-batched binding flush.
  `<tosi-b3d>` shims `window.rAF`; `await updates()` before `enterXRAsync` or a stranded
  per-element render flag freezes bindings for the whole session.

### haltija (injected widgets)

- Build injected elements **stable by default**: render the static shadow structure once (guard
  on `shadowRoot.querySelector('.widget')`), attach handlers once, then mutate only changed nodes
  via a targeted `updateUI()` — never re-assign `innerHTML` on update.
- Use a **`killed` boolean** to stop WebSocket reconnection: check it at the top of `connect()`,
  guard the `onclose` reconnect timer with it, and set it in `disconnectedCallback` (also restore
  `console`, clear watchers, remove highlights).
- For CSS transitions: set start value → force reflow (read `offsetHeight`) → set end value + add
  an `.animating` class. Animate a single property throughout (convert `right`→`left` rather than
  switching properties); scope to explicit `.animating` classes — never `transition: all` on
  `:host`.

### loewald-dot-com

- For filtered lists use `bindList`'s built-in `filter` + `needle` options, not computed getters.
