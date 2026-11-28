# Weekly security & health sweep — 2026-11-27 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).
**Nothing was written to any repo except this one**: no issues, comments, pushes or PRs.

**Scanned:** 17 GitHub repos, **23 dependency trees** (6 nested workspaces audited separately),
**16 published tarballs**, open issues on all 17 repos.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tosijs-encrypt, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto`: marked *(private)*, out of scope.
- `tosijs-virta`: private repo, not scanned.
- `tosijs-3d-ensemble`, `manta-recon`: local-only, no GitHub remote.
- `lukko`: `private: true`, never published, so no tarball (16 tarballs for 17 repos).

**Tooling:** `bun install --frozen-lockfile --ignore-scripts` + `bun audit --json` (17 trees);
`npm ci --ignore-scripts` (2 lockfile trees) and `npm install --ignore-scripts` (4 trees with no
lockfile) + `npm audit --json`; `npm view … dist-tags / deprecated / time`;
`git ls-remote --tags`; `npm pack <pkg>@latest` + extract + grep; issues via `search/issues`
(anonymous REST still 403s; `lukko` needed `add_repo` to clone); `bun tools/scoreboard.ts`.
All 23 installs exited 0.

**UNCHECKED:**

- **The Electron inside haltija's notarized desktop download** — not read from the binary;
  GitHub releases unreachable from this session (fourth week).
- **Task board (virta)** unreachable, so board-side status of the findings below is unknown.
- **Whether Nonono / Snowfox load tosijs-ui via the IIFE/CDN build** (§M2) — private
  consumers, invisible from here.
- **Dev-vs-shipped classification of the tosijs-platform root `@grpc/grpc-js` high** — carried
  from last week's sweep (dev-only), not re-derived.

---

## MAJOR findings

### M1. tosijs (real consumers): 1.10.13's security fixes are not reflected in the deprecations, and a further security fix sits unreleased

- **1.10.13** (published 11-27 15:52 UTC) fixes two security defects that affect **1.6.0/1.8.0 to
  1.10.12**: a contract validator returning `false` read as "valid" (#4250), and raw-prototype
  reads through `[=__proto__]` / compound `__proto__` paths (CHANGELOG `## [1.10.13]`).
- **Deprecations now point at a vulnerable version.** `1.8.0`–`1.10.10` still say "Upgrade to
  1.10.11"; `1.10.11` and `1.10.12` carry no deprecation at all, though both are affected by the
  1.10.13 fixes.
