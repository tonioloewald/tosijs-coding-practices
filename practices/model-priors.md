# Model priors that fight this stack

Every other doc here is **descriptive** — "this is what we do." This one is **predictive**:
these are the things a competent LLM (and a competent human trained on the same corpus) will
reflexively do *wrong* in this codebase, and why the reflex is strong.

Read it as adversarial toward your own defaults. **None of these priors are stupid** — that's
the problem. Each one is a well-earned lesson from a dominant paradigm, which is exactly why it
steamrolls a local design that chose differently. The more confidently the corpus asserts a
practice, the harder it runs over a codebase that considered it and said no.

Format: **the prior** → **why the corpus holds it** → **what it does here** → **the tell**.

---

## 1. `UI = f(state)` — reach for `render()`

**The prior.** A component describes its whole UI as a function of state; on change you re-run
that description and the framework reconciles. React made this the water; Lit swims in it too.

**Why the corpus holds it.** It's most of frontend writing for a decade, and it's genuinely a
good idea *in a system built to reconcile*.

**What it does here.** tosijs is **observant**, not reactive: the DOM is persistent terrain
built once and updated by pin-point observers. Re-describing the UI to update it is the slow
path *and* the buggy path — duplicated bindings, stale nodes, lost focus/scroll state.

**The tell.** You wrote a `render()` that builds DOM, or put conditional logic in `content()`,
or thought "why isn't it re-rendering?" See [`observant-model.md`](observant-model.md) — this
prior is *why* that doc has to be so emphatic.

## 2. `onFoo={fn}` is a callback prop

**The prior.** `onClick`, `onChange`, `onProgress` — an `on`-prefixed prop holding a function
is how you pass a callback.

**Why the corpus holds it.** It's React's convention, and React is the corpus.

**What it does here.** tosijs's element factory treats **any `on<Capital>` prop as a DOM
`addEventListener` target**. Assign a function to `onProgress` and the class field stays
`null` — the callback **silently never fires, with no error**. This cost real debugging time in
**tosijs-3d and tosijs-product independently**. It is not a naming coincidence; it is this prior
leaking into an API that made a different, defensible choice.

**The tell.** You named a callback prop `on*`. Use a non-`on` name (`drive`, `whenDestroyed`) or
the `handle<Event>` convention; to set a real function prop, use the `apply(el){ el.onFoo = fn }`
escape hatch.

## 3. A custom element *has* a shadow DOM

**The prior.** Not "shadow DOM is good encapsulation" — it's that **shadow DOM is not
experienced as a decision at all**. Every custom-elements tutorial opens with
`attachShadow({mode:'open'})`. It is presented as *what a custom element is*.

**Why the corpus holds it.** Light-DOM custom elements barely appear in the literature. And
there's a real coercion underneath: **`<slot>` only works inside shadow DOM**, so *composition
is held hostage to encapsulation you may not want*. Most authors accept the whole bundle because
the platform gives them no way to take just the half they need.

**What's actually true.** Shadow DOM carries a **real performance cost**, and its style
encapsulation is **usually undesirable** — you generally *want* your design system's cascade and
CSS custom properties to reach in. The encapsulation is sold as a feature; in practice it's most
often an obstacle you spend effort punching holes through.

**What this stack did.** tosijs **refused the trade** rather than accepting a bad design: it
reimplemented **slot composition for light DOM** (`<tosi-slot>` / `xinSlot()`), so you get
composition *without* being forced into shadow DOM. Hence the ecosystem default: **light DOM**,
with shadow DOM reserved for when you genuinely need isolation (e.g. rendering untrusted email
HTML). Reflexive shadow DOM here also **breaks tosijs path bindings** outright.

**The footgun in the fix — know it.** Light-DOM slotting inserts a real element into the tree, so
**a slotted element's `parentElement` is the `<tosi-slot>`**, not the host or the logical parent
you expect. Anything that walks the tree — `parentElement`, `closest()`, direct-child CSS
selectors (`>`) — sees the slot wrapper. This is the honest cost of fixing composition without
shadow DOM, and it's cheaper than the thing it replaced.

