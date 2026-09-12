# Proposal: React-brain detectors, with executable replacements

**Status:** proposal, rung 1. Target **1.12**, not 1.11.0 — see *Scheduling*.
**Origin:** owner, 2026-09-12. All behaviour below MEASURED, not assumed.

## What tosijs does today when someone brings React habits

Probed against HEAD. Three of these are worse than "no warning."

| written | what happens now |
| --- | --- |
| `div({key: 'row-1'})` | `<div key="row-1">` — junk attribute, silent |
| `div({dangerouslySetInnerHTML: {...}})` | `dangerously-set-inner-h-t-m-l="[object Object]"` |
| `div({className: ['a','b']})` | **`class="a,b"`** — one bogus class name |
| `div({style: 'color: red'})` | works, but **clobbers** any later style prop or style binding |
| `render() { return … }` | return value silently discarded |
| `componentDidMount() {…}` | defined, never called, no signal |

`className` is not merely a React idiom — it is a **silent correctness bug**.
`class` accepts arrays and boolean maps; `className` is a real DOM property, so
it takes the assignment branch and array-joins with a comma.

## The detectors, and where each costs nothing

**At registration — once per class, zero runtime cost.** The slot already
exists: the `on<Event>` collision warning (`src/component.ts:2055`) warns once
per class, honours `settings.quiet`, and states what actually happens.

- a direct `this.render()` call (see the two tiers below)
- React lifecycle names on the prototype: `componentDidMount`,
  `componentWillUnmount`, `componentDidUpdate`, `shouldComponentUpdate`,
  `getDerivedStateFromProps`, `componentWillReceiveProps`,
  `getSnapshotBeforeUpdate`, `UNSAFE_*`
- `setState` / `forceUpdate` defined

**At the `render()` call site — one comparison** (`src/component.ts:2694`).
A non-`undefined` return is the canonical React-brain error and is invisible
today.

### Calling `render()` directly is React-brain in TWO tiers, and one message should carry both

> "Calling render directly is kind of two tiered react brain. 1. use
> queueRender but 2. maybe don't do it at all?" — owner

Verified: `queueRender(triggerChangeEvent = false)` schedules via
`requestAnimationFrame`, and the **only** internal `this.render()` is inside
that rAF callback, immediately after `_renderQueued = false`. So a direct call
bypasses both the batching and the bookkeeping — N calls do N renders, mid-frame.

- **Tier 1, mechanical and unambiguous.** `this.render()` should be
  `this.queueRender()`. Detected by a **secret handshake** — see below.
- **Tier 2, conceptual and the real disease.** *Why are you calling render at
  all?* tosijs is observant: the DOM is persistent and bindings update it
  surgically. Reaching for render to "update the UI" is `UI = f(state)`
  imported wholesale, and the answer is almost always a binding.
  `CLAUDE.md:509` already says it — *"`render()` runs on attribute changes —
  use only for structural changes, not manual DOM updates."*

**One detector, one message, both tiers** — cheaper than two detectors, and it
reaches the reader where they already are. Do NOT build a separate tier-2
detector: distinguishing "structural change" from "manual DOM update" at
runtime is not worth what it would cost.

### The handshake (owner's idea, and it is the right primitive)

> "The trick would be for queueRender to have a secret handshake."

A module-private token `queueRender` holds and `render` checks. **Per-instance,
not a module boolean** — a `WeakSet`:

```ts
const SANCTIONED = new WeakSet<Component>()

// inside queueRender's rAF callback, where the only internal render() lives:
SANCTIONED.add(this)
try { this.render() } finally { SANCTIONED.delete(this) }

// the check:
if (!SANCTIONED.has(this)) warnDirectRender(this)
```

Three properties that a simpler design does not have:

1. **`super.render()` from an override does not false-positive.** The instance
   is in the set for the whole call, so the commonest correct pattern —
   which `CLAUDE.md:610` explicitly tells people to write — stays silent. An
   argument-passed token would break exactly here, because an override's
   `super.render()` forwards nothing.
2. **A nested direct call IS caught.** If a parent's sanctioned render calls
   `child.render()` directly, a module-level boolean would be true and miss it;
   a per-instance set catches it, because the child is not in the set.
3. **Cost is nothing.** One add/delete per *queued* render (already
   rAF-throttled) and one `has` per render.

**Install the check by wrapping `render` on the concrete prototype at
registration**, not by putting it in the base `render()`. Otherwise a subclass
that overrides `render()` without calling `super.render()` skips the check
entirely — and that subclass is likelier than average to be the confused one.
The precedent is in this file: `DRAIN_WRAPPED` (`src/component.ts:1682`) wraps
`connectedCallback` on the concrete prototype for the same reason.

### The handshake needs a PUBLIC door, or it is a wolf-cry

A synchronous render during a drag — paired with raw `xin` reads/writes,
because `touch()` is async-batched — is correct and deliberate. If the only way
to do it is the thing that warns, the warning is wrong for a legitimate use,
which is the 1.9.0 failure in a new costume.

So the handshake ships with a sanctioned synchronous entry point — `renderNow()`
or `queueRender({ sync: true })` — which adds to the set and calls `render()`
immediately. Then the warning can say something true and complete: *"call
`queueRender()`; if you meant to render synchronously this frame, call
`renderNow()`."* A detector whose message has no correct destination should not
ship.

