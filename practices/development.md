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

## Code you write should read like the code around it

Match the surrounding file's naming, comment density, and idioms. Consistency beats
personal preference. The ecosystem's house style (see [code-quality.md](./code-quality.md)):
single quotes, no semicolons, 2-space indent, ES5 trailing commas.

## Editing conventions

- Small, surgical edits. Don't reformat files you're only touching one line of — several
  repos have `.prettierignore` entries for hand-curated files (e.g. tosijs `xin-types.ts`).
- Reference code as `file_path:line` in notes and reviews — it's clickable.

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
