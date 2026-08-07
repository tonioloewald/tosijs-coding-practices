# Releasing

Every library in this ecosystem releases **locally** — there is no CI publish workflow in
any repo. That means the local build + your discipline *are* the release gate, and built
artifacts are committed to git so they must be regenerated, never hand-edited.
— seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, tjs-lang, tosijs-schema, haltija, editor2

For where the built site goes (GitHub Pages / Firebase / Cloudflare), see
[deployment](./deployment.md). This doc is about **packaging, versioning, tagging, and publishing**.

> **Local publishing is under pressure from npm's side.** npm is restricting tokens that
> bypass 2FA for direct publishing, so a local `npm/bun publish` now needs an OTP
> (`bun publish --otp=<code>` works and needs no second browser tab). The planned
> replacement — publish from a tag via GitHub OIDC, which also removes the long-lived
> publish credential from the maintainer's laptop — is drafted in
> [publishing-via-oidc.md](./publishing-via-oidc.md). **Not yet implemented**; `tosijs-ui`
> is the intended pilot.

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
- For rebases/merges over committed generated files, mark them `merge=ours` in `.gitattributes`
  and run `git config merge.ours.driver true` once per clone, then rebuild — resolving those
  conflicts by hand is pointless since the next build overwrites them. — seen in: tosijs-ui

## Tagging

Tag `vX.Y.Z` at the release commit and push tags. **Contradiction in the ecosystem:** some
repos use **lightweight** tags (tosijs, tosijs-ui), others use **annotated** tags (tosijs-3d,
haltija). Rule of thumb: prefer **annotated** (`git tag -a` — it carries a message and date);
otherwise follow the existing tag style in that repo, don't mix.

For npm **pre-releases**, `npm publish --tag beta` is mandatory — without the dist-tag npm marks
the beta as `latest` and a bare `npm install <pkg>` pulls it. Pair it with
`gh release create --prerelease`. — seen in: haltija

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
- **Betas take the same sequence with two deltas**: `gh release create --prerelease` and
  `npm publish --tag beta` (see [Tagging](#tagging) — the dist-tag is not optional). The flags
  cut both ways: pass them on a *stable* release and the version lands under the `beta`
  dist-tag, so `npm install haltija` keeps serving the previous release and nobody gets the fix.
  Decide stable-vs-beta before you type either command.
- DMG notarization is on-demand, not part of either loop; set `APPLE_API_KEY_ID` before
  overwriting `APPLE_API_KEY` or notarization fails with a JSON parse error.
