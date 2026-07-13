# Code quality

## Formatting & linting

- **Run `bun run format` before committing.** Across the stack this is `eslint --fix`
  then `prettier --write` (some projects scope eslint to `src demo`). One command, in that
  order. — seen in: tosijs, tosijs-ui, tosijs-product, tjs-lang, editor2
- **Prettier house style:** single quotes, **no semicolons**, 2-space indent, ES5 trailing
  commas, ~80 col. Prettier is deliberately **pinned to v2** in most repos — don't "upgrade"
  it; v3 reflows the whole tree. — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product,
  tjs-lang, loewald-dot-com
- **Prefix intentionally-unused args/vars with `_`** (matches every config's
  `argsIgnorePattern: '^_'`); otherwise lint fails. — seen in: tosijs, tosijs-ui,
  tosijs-product, tjs-lang, tosijs-3d
- **Match the file, not a global rule.** Some repos have **no committed eslint/prettier
  config** (react-tosijs is 2-space, *double*-quoted, *with* semicolons; editor2's `format`
  script references eslint/prettier that aren't even devDependencies and may fail on a clean
  install). If there's no config file, copy the surrounding code's style — don't impose the
  single-quote/no-semi default. — seen in: react-tosijs, editor2
- Pre-existing lint errors in unrelated files are expected — don't let them block your
  commit, and don't fix-and-reformat files you aren't otherwise touching.
- Respect `.prettierignore`. Some files are hand-laid-out on purpose (e.g. tosijs
  `xin-types.ts`) — reformatting them is a regression. — seen in: tosijs
- **In markdown prose, never let a wrapped line begin with `+`, `-`, `*`, or `1.`.** Per
  CommonMark that starts a list, so the marker is swallowed and vanishes from the rendered
  output: `JSON-Schema\n  + $predicate` renders as a nested bullet reading "`$predicate`
  as..." — the `+` is simply gone. Keep the operator off column one (rewrap, or put the
  clause on one line). If Prettier rewrites your `+` bullet to `-`, that's not Prettier
  breaking your prose — it's Prettier *reporting* that the renderer already ate it. Don't
  `.prettierignore` the file to silence it. — seen in: tjs-lang (CHANGELOG.md, TODO.md —
  it recurs)
