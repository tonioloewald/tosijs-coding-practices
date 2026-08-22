# Deployment

Pick a host by project shape. Four targets recur across the ecosystem:

- **GitHub Pages** — libraries and doc sites (the default).
- **Firebase** — full-stack apps needing auth/DB/functions.
- **Cloudflare Pages / R2 / Workers** — static asset CDNs and edge compute.
- **Tauri DMG** — desktop apps; "deploy" means code-sign + notarize, not a web host.

There is **no CI _deploy_ in this ecosystem** — every deploy is a hand-run local command.
(There *is* CI on some repos, for tests: tosijs-ui and haltija both have workflows. Don't read
"no CI deploy" as "no CI"; see [review](./review.md) on knowing which lanes are gated.) GitHub
Pages auto-redeploys from `main`'s `/docs` on push; everything else (Firebase deploy,
`wrangler`, `npm publish`, DMG notarize) you run yourself. See [releasing](./releasing.md)
for the version-stamp + npm-publish flow. — seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, kith-email, loewald-dot-com

## GitHub Pages

The default for OSS libraries and doc-sites. The tosijs-ui `buildSite` prerenders one
SEO `index.html` per doc, emits sitemap/robots/`llms.txt`, and can build an ePub.
— seen in: tosijs, tosijs-ui, tosijs-3d, tosijs-product, react-tosijs, editor2

- **Serve from `main` branch `/docs`, NOT root.** `buildSite` emits root-absolute asset
  paths and writes `CNAME` + `.nojekyll` into `docs/`; serving from `/` 404s *every*
  asset. Custom domains come from the `CNAME` file in `docs/` (tosijs.net, 3d/product/react.tosijs.net).
  — seen in: tosijs-3d
- **`docs/` is generated output — never hand-edit it or put source `.md` there.**
  `buildSite` runs `rm -rf docs/` first, so anything you author in `docs/` is silently
  deleted with no error. Put source doc pages in `src/docs/*.md` and per-component docs in
  inline `/*# ... */` comments. — seen in: tosijs-product, tosijs-3d, tosijs-ui, react-tosijs, editor2
- **Verify no `docPaths` entry overlaps `outputDir` (`docs/`) before building.** `buildSite`
  deletes `outputDir` first but does NOT validate overlap — an overlapping source path is
  destroyed and the build "succeeds" producing an empty site. — seen in: tosijs-product
- **SPA-fallback trap:** if a built asset (e.g. `iife.js`) is missing, the page 404s into
  the SPA fallback and "loads as HTML." A dev-server rebuild `rm -rf docs`s and can wipe a
  separately-built bundle — rebuild the bundle, don't just restart the watch. — seen in: tosijs

**Contradiction — do you commit `docs/`?** Most projects **commit** `docs/` (and `dist/`):
it's the Pages web root served from `main`, so a push auto-redeploys, and `dist/` is the
published package. Expect large regenerated diffs; commit them, don't revert. — seen in:
tosijs, tosijs-ui, tosijs-3d, tosijs-product. **But editor2 gitignores `docs/` + `dist/`**,
so its Pages publish is a separate manual `gh-pages` step and a commit to `main` does NOT
update the site. **Rule of thumb:** check `.gitignore` before assuming a push redeploys —
commit `docs/` unless the repo deliberately ignores build output. — seen in: editor2

## Firebase

For full-stack apps needing auth, Firestore/RTDB, hosting, and Cloud Functions (positioned
as "PHP/LAMP simplicity"). Build the client to a gitignored hosting root (`.demo/`) and ship
it — but **split hosting-only from full deploys**: use `bun run deploy:hosting`
(`firebase deploy --only hosting`) for a site refresh, and reserve `bun run deploy` for when
Cloud Functions actually changed (it additionally runs `functions:deploy`, so a bare deploy
needlessly redeploys functions on every site refresh). The `functions/` subdir uses
**npm + Node**, deliberately separate from the bun-based root — run `cd functions && npm
install`. — seen in: tjs-lang, loewald-dot-com

- **Route ALL Firestore access through Cloud Functions endpoints; keep `firestore.rules`
  deny-all.** Security is enforced server-side by the access-control layer, not by rules; a
  collection with no config is deny-by-default. Bypassing the endpoints with the client SDK
  defeats field-level access control. — seen in: loewald-dot-com
