# Releasing

Every library in this ecosystem releases **locally** — there is no CI publish workflow in
any repo. That means the local build + your discipline *are* the release gate, and built
artifacts are committed to git so they must be regenerated, never hand-edited.
— seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, tjs-lang, tosijs-schema, haltija, editor2

For where the built site goes (GitHub Pages / Firebase / Cloudflare), see
[deployment](./deployment.md). This doc is about **packaging, versioning, tagging, and publishing**.

## Before a minor or major release: run the comprehensive review

For any **minor or major** bump, run the eight-lens
[comprehensive pre-release review](review.md#comprehensive-pre-release-review-minor--major)
**first** — correctness, efficiency, DRYness, documentation accuracy, test coverage,
developer experience, **ecosystem & abstraction health**, and **practices self-review** — each
as an independent pass over `git diff vLAST..HEAD`. Runnable: [`/pre-release-review`](../tools/README.md).

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

## Cutting a release (canonical flow)

1. **Bump `version`** in `package.json` (semver) — this is the single source of truth (below).
2. **Add a `CHANGELOG.md` entry** under the new version (Keep a Changelog format), where one exists.
3. **Build** — run the project's build (usually `bun run build`). It runs tests, stamps
   `version.ts`, and regenerates `dist/` (+ `docs/` for doc-site projects). If the build runs
   tests and any fail, it exits non-zero — do not ship. — seen in: tosijs, tosijs-ui, tosijs-schema
4. **Commit everything**, including regenerated `dist/`/`docs/`, with a `vX.Y.Z: <summary>` message.
5. **Tag** `vX.Y.Z` (see tagging below).
6. **Push** commits and tags: `git push && git push --tags`.
7. **Publish** the npm package: `npm publish` (the `files` field controls the tarball — usually
   just `dist/`, `LICENSE`, `README.md`).

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

## Who pushes and publishes — check before you act

**Contradiction:** the default "landing the plane" rule treats `git push` as the definition of
done (below), but some repos make `npm publish` and `git push` **human-only** — the agent runs
bump → build → verify → commit → tag and then **stops** with a standing "never publish or push
without an explicit go-ahead." — seen in: tosijs-3d, tosijs-schema

Rule of thumb: check the project's `RELEASING.md`/`AGENTS.md`/`CLAUDE.md` first. If it names a
human-only gate, stop after tagging. If it doesn't, finish the push per "landing the plane."
Never bypass a pre-push hook with `--no-verify` — fix the underlying failure. — seen in: tjs-lang

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
- Bump BOTH `package.json` and `apps/desktop/package.json`, then the fixed sequence: build →
  `bun test src/` 100% green → commit → annotated tag → push commits AND tag →
  `gh release create --prerelease` → `npm publish --tag beta`. DMG notarization is on-demand,
  not part of the beta loop; set `APPLE_API_KEY_ID` before overwriting `APPLE_API_KEY` or
  notarization fails with a JSON parse error.