- **Turn off Prettier's *embedded* formatting for markdown, not Prettier itself.** Prettier
  reformats fenced code **inside** `.md`, which mangles hand-laid-out examples: two separate
  ` ```js ` lines `'5' == 5` and `[1] == 1` become the single nonsense expression
  `;('5' == (5)[1]) == 1` (ASI guards). The surgical fix is a config override, not
  `.prettierignore` on your docs:

  ```json
  "overrides": [
    { "files": "*.md", "options": { "embeddedLanguageFormatting": "off" } }
  ]
  ```

  Code fences are then left exactly as written, while Prettier still normalizes markdown
  prose — which is what catches the swallowed-bullet bug above. Banishing Prettier from
  markdown entirely would hide that class of defect instead of fixing it. (Note the value
  is `"off"`; `"ignore"` is not valid and Prettier will error out.) — seen in: tjs-lang

## TypeScript conventions

- **Strict mode, full type coverage.** The working strict baseline is Bun bundler-mode:
  `moduleResolution: 'bundler'`, `allowImportingTsExtensions`, `verbatimModuleSyntax`,
  `noEmit`, plus `noUncheckedIndexedAccess` / `noImplicitOverride` /
  `noFallthroughCasesInSwitch`. Array/record access is possibly-`undefined` by design; use
  explicit `.js` extensions in relative imports where the config demands it. — seen in:
  kith-email, tosijs-schema, lukko
- **`tsc` is the type gate, not `bun build`.** `bun build` does **not** type-check or emit
  `.d.ts`. Wire `tsc -p tsconfig.build.json --emitDeclarationOnly` (or `tsc --noEmit`) into
  the build and run it directly while developing; a type error must fail the build. — seen
  in: haltija, editor2, react-tosijs, tosijs-schema
- **`any` is permitted where it earns its place** (the shared ESLint config sets
  `no-explicit-any: 0`) — but it's a smell, not a default. — seen in: tosijs, tosijs-ui,
  tosijs-product, tjs-lang
- **Uppercase wrapper types** (`String`, `Number`, `Boolean`, `Function`) are intentionally
  allowed via a tosijs `ban-types` override — do not "helpfully" convert them to lowercase;
  they're load-bearing for boxed-scalar/proxy machinery (boxed scalars literally proxy over
  `Number`/`String`/`Boolean` wrapper objects). — seen in: tosijs
- **Exported classes must be named** — `tsc --declaration` fails (TS4094) on exported
  anonymous classes with private/protected members. Never `export default class {}`. — seen
  in: tosijs

## Never hand-edit generated files

- `dist/`, `docs/`, `version.ts`, `llms.txt`, `icon-data.ts`, `embedded-assets.ts`,
  generated `*.md`/`*.json` — all are **build output**, often committed to git and shipped in
  the package. Never hand-edit them or revert their (large) diffs. Bump the version in
  `package.json` only; the prebuild stamps `version.ts`. Run `bun run build` before
  committing so committed generated files match source. — seen in: tosijs, tosijs-ui,
  tosijs-3d, react-tosijs, editor2, haltija
- **Enforce it with a "docs-drift" check:** rerun the generator in CI (or locally) and fail
  via `git diff --exit-code` on the generated set. Cheap way to guarantee committed
  artifacts stay in sync with their source/schema. — seen in: haltija
- For repos that commit regenerable artifacts, set the `merge=ours` driver once per clone
  (`git config merge.ours.driver true`; `.gitattributes` marks the files) so rebases don't
  stop on pointless generated-file conflicts — then rebuild to regenerate canonically. — seen
  in: tosijs-ui

## CSS is code

- **Never write CSS as raw strings, `var()` strings, or `document.createElement('style')`.**
  Style through tosijs facilities: `StyleSheet(id, spec)` / `XinStyleSheet`, static
  `lightStyleSpec`/`shadowStyleSpec` on components, and `vars.*` / `varDefault.*` /
  `initVars` for theming. No magic numbers — use the scaled variants (`vars.spacing50`).
- The built-ins are deduped, typed, bindable, and drive dark-mode/theming by recomputing
  from a few brand colors; hand-rolled style injection bypasses all of it. `static styleSpec`
  is deprecated — pick light vs shadow explicitly. — seen in: tosijs-ui, tosijs-3d

## TJS type-safety

Where a module is TJS, lean on runtime validation at boundaries rather than trusting types
alone. See [tjs-lang.md](tjs-lang.md) for `safety inputs` / `safety none` and monadic errors.
Note the TJS gotcha: a colon value like `function foo(x: 'default')` is an **example** (a
required param whose type widens to `string`), *not* a string-literal type. — seen in:
tjs-lang

## Naming & idioms

- Match the file you're in. House convention for component callbacks is `handle<Event>`
  (not `on<Event>`, which the element factory intercepts as an `addEventListener` target — the
  class field stays null and the callback silently never fires). See
  [web-components.md](web-components.md). — seen in: tosijs, tosijs-3d, tosijs-product
- `static preferredTagName` over derived tag names (survives minification). See
  [web-components.md](web-components.md).
- **Open the main module file with a `/*# ... */` markdown doc-comment block** (usage,
  how-it-works, commands). It feeds generated docs — keep it in sync when the public API
  changes. Only fenced blocks tagged `js`/`html`/`css`/`test` become live examples; use bare
  ``` for non-runnable snippets. — seen in: editor2, tosijs, tosijs-ui, tosijs-3d

## Deprecations

The stack removes APIs slowly: a deprecated name keeps working and emits a **single**
`console.warn` per feature (tracked in a `Set`). When you deprecate something, follow that
pattern — warn once, keep it working, document the replacement. When you *use* the stack,
prefer the current name (`.tosi.value`/`.value` over `xinValue`/`tosiValue`). — seen in:
tosijs, haltija

## Project-specific practices

### kith-email
- Keep the strict flag set explicit in `tsconfig`: `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch` — array/record access is treated as
  possibly-undefined on purpose.

### tosijs-schema
- Keep **type-level tests in a separate `*.types.ts` file** verified only by `tsc --noEmit`
  (they hold intentional `@ts-expect-error` lines + `assertType<T>()` no-ops). Running that
  file under `bun test` is a category error — it asserts compile-time failures, not runtime
  behavior.

### tjs-lang
- **Don't name the full-build script `build`.** `bun build` is a Bun builtin; a `build`
  script means `bun build` silently runs the builtin while `bun run build` runs your script.
  Name the clean-build task `make` instead.

### loewald-dot-com
- Before touching `access.ts` or the write/validate path, read the "Design invariants"
  section of `ROADMAP.md` and treat those decisions as settled — relitigating them
  reintroduces designed-out bug classes (keep `Invalid` "fix payload" and `Denied` "don't
  retry" distinct).
