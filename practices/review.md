# Code review

## Tooling

- **`/code-review`** (Claude Code) reviews the current diff at a chosen effort level. Use it
  before committing anything nontrivial. `/code-review ultra` runs a deeper multi-agent
  cloud review of the branch or a PR — it is user-triggered and billed.
- **`/security-review`** for changes with a security surface (auth, capability VMs, network
  sync, untrusted input, deployment config).
- These projects have **no CI** — no `.github/` workflows anywhere in the ecosystem. Tests,
  lint, build, and publish are all local/manual. So review IS the gate: `bun run build`
  runs tests first and exits non-zero on failure — run it, don't assume a pipeline will.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, kith-email, react-tosijs

## Verify end-to-end — don't approve on tests + typecheck alone

- **Drive the real flow before you call it done.** Happy-DOM unit tests can't see real
  layout, scroll metrics, `offsetWidth`, `:scope >`, or rAF timing, so a green suite still
  hides runtime breakage. Get agent eyes on the running HTTPS dev page.
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs
- **Use haltija + the `hj` CLI** to navigate/eval/screenshot the live page (`hj eval` to
  inspect component state, `hj screenshot` to see it), not the Claude-in-Chrome extension.
  Enable per-project with `haltijaDev: true` in the site config (localhost-gated, never
  bundled). Address one server per project by `--name`/`--port` — bare `haltija` grabs the
  default port and its own browser, so tests hit the wrong head.
  — seen in: tosijs-ui, tosijs-3d, kith-email
- A finding you couldn't reproduce on the running page is a question, not a defect.

## What to look for (stack-specific)

- **Observant correctness:** are new state paths actually observed/bound, or did someone
  reach for a manual re-render? Is `await updates()` used where a test asserts post-mutation?
- **`content()` vs `render()`:** bindings belong in `content()` (runs once); `render()` is
  for structural attribute-change updates only. Imperative DOM patching in `render()` or
  conditional logic in `content()` produces stale/duplicated UI. — seen in: tosijs, tosijs-ui,
  kith-email, tosijs-3d, tosijs-product
- **`on<Event>` callback trap:** `elementCreator()`/`elementSet` treats ANY `on*`-prefixed
  prop as an `addEventListener` target, so a callback prop named `onFoo` silently never
  fires — no error. Flag it: use `handle<Event>` (component members) or non-`on` names
  (`drive`, `whenDestroyed`); set a real function prop via the `apply(el){ el.onFoo = fn }`
  escape hatch. — seen in: tosijs, tosijs-3d, tosijs-product
- **Boxed vs. raw leaks:** proxies must not nest (proxy-on-proxy). Watch spreads of proxied
  objects into state; the stack unwraps on set/get but new code can defeat it. `===` on a
  BoxedScalar and `toDOM` callbacks getting raw values are common silent misbehaviors.
- **id-path sanitization:** reject id-path values containing `[`, `]`, `/`, or spaces —
  they break path parsing and corrupt bindings. Sanitize with
  `str.replace(/[\[\]\/\s]/g, '_')`. — seen in: kith-email
- **id-path opportunities:** list code that rebuilds instead of using surgical updates.
- **Component conventions:** `static preferredTagName` (survives minification); `value` is a
  property, never an `initAttribute`; boolean attributes default false.
- **Shadow vs. light DOM:** path bindings do NOT work inside shadow DOM, so apps default
  components to LIGHT DOM (`role` in `initAttributes`) — contradicting the library's own
  shadow-DOM default. Rule of thumb: shadow DOM only when you truly need CSS isolation
  (e.g. rendering untrusted email HTML); otherwise light DOM. — seen in: kith-email,
  tosijs-3d, tosijs-product
- **TJS boundaries:** validation at public edges, not smeared through hot paths; throws
  converted to monadic errors where that's the module's contract.
- **No accidental reformatting** of `.prettierignore`'d or unrelated files — notably
  `src/xin-types.ts` (hand-curated layout). Generated `dist/`/`docs/` diffs are expected on
  a build; don't revert or hand-edit them.

## Feed rough edges upstream, don't work around them silently

- When you hit a sharp edge in an in-house dependency (tosijs / tosijs-ui / tosijs-schema),
  log it in an **`UPSTREAM.md`** at the repo root instead of quietly coding around it:
  newest at top, each entry `Context` + concrete `Suggestion`, marked `✅ RESOLVED` with the
  fixing version once landed. Creates a durable, actionable backlog and stops the same
  integration trap being rediscovered. — seen in: tosijs-product

## Review posture

- Report faithfully. If tests fail, say so with output. Don't claim "done and verified"
  without having driven it.
- Findings should be actionable and ranked by severity. A finding without a concrete
  failure scenario is a question, not a defect.
- Work isn't done until it's pushed: per "Landing the Plane", `git push` succeeding (and
  `git status` clean vs origin) is the definition of done; file follow-ups in `TODO.md`.
  — seen in: tosijs, tjs-lang

## Project-specific practices

### tosijs-3d

- `RELEASING.md` is an agent-scoped release runbook: stop dev server → clean-tree check
  (ignoring `docs/` churn) → bump → build → verify → commit → tag, and the agent STOPS —
  `npm publish` and `git push` are human-only. Worth mirroring where releases are agent-run.

### tosijs-product

- Before building a tosijs-ui/site project, verify no `docPaths` entry overlaps `outputDir`
  (`docs/`) — `buildSite` does `rm -rf docs/` first without validating overlap, so an
  overlapping source path is silently destroyed and the build "succeeds" empty.
