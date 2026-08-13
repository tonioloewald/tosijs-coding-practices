# Documentation as an artifact, not a promise

> **STATUS: PROPOSAL — for comment and iteration.** Drafted from haltija's experience, where
> keeping documentation in step with code has been the single most persistent source of defects.
> Nothing here is settled. Argue with it.

Documentation drift is not a discipline problem. It is a **duplication** problem wearing a
discipline costume: the same fact written in two places, with a human promise to keep them equal.
The promise is always kept for a while and never kept forever.

The fix that works has one shape — **make the second copy a build artifact** — and the fix that
never works is resolving to be more careful.

## The four moves

### 1. Generate documentation from ONE source of truth, and put that source in (or beside) the code

Not "keep the docs updated". *Delete the second copy.* Where a doc contains an enumeration — legal
values, commands, flags, environment variables, error codes — that list should be **generated**
from the definition, into a marked block, by the build.

**Put the prose at the definition**, not in a doc that refers back to it:

```ts
export const TEST_ACTIONS = {
  drag: {
    core: false,
    summary: "Drag from the element's centre by a pixel delta — sliders, resize handles.",
    fields: '`selector`/`ref`, `deltaX`, `deltaY`, `duration`',
    example: '{"action": "drag", "selector": ".slider-thumb", "deltaX": 50}',
  },
  // …
} as const satisfies Record<string, ActionDoc>
```

Two properties matter more than the mechanism:

- **You cannot forget it, because it is the thing you are looking at.** Adding an entry means
  writing its prose in the same edit.
- **The type makes it mandatory.** A `Record<string, Doc>` where `summary` and `example` are
  required means an undocumented addition does not compile. A convention would be ignored; a type
  cannot be.

Then a marker block in each hand-written doc, filled by the build:

```md
<!-- GENERATED:step-actions -->
<!-- END:step-actions -->
```

and a CI gate asserting a build leaves the tree clean, so staleness is a red build rather than a
discovery six months later.

**Prose keeps what humans are good at** — judgement, rationale, when-not-to. Lists are not that.

### 2. Mark what belongs on the CORE discovery surface, in the same place

Every project has surfaces that are read *always* (an agent skill/prompt, `llms.txt`, a README's
first screen) and surfaces read *on demand* (full API reference). Which tier an item belongs to is a
real decision, and it should be recorded **next to the item**, not implied by where someone happened
to paste it:

```ts
core: boolean   // no default — see below
```

**Make it mandatory with no default.** A default is always taken, and everything drifts into "core"
one individually-reasonable addition at a time. Forcing the author to type `core: false` is the
entire mechanism.

Then generate the core surface from the core items and the reference from all of them. Being
non-core must mean *documented elsewhere*, never *undocumented* — that is a separate assertion worth
writing, because "not core" quietly becoming "not written down" is a worse failure than a long page.

### 3. TEST your names on agents, then move toward guessability by deprecation

If a name needs a paragraph before anyone can use it correctly, **the paragraph is a symptom**. The
durable fix is to rename, not to write more prose.

That is measurable rather than arguable. Show a fresh agent the vocabulary with **no descriptions**
and ask two kinds of question:

- **cold-read** — given only this name, what do you think it does?
- **reach** — given this task and the bare list of names, which would you use?

The second catches collisions. **Read the distribution, not the score**: an answer that recurs is a
design finding, because the word already means that to a competent reader and yours is the odd
meaning out.

Then move by **deprecating alias**, never by breaking:

1. rename to the honest name; keep the old spelling working, with a warning that names the replacement
2. generate docs from the new name; make recorders/generators emit the new name
3. assert as a hard invariant that **an alias may never shadow a live name** — otherwise a word
   means two things depending on vintage, which is worse than the original confusion
4. drop the alias later, which frees the good name for the meaning everyone expected

**Expect to be wrong about which names are bad.** In haltija's first run, three of four predicted
naming bugs were disproven — agents disambiguated them from context — and the one confirmed case was
unanimous and worse than predicted. Intuition about one's own vocabulary is close to worthless;
that is precisely why the harness is worth building.

Keep it **out of CI**. It costs real model calls, it is non-deterministic, and a flaky naming test
is disabled within a week. It is an instrument you *run and read* when changing a vocabulary.

### 4. Size-gate the core discovery surfaces

Prompts and READMEs do not decay on their own. Each addition is individually reasonable, nobody is
ever assigned "delete something", and five years later it is a manual that competes with the user's
actual task for attention and context.

A byte ceiling converts that slow ratchet into an explicit decision:

- the budget may be **lowered, never raised** — record the history inline so the direction is visible
- the failure message must say **CUT**, and name the moves (mark something non-core, move an
  enumeration into a generated block, delete a redundant example)
- assert the **headroom stays tight**, or a generous ceiling enforces nothing

Haltija's agent prompt was ~31KB (~7.8k tokens) when first measured, against an original ambition of
a "pithy one-pager". One section was 52% of it, and its largest blocks were caveats that each
carried *the rule, the reasoning, and the incident that caused it*. Only the rule earns space on a
surface read every time; the incident already lives in the changelog and the code comments.

## The ideal pipeline, and why you probably will not start there

```
spec → commands → implementation → docs → discovery surface
```

Each stage derived from the one before, so there is nothing to keep in sync.

Three honest caveats:

- **Not everyone has that luxury.** Plenty of work starts at a code module with docs and tests and
  grows outward. That is fine — the moves above are applicable at any entry point, and the value
  is in the derivation, not in having started from a spec.
- **Perfection is the enemy of better.** One generated enumeration beats a plan for a full
  pipeline. Convert the worst duplication first and let the rest wait.
- **Projects drift from this, including ours.** Haltija drifted a long way: three hand-maintained
  copies of one list, an environment-variable table missing three variables the code read (one of
  them the *highest-priority* configuration override), and prose that existed only on the prompt
  and nowhere else. The drift is normal. The response — convert a copy into an artifact each time
  you get burned — is the practice.

## Where this should end up: an affordance, not a per-project reimplementation

Every project doing this separately is the duplication problem one level up.

**Proposal: `tosijs-ui`'s doc/build system should afford this directly** — marker blocks, the core
tier, the size gate, generation from a typed definition — so a project gets it by adopting the
system rather than by hand-rolling a bespoke one. Projects that have already hand-rolled it (haltija
has, in part) should migrate to the shared implementation once it exists and delete their own.

That is [negative blast radius](../README.md#the-organizing-idea-negative-blast-radius) applied to
knowledge: solve it once, well, and let every downstream project inherit the improvement for free —
rather than each of them inheriting only the *advice* and paying to implement it again.

## Open questions

- What is the right marker syntax, and should it be tool-agnostic (HTML comments work in Markdown
  and are invisible when rendered)?
- Does the `core` tier want to be boolean, or a small ordered set (`core` / `reference` / `internal`)?
- Can the size gate be expressed in tokens rather than bytes without pulling a tokenizer into every
  project's test suite? Bytes/4 is a serviceable proxy; is it good enough?
- Is the naming harness worth sharing as a package, or is it inherently per-vocabulary?
- What is the cheapest useful version of all this for a small project — the 20% that gets the 80%?