**The tell.** You typed `attachShadow` or `static shadowStyleSpec` without first asking whether
you actually needed isolation.

## 4. `sideEffects: false` is free tree-shaking

**The prior.** Set it in `package.json`; bundlers prune harder; everyone wins.

**Why the corpus holds it.** For most libraries it *is* free, and bundler docs recommend it
unreservedly.

**What it does here.** `elementCreator()` **registers custom elements as an import side effect**.
`sideEffects: false` tree-shakes those registrations to **zero** — the library "works," imports
resolve, and no elements exist. Likewise: never point a `browser` export condition at the IIFE
(it inlines the whole framework).

**The tell.** You "optimized" packaging in a library whose whole job happens at import time.

## 5. "The test was already failing — not my change"

**The prior.** A red test that predates your diff isn't your problem; note it and move on.

**Why the corpus holds it.** It's ubiquitous in PR threads and CI discussions, and — this is the
trap — **it's usually true**. That makes it feel like professional judgment rather than
negligence. It's a base-rate error, not a lie.

**What it does here.** Two agent-specific pressures stack on top of the bad heuristic: a narrow
context window (the change that caused it genuinely *has* slipped out of view) and an incentive
to declare done. "Already red, not mine" is **simultaneously socially normal and locally
convenient** — about the worst combination a heuristic can have. A real observed consequence:
a publish gate silently skipping ~126 tests, which is *how a whole Playwright lane rotted for
months*.

**The tell.** You explained a failure instead of investigating it. **Every red or skipped test is
in scope.** Fix it if easy; if not, flag it with the suspected cause **and still schedule it**.

## 6. "I only `git add`ed one file, so I only committed one file"

**The prior.** `git add <file> && git commit` commits that file.

**Why the corpus holds it.** It's true whenever the index was empty, which is most of the time.

**What it does here.** `git commit` commits **the whole index** — including anything *already
staged that you didn't stage*. A one-file docs commit in `tosijs-product` swallowed a dozen
pending `demo/` + `dev.ts` deletions that were sitting in that repo's index. Note the shape:
**"not my mess → didn't look"** — the same reflex as #5.

**The tell.** You committed in a repo whose `git status` you never read. Path-limit
(`git commit -- <file>`) and verify (`git show --name-only HEAD`).

## 7. `===` compares values

**The prior.** Use strict equality; `==` is a footgun.

**Why the corpus holds it.** Correct, and hard-won, in ordinary JS.

**What it does here.** tosijs 2.0 boxed scalars are **proxies over primitive wrappers**, so
`===` is *identity*, not value comparison — **by design**. `==` / `Eq` unwrap via `valueOf`
and do what you want. This is the one place the usual advice inverts.

**The tell.** You reached for `===` on a boxed scalar and got `false` for two equal values.

## 8. Scripts are named `build`

**The prior.** `npm run build` / `bun run build` is the build script. Always.

**What it does here.** **`bun build` is a Bun *builtin*** (the bundler). If a `build` script also
exists, `bun build` silently runs the builtin while `bun run build` runs your script — a
divergence footgun. tjs-lang deliberately names its full-build task **`make`** to defend against
this.

**The tell.** You assumed `bun build` and `bun run build` are the same command.

---

## Why this doc exists

Two observations drove it. First, **React anti-patterns are real in the corpus** — not as
opinions but as *debugging assumptions*, which is worse, because they arrive pre-loaded with the
confidence of experience. Second, **dismissing failing tests you didn't break is normal
professional practice**, widely enough attested that it slid into the default mindset.

Neither is a knowledge gap. Both are cases where knowing more makes you *more* likely to be
wrong here. That's the category this file tracks — and it's a **living list**: when you catch
yourself (or another agent) confidently doing the locally-wrong thing, the prior behind it
belongs here.
