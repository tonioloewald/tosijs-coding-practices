# Development

How to work in a project day-to-day.

## Getting oriented

- **Read the project's `CLAUDE.md`/`AGENTS.md` first.** It records the non-obvious: build
  entry points, watch-mode caveats, environment quirks. This shared repo is the *default*;
  the project file is the *exception*.
- **There is ONE build/dev entry per repo — find it, don't reinvent it.** Almost every
  project funnels dev server + build + version stamping + doc generation through a single
  hand-written script; looking for a webpack/vite config or extra npm scripts wastes time.
  Learn the one script and edit *it*.
  - `bin/site.ts` (thin wrapper over `tosijs-ui/site` `buildSite`/`devServer`, config in a
    `*-site.config.ts` via `defineSiteConfig`) — tosijs, tosijs-ui, tosijs-3d, tosijs-product.
  - A bespoke `dev.ts`/`serve.ts`/`build.ts` (prebuild → `Bun.build` → watch → serve) —
    react-tosijs, editor2, lukko, loewald-dot-com.
  - `bun run make` — tjs-lang (see project note on why it isn't named `build`).
  — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs, editor2, lukko, tjs-lang

## Bun is the toolchain

- **Use Bun for everything: `bun install`, `bun <file>`, `bun test`, `bun run build`.** Never
  reach for node/npm/vite/jest — the tsconfigs assume bundler mode (`moduleResolution: bundler`,
  `allowImportingTsExtensions`, explicit `.js`/`.ts` extensions in imports), and node tooling
  fights it. — seen in: tosijs-schema, editor2, kith-email, lukko, and the rest
- **Never add a `build` script to `package.json` in a Bun project.** `bun build` is a builtin
  (the bundler), so a `build` script makes `bun build` and `bun run build` do different things —
  a silent footgun. Name the full-build task something else (`make`). — seen in: tjs-lang
- **A lingering `package-lock.json` / `bun.lockb` is stale — prefer `bun.lock`.** Several repos
  carry two lockfiles; bun is canonical. The exception is a Firebase `functions/` subdir, which
  legitimately runs npm + Node. — seen in: tosijs, tosijs-3d, react-tosijs, loewald-dot-com
- **🚨 Never call `Bun.build()` inside a long-lived process — shell out to the `bun build` CLI.**
  Bun's bundler never returns its native arena. RSS grows monotonically per call with no plateau
  (40 sequential builds of one entry = **+367MB**, still climbing ~5MB/build at the end) while the
  JS heap stays flat — so `Bun.gc()` can't reclaim it and no heap profiler will show it. Anything
  that bundles more than once is exposed: dev servers, watch modes, SSG rebuild loops, test
  harnesses that bundle fixtures. This is not theoretical — **a ~2-day `tosijs-ui` watch session
  reached 136GB RSS and took the machine down.** Filed as
  [oven-sh/bun#34053](https://github.com/oven-sh/bun/issues/34053). A child process gives the
  memory back to the OS on exit: the same 15 bundles leave the parent **+0.5MB** instead of
  +192MB. The same reasoning applies to any native-heavy build step you run repeatedly (happy-dom,
  `@resvg/resvg-js`) — put it in a child. — seen in: tosijs-ui
- **⚠️ If you consume `tosijs-ui/site`, update to ≥ 1.6.22 as a priority.** Every dev server built
  on it called `Bun.build()` in-process once per rebuild, so it leaked until that release (fixed
  there: bundle + ePub moved to child processes, plus a memory watchdog that exits with the
  growth-per-rebuild rather than thrash the machine). Baseline RSS 503MB → 150MB, per-rebuild
  growth 26–59MB → ~2.7MB. — seen in: tosijs-ui, and every doc site built on it

## The dev loop

- `bun install` once, then the project's start script (commonly `bun start`).
- **Dev servers serve HTTPS on a fixed port and need locally-trusted TLS certs generated once**
  (`bun run tls` / `bun tls`, or `tosijs-dev-certs`). Generation is manual and needs sudo
  (`mkcert -install`) — the server won't auto-generate and exits telling you to run it. If the
  server won't start, check certs before anything else. — seen in: tosijs, tosijs-ui,
  loewald-dot-com, editor2
- **Ports are fixed and differ per project** (tosijs 8018, tosijs-ui 8787, tosijs-product 8788,
  react-tosijs 8016, editor2 8789, loewald 8020). To run two ecosystem dev servers at once,
  configure a distinct port — tosijs-product deliberately pins 8788 to dodge tosijs-ui's 8787.
  — seen in: tosijs-product, tosijs-ui
- **Restart the dev server after editing the server script itself** (`serve.ts`/`dev.ts`), even
  under `--hot` — the running process *is* the server, so hot reload can't fully re-establish it.
  — seen in: lukko
- Hot reload is expected. Some projects persist state to `localStorage` across reloads
  (tosijs `hot-reload.ts`) — a stale value surviving a reload is a feature, not a bug.
- **`bun start` may point at production, not a local backend.** In loewald-dot-com plain
  `bun start` connects to *production* Firebase; use `bun start-emulated` + `bun seed` for
  isolated local work. Know your target before you write data. — seen in: loewald-dot-com

## Spawning background processes: capture the PID, tear them down

- **Never `pkill -f <pattern>` (or any broad-pattern kill) on a shared dev machine.** Multiple
  agent sessions run in sibling repos on the same box, and a pattern like `pkill -f haltija`
  matches *their* processes too — including scratchpad harnesses you can't see. Kill by PID from
  `pgrep -fl`, having read what you're about to kill. (Promoted from tosijs-3d's CLAUDE.md — the
  hazard is identical from any repo, and an agent in a sibling checkout won't have read that
  file.) — seen in: tosijs-3d

- **A backgrounded child (`&`) does not die with the shell that spawned it.** When the parent
  shell exits or is killed — a tool-call timeout, an interrupted task — the child is reparented
  to PID 1 and keeps running: a CPU-pegging or memory-holding orphan nobody is watching. macOS
  has no `PR_SET_PDEATHSIG`, so nothing reaps it for you.
- **`kill $(jobs -p)` silently no-ops in zsh** — the agent Bash tool's shell. `jobs -p` inside a
  command substitution runs in a subshell that can't see the parent's background jobs, so it
  prints nothing, `kill` gets no arguments, and a trailing `2>/dev/null` hides the "not enough
  arguments" error. It happens to work in bash, which is exactly how the bug hides.
- **Capture each PID at spawn instead:** `pids=""; for …; do cmd & pids="$pids $!"; done; …;
  kill $pids 2>/dev/null`. `$!` is reliable in both shells. For interruption-safety (no
  `trap … EXIT` survives a SIGKILL), spawn in a process group and `kill -- -$pgid`.
- This is the *authoring* side of [`review.md`](review.md) lens 9's "killing is a policy" rule:
  don't leak the processes you spawn, and make the cleanup survive an interrupted run.
- **When the child reparents, or is a GUI/daemon, launcher-side cleanup isn't enough — it must
  terminate *itself*.** Everything above assumes the launcher outlives the child and reaps it. Two
  cases break that: (1) a child that **reparents** (a macOS GUI app, or Electron, jumps to launchd
  shortly after startup — `process.ppid` becomes 1 and a descendant walk at teardown time misses
  it); (2) a **SIGKILL** of the launcher, which runs no trap. The fix is to make the child watch its
  spawner and quit on its own: pass the launcher's pid **in an env var** (not `process.ppid`, which
  the reparent invalidates) and poll it — when it's gone, exit. A GUI/daemon should quit *itself*
  (`app.quit()`), not be externally killed, so it reaps its **own** helper/child processes — an
  external tree-kill notoriously leaves those behind. Also: a per-app singleton lock (Electron's
  `requestSingleInstanceLock`) must be **skipped for isolated/ephemeral instances**, or one orphan
  blocks every future run. — seen in: haltija 1.5.5 (issue #7, `--private --app`: env-passed
  `HALTIJA_SPAWNER_PID` + poll + `app.quit()`; lock skipped for private runs)
