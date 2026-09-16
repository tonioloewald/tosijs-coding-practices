# Opposite universes, converging requirements

*2026-09-07. Owner observation on [tosijs-ui#142](https://github.com/tonioloewald/tosijs-ui/issues/142)
— the second clean instance of a pattern worth naming.*

Twice now, an emerging requirement from the **3D / game-dev side** has filtered into the
**enterprise-UI side** because the two have similar needs converging from seemingly
opposite universes — and each time the result was profitable cross-fertilization: time
saved, problems solved in both domains, infrastructure neither would have justified alone.

**Instance one: UI schematics.** The requirement to surface both a flat DOM UI *and* a 3D
scene for agent debugging — screenshots throttle, WebGL lies, a hidden tab reports zero
geometry — came from the 3D side's much harsher observability demands. What it produced
generalized immediately: agent-surface schematics, haltija's screenshot→schematic
fallbacks, and eventually `tosijs-floorplan` as a standalone renderer consumed by the flat
side. The unified "one substrate, many consumers" UI requirement meant the 3D-driven
solution was a DOM solution for free.

**Instance two: test fences (#142).** Doc-site test fences are an enterprise-UI docs
feature. Their promotion case — the report arguing they should be the primary
component-test tier — was written by `tosijs-3d-ensemble`, the ecosystem's harshest
substrate (WebGL, async library loads, "a renderer that will lie to you if you ask it the
wrong way"). The conversion found two defects in the README's most-read example within a
minute, surfaced a **pair-wise** behavior (skybox takes ownership of the day/night cycle,
so `sun.intensity` becomes a multiplier) that per-component testing structurally cannot
express, and mapped the tier's honest boundary (fences replace the browser lane, not
`bun test`). The flat-UI side gets a matured, boundary-mapped testing tier; the 3D side got
its bespoke Playwright lane deleted.

## The shape

The game side is the **extreme consumer**: its requirements arrive earlier and harder
(real renderer, real geometry, real time), so meeting them produces general solutions
rather than special cases — while the enterprise side supplies the substrate (doc system,
component model, agent surface) that makes the general solution cheap to land. This is the
already-recorded "N consumers hardening a shared substrate" dynamic, but with a
directional refinement: **the harshest consumer is the requirements generator, and its
requirements generalize downhill.**

Two consequences worth holding:

- **Strategy validation**: tosijs-3d and the game projects are not a hobby track beside
  the platform — they are where the platform's next requirements come from. When pricing
  investment on the 3D side, count the enterprise-side dividends; both prior instances
  paid there.
- **Watch for the third instance** — likeliest candidates: ensemble's fact-ledger /
  capability needs meeting lukko's capability security, or ariosto's writing-room
  scoped-knowledge model meeting the agent surface's expose-nothing-by-default. If a third
  lands, this stops being a pattern and starts being a pipeline.
