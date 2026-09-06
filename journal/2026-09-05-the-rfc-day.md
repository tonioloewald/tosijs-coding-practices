# The RFC day — consumer evidence reshapes the tooling

*2026-09-05. Outcome review due ~2026-09-20 — see predictions at the end of the 09-06 entry.*

## What happened

The release-practices RFC (#10) and its sibling threads (tosijs-ui#61, #131) accumulated
consumer answers from across the ecosystem — every repo answering "what do you actually do
today, and what would have saved you something." The standout was manta-recon's answer as a
pure consumer: five real failures across nine upgrades, scored against both proposals —
four of five pointed at the smoke lane, zero at stabilization branches. Its later synthesis
split "ceremony" into **judgement ceremony** (caught nothing, measured) and **fact checks**
(paid every time one existed), which became the organizing distinction for everything after.

Harvested into the corpus the same day: peers are a contract not a detector; own-it vs
require-it dependency packaging (decided by who is on the other end); registry reads lag
publishes; an ignore rule protects a path, not a secret; dogfood is blind to packaging *by
construction*; fail loudly / degrade honestly (25% of one backlog was silent failure).

Tooling changes: `release-doctor` gained the shipped-imports-declared scan (files vs
manifest, nominated independently by two threads) and `--prefer-online` on registry reads;
`tools/scoreboard.ts` now generates the README scoreboard's fact columns (Version, "As of")
from the registry and GitHub — the prose columns stay written. First run refreshed 13 rows
and caught real drift.

Process changes: the review lenses were reframed as **cascades** (facts gate judgement;
each judgement question must name its trigger fact and settling fact), then immediately
course-corrected by the owner — *don't lengthen the review* — into the **AAR loop**: per
release, a 3–6 bullet after-action report (facts only); quarterly, one bounded analysis
pass that mines them. Guard rail: **the series must converge** — process changes originate
only in that batch, each batch names what it retires, unverifiable benefits get reverted.

Direction set: the practices site becomes a navigation hub (scoreboard as front end, books
as depth), implementation split into **policies (this repo) vs system (tosijs-ui)** with
the metadata contract as the seam; this repo volunteered as first adopter of the RFC's
site branch (greenfield — proves the config, not the migration).

## Why it matters

The consumer evidence relocated the whole release-practices debate: the site branch and
fact checks survive on measurement; version branches survive only on the producer-side
decision-tax argument. And the judgement/fact distinction generalized into the day's
second principle: **laziness with the right sign** — doing less work counts only if it
saves downstream work too; friction that has become invisible through habituation is the
dangerous kind.