— seen in: a pre-release-review load test spun up 8 `yes > /dev/null` CPU hogs, ran tests under
  contention, then leaked all 8 for over an hour because its `kill $(jobs -p)` no-oped under zsh

## A rot-prone claim gets a date AND a test

Any published number is a claim with a shelf life: bundle sizes, benchmark results, test
counts, dependency counts, "zero dependencies", supported-version matrices. Each was honest
when written and each drifts silently — *your own* feature work is what moves it.

The cost isn't the inaccuracy, it's the **credibility transfer**. A reader who disproves a
checkable claim in thirty seconds discounts your *unverifiable* ones too — and the
unverifiable ones (security properties, design guarantees) are usually the load-bearing
ones. A stale "66 KB gzipped" costs you the reader's trust in "capability-sandboxed",
which they can't check as easily.

So, for every claim that can rot:

1. **Qualify it** — "measured at v0.12.0". A dated claim ages honestly; an undated one is
   unfalsifiable-by-inspection, because a reader can't tell whether it's current.
2. **Make it self-updating, or track it with a test** — prefer the test. A guardrail that
   re-measures the artifact and fails when the doc drifts past a tolerance converts "someone
   should re-check this" into "it cannot be wrong by more than one release." Skip the test
   when its input is absent (an unbuilt `dist/`) so it doesn't red a fresh clone; it should
   bite in the pre-tag/publish flow, where it counts.
