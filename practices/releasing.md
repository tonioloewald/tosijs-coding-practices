# Releasing

Every library in this ecosystem releases **locally** — there is no CI publish workflow in
any repo. That means the local build + your discipline *are* the release gate, and built
artifacts are committed to git so they must be regenerated, never hand-edited.
— seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, tjs-lang, tosijs-schema, haltija, editor2

For where the built site goes (GitHub Pages / Firebase / Cloudflare), see
[deployment](./deployment.md). This doc is about **packaging, versioning, tagging, and publishing**.

> **Publishing is plain `npm publish`. Do NOT tell the maintainer to pass `--otp`.**
> This note used to say an OTP was required. It has not been for weeks (as of 2026-09-04),
> and the stale line caused an agent to prescribe `--otp=<code>` twice in one session — the
> second time after being corrected. Release instructions get copied and run, not read
> critically, so a wrong flag here costs a failed publish and a round trip every time.
>
> The underlying situation does move — npm has been tightening tokens that bypass 2FA — so if
> publishing ever demands a one-time code again, **fix this note in the same commit** instead
> of working around it locally. The planned replacement, publishing from a tag via GitHub
> OIDC (which also removes the long-lived credential from the maintainer's laptop), is
> drafted in [publishing-via-oidc.md](./publishing-via-oidc.md). **Not yet implemented**;
> `tosijs-ui` is the intended pilot.

## Before a minor or major release: run the comprehensive review

For any **minor or major** bump, run the nine-lens
[comprehensive pre-release review](review.md#comprehensive-pre-release-review-minor--major)
**first** — correctness, efficiency, DRYness, documentation accuracy, test coverage,
developer experience, **ecosystem & abstraction health**, **practices self-review**, and
**blast radius** — each as an independent pass over `git diff vLAST..HEAD`. Runnable:
[`/pre-release-review`](../tools/README.md).

Unresolved correctness/security findings **block** the release. Route the rest by lens:
`TODO.md` for lenses 1–6, a **GitHub issue on the upstream repo** (mirrored in `UPSTREAM.md`)
for ecosystem findings, and the shared practices repo for self-review findings — never
silently drop one. Patches get a lighter correctness + docs pass. Only start the flow below
once that review is clean or its open findings are consciously deferred.

**Settle your incoming issues.** Before releasing, check what consumers have filed against you
and act on it — a release is when that debt comes due:

```bash
gh issue list -R tonioloewald/<this-repo> --state open
```

Fix what this release should fix, and **close each fixed issue naming the version** — a
downstream agent is waiting on that signal to drop its workaround. See
[`cross-project.md`](cross-project.md).

## Say what you are NOT fixing, in one place

A review produces findings. Some get fixed; the rest need a decision written down, or the
record cannot distinguish one from the other.

tjs-lang's `TODO.md` carried, verbatim:

> ### 14 majors from the re-review, not yet worked

That reads identically whether the majors were triaged and deliberately deferred, or
nobody got to them and the release went out anyway. A reader six months later — including
the author — cannot tell which, and neither can anyone deciding whether to trust the next
release's process.

> **A release whose review left confirmed findings unfixed must say so in ONE place, with
> three things: what they are, the decision, and the version they are deferred to.** An
> unannotated open-findings list is indistinguishable from an oversight, and will be read
> as one.

Three things make it practical rather than ceremonial:

1. **One place.** Split across `TODO.md`, a review report and a changelog, it is not a
   record — it is three partial records that will drift.
2. **The decision is the content.** "Deferred to 0.14.0; all in the TS converter, which no
   shipped consumer path touches" is a record. "Not yet worked" is an absence.
3. **Deferring is fine.** This does not say fix everything before shipping. It says the
   choice must be legible. The failure it prevents is not shipping with known majors; it is
   being unable to show afterwards that you *chose* to. — seen in: tjs-lang (0.13.0)

## Which number moves: version by narrative, not by semver's letter

Semver's *letter* says any backwards-compatible new functionality is a minor. Followed
literally, that inflates the version number: every small forward step becomes a release
milestone, and a library sprints through minors that mark nothing a human would call a release.
This stack versions by **narrative** instead — the number should tell a consumer *what happened*,
not *that the API grew by one function*.

- **Patch** — incremental additive work that breaks nothing: a new export, a small feature, a
  doc or dependency fix. **This is the default, even when it enlarges the public API.** You
  accrete patches while building *toward* something.
- **Minor** — a **coherent body** of new functionality landing together (the "something" the
  patches were building toward), **and/or a breaking change**.
- **Major** — reserved per the project's own threshold (pre-1.0 libraries often carry breaks in
  minors; say so in the project's `CLAUDE.md`).

The failure mode is cutting a minor because a change is *technically* additive. Don't. If you're
unsure, it's a patch — a minor is a claim that a chapter closed. — seen in: tosijs-product (six
helpers exported → 0.6.2 patch, not 0.7.0; the additive-so-minor reflex was the wrong call)

## Cutting a release (canonical flow)

1. **Bump `version`** in `package.json` (semver) — this is the single source of truth (below).
2. **Add a `CHANGELOG.md` entry** under the new version (Keep a Changelog format). Every
   product ships a changelog (see [`development.md`](development.md) "Baseline artifacts") —
   if this project doesn't have one yet, create it now and backfill coarsely from git tags.
   When an entry fixes a vulnerability present in **already-shipped** versions, **state which
   versions are affected** ("0.11.0 and earlier are affected") — a pinned downstream can't tell
   a security fix from a nice-to-have improvement otherwise, and won't know it must upgrade.
   Frame security fixes as fixes, not features.
3. **Run the tests. Explicitly. The build does not run them.**

   This step used to read *"run `bun run build` — it runs tests… exits non-zero, do not ship."*
   **That was false**, and it was the most dangerous sentence in this file. In tosijs-ui,
   `"build": "bun bin/dev.ts --build-only"` compiles and exits 0 without running a single test.
   An agent cutting a release by the book saw a green build and believed the suite had passed
   when it never ran — which is how the Playwright lane sat **red across 23 tags in ~4 weeks**.

   So: **name every lane and run every lane.** A project with three test lanes has three
   commands, and a green build is evidence about none of them. Check what `build` actually does
   before you trust it (`grep '"build"' package.json`), and if a lane is not in CI, it will rot
   silently — run it locally before every release, no exceptions.

   A second instance of the same trap: tjs-lang's fast lane (`test:fast`) sets
   `SKIP_LLM_TESTS=1 SKIP_BENCHMARKS=1`, so the benchmark and LLM tiers only run in the full
   `bun test`. A vector-search benchmark silently drifted to a **27× flake** — it asserted a 3×
   ratio on a single sub-millisecond measurement — because nothing ran that lane between
   releases. The fix was two-fold: repair the benchmark (time 50 iterations, not one), and stop
   trusting convention — make the full-suite run a **hard, enforced** pre-tag gate (see
   [Tagging](#tagging)). The lanes your fast loop skips are exactly the ones that rot, so the
   release gate must run the *whole* suite, and enforcement beats discipline. — seen in:
   tosijs-ui, tjs-lang

4. **Build** — run the project's build (usually `bun run build`). It stamps `version.ts` and
   regenerates `dist/` (+ `docs/` for doc-site projects). — seen in: tosijs, tosijs-ui, tosijs-schema
5. **Commit everything**, including regenerated `dist/`/`docs/`, with a `vX.Y.Z: <summary>` message.
6. **Tag** `vX.Y.Z` (see tagging below).
7. **Push** commits and tags: `git push && git push --tags`.
8. **Publish** the npm package: `npm publish` (the `files` field controls the tarball — usually
   just `dist/`, `LICENSE`, `README.md`).

8b. **Confirm the publish actually landed**, the same way step 3b confirms the CI runs did:
   ```bash
   npm view <pkg> dist-tags        # is the new version there, under the tag you meant?
   npm view <pkg> version          # did `latest` move — and did you MEAN it to?
   ```
   A tag in git is not a version on the registry. Measured cost: haltija had **ten of sixteen
   tags since 1.5.2 never published** — `npm view` said `1.11.2` while the repo was tagged
   `v1.11.3`. Nobody noticed because every local check (tests, build, tag, push) was green; the
   only failing step was the one nobody looked at afterwards. Releases are cumulative, so the
   user-visible damage was small — but "we shipped it" was false for a year of tags.

   Check `latest` specifically when publishing a **prerelease**: the point of `--tag rc` is that
   `latest` does not move, and the only way to know it didn't is to look.

8c. **Install what you published, from the registry, and run it.** Not the local tarball —
   `npm pack` proves the files you *have*; only a registry install proves what a consumer *gets*.
   ```bash
   cd $(mktemp -d) && npm init -y >/dev/null && npm i <pkg>@<tag>
   ./node_modules/.bin/<cli> --version    # and one real command
   ```
   For a library, import it the way the README tells people to. This is the cheapest possible
   test and it covers the class of bug no unit suite can: wrong `files`, a missing `bin`, an
   export map that resolves in-repo and not out of it, a `dist/` that was never rebuilt.
   — seen in: haltija 1.12.0-rc, where installing the candidate and importing `haltija/test`
   revealed that a module-scope singleton made a new warning fire on IMPORT — scolding callers
   who had done the right thing. Reasoning about the manifest would never have shown it.
9. **Update your row in the shared scoreboard** — the "Project scoreboard" table in the
   practices repo's `README.md`: new version, a one-line activity note, today's date in
   "As of". This is the practices repo's no-signoff carve-out, so commit directly — but with
   **`git pull --no-rebase`** (that repo inverts the rebase rule; see its `CONTRIBUTING.md`).
   Do it even for a beta/patch: a stale scoreboard is worse than none, and the row is how
   other agents (and the human) see the ecosystem at a glance.

> **Stop the dev server before you build/commit.** `bun start` continuously rewrites
> `docs/iife.js` on every change and re-dirties the tree between `git add` and `git commit`,
> so a running watcher will strand a half-committed release. — seen in: tosijs-3d, tosijs

## Version is stamped, never hand-edited

- `package.json` `version` is the ONLY place you edit. A prebuild writes `src/version.ts`
  from it and re-exports it from `index.ts`; hand-edits to `version.ts` are overwritten.
  The trap is bumping the constant and forgetting `package.json`, or vice-versa.
  — seen in: tosijs, react-tosijs, editor2, haltija
- Desktop (Tauri) builds auto-sync `package.json` version into `src-tauri/tauri.conf.json`
  on every build for the same reason — one source of truth, no drift. — seen in: lukko, kith-email

## Versioning philosophy: break toward correctness, but know who you're breaking

When a project's consumers are **all in-ecosystem** (sibling repos you control, on lockfiles/CI),
**breaking toward correctness — announced and documented, in a minor — is the right default.**
The conservative machinery (opt-in flags, deprecation windows, a whole legacy mode) is real
standing complexity that only pays for itself against a large **unknown external** base. Don't
build it speculatively. But hold three distinctions, because they change the answer in specific
cases — worked out over tosijs-schema's three breaking-in-a-minor releases (1.5.0, 1.7.0, 1.8.0):

- **The break's CLASS decides whether a "legacy-loose" escape hatch is ever acceptable.**
  A **fail-open / security** fix (the old behavior was a *hole* — `additionalProperties` not
  enforced, a prototype-key bypass) must **never** get a loose opt-in; that option is literally
  "keep the vulnerability," and these deserve the *most* aggressive treatment (GHSA-adjacent). A
  **spec-conformance** tightening (accepted more than the spec but leaked nothing — `date-time`
  → RFC 3339) *may* carry a loose opt-in if you want one. Scope any escape hatch to the
  conformance class only.
- **The trigger for "deprecate-then-major" is break FREQUENCY, not just external consumers.**
  Even in-ecosystem, a consumer would rather absorb one `2.0.0` migration than a trickle of
  surprise minor breaks. Rare breaks → minors are fine. If you notice you're shipping a breaking
  minor every few weeks, batch them into a major (loose defaults deprecated-but-working in
  between) to cut the drip — regardless of who consumes.
  - **But the batch trigger is subordinate to the CLASS distinction above: a fail-open fix
    cannot be batched.** Batching means "loose defaults deprecated-but-working in between" —
    which for a fail-open hole is exactly the forbidden opt-in ("keep the vulnerability" for
    the length of the deprecation window). So when the frequency trigger fires on a run of
    breaks that are *mixed* class, batch the conformance-class ones and **ship the fail-open
    ones now anyway** — the disposition is "ship now, cannot batch," and it should be recorded,
    not left as a silent contradiction of the frequency rule. tosijs-schema tripped this at
    1.8.0: three breaking minors (1.5.0, 1.7.0, 1.8.0; the last two four days apart) crossed
    the frequency line, but 1.5.0 and 1.8.0 were fail-open closures that had to ship promptly,
    and only 1.7.0 (a `date-time` conformance tightening) was ever batchable. Frequency alone
    would have said "hold for a 2.0.0"; the class rule overrode it.
- **"No significant external consumers" is an assumption, so keep validating it.** The whole
  policy rests on it. The nine-lens review's lens 7b now glances at npm downloads + GitHub
  dependents on a breaking release ([`review.md`](review.md) §7b) so a footprint that quietly
  grew gets noticed *before* a break bites someone.

— seen in: tosijs-schema (versioning policy in its README, breaking-in-a-minor 1.5.0 + 1.7.0 +
1.8.0; the 1.8.0 review recorded the "ship-now-cannot-batch" disposition when the frequency
trigger fired on mixed-class breaks).

## Responsibility scales with the MEASURED user base — don't cosplay Firebase

Code quality and correctness are unconditional — they are for the code and for us, and no
audience size changes them. **Release-process *worry* is not unconditional**: anxiety about an
rc briefly exposed as `latest`, an unpublished tag, or a breaking minor is proportional to the
**measured** consumer base, not an imagined one.

- **Measure, don't imagine — and know each instrument's failure mode.** Raw npm downloads are
  the WEAKEST signal: every published package collects ~50–250/month of mirror/scanner noise
  (measured: a package with zero plausible consumers drew 245/month), and an ecosystem's own
  CI, cloud agent sessions, and transitive dependency edges generate thousands more — the
  weekly sweep alone installs every package. Instruments that actually distinguish, weakest to
  strongest: per-version download shape (scanners pull *every* version — 58–111 distinct
  versions/week downloaded is a crawler signature; a top version three majors stale is
  machines, not humans); jsDelivr hits — but read the **per-file** breakdown
  (`data.jsdelivr.com/v1/stats/packages/npm/<pkg>@<ver>/files`), not the total: a crawler
  enumerates the whole file tree evenly (measured: 2,160 hits/month on one stale version,
  4–5 per file including `.d.ts` and icon-data files — a bot, and most of the package's
  apparent CDN traffic), while a real script-tag audience concentrates on the published
  bundle (`dist/iife.js`) at a current version; GitHub dependents graph (`/network/dependents`, subtract your own repos); GitHub
  code search for the package in external `package.json`s; and strongest, **humans** —
  non-owner issue/PR authors. ⚠️ **The npm search API silently does not support
  `dependencies:<pkg>`** — it free-texts the query and returns garbage: measured 187,439
  "dependents" for tosijs-ui and 0 for tosijs *in the same minute*. Both of the wild consumer
  estimates that prompted this measurement (zero / 100k+) trace to that one broken query.
- **Baseline, measured 2026-08-25:** on the *public* instruments, the only identified external
  usage is **a friend of the owner who kicked AJS's tires early on** (two experimental repos
  consuming tosijs + tosijs-schema); **zero** external repos in any GitHub dependents graph;
  **zero** non-owner issue or PR authors ever, on any repo (dependabot aside). **But the public
  instruments missed real consumers:** per the owner, **Nonono** (his previous startup) and
  **Snowfox** use(d) **tosijs and tosijs-ui** in production, in private repos — invisible to
  every instrument above. So: tosijs and tosijs-ui carry real production responsibility (to
  *known, contactable* organizations — a known counterparty can absorb a coordinated break in a
  way an anonymous base cannot); the rest of the ecosystem remains measured-zero. The
  methodological lesson: **the instruments only see public surface — for private/commercial
  usage, the owner's own knowledge is the instrument. Ask before concluding zero.** Download counts are fully explicable by self-generated traffic + noise.
  The *internal* base is the real one: 21 in-ecosystem manifests (tosijs ×17, tosijs-ui ×16,
  tjs-lang ×8, tosijs-schema ×7, haltija ×4 as a dependency plus CLI use everywhere).
  Absence can't be proven (vendored copies, CDN script tags, and private repos are invisible)
  — so re-measure at each decision rather than caching this conclusion.
- **Severity scales with audience; SEQUENCING does not** (amended 2026-09 — the practices
  audit found the original wording pre-graded the ecosystem's most-recurring defect class as
  ignorable, self-fulfillingly: unlanded releases prevent the consumers that would raise the
  grade). On a zero-consumer package a publish-integrity slip is still not an *incident* —
  but "Land the current release before starting the next" outranks this calibration: a
  tag/publish/tree divergence **always blocks further version work on that package** until
  reconciled. `tools/release-doctor.ts` makes the check mechanical. Don't grade it major,
  don't build ceremony against it — just land the plane before touching the throttle again. Reviews and
  sweeps should grade breakage/publish-state findings **against the measured base**: major on a
  package with real users, notable on one without.
- **The error is live in both directions, and the same instrument fixes both.** Assuming users
  you don't have is **process cosplay** — Firebase-scale caution without Firebase-scale users,
  a standard the Firebase team itself doesn't hold (they break things; see their changelogs).
  Assuming you still have none after the footprint quietly grows is how a break finally bites
  someone. Both errors are cured by checking the numbers, not by defaulting to fear or bravado.

— rule set by the owner; baseline measured 2026-08-25 (instruments above) and zero breakage
complaints ever received across the ecosystem

## Breaking changes: justify, document, migrate

Removing or changing public API imposes a cost on every consumer. Before you ship one, all four:

1. **Prefer deprecation over breakage.** Keep the old name working and warn once (see
   [code-quality.md](code-quality.md)). This stack removes APIs slowly *on purpose*.
2. **Justify it.** A break should buy something a deprecation can't. An **incidental** break —
   an API removed because it was in the way of a refactor — is the kind consumers resent.
3. **CHANGELOG entry naming exactly what broke.** A release that removes public API with **no
   CHANGELOG entry is a trap** — and it's an easy one to ship, because the code compiles fine.
4. **Migration notes, reachable from the artifact the consumer installed.** Tell them
   precisely what to change, before → after, in a table.

   The **destination is project-shaped, not universal**: a `Migration.md` in `docPaths` is
   the convention for the tosijs/tosijs-ui _sites_, because that is where their consumers
   read. A library whose consumers live in `node_modules` needs it in the published tarball;
   a CLI needs it where `--help` can point. What generalises is the test:

   > Can a consumer who has **only what they installed** — no repo checkout, no site visit —
   > find the migration table? If not, it doesn't exist for them.

   tjs-lang failed exactly this and it was invisible for releases: it shipped `llms.txt`, an
   agent-facing index, with **29 of its 43 links 404 in the tarball** — including the doc it
   names as the thing to read first, and the CHANGELOG. The guard test resolved links against
   the repo root, so it certified an artifact nobody installs. **Check relative links against
   the packed artifact** (`npm pack --dry-run --json` gives you npm's own file list); link
   anything that deliberately doesn't ship — roadmaps, backlogs, agent checklists — absolutely
   on the repo host instead.

**Deprecation aliases only protect the JS import surface.** Three break classes slip past a
warn-once alias entirely, because nothing resolves them by name at runtime — plan migration
notes around these specifically:

1. **Custom-element tag names.** Renaming `<xin-select>` → `<tosi-select>` leaves every CSS
   selector and `document.querySelector('xin-…')` silently matching nothing. In one consumer a
   stale `querySelector` made an editor handle permanently `null`, so "insert asset into editor"
   quietly degraded to "copy to clipboard" — no error, anywhere.
2. **CSS custom properties.** `--xin-tabs-*` → `--tosi-tabs-*` just stops applying. No warning
   exists for a variable nobody reads.
3. **A public property whose *type* changes in place.** tosijs-ui 1.7 turned `codeEditor.editor`
   from an ACE `Editor` into a CodeMirror `EditorView` under the same name — a grep for removed
   names can't find it, and the alias mechanism has nothing to hang a warning on.

So: **type-only changes and name-identical changes need a CHANGELOG line and a `Migration.md`
table even more than removals do** — the removals are the ones consumers actually notice. Give
consumers a mechanical way to find call sites (e.g. "diff your `xin-*` tags against the tags we
register").

— seen in: tosijs (`Migration.md` in `docPaths`), tosijs-ui (1.7 dropped `<tosi-code>`'s
pre-1.7 ACE theme/options props; 1.7 `xin-*` → `tosi-*` rename), loewald-dot-com (consumer side)

## Build artifacts: ship multiple formats from one entry

Publish a bundler-friendly ESM build **and** a self-contained build, plus types:

- **ESM** (`dist/module.js`) with `tosijs`/`tosijs-ui`/`react` marked **external** — consumers
  using a bundler share one framework copy instead of shipping duplicates. Declare framework
  deps as `peerDependencies`, not `dependencies`. — seen in: tosijs, tosijs-product, editor2, react-tosijs, tosijs-schema
- **IIFE** (`dist/index.js`) with everything bundled — a plain `<script>` / CDN page gets a
  zero-build global (`globalThis.tosijs*`). — seen in: tosijs, tosijs-product, editor2
- **`.d.ts`** via `tsc --emitDeclarationOnly` (or `emitLibrary:true` in the site config, which
  runs tsc for you so there's no separate invocation to forget). — seen in: react-tosijs, tosijs-product, editor2, tosijs-3d, haltija
- Wire all of this in the `package.json` `exports` map with `import`/`require`/`browser`/`types`
  conditions so each consumer resolves the right file. — seen in: tosijs-schema, editor2, react-tosijs

> **Flatten the `.d.ts`.** `tsc` nests declarations under `dist/src/`, so `package.json`
> `"types"` won't resolve until you `mv` the entry types up to `dist/` root. — seen in: tosijs-product, editor2

For a browseable published library, ship **per-file, unminified** JS + sourcemaps with
`removeComments:false` (a `tsconfig.build.json` override; keep root `tsconfig` on `noEmit`) so
consumers and agents read real source with `/*# */` doc blocks intact. — seen in: tosijs-3d

### A per-file build must write `.js` in its import specifiers

If you ship **per-file** rather than bundled, every relative specifier in the source survives
verbatim into the published JS — so `from './thing'` reaches the consumer, and **Node's ESM
resolver rejects it** (`ERR_MODULE_NOT_FOUND`). Bundlers resolve extensionless specifiers;
Node does not. The same applies to deep package subpaths (`@babylonjs/core/Misc/observable`)
when the dependency publishes no `exports` map.

Write the extension in the source — `from './thing.js'`, the TypeScript convention. `tsc`
passes it through and bundlers resolve it fine, so it is correct everywhere and costs nothing.

**Why nobody catches it:** every loop in this stack is a bundler or Bun — dev server, doc site,
tests, games — so the one consumer that would notice is the one nobody runs. Bundling hides it
entirely, which is why `tosijs` has never hit it despite 293 extensionless imports in its
source. — seen in: tosijs-3d-ensemble (shipped it three times), tosijs-3d (394 in `dist`)

Two things make it stick:

- **Test the SOURCE, not the output** — assert no extensionless relative specifier exists, so it
  fails at authoring time instead of after a publish.
- **Verify by installing the tarball into an empty directory and importing it under `node`.**
  Both projects found this only that way. Reading the build output does not surface it.

> **Resolving is not evaluating.** Once resolution is fixed, a browser library may still die on
> `HTMLElement is not defined` because importing the barrel registers custom elements. If pure
> modules were split out to be usable headlessly, they need **subpath exports** to actually be
> reachable — otherwise the only door is the barrel, and the split bought nothing.
> — seen in: tosijs-3d (`tosijs-3d/light-settings`)

## Track bundle size on every release

The whole selling point of these libraries is being small, so make size regressions visible:
gzip the built entry and print the size as a build/pack step (`gzip -9 -k dist/index.js`, or
`zlib.gzipSync` in the build script), then delete the temp artifact. — seen in: tosijs-schema, editor2

## Regenerate generated files, then verify they're in sync

Built output (`dist/`, `docs/`, `version.ts`, `llms.txt`, generated docs) is committed and
shipped. Never hand-edit it and never revert its large diffs — rebuild instead. To catch stale
artifacts, rerun the generator and fail on a dirty tree: `bun run build && git diff --exit-code`
over the generated paths. — seen in: haltija, tosijs-ui, tosijs, tosijs-3d, tosijs-product

- If a project also generates docs from executable code (`bun examples.ts > examples.md`),
  that regeneration belongs in the same publish gate so docs can't drift from behavior.
  — seen in: tosijs-schema, haltija
- A generated file the gate doesn't cover WILL ship stale: tosijs-schema's `dist/context.md`
  (bundled agent-facing docs) sat outside `pack` and shipped stale in the published 1.4.0
  tarball; the v1.5.0 review caught it. Prefer the list-free gate: full build, then
  `git status --porcelain` must be empty before tagging. — seen in: tosijs-schema (v1.5.0 review)

- **A drift gate built on "regenerate + `git diff`" protects only GENERATED artifacts** — a
  hand-maintained field it *names* is false assurance. tosijs-schema's `llms.txt` version header
  read `v1.5.0` through v1.5.1 and v1.6.0 while the release checklist listed "llms.txt version"
  as gate-covered: `pack` never regenerated the file, so a forgotten hand-edit produced no diff
  and the gate passed on a wrong value. Either GENERATE the field (stamp it from the single
  source of truth — tosijs-schema now stamps the header from `package.json` in `make-context.ts`)
  or drop it from the gate's claimed coverage. — seen in: tosijs-schema (v1.6.0 review)
- **Ship the escape hatch in the SAME release as the tightening**, not one later. When a release
  tightens a default that fails consumers on install, the sanctioned alternative must land
  atomically with it — otherwise the accidental old behavior is load-bearing with no replacement.
  tosijs-schema 1.5.0 enforced `additionalProperties` with no way to spell an intentionally-open
  object; the `.open` relief didn't arrive until 1.6.0 — one full release of consumer pain (see
  its issues #4/#5). Sharpens the "stricter = breaking" rule above. The clean positive
  counterpart: tosijs-schema 1.7.0 tightened `format: 'date-time'` to RFC 3339 AND shipped the
  `format: 'date'` remedy (+ `s.date` builder) in the same release — tighten-and-relief atomic,
  break announced with a migration table. — seen in: tosijs-schema (1.5.0→1.6.0 negative, 1.7.0 positive)
- For rebases/merges over committed generated files, mark them `merge=ours` in `.gitattributes`
  and run `git config merge.ours.driver true` once per clone, then rebuild — resolving those
  conflicts by hand is pointless since the next build overwrites them. — seen in: tosijs-ui

## One `[release] vX.Y.Z` commit per version

tosijs-3d's 0.8.0 accumulated **three** commits all titled `[release] v0.8.0`,
none tagged, because work kept arriving after the first one was written. The
cost is that the release has no readable provenance: nobody can say which tree
0.8.0 *is*, and any gate that ran, ran against one of three different trees.

It is not bookkeeping. That release's one BLOCKER was a direct consequence — a
⚠️ Breaking note written in the first "release" commit said four widget families
were *not* migrated, and the commit that migrated them never revisited it. The
stale sentence survived because the release commit happened before the work it
described.

If more work lands, **amend or re-title**. A release commit is a claim that the
tree is the release; make it once, last.

## If the release renames anything, sweep the docs and demos

A rename is only done when the corpus that teaches it is done too. At tosijs-3d
0.8.0 the flagship `/ui/` page still taught the deprecated spelling on eight
call sites — and one of them, `iconGrid3d({onSelect})`, was **silently dead**
rather than deprecated, because that widget had only ever had the new name. The
page documenting the fix demonstrated the exact bug the release was cut to
eliminate, and every visit printed deprecation warnings at load.

The file *had* been edited that release (its table of contents gained a link to
the new page); nobody checked its body. No lens owned the docs corpus.

One grep, before the tag:

```sh
# for each spelling the release deprecates
grep -rn 'onSelect:' src/docs/ demo/ src/*.ts
```

Include `/*# */` doc comments — in a literate-programming setup that is where
the examples live, and it is not type-checked, so nothing else will catch it.

## Tagging

**Land the current release before starting the next.** If the current version's tag is not
pushed and its publish not confirmed on the registry, do **not** bump the version, create the
next tag, or move any tag — reconcile first. Stacking a new version on an unlanded release
forks the record three ways (working tree, tags, registry), and every observed
publish-integrity failure in the ecosystem grew from that state: releases tagged but never
published (tosijs-ui 1.10.1/1.10.2), a release published from a tree whose commits and tag
were never pushed (tosijs-timezone-picker 0.6.0), and a dist-tag left pointing at a
superseded pre-release (tosijs-3d `next`). "Confirm the publish landed" (below) is the check;
this rule is the ordering that keeps the check meaningful. — seen in:
tosijs-timezone-picker, tosijs-ui, tosijs-3d (weekly sweep findings); rule set by the owner

**A tag is part of publishing, not a step ahead of it — and never fix an unpublished tag with
a new version number.** The rule above says land the current release before starting the next;
this is its other half, for when the "release" never left the machine. tosijs tagged `v1.10.0`,
found two defects before publishing, and cut `v1.10.1` for them — then a subsequent additive
change made `1.11.0`. Three version numbers, npm still on `1.9.2`, nothing shipped. Each bump
was individually defensible (semver says a fix is a patch, an addition is a minor) and the
aggregate was pure inflation, because **semver describes what CONSUMERS observe between
releases, and consumers had observed none of it.** An unpublished tag has no audience to
protect compatibility for.

So: if the version is not on the registry, **amend it** — fold the fixes into the pending
number, delete the redundant tags (`git tag -d` plus `git push origin :refs/tags/vX.Y.Z`),
and let the single published version carry the whole story. Check before deleting anything:
`npm view <pkg> versions --json`. Deleting a tag someone could have installed is a different
and much worse act than deleting one that names nothing. — seen in: tosijs 1.10.0/1.10.1/1.11.0
(2026-09-04); rule set by the owner

Tag `vX.Y.Z` at the release commit and push tags. **Contradiction in the ecosystem:** some
repos use **lightweight** tags (tosijs, tosijs-ui), others use **annotated** tags (tosijs-3d,
haltija). Rule of thumb: prefer **annotated** (`git tag -a` — it carries a message and date);
otherwise follow the existing tag style in that repo, don't mix.

For npm **pre-releases**, `npm publish --tag beta` is mandatory — without the dist-tag npm marks
the beta as `latest` and a bare `npm install <pkg>` pulls it. Pair it with
`gh release create --prerelease`. — seen in: haltija

**Enforce it, because this paragraph did not.** The rule above was here, correct and
unambiguous, when tosijs published `1.8.0-rc.2` without the flag — `latest` moved to a release
candidate and every `npm i tosijs` served it until someone looked. A rule you have to remember at
exactly one moment, months apart, under the mild adrenaline of shipping, is a rule that will be
forgotten. Same argument as the pre-push gate below: discipline rots, enforcement doesn't.

The guard is ~20 lines in `prepublishOnly`, and npm hands you the signal:

```js
// npm sets npm_config_tag for a NON-DEFAULT --tag. `latest` is the default, so
// `--tag latest` is indistinguishable from no flag — the override needs an env var.
// bun does not set it at all (see below).
const isPrerelease = pkg.version.includes('-')
const tag = process.env.npm_config_tag
const bun = (process.env.npm_config_user_agent ?? '').includes('bun')

if (isPrerelease && process.env.ALLOW_PRERELEASE_ON_LATEST !== '1') {
  if (tag == null && bun) { /* warn: cannot be checked under bun, verify after */ }
  else if (tag == null || tag === 'latest') { /* explain, exit 1 */ }
}
```

**It must not block a correct `bun publish --tag rc`.** bun does not set `npm_config_tag`,
so a guard that only reads that variable refuses every correct bun publish and tells the user
to run the command they just ran. Every sibling repo here publishes with bun. Hard-block only
where the signal is trustworthy; degrade to a loud warning where it is not, and lean on the
post-publish `dist-tags` check as the backstop.

Verify that against `npm publish --dry-run` **both ways** before trusting it, rather than taking
it from the docs — the whole guard rests on that one environment variable.

Three scoping decisions worth copying:

- **Give the override a channel that is actually observable — NOT `--tag latest`.**
  ⚠️ This document previously said "allow `--tag latest` explicitly", and the snippet above
  cannot implement it: **npm exports `npm_config_*` only for NON-DEFAULT values, and `tag`'s
  default is `latest`**, so `npm publish --tag latest` leaves `npm_config_tag` unset —
  indistinguishable from omitting the flag, and refused by the same branch that told the user
  to run it. The only escapes were `--ignore-scripts` or deleting the hook, both of which
  disable every publish gate permanently. Verified against npm 11.18.0.
  Use an env var, which survives into the script env: `ALLOW_PRERELEASE_ON_LATEST=1 npm publish`.
  The principle stands — the guard stops the accident, not the decision — but "say it out loud"
  needs a channel the hook can hear.
- **A stable release with no `--tag` must pass untouched.** That is the ordinary path and it has
  to stay frictionless, or the guard becomes something people work around.
- **`prepublishOnly`, not `prepack`** — it fires for `npm publish` and not for `npm pack`,
  `bun pm pack`, or an install. Narrowest hook that covers the mistake.

Put the recovery commands in the failure message. The moment you most need
`npm dist-tag add <pkg>@<version> <tag>` is the moment you have just discovered you need it, and
it is fixable without unpublishing:

```
npm dist-tag add <pkg>@<prerelease> rc
npm dist-tag add <pkg>@<last-stable> latest
```

— seen in: tosijs 1.8.0-rc.2 (`bin/check-publish-tag.ts`)

### Enforcing the full-suite gate at the tag (pre-push hook)

Discipline ("run every lane before you tag") rots; enforcement doesn't. But **git has no
`git tag` hook** — there is no client-side hook that fires when a tag is created. The tag's
push is the enforceable moment, and it's the right one: publishing happens from the pushed tag,
so gating the tag's *arrival at the remote* gates the release. You can create a local tag
freely; you just can't ship one with a red suite.

A `.githooks/pre-push` (wired via `git config core.hooksPath .githooks` in the `prepare` script)
does it. `pre-push` receives one line per pushed ref on **stdin** — `<local-ref> <local-sha>
<remote-ref> <remote-sha>` — so the hook: (1) reads stdin; (2) runs the full suite only if a
line's local ref matches `refs/tags/*` **and** its local sha isn't all-zero (all-zero = a tag
*delete*, skip it); (3) exits 0 immediately for branch/`main` pushes, leaving normal development
untouched. If the suite needs an external service (tjs-lang's needs a local LLM server), the hook
**preflights reachability** and refuses early with a clear message rather than dumping a wall of
failures. Escape hatch: `git push --no-verify`, and **only** for a tag whose suite you've already
run green another way — never to dodge a real failure. — seen in: tjs-lang (`.githooks/pre-push`)

## Who pushes and publishes — check before you act

**Contradiction:** the default "landing the plane" rule treats `git push` as the definition of
done (below), but some repos make `npm publish` and `git push` **human-only** — the agent runs
bump → build → verify → commit → tag and then **stops** with a standing "never publish or push
without an explicit go-ahead." — seen in: tosijs-3d, tosijs-schema

Rule of thumb: check the project's `RELEASING.md`/`AGENTS.md`/`CLAUDE.md` first. If it names a
human-only gate, stop after tagging. If it doesn't, finish the push per "landing the plane."
Never bypass a pre-push hook with `--no-verify` — fix the underlying failure. — seen in: tjs-lang

**A generated file that is committed must be added to the drift gate in the same commit that
creates it.** The gate *is* the list, so a file missing from the list is ungated no matter how
obviously generated it looks — and a written argument for why staleness is impossible is not a
substitute for a check that costs one line. Better still, don't keep a list: assert the build leaves
the tree clean (`git status --porcelain` empty after `bun run build`), which cannot omit the next
generated file. haltija shipped six committed compiled twins — the ones npm actually ships — that no
gate could see, because the drift workflow named five files all derived from one schema. — seen in:
haltija

## "Landing the plane" — session completion

A work session is **not** done until `git push` succeeds (subject to the human-only gate above).
Every session, in order:

1. **File remaining work** — add follow-ups to the project's `TODO.md` (issue tracking lives
   there, not GitHub Issues, across these repos). — seen in: tosijs, tjs-lang, haltija
2. **Run quality gates** (if code changed) — tests, linters, build.
3. **Push** — mandatory unless the repo gates it to a human:
   ```bash
   git pull --rebase
   git push
   git status   # MUST show "up to date with origin"
   ```
   > **Exception — the `tosijs-coding-practices` repo: `git pull --no-rebase` (merge), never
   > `--rebase`.** Its history must be append-only, because a rebase linearizes away a concurrent
   > edit — and there, a collision between two agents *is the signal* worth preserving. See its
   > `CONTRIBUTING.md`.
3b. **Confirm the runs the push triggered are green** — `gh run list -L 3`, or `gh run watch`.
   A push that goes red is not landed: in an agent-run repo nobody else is watching the
   notification. Measured cost: haltija's Playwright gate sat red on `main` for three commits and
   was found only by a nine-lens review a week later. (`grep "gh run"` across this repo returned
   nothing before this entry existed.) — seen in: haltija

   **Enumerate the LANES, not the last N runs, and never substitute a local run for either.**
   `gh run list -L 3` returns the three most recent runs, which on a busy push are often three
   attempts at *one* workflow — so a second, older, red lane is simply not in the output. Loop over
   the workflows by name. And "I ran the tests" is a claim about the suite you chose to run: a
   green unit suite says nothing about the e2e lane, which is precisely where a change to rendering
   or DOM behaviour shows up. — seen in: haltija 1.12.0, where a local `bun run test` was reported
   green while `e2e.yml` was red on `main` from the same commit, for the second time in one release
   cycle. The regression was real (hidden `display:none` text leaking into the affordance map), and
   the fix took four minutes; finding it took a release-readiness check that happened to enumerate
   all four lanes.
4. **Clean up** — clear stashes, prune stale remote branches.
5. **Verify** — everything committed AND pushed.
6. **Hand off** — leave context for the next session.

Do not stop before pushing (that strands work locally) and do not say "ready to push when you
are" — complete the push, or stop cleanly at the tag if the repo is human-only-publish.

Branching: commit/push only when asked; if on the default branch, branch first. Commit messages
and PR bodies follow the harness's co-author/attribution footer conventions.

## Bypassing the publish loop: where local tarballs live

Sometimes a release is tagged but cannot be published — no npm rights to hand, the owner is
remote, a registry outage, or a downstream project needs to try a fix *now*. The stopgap is
`npm pack` and a `file:` dependency. That is fine. What is not fine is leaving the artifact
somewhere only its author can find.

**Put it in a shared sibling directory of the projects that consume it**, not in a session
scratchpad, not in the producing repo (`*.tgz` is gitignored in every repo here, so it is
invisible to git *and* to anyone who clones), and not loose in `/tmp`:

    ~/projects/
      tosijs-3d/            <- produces
      manta-recon/          <- consumes
      local-packages/       <- BOTH agree to look here
        tosijs-3d-0.7.0-beta.5.tgz
        PROVENANCE.md

The whole value of a stopgap tarball is that a *different* agent, in a *different* repo,
picks it up without being told. A path that only the producer knows converts a five-second
lookup into an archaeology exercise — and worse, into a **silent duplicate**: the consumer
packs its own from the tagged tree, and now two artifacts claim one version with nothing
proving they match.

### Rules

- **One agreed location, named in both projects' `CLAUDE.md`.** Producer writes there;
  consumer reads there. Neither guesses.
- **Never a session scratchpad.** It is ephemeral, session-scoped, and unreachable by the
  one agent that needs it. If you packed to a scratchpad, copy it out before you finish.
- **Ship a `PROVENANCE.md` beside it** — tag, commit, whether the tree was clean, timestamp,
  and a `sha256`. A `file:` dep has no registry, no integrity hash and no audit trail, so
  the provenance note *is* the supply chain. State what it contains and what supersedes it.
- **Record the sha256, and check it.** If the consumer has to pack its own, comparing hashes
  is what distinguishes "byte-identical to the official artifact" from "a plausible lookalike
  built from a different tree." Do not assert equivalence you have not measured.
- **Version-suffix every file, and never overwrite one in place.** A `file:` dependency is
  cached by path; rebuilding `foo-1.2.3.tgz` with different bytes gives some consumers the
  old one and no way to tell.
- **Delete superseded tarballs** when the consumer moves on, and drop the whole directory the
  moment the version reaches npm — `bun add pkg@<version>`. A stopgap that outlives its
  reason becomes a fork nobody declared.

### Traps

- **An un-suffixed version number is not "the final release."** `pkg-0.7.0.tgz` sitting
  beside `pkg-0.7.0-beta.1.tgz` may well be *older* — an early build stamped before the beta
  sequence started. Check mtimes and the packed `package.json`, not the filename.
  — seen in: tosijs-3d (`/private/tmp/tosijs-3d-0.7.0.tgz` predates beta.1 by 15 minutes)
- **macOS `find` is BSD and silently ignores GNU predicates.** `-newermt` matches *nothing*
  rather than erroring, so `find ~ -name '*.tgz' -newermt '-2 days'` returns clean and reads
  as "there is no tarball" when there are four. Drop the time filter before concluding a file
  does not exist, and prefer `ls -lt` for recency.
- **Absence from npm proves nothing about existence.** Beta tarballs are cut *outside* the
  registry by definition, so `npm view` and `gh release list` both come back empty for
  artifacts that exist. Check the agreed directory first, the registry second.

## Traps

- **Two lockfiles.** Several repos carry both `bun.lock`(`b`) and a stale `package-lock.json`.
  Bun is canonical — use `bun`, ignore the npm lockfile. — seen in: tosijs, react-tosijs, tosijs-3d, loewald-dot-com
- **`docs/` may be gitignored, not committed.** Most repos commit `docs/`, but a few gitignore
  both `docs/` and `dist/`, so the Pages publish is an out-of-band `gh-pages` step and committing
  to `main` does NOT update the live site. Confirm per repo. — seen in: editor2 (contrast: tosijs, tosijs-3d, tosijs-product)
- **Backward-compat on API renames.** Keep old names working and emit a single `console.warn`
  per deprecated feature (tracked in a `Set` so it never spams). Renaming without an alias breaks
  consumers silently at their next install. — seen in: tosijs

## Project-specific practices

### tosijs-schema
- Gate publish behind one `pack` script wired to `prepublishOnly`, chaining the whole quality
  run so nothing ships stale: `bun test && tsc --noEmit && bun bench.ts && regenerate docs &&
  build cjs && build minified esm && emit .d.ts && show-size`. Ship only `./dist` (`files: ["dist"]`).

### kith-email (Tauri desktop DMG)
- Release via `bun run release` (`./scripts/build-release.sh`): Tauri notarizes/staples the
  `.app` but **not** the `.dmg` wrapper, so the script additionally submits the DMG to
  `notarytool` and `stapler`-staples it. Verify with
  `spctl -a -t open --context context:primary-signature <dmg>` — expect `Notarized Developer ID`.
  An un-stapled DMG is Gatekeeper-rejected even when the inner app is fine.

### haltija (npm + Electron DMG)

> **These per-project sections are DELTAS from the canonical flow above, never replacements for
> it.** Run the canonical steps; the section below only says where this project differs. A restated
> sequence silently overrides the canonical one, and the step it drops is always the last one —
> haltija's row sat fifteen tags stale because both places an agent reads when releasing it
> (`AGENTS.md` and this section) restated the flow as self-contained and ended at `npm publish`,
> so step 9 was never reached. `grep -ri scoreboard` in the haltija repo returned zero hits.

- Bump BOTH `package.json` and `apps/desktop/package.json` (the build stamps `src/version.ts`
  from the root one), then the fixed sequence: build → `bun test src/` 100% green → commit →
  annotated tag → push commits AND tag → `gh release create` → `npm publish`.
- **A schema change must be committed with its rebuild.** `bun run build` regenerates `API.md`,
  `DOCS.md`, `llms.txt`, `bin/hints.json`, and `apps/mcp/src/endpoints.json` from
  `src/api-schema.ts`; the `docs-drift` CI workflow re-runs the build and fails if any of them
  differ. Same idea as [Regenerate generated files, then verify they're in
  sync](#regenerate-generated-files-then-verify-theyre-in-sync), enforced in CI.
- **A prerelease channel NEVER MOVES BACKWARDS IN SEMVER.** Before cutting one, check that
  the new version sorts **above** whatever the channel's dist-tag currently points at:

  ```sh
  npm view <pkg> dist-tags        # what next/beta/rc points at today
  npx semver -r "^<new-version>" <that-version> <new-version>   # the new one must win
  ```

  Measured failure: `0.7.0-rc.1` was published, work continued, and `0.7.0-beta.1…6` were
  published after it. Semver sorts `beta` **below** `rc`, so `bun add pkg@next` wrote
  `^0.7.0-beta.6` and then resolved **backwards** to rc.1 — three-days-older code than the
  adopter installed — and `bun update` reported the downgrade as an **upgrade**.
  `maxSatisfying([…], '^0.7.0-beta.6')` returns `0.7.0-rc.1`; reproduce it before disbelieving
  it. The successor to `-rc.N` is `-rc.N+1`, **never** a beta.

  The existing `npm view dist-tags` check cannot catch this: the dist-tag was *correct*, and
  RANGE RESOLUTION was what went wrong. So assert the stronger property — the version you are
  about to publish is the semver-max of everything already published on that channel. Only a
  stable release un-inverts a channel this has happened to, since it sorts above every
  prerelease.

- **Betas take the same sequence with two deltas**: `gh release create --prerelease` and
  `npm publish --tag beta` (see [Tagging](#tagging) — the dist-tag is not optional). The flags
  cut both ways: pass them on a *stable* release and the version lands under the `beta`
  dist-tag, so `npm install haltija` keeps serving the previous release and nobody gets the fix.
  Decide stable-vs-beta before you type either command.
- DMG notarization is on-demand, not part of either loop; set `APPLE_API_KEY_ID` before
  overwriting `APPLE_API_KEY` or notarization fails with a JSON parse error.

## `npm deprecate` is for "you cannot get the fix by updating"

Distinct from API deprecation above (keeping an old *name* working). This is about marking a
published VERSION, and the bar is a question about **escape**, not severity:

- **Can a consumer reach the fix by updating?** Then the CHANGELOG's upgrade note is the
  proportionate channel — `latest` moving IS the fix reaching them.
- **If they cannot, deprecate.** The qualifying shape: a break in `0.12.0` where the
  consumer's range is `^0.12.0`, which under 0.x semver cannot float past `0.13.0`. They are
  stuck permanently and `npm deprecate` is the only thing that reaches them.

**"This version had a bug" is not the bar.** Every project has bugs; the ones that fix them
quickly end up with several superseded versions in a row, and deprecating each one produces
a package whose version list is mostly warnings. That reads as a project in trouble rather
than one that responds fast — and since every deprecation prints on install, spending the
signal on marginal versions teaches people to ignore it, including for the one that matters.

Three failure modes, all observed in a single release sequence (tjs-lang 0.13.x, four
deprecations across six versions, of which **one** met the bar):

1. **Momentum.** Having deprecated the previous two, the third gets recommended without
   re-examining whether it qualifies. Size the affected population *before* recommending —
   in the case that prompted this it took two minutes and reversed the answer (the defect
   needed an opt-in feature that was one release old, and the version was `latest` for 21
   hours).
2. **A range sweeping up more than you meant.** `<0.12.1` also catches every prerelease
   below it. A beta is opt-in and superseded normally; it does not need a warning. Check
   what the RANGE matches, not just the version you had in mind.
3. **Not reading the state back.** Two deprecations in that sequence silently did not
   take — one was owed at a publish and skipped, one did not run. Always
   `npm view <pkg>@<version> deprecated` afterwards. A deprecation you did not verify is one
   you did not do.

— seen in: tjs-lang

### The security case inverts the bar — and needs a channel `npm deprecate` cannot reach

Everything above is about **not** over-deprecating. A security fix is the other direction, and
the same restraint applied there produces a package that quietly points users at vulnerable
versions. Four failures, all found in one review of tjs-lang 0.13.10 and all still live at the
time (`v0.13.9..c967ec2`):

1. **Deprecate the RANGE, not the version you happened to be looking at.** One version was
   deprecated; four others carrying the same execution path were not. If the defect predates
   the fix, the affected set is `<=<last vulnerable>`, and you must establish the lower bound by
   inspection (`git grep` the vulnerable construct at old tags), not by assuming it arrived when
   you noticed it.
2. **Audit the EXISTING strings — a deprecation can aim at a vulnerable target.** Five strings
   said "Upgrade to X" where X was itself vulnerable, because each was written when X was
   current and none was revisited. A stale pointer is worse than no pointer: it is a
   machine-readable instruction to install something broken. After any security release, re-read
   every existing deprecation message on the package.
3. **`npm deprecate` does not reach `npm audit` or Dependabot — only an advisory does.** With no
   GHSA, a consumer pinned to a vulnerable version gets **zero** findings from every automated
   channel, and a deprecation notice only prints on install, which a lockfile'd CI never does.
   File the advisory; it is the only path into the tooling people actually rely on.
4. **"No known consumers" is a measurement, not an assumption — and so is its refutation.**
   That sentence justified skipping all of the above, and it shipped inside the published
   tarball, which is reason enough to fix it. But the review "refuted" it with 6,658
   downloads/month, and **that was the same error pointed the other way** — an unvalidated
   number used as evidence.

   Checked properly, the download count was almost entirely the maintainer's own CI. The
   diagnostic that settles it takes two minutes and is worth doing before ever citing a
   download total:

   - **`https://api.npmjs.org/versions/<pkg>/last-week`** — per-version. Real adopters cluster
     on `latest` and on a few recent ranges. Here `latest` had **zero** downloads while
     traffic spread across nine ancient versions, each of which matched a lockfile in one of
     the maintainer's own repos — a shared UI component pulled the package into every one of
     their projects' CI.
   - **`https://api.npmjs.org/downloads/range/last-month/<pkg>`** — per-day. Correlate spikes
     with your own commit dates. A **zero-download day** is near-proof that no distributed
     population exists; the largest spike here landed exactly on the day a sibling repo gained
     a new pin.

   A public package also has a nonzero floor from registry mirrors and security scanners, so
   "downloads > 0" never means "someone depends on this."

   **The consequence is that remediation should be sized to the real population, not the
   headline number** — and that cuts in the helpful direction. A named consumer you can
   message directly (this project had one, in its own docs) is better evidence *and* a better
   channel than a GHSA. Where the affected population is your own repos, updating them IS the
   fix. Reserve the full advisory machinery for a population you have actually shown exists —
   see "Responsibility scales with the MEASURED user base" above, which this file already
   said and which the review and I both walked past.

   What survives regardless of audience size: **deprecation strings that point at vulnerable
   versions are simply wrong**, and correcting them costs minutes. Do that part always.

The recurrence is the point: this was filed as a blocker in one review, left unticked, and
found again as a blocker in the next. A distribution step that lives only in a review report is
not a process step, which is why it is here.

— seen in: tjs-lang (`v0.13.9..c967ec2`)
