# The observant model (not "reactive")

Read this before writing any tosijs component or binding. It is the one idea that, if you
carry a React/Lit mental model into tosijs, will make everything you write subtly wrong.

## The distinction in one sentence

**Reactive** frameworks (React, Lit/lit-html, Vue…) express the UI as **`UI = f(state)`**:
you write a `render()` that returns a description of the *entire* UI for the current state,
and the framework re-runs it on every change and reconciles the difference (React diffs a
virtual DOM; Lit re-evaluates a template and patches it).

**tosijs is observant.** The DOM is **static by default** — a persistent structure you build
**once** — and it is updated by **pin-point changes** driven by *observed* state changes and
user events. There is no `UI = f(state)`, no re-render pass, no diff. Observers surgically
mutate exactly the bound nodes that changed, and nothing else.

> Reactive: state changes → re-run render → diff → patch.
> Observant: build the DOM once → wire bindings → state changes → the observer for that
> path touches its bound node directly.

## What follows from this

- **The DOM is terrain, not output.** You lay it down once; it persists. You do not recreate
  it to reflect new state — you *bind* it to state and let observers update it in place.
- **`render()` is often unnecessary — or only does surgical work.** Because bindings keep the
  UI in sync automatically, most components never need a `render()` at all. When one exists,
  it should do *structural* touch-ups on attribute/value changes (toggle `hidden`, set
  `textContent`, `replaceChildren`) — **not** rebuild the component's content and **never**
  re-assign `innerHTML`. Treating `render()` like a React render function produces stale,
  duplicated, or flickering UI. (See [`web-components.md`](web-components.md) for
  `content()` vs `render()`.)
- **Set up bindings once, in `content()`.** `content()` runs a single time at hydration; it
  builds the full element tree and wires the bindings. That is where the work goes.
- **Updates are batched and targeted, not swept.** `touch(path)` coalesces on a tick and
  notifies only the observers registered for that path (and its parents/children). There is
  no whole-tree pass, which is *why* the model is fast — see [`performance.md`](performance.md).
- **User events and state are peers.** UI updates come from two sources — observed state
  changes *and* direct user events — not solely from a state-derived render. You wire both.

## The path is one substrate with many consumers

**Every write carries a stable, global address** (`list[id=123].color`), so the surgical
DOM update, the observer, the sync delta (`{ path, value }` on the wire), the agent surface
(`read`/`write`/`describe`), and write-time checks are each *readers of an address that
already exists* — new capabilities keep coming out "basically free" because the addressing
was already paid for. Two design rules follow:

- **Prefer new readers of the path over new registries.** A parallel map keyed by anything
  else must stay correct under the same churn the path already survives — the mistake
  behind every rejected path→element index.
- **Check on writes, not reads.** Reads are constant (every binding evaluation); writes are
  bounded by typing speed and network arrival, and are the dangerous direction — a bad
  write *creates* the structure it walks through. Genuinely write-heavy paths (drag,
  animation) route through the raw proxy; any write check needs a **dial keyed to the
  channel's trust level**, because no single strictness suits both a human keystroke
  (refusal breaks the app under their hands) and an untrusted agent's tool call (refusal
  hands it a structured error; silence corrupts state a human gets blamed for).

## Why the word matters

Call it **observant** (observer / pub-sub), not "reactive." The vocabulary keeps the mental
model honest: "reactive" primes people to reach for `render()`, conditional rebuilds, and
"the UI is a function of state" — all of which fight tosijs. If you catch yourself rebuilding
a subtree to reflect a value, stop: bind the node and mutate the state instead.

## Contrast table

| | Reactive (React, Lit) | Observant (tosijs) |
| --- | --- | --- |
| Core equation | `UI = f(state)` | DOM is persistent; bindings wire it to state |
| On state change | re-run render, diff, patch | observer touches the specific bound node |
| `render()` | describes the whole UI, runs every change | often absent; only surgical structural updates |
| Where UI is built | returned from render each time | built **once** in `content()` |
| Update granularity | framework infers from a full re-description | you declared it up front via the binding |
| Cost model | proportional to what render re-describes | proportional to what actually changed |

Lit is worth calling out specifically: lit-html patches the real DOM efficiently rather than
diffing a virtual DOM, so it is *more surgical than React* — but it is still **reactive**,
because you author a `render()` that returns the whole template as a function of state and
the framework decides what changed. In tosijs you never re-describe the UI to update it; you
described it once and bound it, and the observer already knows the one node to touch.

## The trap, restated

The single most common mistake (seen across every component project in the ecosystem) is
importing the reactive habit: putting conditional/dynamic logic in `content()`, rebuilding
DOM in `render()`, or reaching for a re-render to reflect a change. The fix is always the
same — **build once, bind, mutate state, let the observer do the pin-point update.**

## Boxes are not transparent, and the three ways that bites

