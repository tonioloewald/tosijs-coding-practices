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

## The detector is one question, and it compares nothing

> "It's not even more. It's like you just added a bunch of observers. Are you
> sure?" — owner

Three drafts of this compared things — observers to bindings, this release to
the last. All wrong, and the third correction is the one that makes it work:

> **This change added N observers. Are you sure?**

No ratio. No baseline. No threshold. It asserts nothing, so it cannot be
wrong — it prompts the author to confirm an intent they already have, at the
only moment they have it.

**Why that beats every comparison I drafted:**

- **The ratio is refuted** — but ⚠️ **the numbers below were wrong, and were
  relayed into a public RFC before anyone checked them.** This said tosijs-ui
  has "27 `observe` against 20 `bind` — more observers than bindings in code
  that is fine." Re-counted by reading every call site: **18 `observe` against
  21 bind-ish**. The 27 counted `MutationObserver`/`ResizeObserver` calls,
  `hash-state`'s own `observe` METHOD, and tests. Observers do **not** outnumber
  bindings there.

  The conclusion survives anyway — an absolute-ratio detector still fires on
  legitimate code — but *"in code that is fine"* did **not** survive. Classified
  against the rule that actually matters (below), only **2 of 18** are clearly
  legitimate. See tosijs#44.

  **The lesson is the relay, not the arithmetic:** a figure written here as
  supporting colour was later cited as the load-bearing refutation of the
  owner's premise, in three public issues, without anyone re-deriving it. A
  number in a proposal is a claim, and it inherits no credibility from the
  document it sits in.
- **The delta-against-bindings needs a corpus nobody has.** tosijs's own
  history orders plausibly (`+1 observe/+8 bind` healthy, `+6/+4` less so) but
  its `src/` *implements* `bind` and uses `observe` for internal machinery —
  the wrong corpus, and no application corpus is validated.
- **A question needs neither.** "You added four observers" is a fact about the
  diff. Whether that is right is the author's call, and they are the only one
  who can make it.

The reason travels with the question, because the reason is the part nobody
knows:

> `observe` leaves **no trace in the agent map** — an element becomes wired by
> being bound and by nothing else. If these observers write to the DOM, `bind`
> would register them; as written, an agent cannot see what they drive.

**And it is aimed at the real case.** Not an app built wrong from the start,
but *mostly decent code where an agent lost context and reverted to
hand-writing DOM updates* — a burst of new observers in an otherwise bound
codebase. A burst is visible without any comparison at all.

## ⚠️ The rule this proposal was missing

`bind(el, path, { toDOM })` accepts an **arbitrary** `toDOM` — the side effect
may land on a completely different node — and the bound element is *still*
registered with `BOUND_CLASS` and still appears in `describe()`. Verified by
execution.

So the line is not "observe vs bind by taste". It is:

> **Using `observe` to persist a value is entirely legitimate. If you `observe`
> and then shove something into the DOM, you are almost certainly adding code
> and bugs for no good reason.** — owner

`observe` is for reactions that touch **no DOM** (persist, sync, telemetry,
process control, derived state). Anything that touches the DOM has an element
to bind to, and `bind` gives agent-map registration away for free.

**"Adding code" is literal:** `bind` applies on setup, `observe` does not, so
every hand-rolled version carries a manual priming call — `live-theme.ts:356`
and `hash-state.ts:28` both do. Forget it and the UI is stale until the first
change.

This also retires the taxonomy drafted for tosijs#44: `'structure'`,
`'document'` and `'handoff'` were all DOM effects, and listing them as good
reasons legitimised the exact conversions the proposal exists to cause.

## Why naming cannot fix this, though it is the right instinct

> "If we were doing dangerouslyUpdateInnerHTML style thing it would be
> something like observeAndManageUpdatesManuallyYouFool…" — owner

Naming-as-deterrent is the best mechanism available when it applies: the name
warns at the call site, every time, for free, with no gate and no false
positives. **The corpus measured exactly when it applies**
(`exactly-probe.ts`, N=5):

| arm | result |
| --- | --- |
| `Exactly` — a novel, self-describing word, no comment | **4/5, zero wrong** (the miss was a no-answer) |
| `switch` — contradicts a prior every model holds | **0/5, five confident errors** |

> **"Guidance is needed where we contradict an existing habit, not where we add
> a well-named novelty."**

`dangerouslySetInnerHTML` is the *novelty* case: nobody arrives with a prior
about what it means, so the name fills an empty slot and does all the work.

**`observe` is the other case.** Every reactive library has one, everyone
arrives with a prior, and **the prior is correct** — `observe` genuinely is the
right tool for non-DOM reactions. A deterrent name would be fighting a habit,
which is measurably where a name alone fails.

**And React's trick has a structural precondition tosijs does not meet.**
`dangerouslySetInnerHTML` works because it is the *only* spelling of the
dangerous thing; there is no innocuous alternative to hide in. Here `observe`
is simultaneously the innocuous spelling and the dangerous one, decided by what
the callback does. **You cannot deter a name that is right half the time.**

Which leaves one real design option, and it is an API change rather than a
detector: **make the dangerous path unable to hide inside the innocuous one.**
`observe` for non-DOM reactions; a separate, self-indicting entry point for
"I am updating the DOM myself." Only that version gets the naming mechanism to
do the work — and it is a 2.0-shaped change, not a warning.

**The trap, also measured:** *"naming the language WITHOUT stating the rule is
worse than saying nothing."* A deterrent name that does not say **why** — that
`observe` leaves no trace in the agent map — scores below silence. Whatever the
name, the reason travels with it.

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

If the question is answered "yes, I meant it" every time for two releases, it
is noise and goes. Note what has already been retired without ever shipping:
an **absolute ratio** (tested, fires on good code, dead) and a
**delta-against-bindings** (needs a corpus nobody has). Two of three mechanisms
killed before adoption, by measurement and by the owner sharpening the
question — which is the process working, not a setback.

**The general lesson is worth more than the detector.** Each draft compared
something, and each comparison needed a baseline, a threshold, and a corpus to
validate it. The version that survives asserts nothing and asks the author
something only they can answer. **When a signal is weak, make it a question —
questions cost nothing to dismiss, findings cost a rebuttal.**
