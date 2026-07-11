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