- **Unreleased security fix on `main`:** `bdd81ea` (11-27 20:37 UTC, hours old) — a malformed array
  index (`rows[ 0]`, `rows[0x0]`) got past agent-surface redaction and could write/delete the wrong
  row (#4312, #4338). CHANGELOG `[Unreleased] → Security`, "Reproduced on 1.10.13". Same card
  still open for non-`idPath` selectors and `[=key]` respellings.
- Still open: [#55](https://github.com/tonioloewald/tosijs/issues/55) (props-bag injection,
  **25 days**), [#43](https://github.com/tonioloewald/tosijs/issues/43) (76 days), #41, #32.

**Recommended action:** cut 1.10.14 with #4338; then re-deprecate `1.8.0`–`1.10.13` (or at least
through 1.10.12 now) with a string naming the newest fixed version. Releasing.md: a deprecation
pointing at a vulnerable version is simply wrong, regardless of audience.

### M2. tosijs-ui (real consumers): the published IIFE bundles tosijs 1.10.10

- `tosijs-ui@1.19.2` `dist/iife.js` (the CDN `<script>` artifact; README "Using the iife via
  cdn" says it bundles tosijs) embeds tosijs **1.10.10** — version marker in the bundle,
  `node_modules/tosijs/dist/module.js` in `iife.js.map`. Root cause: `devDependencies.tosijs`
  is pinned `1.10.10`.
- 1.10.10 is itself deprecated for security ("Upgrade to 1.10.11") and misses every fix in
  1.10.11–1.10.13 (§M1). A CDN consumer cannot upgrade tosijs independently.
- The ESM build imports tosijs as a peer (`^1.10.9`), so npm consumers resolve a current
  tosijs — but that floor also admits the vulnerable versions.
- Same class, measured-zero packages: `tosijs-product@0.8.0` and `tosijs-styled-editor@0.7.0`
  `dist/index.js` both inline tosijs **1.10.1**.

**Recommended action:** bump tosijs-ui's dev pin to the fixed tosijs and republish (patch); raise
the peer floor to the fixed version at the next minor. Rebuild tosijs-product / tosijs-editor
bundles on their next release.

---

## Notable, non-major

### N1. Non-owner issues — still the two from `trackoor`, still unanswered

- [tosijs-schema #13](https://github.com/tonioloewald/tosijs-schema/issues/13) (date-time
  offset/leap-second validation) and
  [tosijs-encrypt #1](https://github.com/tonioloewald/tosijs-encrypt/issues/1)
  (extensionless re-export breaks `node16`/`nodenext`), both 11-16, 0 comments. Looks like an
  automated/research sweep, so the measured-zero calibration stands; the repros are real.

### N2. tjs-lang: unpinned TypeScript import still on `latest`

- [#55](https://github.com/tonioloewald/tjs-lang/issues/55) (open since 09-06):
  `esm.sh/typescript@5` still in `0.14.0`'s `dist/tjs-browser-from-ts.js`. Measured-zero.
- The scoreboard Activity prose for tjs-lang still says "0.14.0 in flight… rc.5" (owner's cell).

### N3. tosijs-platform (in production)

- `storage.rules` `/users/{userId}/**` still `allow read: if true`;
  [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) open **96 days**. The comment
  says the production bucket has no `users/` folder — if so, delete the block and close #3.
- `functions/` still has no tracked lockfile; fresh resolve: 0 high, 28 moderate (unchanged;
  `firebase-admin ^12.7.0`).
- Root tree: 1 high `@grpc/grpc-js` GHSA-m9gg-hp2v-232j, 1 low (unchanged).
- Publish: `service-compris` 0.4.0 in `package.json`, unpublished, untagged (`latest` 0.3.0).
  Measured-zero: bookkeeping.
- Tracked `functions/.env.sandbox` / `.env.liquid-force-425209-g2` (edited 11-27): feature
  flags and `SITE_HOST` only, no secret-shaped values.

### N4. happy-dom highs (test-only), unchanged

- GHSA-834v-8h66-3h79, GHSA-c8p4-j97h-3vg8 (high), GHSA-5fpq-26gf-qwcr (moderate); fix `^21.0.4`.
- In: **kilpi** (first — its publish gate runs hostile HTML through this DOM), ngx-tosijs,
  tosijs-timezone-picker, react-tosijs.

### N5. lukko: 2 critical / 15 high, thirteenth consecutive week

- All transitive via `tjs-lang ^0.3.0` (`protobufjs`, `websocket-driver`, `undici`,
  `@grpc/grpc-js`). HEAD `94d25be` (2026-03-04), `private: true`. Fix:
  `bun add tjs-lang@^0.14.0` (#2).

### N6. Publish integrity

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.13 | v1.10.13 | 1.10.13 | ✅ facts agree; deprecations wrong (§M1) |
| `tosijs-ui` | 1.19.2 | v1.19.2 | 1.19.2 · `beta` 1.17.0-beta.5 | ✅ (bundle: §M2) |
| `tosijs-schema` / `tosijs-floorplan` / `tosijs-encrypt` | 1.14.0 / 0.7.0 / 1.1.0 | match | match | ✅ |
| `tjs-lang` | 0.14.0 | v0.14.0 | 0.14.0 · `rc` 0.14.0-rc.10 | ✅ |
| `react-tosijs` / `ngx-tosijs` / `tosijs-3d` | 1.2.1 / 0.9.1 / 0.13.2 | match | match | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` / `haltija` | 0.8.0 / 0.7.0 / 1.0.1 / 1.13.2 | match | match | ✅ |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ §N3 |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on remote |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ 0.2.0–0.6.0 tagged, never published |

- Stale dist-tags, unchanged: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3; `haltija` `rc`
  1.12.0-rc.5 / `beta` 1.13.0-beta.5; `service-compris` `beta` 0.2.0-beta.2; `tosijs-ui` `beta`
  1.17.0-beta.5; `tjs-lang` `rc` 0.14.0-rc.10 (behind `latest`).

### N7. Dev-tree advisories that reach no consumer (unchanged)

- `react-tosijs` 15 high + 6 moderate (eslint-8 tooling + happy-dom); `ngx-tosijs` Angular
  moderates + happy-dom; `tosijs-schema` `zod` GHSA-mrhx-c7xc-m3w5 (high, bench-only).
- `minimatch` GHSA-g3hv-75wg-m249 (moderate) in tosijs-ui, tjs-lang, tosijs-3d, tosijs-product;
  tjs-lang also `glob` (moderate) + `fast-xml-parser` (low); `tjs-lang/functions` 4 moderate +
  1 low.
- Audit 0: tosijs, haltija (3 trees), tosijs-editor, tosijs-encrypt, tosijs-floorplan, wobbly,
  `tjs-lang/editors/vscode`, `tosijs-platform/create-script`.

### N8. Secrets: clean

- Grepped every tracked file in 17 repos and all 16 tarballs for `AIza`, `sk-`, `ghp_`,
  `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ`, `-----BEGIN … PRIVATE KEY`, and base64
  `cGsuZXlK` / `c2suZXlK`.
- **No `sk.` Mapbox secret, cloud key, PAT or Slack token anywhere.** Every full Mapbox `pk.`
  token (plain and base64-decoded) hashes to the single accepted tosijs-ui demo token; class
  unchanged.
- `sk-` hits are the known false positives (sourcemap anchors, tjs-lang prose, a tosijs review
  test label); `-----BEGIN` is prose in a tosijs-3d review. Firebase web `apiKey` in
  `tjs-lang/demo/src/` (3 files): public-class, demo-only.
- No tarball ships `reviews/`, `journal/`, `proposals/`, `.env*`, `.npmrc` or keys.

### N9. Issues: 185 open across the 17 repos

- tosijs-ui 74, tjs-lang 28, tosijs-platform 28, tosijs 18, tosijs-3d 15, haltija 9,
  react-tosijs 3, tosijs-schema 2, kilpi 2, lukko 2; 1 each for encrypt, ngx, wobbly,
  timezone-picker.
- **Opened since 11-13, still open:** tosijs-ui #258, #259, #260, #264, #268, **#270** (11-25,
  `<tosi-tabs>` deprecated accessor trips tosijs's `on<Event>` warning), **#271** (11-27,
  live-example options); tosijs-3d **#129** (11-23); tosijs-schema #13, tosijs-encrypt #1.
  None of the new ones is security-relevant.
- Security-relevant, still open: tosijs-ui #254 (tunnel can forward the wrong dev server),
  kilpi #2 (custom elements pass the denylist; open 66 days, load-bearing for `<tosi-md>`),
  tosijs #55/#43/#41/#32, tosijs-platform #3, tjs-lang #55, lukko #2.

### N10. Scoreboard: 1 fact cell refreshed with this report

`bun tools/scoreboard.ts`: `tosijs` → 1.10.13; "As of" advanced on verified rows. Task board,
`kith-email` and `tosijs-virta` unreachable, left alone. Prose cells left to the owner.