3. **State increments as increments, or don't** — a table row reading "+ Transpiler 5 KB"
   next to "VM 66 KB" gets read as "the transpiler is 5 KB" when it's 64 KB standalone.
   Prefer independent, directly-checkable rows over deltas that require the reader to
   reconstruct your arithmetic.

The same discipline applies to prose claims that overstate a real result: say what you
*have* proven, not the neighbouring stronger thing. "Termination is guaranteed by fuel
metering" is unassailable; "solves the halting problem" is the same work described in a way
that invites dismissal. — seen in: tjs-lang (`src/bundle-size.test.ts`, after a cold review
found every row of the bundle table stale)

## Baseline artifacts: every product ships `llms.txt` and a `CHANGELOG.md`

Both are how a project talks to consumers it never meets — and agents are first-class
consumers here. Every product (anything a consumer installs, deploys, or reads docs for)
ships both and keeps them current:

- **`CHANGELOG.md`** (Keep a Changelog format). Release notes are the API's history, and the
  cross-project protocol depends on them — "close the issue naming the version" only helps a
  downstream agent if the version's changelog says what changed. [`releasing.md`](releasing.md)
  requires an entry per release; if the file is missing, **create it at the next release**
  (coarse backfill from git tags is fine).
- **`llms.txt`** — the LLM-readable index of what the project is and how to use it, served
  from the deployed site root where a site exists, at the repo root otherwise.
  - **Doc-site projects get it generated** — `buildSite` (tosijs-ui's doc-system,
    `make-llms-txt`) emits it; it's covered by the generated-files rule below. Don't
    hand-edit it.
  - **Everything else hand-authors it at the repo root** and updates it per "agent-facing
    docs travel with the code" (below) — when an entry point, command, or endpoint changes,
    `llms.txt` changes in the same commit. haltija regenerates it from `src/api-schema.ts`
    with CI drift-gating; that's the strongest form.

A missing `llms.txt` makes every downstream agent re-derive the project from source; a
missing changelog breaks version-naming in issue closes. Neither is optional because a repo
is private — private repos have agent consumers too. — raised by the repo owner 2026-07-21;
at that point 8 of 14 linked projects shipped both, and the sets were identical — the gap
list (tosijs-schema — fixed at 1.5.0, editor2, lukko, loewald-dot-com, kith-email, static-assets, ariosto)
is tracked by issues filed on each.

## Generated files are committed — build before you commit

- **Run `bun run build` before committing so tracked generated files match source.** `dist/`,
  `docs/`, `llms.txt`, `src/version.ts`, `src/icon-data.ts` are committed in most repos and
  shipped in the package — stale outputs ship broken behavior. Never hand-edit or revert their
  large diffs. — seen in: tosijs, tosijs-ui, tosijs-3d, haltija
- **`src/version.ts` is generated from `package.json`, never source.** The prebuild stamps it
  and `index.ts` re-exports it; bump the version in `package.json` only. Hand edits are
  overwritten. Same idea syncs `tauri.conf.json` in Tauri apps. — seen in: tosijs, tosijs-ui,
  react-tosijs, editor2, haltija, lukko
- **For generated-file merge/rebase conflicts, set the merge=ours driver once per clone:**
  ```bash
  git config merge.ours.driver true   # .gitattributes marks generated files merge=ours
  ```
  Then rebuild to regenerate canonically. The driver isn't stored in the repo, so without it
  every generated-file conflict stalls the rebase — and hand-resolving is pointless since the
  next build overwrites them. — seen in: tosijs-ui