A tosijs proxy resolves a *path*; it is not the value at that path. Reads through
it come back **boxed**, and JavaScript cannot make a box behave like its
contents — an object wrapper is always truthy, so `new Boolean(false)` is truthy,
and no proxy can fix that. (`.tjs` can: native `==` there is a footgun-free
`===` that unwraps boxed primitives. In `.ts` you do not get it.) So:

    store.pieces.find(p => p.id === 'a')   // {} — p.id is a box, === is false
    if (box) …                             // true even when it holds false
    structuredClone(store)                 // DataCloneError

**Use the proxy for binding and observing; use `.value` for everything else.**
Anything that expects plain data — a JSON serialiser, a validator, a builder,
`structuredClone` — gets `.value`. In a component, make the plain document a
*getter* over the store rather than a second copy.

Three specific traps, each of which cost real time in `tosijs-3d-ensemble`:

- **A held OBJECT box disagrees with itself** (leaf boxes are fine). Leaf proxies
  are *empty* — path only — so they resolve live. Object proxies still wrap their
  target, so `.value` on a held one returns whatever it closed over, permanently.
  Within one object box, `objBox.n.value` traverses and is correct while
  `objBox.tosi.value` is the original: two mechanisms, one object. It presents as
  a failed *write*, so every diagnosis goes to the wrong end — a test asserting
  "the write did not land" passed for the wrong reason, and a correct line of
  code got "fixed". **Never hold a boxed proxy — read it through the chain each
  time** (every access mints a fresh one; `store.q === store.q` is `false`).
  Historical, per the author: leaves used to be bare values, then wrapped
  primitives (stale, and `new Boolean(false)` truthy), then honest empty
  proxies — and objects were left behind. tosijs#35 tracks emptying them too,
  after which holding a box becomes safe. — seen in: tosijs-3d-ensemble
- **An observed path is the path you OBSERVED, not the leaf that changed** — and
  sometimes it *is* the leaf path, which is worse, because code that parses it
  appears to work. Treat the notification as "something under here moved" and
  read the document; use the path only where a coarse value is harmless, such as
  a coalescing key. — seen in: tosijs-3d-ensemble
- **Do not write a box from inside an observer.** The write notifies again and
  that second notification is indistinguishable from a fresh edit — it recorded
  an undo step for a change the user never made. Mutate the plain object under
  the store instead when the point is to normalise what was just written.
  — seen in: tosijs-3d-ensemble

## Do not roll your own coalescing, memoization, or dirty-checking

Updates are queued on an rAF and tosijs skips writes that change nothing.
Measured: **50 writes to one path produce 1 notification, and an unchanged write
produces 0.** If you find yourself debouncing, memoizing, or comparing a "new"
value against the last one you saw, the framework already did it — you are
adding work, losing its performance, and taking on the correctness burden its
test suite already carries.

The same applies one level up: do not decide *when* to re-render. In
`tosijs-3d-ensemble` I wrote a `_changesPanelShape()` predicate, a `describe`-string
coalescing key for undo, and a `chrome: false` flag threaded through the mutation
path — three mechanisms, all worse versions of what the store does for free, all
deleted once the panel was bound.

## `Component` disables `tsc` for your whole class

`Component` declares `[key: string]: any`, and an index signature propagates to
every subclass. So on any component, `this.typoedMethod()` and
`const n: number = this.notAThing` both type-check under `--strict`.

This is not theoretical: a mis-splice deleted five method definitions from a
component and `tsc --noEmit` stayed green, as did 312 tests — the methods were
only reachable from a browser path. It failed at runtime with
`this._box is not a function`.

**So for components, a green typecheck is weaker evidence than it looks.** After
any refactor that moves or renames members, exercise the component in a browser
before believing it. Filed as tosijs#36. — seen in: tosijs-3d-ensemble

## Act on committed state (the Enter-commit race)

A recurring variant of the same imported habit, seen in demo after demo: a
text field with a submit-on-Enter `keydown` handler that mutates state and
programmatically clears the bound path. It races the platform: **Enter
commits the field**, firing a synchronous `change` event — and since state
updates are synchronous while DOM flushes are async, the commit's echo
(`handleChange` reading the still-uncleared DOM value) lands *after* your
clear and writes the stale text back. The field "doesn't clear," and neither
does state.

The fix is never to poke the DOM (`event.target.value = ''` is treating the
symptom with the disease). Wire the action to **`change`** instead of
`keydown`: tosijs's capture-phase document handler writes the committed
value to state *before* the element's own handler runs, so the handler acts
on committed state, mutates atomically, and the UI catches up on its own —
the same doctrine as everything else in this file:

    input({
      bindValue: app.newItem,
      onChange: 'app.addItem',   // Enter commits → state commits → act
    })

    // in state: read, mutate, clear — atomically; no element in sight
    addItem() {
      const text = app.newItem.value.trim()
      if (!text) return
      app.items.push({ text, done: false })
      app.newItem = ''
    }

(Unit DOMs don't emulate Enter-commit, so only real browsers expose the
race — if a "clear the field" behavior matters, it needs a browser-lane
test.)
