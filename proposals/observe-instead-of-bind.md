# Proposal: the observe-instead-of-bind signal

**Status:** proposal, rung 1. **One signal already refuted by testing it.**
Split from `react-brain-detectors.md` because it is not React-brain and the
fix is different.

## The failure mode

> "Agents reaching for `observe` when they should just `bind`. That's not
> exactly react-brain so much as not understanding that bind does all the hard
> work you probably are going to do yourself for you." — owner

Not an imported mental model — **reaching past an abstraction that already
solved the problem.** The hand-rolled version works: the page updates, nothing
throws. That is what makes it expensive.

### What it costs, measured

Two divs on a page, both driven by state — one `bindText`, one `observe` plus
`el.textContent = …`. `describe()` returns **one**:

```
elements on the page    : 2
elements the agent SEES : 1
hand-rolled div present : false
```

The agent map is built from `BOUND_CLASS`. **An element becomes *wired* by
being bound and by nothing else.** So an app written this way describes itself
as smaller than it is, and the ONE USER INTERFACE premise fails silently —
the same blind spot as instrument 0 in `measured-legibility.md`, from the other
direction.

Also forfeited: surgical list updates via `idPath`, the async-batched touch,
and the accumulate-don't-clobber `bind` behaviour that 1.10.1 shipped a fix for.

## The pernicious case is a DELTA, not a state

> "It's probably more pernicious when new observers get added without new
> wiring. So the app has mostly decent code but the agent has forgotten context
> and goes back to hand writing DOM updates." — owner

This is the correct framing and it **refutes the detector I was about to
propose.** Measured on tosijs-ui, a large mature consumer:

| | count |
| --- | --- |
| `bind*` props / `bind(` | 20 |
| `observe(` | **27** |
| `touch(` | 4 |

**More observers than bindings in code that is fine.** An absolute-ratio
detector fires on a healthy codebase. Refuted before shipping — which is the
cheapest possible time to find out.

The delta survives, weakly. tosijs's own history:

```
v1.10.1...HEAD     +observe 1   +bind 8     healthy
v1.9.2...v1.10.1   +observe 6   +bind 4     observers outpacing
```

Plausible ordering, but **tosijs's own `src/` is the wrong corpus** — it
*implements* `bind` and uses `observe` for internal machinery. Needs testing
against an application (tosijs-3d, manta-recon, the demos) before it is
trusted.

## `touch()` as a weak signal, and why rarity is the point

> "Another thing to look for is lots of calls to touch, but again it's not
> definitive." — owner

Not definitive, and legitimate in several places (`forEach`/`map` yield raw
items, so mutations need a touch; hot-reload; forced updates during drag). But
**4 occurrences across all of tosijs-ui** — so it is *rare in good code*, and a
spike is informative even though a single call is not.

**A weak signal that almost never fires is worth more than a strong one that
fires constantly.** False-positive volume is what kills a detector; rarity caps
it. Treat `touch` density the same way — a delta, and a question, never a
verdict.

## Where this belongs — and it is NOT a runtime warning

The first draft of this was a `describe()` runtime note. Wrong home: the
signal is a **delta**, and a runtime has no diff. It belongs in the review
lens, phrased as a question rather than a finding:

> Did this change add observers without adding wiring? If so, do those
> observers write to the DOM — and would `bind` have registered them in the
> agent map?

Weak by construction, so it must never gate. It earns its place only if it
would have caught a real instance — **which is the first thing to check, not
the last.**

## Retirement

If the delta signal does not separate a known-good app from a known-hand-rolled
one on first test, it goes. The absolute ratio is already retired: tested,
fired on good code, dead. One of two signals killed before adoption is the
process working, not a setback.
