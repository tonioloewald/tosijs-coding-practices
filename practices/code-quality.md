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

- **Never silence format/lint in a verification pipeline, and always chain with `&&`.** A
  `bun format 2>/dev/null` (or an unchained `format; test`) lets a lint failure ride to green:
  the failure prints nothing, the pipeline continues, and the broken state ships. Seen twice in
  one tosijs-3d session — one silenced failure reached a push (commit 81328438), and a later
  `bun format` non-zero exit surfaced only because it was chained. Related trap: when a dev
  server's start script runs `format && serve`, "the server won't start" can MEAN "lint failed"
  — check the format output before debugging the server. — seen in: tosijs-3d

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

## Recursive structural ops must be cycle- and shared-ref-safe

Deep-equal, deep-clone, format/serialize, and any hand-rolled tree walk must handle **shared
references (DAGs), not just true cycles.**

- **`JSON.stringify` guards cycles but not DAGs.** A graph that shares one child twice per level
  (`{a: n, b: n}`, N deep) has O(N) nodes but a 2^N *unfolded* tree; `JSON.stringify` re-expands
  every shared reference and blows up exponentially — it throws only on a genuine cycle. Under
  bun/JSC there's no max-string cap to save you: it allocates into the gigabytes and OOMs the
  machine. A naive `deepEqual` has the same shape in *time*.
- **Fix: memoize, and bound the output.** For equality, memoize visited pairs
  (`WeakMap<object, WeakSet<object>>`) and return `true` on a repeat — coinductive, collapses
  O(2^depth) → O(nodes), and terminates on real cycles too. For formatting, thread a `WeakSet`
  and emit `[shared]`/`[Circular]` on re-visit, plus a hard output-length cap so even a huge
  non-shared object truncates instead of allocating unboundedly (what `util.inspect` does).
- Allocate the memo lazily on the first *nested-object* descent, so flat-object compares — the
  common case — pay nothing.
— seen in: tjs-lang#21 — its own `expect`/`deepEqual`/`format` and the user-facing `Is` all blew
  up on DAGs; same class as bun's assertion-formatter OOM (oven-sh/bun#34178)

## The style guide — what good code looks like here

This file *is* the general style guide; this entry makes that role explicit and gives it a
shape (owner-requested, 2026-09-01). Three levels:

1. **General** (this file): the house style (single quotes, no semicolons, 2-space indent,
   ES5 trailing commas), match-the-surrounding-file, DRY-when-downhill, small surfaces,
   comments only for what code can't say, errors as curriculum.
2. **Per-project deltas** live in that project's `CLAUDE.md` — as *deltas that link here*,
   never paraphrases (cross-project.md). A project with no deltas section inherits this file
   wholesale, and that's the common, correct case.
3. **Exemplars over rules**: each project's examples and doc-site samples are the style
   guide's executable form — which is why the examples audit (testing.md, Tier 3) checks
   that they exemplify current practice. When a rule here and a shipped example disagree,
   one of them is a bug; fix whichever is wrong, in the same change.

Tier 3's style-conformance check measures drift between this guide and the code actually
being written — including render-creep in component leaves (see review.md Tier 3), where
philosophy says static-by-default and the measurement says whether reality agrees.

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
- **Don't ship a package name that near-collides with a sibling — and if one slips out,
  rename before the first external consumer, because that window never reopens.**
  `tosijs-schematic` vs `tosijs-schema` read as related-but-distinct to their author and
  as the same thing to everyone else; the confusion was observed in practice within two
  days of publishing. A README "not to be confused with…" callout documents the debt, it
  does not pay it down. The rename window is measured in **consumers, not time**: with
  zero external dependents the whole cost was five files, an npm deprecation, and a
  GitHub redirect (which preserves issue URLs); one shipped dependent later it becomes a
  permanent alias. Two corollaries: (a) test a candidate name by what a reader skimming
  an issue list would assume it means — `floorplan` beat `wireframe` because it names a
  *document of a live structure*, not a sketch of a proposed one; (b) scope the rename
  honestly — exported API names that are a multi-producer contract mid-adoption stay put
  (renaming `SchematicRecord` would have broken two producers to disambiguate nothing).
  — seen in: tosijs-floorplan (née tosijs-schematic) vs tosijs-schema, 2026-08-09