- **Make access-denial opaque:** non-privileged callers get **404, not 403**, for protected
  collections — a raw 403 leaks that the collection exists. — seen in: loewald-dot-com
- Keep secrets out of the repo; use Firebase config / environment, not committed keys.
- Emulators run **compiled** code from `functions/lib/` — rebuild + restart after every
  functions change or you test stale code. — seen in: loewald-dot-com

## Cloudflare Pages / R2 / Workers

Pages for static/JAMstack, **R2** for object storage / asset CDN (free egress beats
Firebase for large binaries), **Workers** for edge compute. `cdn.tosijs.net` is the shared
asset CDN — heavy 3D/media binaries live there, and consuming repos reference them by URL
rather than duplicating. — seen in: static-assets, tosijs-3d

- **Use `bunx wrangler` / `bunx firebase-tools`, not installed deps.** The CLIs are only
  needed at deploy time (and must be logged in: `wrangler login`); keeping them out of
  `package.json` keeps the repo dependency-free. — seen in: static-assets
- **Generate host config from one source of truth.** Emit both Cloudflare `public/_headers`
  and `firebase.json` from the same metadata rules; never hand-edit the generated files (a
  rebuild clobbers them). This makes switching host a deploy/DNS choice, not a rebuild —
  the deployable stays byte-identical. — seen in: static-assets
- **Set CORS + long immutable cache on CDN responses:** `Access-Control-Allow-Origin: *`
  plus `Cache-Control: max-age=31536000, immutable`. Consumers fetch cross-origin, and
  content-addressed assets are safe to cache forever. — seen in: static-assets, tjs-lang
- **Anti-harvest a public CDN:** 404 directory listings, set `X-Robots-Tag: noindex` on
  every response, ship `robots.txt` `Disallow: /`, and never publish a full namespace
  manifest — keep it usable by apps that know paths, not browsable as a bundle. — seen in: static-assets
- **Cloudflare Pages caps at <20k files** — trim the served set (via metadata excludes) to
  stay under it or deploys break. — seen in: static-assets
- Invoke the Cloudflare Claude Code skills (Workers, Pages, R2, D1, Durable Objects,
  `wrangler`) before running `wrangler` or writing Worker code, rather than working from memory.

## Tauri desktop apps

kith-email and lukko ship signed/notarized macOS DMGs — no web host at all. "Deployment"
means code-sign + notarize.

- **Notarize the DMG wrapper, not just the app.** Tauri notarizes/staples the `.app` but
  NOT the `.dmg` — submit the DMG to `notarytool` and `stapler staple` it separately, then
  verify with `spctl -a -t open --context context:primary-signature <dmg>` expecting
  "Notarized Developer ID". An un-stapled DMG is Gatekeeper-rejected as "Unnotarized" even
  when the inner app is fine. — seen in: kith-email
- **Find Cargo artifacts under the workspace-root `target/`** (`target/release/bundle/dmg/`),
  NOT `src-tauri/target/` — a multi-member workspace redirects all output to the root. — seen in: kith-email
- **Ship a self-contained backend:** `bun build --compile serve.ts` into
  `src-tauri/binaries/<name>-<arch>-apple-darwin`; the `aarch64`/`x86_64-apple-darwin` triple
  suffix is required by Tauri's sidecar resolver. `build.ts` auto-syncs `package.json`
  version into `tauri.conf.json` on every build. — seen in: lukko

## Shared preview host (dev.tosijs.net)

A single small VPS serves **preview builds** for every tosijs-* project, so a phone, a
client, or a reviewer can see current work without your dev server — or your laptop —
being up. This is the cross-project convention; the implementation reference is
`tosijs-ui`'s `REMOTE-ACCESS-PLAN.md`, `deploy/Caddyfile`, and `bin/deploy-preview.ts`.

**How a project joins.** Commit the preview block WITHOUT the host, put the host
in your environment, and deploy:

```ts
preview: {
  url: 'https://<name>.dev.tosijs.net',
},
```

```bash
. ~/local-secrets/tosijs-preview.env       # sets PREVIEW_HOST — see below
```

**Never commit the host** (`host: 'user@ip'`) in a public repo: the deploy/tunnel
bins resolve `--host ?? PREVIEW_HOST ?? preview.host`, and a committed address
means any fork running `bun run tunnel` opens outbound SSH to your box — an
address-shaped gift to strangers. (tosijs-3d shipped exactly this and removed it
in its 0.6.0 blast-radius review; this section used to prescribe it.) Prefer a
dedicated deploy user over root while you're at it.

