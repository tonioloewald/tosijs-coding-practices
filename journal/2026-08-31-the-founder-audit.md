# The founder audit

*Journal entry, 2026-09-01. Written by the session agent at the owner's request: a record of a
conversation that ran, off and on, from mid-July to the first of September — beginning as
repository housekeeping and ending somewhere else entirely. Source material for what may become
"The Blind Polymath." The owner should edit before this ships anywhere.*

---

## What happened

A session that started with `/init` in the practices repo became, over six weeks, the ecosystem's
most sustained exercise in pointing its own instruments at itself. The arc, compressed:

1. **Housekeeping found drift everywhere the process predicted it.** Prose↔tool divergence
   between `review.md` and the runnable workflow — in *both* directions, each copy holding
   improvements the other lacked. A scoreboard that disagreed with npm on six rows. The lesson
   that a second copy of anything WILL diverge got written into `tools/README.md` and then
   promptly re-proven by a third copy on another machine (pinned to an old model, for reasons
   that had expired).

2. **A weekly security sweep was instituted, and its first run earned its keep**: every serious
   finding lived in nested workspaces a root-only audit would have called clean, and three
   *different* publish-integrity failure modes surfaced (tagged-never-published,
   published-from-unpushed-tree, dist-tag drift). Most of the majors were fixed within the week —
   the sweep→issue→fix loop demonstrably works.

3. **The user base was measured instead of assumed.** Both prior estimates — zero and 100,000+ —
   turned out to be artifacts of the same broken instrument (npm's search API silently ignores
   the `dependencies:` qualifier). The real numbers: download counts fully explained by
   mirror-noise floors (~50–250/month) plus the ecosystem's own CI; zero external dependents;
   zero non-owner issues ever filed; CDN "traffic" that per-file analysis revealed as a crawler
   enumerating `.d.ts` files. The two real consumers were invisible to every public instrument
   and known only to the owner — *for private usage, asking the owner is the instrument.*
   Result: "Responsibility scales with the MEASURED user base" became practice, and the phrase
   "process cosplay" entered the vocabulary.

4. **Then the instruments turned on the founder.** At the owner's request, ~3,000 of his own
   messages across every project transcript were mined for two audits nobody usually runs.

## The strengths audit

Four capabilities with strong evidence and no self-awareness trail:

- **Executive leadership of the agent fleet** — altitude control, bounded-risk delegation
  ("fix anything that doesn't add risk; otherwise file"), precisely-reserved chokepoints,
  credit given specifically and blame absorbed structurally. Self-described as "trying to stop
  it dissolving into chaos"; described by the evidence as the load-bearing skill.
- **Perceptual direction** — translating lived experience into engineering targets ("whiteout
  by the time the camera hits the cloud edge"; "fog distance should be about a terrain tile").
  Filed by its owner under his known weakness (art), where it doesn't belong.
- **Experimental method** — measure-the-source, one-step bisections, blind harnesses for
  naming, controlled A/Bs on his own perception. Practiced constantly, named never.
- **Mechanism design** — every irritation becomes a self-enforcing rule; the coinages
  ("negative blast radius," "patch scar tissue," "teachable errors") function as executable
  policy for a dozen agents. Attributed by their author to common sense.

## The blindspot audit

Five patterns, each a strength running without a counterweight:

1. **The institution audits everyone except the founder.** Owner assertions become law in one
   utterance; corrections happen only when reality collides with them.
2. **The rulebook has no reverse gear** — measured at 20:1 additions to deletions, zero entries
   ever retired, ~2,500–3,700 lines/month of growth.
3. **The one manual chokepoint (publishing) is the most failure-prone component.** *Corrected
   in discussion*: a ~48-hour experiment with fully-automated publishing once produced more
   broken releases than the entire manual history — manual fails toward unavailability,
   automation toward integrity, and those aren't symmetric. The surviving finding: the failures
   are *reconciliation* failures, and the missing mechanism is divergence detection, not a
   different trigger. (Now recorded as a design constraint in `publishing-via-oidc.md`.)
4. **The distribution hypothesis was never tested** — by the person best equipped to test
   anything. Refined in discussion into something sharper: in a post-AI ecosystem, adoption may
   be driven by agent-legibility rather than human familiarity (the Zod conjecture), and
   agent-channel verdicts are cheap to sample. The experiment is now the opportunity.
5. **"No users" mispriced the heaviest real user** — the owner and his fleet. Narrowed in
   discussion: the protections are for future adopters and for posterity, and the security
   dimension is now mechanically covered by the sweep.

## The resolution

Six strategic questions were put on the table and answered with positions. The compressed
outcome, in the owner's words: **"If I ship ariosto and manta they kind of prove the chain.
Everything else is interesting because it led there."** The pointy end schedules the pyramid;
the infrastructure earns its keep by advancing the chain. Adjacent moves, in service of that:
package the AJS VM standalone (already exportable — packaging, not surgery), run the
agent-adoption experiments, hold presence in the agent-accessibility standards window, and
write the methodology down — it is the one asset with no prior distillation to steal.

On method, one exchange worth preserving: decades of winning good-faith debates is weaker
evidence than independent convergence (the industry walked to fine-grained reactivity a decade
after b8r held the position) or a harness verdict. Experiments are the only interlocutors
rhetoric can't beat — and the emerging agent ecosystem is the first arbiter in the owner's
career that is both careful and cheap to query.

## What changed in the repo because of this conversation

- `releasing.md`: measured-user-base calibration, land-the-plane, the instrument catalog with
  failure modes, the publish-automation design constraint.
- `review.md` + tools: reviewer-context isolation, lens-7b footprint measurement, lens-8
  commit-range and read-direction checks, report-filing-first.
- `development.md` / `testing.md`: fan-out practices (serialize understanding, pilot the
  harness, isolate the fleet), suite-as-contract.
- `cross-project.md` / README: link-don't-paraphrase, freshen-before-read.
- `CONTRIBUTING.md` (with this entry): evidence grades, composition review, retirement
  discipline — the folklore audit made standing policy.

## Open work spawned

- **The folklore review**: classify every practice entry by evidence grade; review the decrees
  and the untested; check rule *compositions* (known instance: version-by-narrative ×
  review-on-minors → minor avoidance → version-number corruption).
- **Nine-lens economics**: find where the value concentrates; split into an always-on cheap
  tier, an efficient batch tier, and candidates for retirement; decouple review triggering
  from version arithmetic.
- **The site**: this repo as a tosijs-ui self-hosted doc site, vending two books — the
  practices, and this journal.