- **CONTRADICTION — is the output committed or gitignored? Check per repo.** Most repos commit
  `dist/`+`docs/` (a release diff includes big regenerated bundles; don't be alarmed). But
  editor2 gitignores both, so its GitHub Pages publish is a separate/manual `gh-pages` step —
  committing to `main` does *not* update the site there. Confirm before assuming. — seen in:
  tosijs, tosijs-ui vs. editor2

## Publishing a library: externalize peers, emit types separately

- **Wire sibling ecosystem deps as `file:` links locally, but declare them as
  `peerDependencies`** (mirror in `devDependencies` for local dev). Peers stop consumers from
  shipping duplicate framework copies; `file:` links let you iterate against unreleased upstream
  locally. — seen in: tosijs-product, editor2, react-tosijs
- **Build the shipped lib with `Bun.build` marking peers external, and emit `.d.ts` separately**
  via `tsc --declaration --emitDeclarationOnly` (then flatten types out of `dist/src/` if tsc
  nested them). Ship dual format: ESM with peers external + a self-contained IIFE for
  `<script>`/CDN. Full release runbooks live in [releasing.md](./releasing.md). — seen in:
  react-tosijs, editor2, tosijs-product, tosijs-ui

## Ecosystem gotchas

- **Never call native `confirm()`/`alert()`/`prompt()` inside a Tauri/webview** (especially in
  async or menu callbacks) — they fail silently and the action no-ops. Use in-app UI
  (`TosiDialog.prompt/confirm/alert`). — seen in: kith-email, lukko
- **Agent-facing docs travel with the code.** When you change an entry point, CLI command,
  script, or endpoint, update the doc that agents read (`CLAUDE.md`, `llms.txt`, a plugin's
  `SKILL.md`) *in the same change* — they silently drift otherwise, and some repos gate this in
  CI (`git diff --exit-code` after re-running the generator). — seen in: tjs-lang, haltija

## Content is code: fix assets at the source, never in the importer

When content (models, textures, audio) is **under your control**, it conforms to the
pipeline's conventions in the *source file* — never via compensating transforms at import
or load time. A code-side rotation that makes a mis-authored model "look right" is a
monkey-patch on every future consumer of that asset, and it composes catastrophically
with frame bugs you haven't found yet: compensating for a *mirrored* frame with a
*rotation* produces a craft that looks correct and flies chirally backwards (inverted
pitch, camera on the nose side) — a far harder bug than the one being papered over.

- **Keep a known-good reference asset in the scene while authoring** and match it
  visually. The ecosystem convention is **Blender defaults: -Y forward (the model's
  face shows in Front view / Numpad 1), +Z up** — chosen deliberately so generic
  Blender tooling, tutorials, and the glTF exporter's front-faces-+Z mapping all agree
  with our content. The reasoning: Blender is central to the content workflow for the
  indefinite future — nobody else is going to build a bleeding-edge do-everything 3D
  suite with a decent UI again — so conventions bend toward Blender, never the reverse. ⚠️ Legacy caveat: assets exported before this decision (e.g.
  tosijs-3d's `test-2.glb` scout) are +Y-forward and fly correctly only via a
  double-negation in the old pipeline — they get re-exported, not imitated. The
  engine-side forward mapping is defined in ONE place (tosijs-3d's library
  canonical frame — see its issue tracker), never per-asset.
- **Apply all transforms** (Blender Ctrl+A) once oriented, so mesh data ≡ world frame —
  zero object rotation/scale. That property is what makes an asset immune to
  exporter/loader disagreements about when transforms get baked; imported legacy content
  (Cheetah 3D-era files) typically carries the convention in an object-level rotation
  and needs this normalization.
- If an asset renders 180°-flipped, **check the node hierarchy for a negative scale
  before touching content** — Babylon's glTF `__root__` carries `scaling [1,1,-1]`; a
  mirror is not a rotation, and "fixing" content against a mirror bakes in wrongness.
- Content you *don't* control (third-party formats) is the exception — normalize it once
  at ingestion into a conforming source file, then treat that as the source.

— seen in: manta-recon (the orientation saga: a content flip compensating for the
mirrored `__root__` control frame, then a Y-up Cheetah legacy frame — two days of
"flying backwards"), tosijs-3d (scout/test-2.glb as the reference frame)

## Code you write should read like the code around it

Match the surrounding file's naming, comment density, and idioms. Consistency beats
personal preference. The ecosystem's house style (see [code-quality.md](./code-quality.md)):
single quotes, no semicolons, 2-space indent, ES5 trailing commas.

## Editing conventions

- Small, surgical edits. Don't reformat files you're only touching one line of — several
  repos have `.prettierignore` entries for hand-curated files (e.g. tosijs `xin-types.ts`).
- Reference code as `file_path:line` in notes and reviews — it's clickable.

## Committing: path-limit it, then verify what you actually committed

- **`git add <file> && git commit` does NOT commit only that file.** `git commit` commits the
  **whole index** — including anything already staged that *you* didn't stage. Path-limit it:
  ```bash
  git commit -m "..." -- path/to/file
  ```
- **Always verify:**
  ```bash
  git show --stat --name-only HEAD
  ```
- **Never assume a repo's index is clean**, especially one you didn't start the session in. Run
  `git status` *before* committing. This is a real incident, not a hypothetical: a one-file docs
  commit in `tosijs-product` swallowed a dozen pending `demo/`+`dev.ts` deletions that were
  already staged in that repo's index.
- **If it happens:** `git reset --soft HEAD~1` restores the index exactly as it was, then
  re-commit with the pathspec. Verify again.

## Stay in your repo; check what's been filed against it

- **You work in one repo.** If you hit a problem that belongs to another (tosijs, tosijs-ui,
  tjs-lang, tosijs-schema…), **file an issue on it — don't go fix it.** Editing another repo
  bypasses its tests, conventions, and release gate, and strands changes nobody is watching.
  If it genuinely can't wait, **ask for signoff first**. Full protocol:
  [`cross-project.md`](cross-project.md).
- **When starting substantive work**, see what your consumers have told you:
  ```bash
  gh issue list -R tonioloewald/<this-repo> --state open
  ```
  Those issues are where your seams are missing. Also skim `TODO.md` (own work) and
  `UPSTREAM.md` (what you're blocked on upstream).

## The self-improving habit

When you finish substantive work, ask whether you learned something that would have saved
time if it had been written down. Project-specific → the project's `CLAUDE.md`. Cross-project
→ contribute it here (`../CONTRIBUTING.md`).

## Project-specific practices

_(dev-loop quirks that haven't earned a cross-project rule yet)_

- **tosijs** — `bin/site.ts` is the *only* build entry; it wraps `tosijs-ui/site` and also owns
  library bundling via `Bun.build` into `dist/{index.js IIFE, module.js ESM, main.js CJS}` plus
  `module.debug.js`/`module.safe.js`. Don't add side-channel build scripts — they miss version
  stamping, doc generation, and the debug/safe variants.
- **tjs-lang** — the `bunfig.toml` alias (`tjs-lang` → `./src/index.ts`) + `.tjs` preload only
  apply *inside* the repo; scripts in `/tmp` resolve to `node_modules` instead. Use absolute
  `src/...` paths for experiments outside the tree.
- **lukko** — keep all Node/Bun APIs (`fs`, `path`, `os`, `Bun.spawn`) in `serve.ts` and its
  imports; the browser entry (`src/main.ts`) must be pure UI talking to the server over
  fetch/SSE, or `Bun.build`'s browser target breaks. Use explicit `.js` extensions in relative
  TS imports.
- **haltija** — respect build-step ordering in `scripts/build.ts`: the IIFE component bundle
  (`dist/component.js`) must be built *before* embed-assets, since the server bundle embeds the
  widget. Don't reorder.
- **loewald-dot-com** — emulators run *compiled* code from `functions/lib/`; `cd functions &&
  bun run build` and restart emulators after any functions change or you're testing stale code.
- **static-assets** — keep heavy/binary/paid-bundle assets OUT of git; commit only
  `metadata.json` + directory structure (the manifest) and repopulate `assets/**` before
  deploying. A fresh clone has the manifest, not the payload, by design.
- **tosijs-product** — when embedding raw HTML in README/markdown (rendered by `marked` with no
  sanitizer, then hydrated), keep the whole `<style>`+custom-element block free of blank lines
  (CommonMark ends a raw-HTML block at the first blank line) and scope its CSS under a wrapper
  class.
- **kith-email** — never build tosijs id-path values containing `[`, `]`, `/`, or spaces;
  sanitize with `str.replace(/[\[\]\/\s]/g, '_')` or you corrupt path parsing and bindings.
- **editor2** — `bun run format` references eslint/prettier that aren't declared as devDeps and
  have no config file; a fresh clone hits "command not found" — invoke via `bunx` or install
  first.
- **tosijs-schema** — generate user-facing docs from executable code (`bun examples.ts >
  examples.md` during `pack`) so docs can't drift from real behavior.