### Where machine-local credentials live: `~/local-secrets/`

**`~/local-secrets/` is the one place these values are stored, and the first
place to look for them.** It is a plain directory (mode `700`) sitting beside
`tosijs-coding-practices` and `local-packages` — a sibling of the repos, never
inside one, so it is structurally impossible to commit. One `600` file per
concern; `tosijs-preview.env` holds `PREVIEW_HOST`. Docs, including this one,
reference it **by path** — the values appear nowhere but the file.

To have it present in every shell, add to **`~/.zshenv`** — not `~/.zshrc`:

```sh
[ -f "$HOME/local-secrets/tosijs-preview.env" ] && . "$HOME/local-secrets/tosijs-preview.env"
```

Two failures produced this, both worth keeping in mind because neither announces
itself:

- **Redacting a config does not redact history.** Removing the host from
  `site.config.ts` in favour of `process.env.PREVIEW_HOST` left the original
  value in the git history of two **public** repos, where `git log -S` finds it
  in seconds. The rule above was written and believed while the address stayed
  published. **If a credential has ever been committed, it is public — rotate
  it.** History rewriting on a published repo does not un-publish anything.
- **"Put it in your shell profile" hides it from everything that isn't you.**
  Agents and scripts run in non-interactive shells that inherit no profile — so
  a profile-only value is present for a human and absent for every tool, which
  is how the tunnel silently became human-only to start. A sourced file is
  legible to both.

```bash
bun run deploy          # dry run — shows what would change
bun run deploy --go     # sync, self-register, refresh the index
```

That is the whole ceremony. **No DNS change** (a `*.dev` wildcard already resolves) and
**no shared config to edit**: the deploy writes its own Caddy fragment to
`/srv/preview/_sites/<name>.caddy`, which the server glob-imports.

**The conventions that make it coordinate:**

| thing | rule |
| --- | --- |
| remote directory | `/srv/preview/<project-name>` (defaults from your site config `name`) |
| hostname | `<label>.dev.tosijs.net`, derived from your `preview.url` |
| label choice | mirror production where one exists — `ui.dev.tosijs.net` for `ui.tosijs.net` — so preview and real differ by one path component and nothing else |
| the root | `dev.tosijs.net` is a **generated index** of what is deployed, with each project's commit. Never point a project at the root. |

**Things that will bite you if you don't know them:**

- **The fragment is the single source of truth** for hostname→directory. The index reads
  the same files the router reads, so a listing can never drift from what actually
  serves. Don't introduce a second mapping.
- **One malformed fragment fails the reload for every project on the box.** The deploy
  therefore validates before reloading and refuses to reload on invalid config, leaving
  the previous good config serving. If your deploy says "NOT reloading", your routing
  did not change and someone else's site is fine — fix your fragment.
- **Anything that can deploy can declare any hostname and serve any path.** Every project
  uses the same key, so this grants no new privilege, but the box trusts everything that
  can reach it. Do not put anything on it you would not put on a public web server.
- **It is public.** Fine for work that ships publicly anyway; add Caddy `basicauth` before
  previewing anything unreleased. The stakes for a *static* host are disclosure, not code
  execution — there is no write endpoint — so one line is a proportionate design.
- **`/version.json`** is emitted by every `tosijs-ui/site` build and carries the commit
  the build came from. It is how "what am I looking at?" is answerable from a deployed
  page, and it is what the index lists. Rebuild before deploying or you will publish a
  stamp pointing at the previous commit.

## General

- Deployment is outward-facing: confirm before a first deploy to a new target, and treat
  pushing content to a host as publishing (it may be cached/indexed even if later removed).
- Prefer reproducible builds: the same `bun run build` that runs in review produces the
  artifact you ship.

## Project-specific practices

**haltija**
- Isolate concurrent server instances by **process/port, not in-app session routing** — one
  server per project via `--port`/`--name` (registered in `~/.haltija/servers/<name>.json`).
  "Process boundary is the isolation primitive" (a per-request session-token scheme was
  deleted after repeated regressions). For CI browser E2E use `haltija --headless`/`--ci`
  driving JSON fixtures via `POST /test/run`, not `bun test`.
