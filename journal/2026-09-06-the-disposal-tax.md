# The disposal tax

*Evicted from `practices/dependencies.md` §13 in the 2026-09-06 mass retirement (D8: essays
move to the journal/book; the operational rule stays behind). Written ~2026-08; evidence is
external.*

Everyone evaluates **adoption cost**: how hard is it to get this in? Almost nobody
evaluates **disposal cost**: three years from now, how hard is it to get this *out*? The
maintainer's name for the second one is the **disposal tax**, and it is worth adopting
because having a name makes it askable.

Note what the question is *not*. "Can I revert the file I converted this morning?" is
`git checkout` — not a feature and not the risk. The case that matters is a hundred files
and three years in, when the reason to leave is that the team changed, the project was
abandoned, or the thing simply did not work out. That is when the bill arrives, and it is
never the moment you have budget for it.

**The counterexample proves the rule.** Languages and frameworks compete loudly on
adoption — drop it in, migrate incrementally, works with your existing code — and
essentially never on exit. Exit cost gets priced for data formats (export your data), for
cloud (egress), for licensing, and almost never for tools. The exception is **TypeScript,
whose disposal tax is close to zero.** That may be the single biggest reason it beat
CoffeeScript (which compiled to output you would not want to inherit), Flow, and Dart. Its
real pitch was *you can always leave* — and it is almost never stated that way, which is
exactly the point.

Be precise about it, though, because the shorthand overclaims. "Strip the annotations and
you have JavaScript" holds **only for the erasable subset**: `enum` emits a runtime object
with reverse mappings, parameter properties (`constructor(private x: number)`) generate
assignments, `namespace` emits objects, and `emitDecoratorMetadata` generates runtime data.
Those compile rather than strip.

Which is what makes it the *best* example rather than a caveat: **the ecosystem legislated
the disposal tax.** Node's type-stripping and TypeScript's `--erasableSyntaxOnly` exist
specifically to forbid the non-erasable constructs — a flag whose whole job is keeping you
inside the subset you can leave from. That is refuse-rather-than-degrade, enforced at
authoring time instead of discovered at exit.

And the erasability was not luck. "Types have no runtime semantics" was a TypeScript design
goal from the beginning — a disposal-tax decision made years before anyone had a name for
it — and the handful of places the language violated its own rule are precisely the places
now being walked back. The exceptions prove the principle.

**The uncomfortable corollary: value and lock-in are usually the same feature.** Everything
a tool gives you over the thing it replaces is, by construction, something the replaced
thing cannot express — and therefore something that cannot trivially come back. A
mechanical, feature-free adoption has zero disposal tax *and* zero value. A deeply
idiomatic one has real value *and* real disposal tax. They move together, necessarily. So
the bar is not *value* — it is **value net of disposal tax**.

Adoption tax is what everyone optimises. Disposal tax is what everyone pays and nobody
quotes.