## Change the funnel, not the consumer — and check the scope of the seam you picked

Before patching a pipeline, ask **what scope does this intervention point have**, and
compare it with the scope you intended. The two diverge silently, and the wrong seam
usually *works* — for the case you tested.

The trap is that discoverability and scope are frequently **inverted**: the narrow,
per-consumer seam tends to sit on the object you already hold, while the funnel that
governs everything is reached through some less obvious owner. So the reach that feels
natural is the one that quietly scopes your change to a single path.

- Symptom of having picked wrong: **two clients of the same setting disagree** — one
  device, one entity, one caller behaves and another doesn't. That is a scope error
  wearing a bug's clothes; adding a second patch to fix the second client entrenches it.
- The question that routes it correctly is usually about *meaning* vs *routing*: whatever
  decides what something MEANS belongs at the funnel, whatever merely delivers it can be
  per-consumer. (Input: sources produce axes, the **mapping** decides what axes mean,
  providers route them to consumers — so "which way is up" is mapping-level, always.)
- Patch the **installer** rather than the installed value when the funnel is re-created
  during normal operation (per-entity remaps, respawns, reconnects). Otherwise the fix
  survives only until the next swap.
- If a library made you pick, that is worth an upstream issue about **affordance**, not
  just a local fix — the next adopter will reach for the same wrong thing.