**And the message must name the legitimate exception.** A synchronous
`render()` during a drag — paired with raw `xin` reads/writes, because `touch()`
is async-batched — is correct and deliberate. A warning that tells someone
doing that they are wrong is the 1.9.0 failure again, in a new costume. Warn
once per class, honour `settings.quiet`, and say plainly when a direct call is
right.

**In `elementSet` — free if placed correctly.** `key` and
`dangerouslySetInnerHTML` already fall through to the unrecognised-prop branch.
`style`-as-string is the existing `else` of a `typeof value === 'object'` test.
Only `className` needs a new test, and only when the value is not a string.

**No hot-path cost anywhere.** `elementSet` runs on every prop of every
element; none of these adds work to a recognised prop.

## RETURN findings; do not warn. An agent cannot see the console.

> "The real problem with the whole idea at runtime is that agents tend not to
> see console spam in the browser, at least not yet." — owner

This lands on every detector in this document, because every one was specified
as a `console.warn`. **The failure modes here are made by agents, and the
correction was being delivered to a channel agents do not observe** and humans
may never open.

**The precedent is already in the repo and was walked past.**
`auditAccessibility` contains **zero** `console.warn` calls — it returns an
`AuditReport` of `findings` and `skipped`, and lets the caller decide. That is
the shape that reaches an agent.

So the detectors return findings. The same detection then reaches three
audiences through channels each can actually use:

| audience | channel |
| --- | --- |
| an agent at runtime | findings folded into `describe()` — the thing it already reads |
| an agent writing code | a test asserts on the returned findings — the lane it does see |
| a human | print them, opt-in |

**It also dissolves three problems that were artefacts of the wrong channel:**
warn-once bookkeeping, `settings.quiet` handling, and console-spam limits.
A returned array has no spam problem; the caller decides.

The one detector that stays a warning is the **`queueRender` handshake**, and
only because a direct `render()` call is a *code* mistake surfaced while the
author is running the app — but it should also appear as a finding, for the
same reason as the rest.

## The part that matters: messages that cannot go stale

A warning is a **claim about a replacement**, and this ecosystem has shipped
three kinds of wrong claim:

- 1.9.0 deprecation messages *"told users to write props keys that do not
  exist"*, and following one literally **shipped a permanently disabled
  button** (`bin/bundles.ts`).
- `src/bindings.ts:34` and `Building-Apps.md:104` taught a deprecation that
  1.9.1 **removed** — ten days stale, and `bindings.ts` is inside a `/*# */`
  block, so it was live on the doc site.
- `src/xin.ts` told users `tosiValue`/`tosiPath` were deprecated when they are
  the canonical free functions.

**Verified: no test in this repo executes any warning's suggested replacement.**
`practices/code-quality.md:257` already states the rule — *"Deprecation is a
claim about a REPLACEMENT, so test the replacement — with the caller's actual
value"* — and nothing implements it.

### The design that makes staleness structurally detectable

**Do not put the fix in a string. Put it in a table the test can execute, and
generate the message from it.**

```ts
{
  id: 'react-key',
  detect: (key) => key === 'key',
  because: "React uses `key` to reconcile a list. tosijs has no reconciler …",
  // EXECUTABLE. Not prose about the fix — the fix.
  fix: () => div({ bindList: { value: app.rows, idPath: 'id' } }, template),
  // what must be true after `fix` runs, so the claim is checkable
  expect: (el) => el.querySelectorAll('[data-list-instance]').length > 0,
}
```

One source for the message and the test. Three gates, all cheap:

1. **Every `fix` runs, and its `expect` holds.** This is the gate that would
   have caught the permanently-disabled button on the day it was written.
2. **Every detector has a positive fixture that triggers it** — otherwise the
   detector rots silently, which is the vacuous-fixture class this repo has hit
   repeatedly (unwired anchors, a `forged != null` arm that never executed).
3. **No prose in `src/` or `docPaths` claims a deprecation the runtime does not
   emit.** A three-line grep over ``` `symbol` is deprecated ``` cross-checked
   against the `warnDeprecated` call sites. This catches the `bindings.ts:34`
   class deterministically, for free, with no model and no corpus to rot.

### What this deliberately does NOT try to do

Gate 3 catches *contradiction*, not *incompleteness* — a doc that simply never
mentions a change stays invisible, and no cheap mechanism fixes that. **Some
staleness will ship.** The gates are chosen because each has a measured
failure behind it and costs a few lines; a scheme that tried to prove docs
complete would cost more than the defects.

## Message standard, and why it is not taste

Every message shows the fix **as code**, not as prose. That is the measured
result, not a preference: `tjs-lang/experiments/agent-legibility/` reports
prose remedy 0/5 and the identical remedy shown as three lines of code 5/5;
across variants, prose 50% vs worked example **80%**, against 0% for shipped
diagnostics.

This also makes the detector set the **first real customer of the legibility
instrument** (`measured-legibility.md`): a natural A/B corpus, written to a
standard that can be measured rather than argued.

## Scheduling

**1.12, not 1.11.0.** 1.11.0 is a security release that has been through eight
review rounds and is not tagged; a new warning surface is scope creep on the
release where scope creep has cost most. The one candidate for pulling forward
is the `className`-with-an-array bug, because it is a silent wrong answer
rather than a missing warning — and even that is arguably its own patch.

## Retirement

If a detector never fires in real use across two releases, it is describing a
mistake nobody makes — retire it rather than keep it for tidiness. If gate 1
never goes red, either the messages are right or the gate is vacuous; prove
which by breaking one deliberately before trusting it.