— seen in: manta-recon (a global invert-pitch setting patched onto the aircraft's own
input provider worked for the keyboard and left the touch gamepad inverted; moving it to
the mapping made the divergence unrepresentable — tosijs-3d#10)

## A small API surface is what makes future refactoring cheap

The API surface is not just a usability concern — it is the **contract that
pins your internals**. Everything a consumer can name, you must keep true
forever; everything else you are free to rewrite, rename, delete, or move to
another package. That relationship is asymmetric and compounding:

- **Small, clean surface → refactoring stays cheap.** Missed abstractions,
  duplicated subsystems, a module that should have been extracted years ago:
  all of it is fixable in one release, because nobody's code depends on how
  it was arranged. tosijs extracted its entire schematic renderer into a
  separate package, then re-vendored it, with zero consumer impact — because
  what shipped was `schematicSVG(map)`, not the shape of its internals.
- **Drifted surface → the same cleanup is a breaking change.** Every extra
  export, every incidentally-public helper, every field a consumer discovered
  and started using is a load-bearing wall you didn't mean to build. The
  refactor doesn't get harder because the code got worse; it gets harder
  because the *promises* multiplied.

So the discipline is preventative, not curative: **be reluctant at the
export, generous inside.** Prefer one function that takes options over five
near-duplicates; keep helpers module-private until a second real consumer
appears; put convenience behind the thing it's convenient for rather than
beside it; and when you must expose something provisional, say so where
consumers will see it (tosijs's agent surface ships marked EXPERIMENTAL for
exactly this reason).

The corollary for size work: a size regression in a project with a tight API
is a *scheduling* question, not a design one. You can always go and fix it.
That is what a small surface buys — see
[performance.md](performance.md#bundle-size).

## Deprecations

The stack removes APIs slowly: a deprecated name keeps working and emits a **single**
`console.warn` per feature (tracked in a `Set`). When you deprecate something, follow that
pattern — warn once, keep it working, document the replacement. When you *use* the stack,
prefer `.tosi.value` (symbol-keyed, cannot be masked by a data property named `value`) over
bare `.value`, and either over the deprecated `xin*` spellings. Note `tosiValue()` itself is
**not** deprecated — see [state-and-schema.md](state-and-schema.md). — seen in: tosijs, haltija,
loewald-dot-com

### When a deprecation alias is the WRONG answer

The warn-once-and-keep-working pattern assumes the old name still _means_ something. It
doesn't when the old name was a **knob whose setting became unconditional** — then keeping
it working is worse than removing it, because a knob that no longer controls anything is a
lie with a compatibility guarantee attached.

tjs-lang 0.13.0 abolished nine mode directives (`TjsEquals`, `TjsStandard`, …). Aliasing them
to no-ops would have meant `TjsEquals` silently doing nothing in a file that already had
honest `==`, and — far worse — `TjsCompat`-style "off" spellings silently doing nothing in a
file that expected JS semantics. So they became **errors that name the replacement**.

The test: **does the old spelling still describe a real choice?** If yes, alias it. If it
named a choice that no longer exists, make it an error and say what replaced it.
— seen in: tjs-lang (nine mode directives abolished in 0.13.0)

## Errors as curriculum

Every diagnostic is a teaching opportunity, and the measured difference between a good one
and a bad one is much larger than intuition suggests. An A/B over diagnostic text in tjs-lang
(`experiments/agent-legibility/`) measured the **repair rate each message actually produces**:

| Message                            | Repair rate |
| ---------------------------------- | ----------- |
| A worked example, shown as code     | **80%**     |
| The same remedy as prose            | 50%         |
| An accurate bare diagnostic         | **0%**      |
| Saying nothing at all               | 0%          |

`Unsupported statement type: ForStatement` scored the same as silence. On the `for`-loop case
specifically, prose advice scored 0/5 while the identical remedy shown as code scored 5/5.

> **Show the fix as code.** A diagnostic that names a problem without showing a repair is
> worth approximately nothing over saying nothing.

Two corollaries that cost real time to learn:

- **Never recommend a remedy you haven't run.** tjs-lang's `new Date()` error told people to
  use `Timestamp.now()` while its own `Timestamp` type _rejected_ that function's return
  value. A remedy that doesn't work is worse than no remedy — it spends the reader's trust
  and their afternoon.
- **Never teach a restriction that doesn't exist.** A draft diagnostic claimed `for...of` was
  unsupported; it isn't. A guard test now checks that every remedy corresponds to a construct
  the compiler actually rejects. A false limit is a permanent tax on everyone who believes it.

— seen in: tjs-lang (`experiments/agent-legibility/`, `src/lang/diagnostic-remedy.test.ts`)

### Tombstones

When you remove something that used to be recommended, removing it from the code is half the
job. **The other half is that nothing keeps recommending it** — and the docs, examples,
editor completions and generated bundles all count.

The failure is embarrassing and cheap to prevent: after tjs-lang abolished nine directives,
its own `PLAN.md` still carried a section headed "Death to Semicolons (`TjsStandard`)", served
from the live playground, teaching a construct that had become a hard error.

> Add a **guard test** that fails if the removed name appears outside documents whose job is
> to record history (changelog, archive, decision ledger) — and have it name the replacement
> for each, so the failure is also the fix.

The allowlist is the design: it forces the question "is this document teaching or recording?"
every time, which is exactly the distinction that goes wrong. — seen in: tjs-lang

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

## A fix applied at one site is not applied

**The single most expensive defect class in tjs-lang 0.13.x.** It produced a blocker in
**four consecutive** review rounds, each time in the fixes for the previous round, and it got
past nine-lens reviews repeatedly. Instances, all shipped:

- a symlink guard moved into one of three directory walks; the other two kept the old
  behaviour and were the two that WRITE files
- a `#!` line re-attached at the file-write path and not the stdout path — where the stdout
  form is the first example in `--help`
- a write boundary adopted by one of five call sites in the same file
- a symlink guard that checked the LEAF but not the directories above it
- a CHANGELOG claiming a fix for a whole file when one test in it had changed

**Why review does not reliably catch it.** The diff is *correct*. Nothing in the changed
lines is wrong; the defect is in the lines that were not changed, often in a file the diff
does not touch. A reviewer reading the change sees a good change.

**The rule:** when a fix touches a value or a decision that crosses a boundary, enumerate
every consumer of that boundary before calling it done — mechanically, with a `grep`, not
from memory. In tjs-lang `result.code` had twelve consumer sites and four were tested; the
other eight happened to be fine, which is luck, not method.

**The durable fix is a test that enumerates, not a lens that reminds.** "Where else?" was
already written down as a project review lens and still did not fire. What worked was a test
that walks the command directory and fails on any raw `writeFileSync`, naming the reason. A
lens can be forgotten; an enumeration cannot.

**And prefer removing the generator.** Two near-identical functions (`emitDirectory` /
`convertDirectory`) meant every defect had to be fixed twice, and three times running only
one copy got fixed. Deduplicating them is more valuable than fixing another instance.

— seen in: tjs-lang
