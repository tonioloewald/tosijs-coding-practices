# Weekly security & health sweep — 2026-11-20 (UTC)

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
lockfile) + `npm audit --json`; `npm view … dist-tags / versions / deprecated`;
`git ls-remote --tags`; `npm pack <pkg>@latest` + extract + grep; issues via `search/issues`
(anonymous REST still 403s; `lukko` needed `add_repo` to clone); `bun tools/scoreboard.ts`.

**Coverage:** all 23 installs exited 0; no frozen-lockfile install needed a fallback.

**UNCHECKED:**

- **tosijs #55 was not reproduced** — status read from `CHANGELOG.md` and the issue tracker only.
- **The Electron inside haltija's notarized desktop download** — not read from the binary;
  GitHub releases unreachable from this session (carried over, third week).
- **Task board (virta)** unreachable, so board-side status of the findings below is unknown.
- **The `trackoor` account (§N1)** — the profile and its other activity can't be read: the user
  API path is blocked here, and `search/issues` refuses the login ("cannot be searched").

---

## MAJOR findings

### M1. tosijs (real consumers): #55 props-bag injection sink still unfixed in 1.10.12

- [#55](https://github.com/tonioloewald/tosijs/issues/55) (opened 11-02, from Snowfox, open
  **18 days**): a plain-object positional child is read as a props bag, so
  `span({}, JSON.parse(untrusted))` can set `innerHTML`, `bind` or `style`.
- 1.10.12 (published 11-18) shipped three non-security fixes (#4159–#4161) and does not mention
  #55. Cousin [#43](https://github.com/tonioloewald/tosijs/issues/43) is now open **69 days**.
- Snowfox has app-level workarounds; Nonono and any other consumer has no protection.

**Recommended action:** decide the opt-in strict mode now, ship it in the next minor, make it the
default at the next major.

**tosijs-ui** has no MAJOR findings: 1.19.2 (published 11-20) agrees across repo, tag and npm;
1 dev moderate (`minimatch`); tarball clean apart from the accepted demo token.

**Resolved since last week:**

- **tosijs deprecations (last week's M2):** `1.8.0`–`1.10.10` now all say "Upgrade to 1.10.11";
  1.10.11 and 1.10.12 are not deprecated. #56 is closed.
- **tosijs** root tree now audits 0 (the `minimatch` moderate is gone).
- **tjs-lang 0.14.0 published** (11-19) as `latest`, tag `v0.14.0` on the remote; repo, tag and
  npm agree.

---

## Notable, non-major

### N1. First non-owner issues on scoreboard packages — both from an external bug-hunter

- [tosijs-schema #13](https://github.com/tonioloewald/tosijs-schema/issues/13) (11-16):
  `format: "date-time"` accepts out-of-range UTC offsets (`-24:00`, `+10:60`) and checks the leap
  second `:60` against local time instead of UTC. A validator saying `true` to invalid input; the
  issue names the fix site (`RX_DATE_TIME` and `FORMAT_VALIDATORS['date-time']` in
  `src/formats.ts`) and gives a ready repro against `ajv-formats`.
- [tosijs-encrypt #1](https://github.com/tonioloewald/tosijs-encrypt/issues/1) (11-16): under
  `moduleResolution: node16/nodenext` every import fails with TS2305, because
  `dist/index.d.ts` re-exports `./src/encrypt` with no extension. Fix: `export * from
  './src/encrypt.js'` in `index.ts`. Check the other packages for the same extensionless
  re-export.
- Both are by `trackoor` and credit a university programming-languages research group, with
  0 comments. This looks like an automated or research test sweep over npm, not a consumer,
  so **it does not change the measured-zero calibration** for either package. The repros are
  real, though, and worth fixing.

### N2. tjs-lang 0.14.0: the unpinned TypeScript import is now on `latest`

- [#55](https://github.com/tonioloewald/tjs-lang/issues/55) (open since 09-06) used to reach only
  `rc` installs. With 0.14.0 promoted, `DEFAULT_TYPESCRIPT_URL = 'https://esm.sh/typescript@5'`
  ships in the stable tarball (`dist/tjs-browser-from-ts.js`), and a test still pins that exact
  string. Measured-zero, but it's a supply-chain edge that no consumer lockfile can see.
- The tjs-lang scoreboard Activity prose still says "0.14.0 in flight… rc.5" (owner's cell).

### N3. tosijs-platform (in production)

- **`storage.rules`:** `/users/{userId}/**` still `allow read: if true`. The comment now says
  "READ-ONLY since 2026-10-17… the production bucket has no users/ folder".
  [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) has been open **89 days**. If the
  folder is empty and unused, delete the match block and close #3.
- **`functions/` has no tracked lockfile.** Fresh resolve: 0 high, 28 moderate, all from the same
  root advisories (`glob`, `minimatch`, `ts-deepmerge`, `uuid`, `google-gax` chain) through
  `firebase-admin ^12.7.0` (registry latest 14.5.1). Last week's `deepmerge` low is gone.
- **Root tree (dev only):** 1 high `@grpc/grpc-js` GHSA-m9gg-hp2v-232j, 1 low. Unchanged;
  `bun update` clears it.
- **Publish:** `service-compris` 0.4.0 in `package.json`, untagged, unpublished (`latest` 0.3.0).
  Measured-zero: bookkeeping.

### N4. happy-dom highs (test-only), unchanged

- `happy-dom` GHSA-834v-8h66-3h79 (high), GHSA-c8p4-j97h-3vg8 (high), GHSA-5fpq-26gf-qwcr
  (moderate); fix `^21.0.4`.
- Still in: **kilpi** (do this one first: its publish gate feeds hostile HTML through the test
  DOM), ngx-tosijs, tosijs-timezone-picker, react-tosijs.

### N5. lukko: 2 critical / 15 high, twelfth consecutive week

- 40 advisories, all transitive via the `tjs-lang ^0.3.0` pin (`protobufjs`, `websocket-driver`,
  `undici`, `@grpc/grpc-js`). HEAD `94d25be` (2026-03-04), `private: true`.
- Fix: `bun add tjs-lang@^0.14.0` (#2).

### N6. Publish integrity

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.12 | v1.10.12 | 1.10.12 | ✅ (deprecations fixed) |
| `tosijs-ui` | 1.19.2 | v1.19.2 | 1.19.2 · `beta` 1.17.0-beta.5 | ✅ |
| `tosijs-schema` / `tosijs-floorplan` / `tosijs-encrypt` | 1.14.0 / 0.7.0 / 1.1.0 | match | match | ✅ |
| `tjs-lang` | 0.14.0 | v0.14.0 | 0.14.0 · `rc` 0.14.0-rc.10 | ✅ (was staged rc) |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.13.2 | v0.13.2 | 0.13.2 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` / `haltija` | 0.8.0 / 0.7.0 / 1.0.1 / 1.13.2 | match | match | ✅ |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ §N3 |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on remote |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases (0.2.0–0.6.0) never published |

- Reverse direction (npm version with no tag): only old pre-convention versions (for example
  `react-tosijs` 1.0.x, `tosijs-editor` 0.4.2/0.4.3). Nothing recent.
- Stale dist-tags, unchanged: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3; `haltija` `rc`
  1.12.0-rc.5 / `beta` 1.13.0-beta.5; `service-compris` `beta` 0.2.0-beta.2; `tosijs-ui` `beta`
  1.17.0-beta.5; **new:** `tjs-lang` `rc` 0.14.0-rc.10, now behind `latest`.

### N7. Dev-tree advisories that reach no consumer

- `react-tosijs`: 15 high + 6 moderate (eslint-8-era tooling + happy-dom), unchanged.
- `ngx-tosijs`: 3 Angular moderates + happy-dom, unchanged.
- `tosijs-schema`: `zod` GHSA-mrhx-c7xc-m3w5 (high), bench-only devDependency.
- `minimatch` GHSA-g3hv-75wg-m249 (moderate) in tosijs-ui, tjs-lang (+ `functions/`), tosijs-3d
  and tosijs-product. `glob` GHSA-3g3m-2fjr-6pw4 and `fast-xml-parser` GHSA-474x-hrwr-fgx4 (low)
  in tjs-lang + `functions/`. `bun update` clears them.
- Audit 0 at every severity: tosijs, haltija (3 trees), tosijs-editor, tosijs-encrypt,
  tosijs-floorplan, wobbly, `tjs-lang/editors/vscode`, `tosijs-platform/create-script`.

### N8. Secrets: clean

- Grepped every tracked file in 17 repos and all 16 tarballs for `AIza`, `sk-`, `ghp_`,
  `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ`, `-----BEGIN … PRIVATE KEY`, and the base64
  forms `cGsuZXlK` / `c2suZXlK`.
- **No `sk.` Mapbox secret (plain or base64), cloud key, PAT or Slack token anywhere.**
- Mapbox `pk.`: only the accepted demo token. Its hash matches the decoded tosijs-ui token
  everywhere it appears: tosijs-ui `dist/mapbox.js`, sourcemaps and docs; the tosijs-product
  `<tosi-map>` doc-demo block and README; the tosijs-3d and timezone-picker doc builds. Class
  unchanged.
- `sk-` hits are known false positives: `task-list-items` / `Map-and-D…` in sourcemaps, prose in
  tjs-lang `vm-budgets.md` / `docs.json`, and a `sk-live-LABEL` test string in a tosijs review.
  The one `-----BEGIN` hit is prose in a tosijs-3d review.
- Firebase web `apiKey` in `tjs-lang/demo/src/` (3 files): public-class, demo-only.
- Tracked env files: `tosijs-platform/functions/.env.*` (feature flags + site host),
  `tosijs/.env.example` (placeholders).
- No tarball ships `reviews/`, `journal/`, `proposals/`, `.env*`, `.npmrc` or keys.

### N9. Issues: 182 open across the 17 repos

- Open counts: tosijs-ui 72, tjs-lang 28, tosijs-platform 28, tosijs 18, tosijs-3d 14, haltija 9,
  react-tosijs 3, tosijs-schema 2, kilpi 2, lukko 2; 1 each for encrypt, ngx, wobbly and
  timezone-picker.
- **Non-owner authors:** the 2 issues in §N1. They are the first on any scoreboard repo.
- **Opened in the last 14 days (since 11-06), still open:** tosijs-schema #13, tosijs-encrypt #1
  (§N1); tosijs-platform #38; tosijs-ui #251, #254, #257, #258, #259, #260, #264, #268.
  - Security-relevant: **tosijs-ui #254**: `tosijs-tunnel`'s default ports can forward another
    project's dev server, so a tunnel can expose the wrong app publicly. Still open.
  - tosijs-ui #260 (dialog promises never settle on disconnect) and #268 (a failed CodeMirror
    chunk load leaves an unhandled rejection): robustness on a real-consumer package.
- Still open on real-consumer packages: tosijs #55, #43, #41, #32; tosijs-ui #222, #214, #205,
  #245/#246.
- Also still open: **kilpi #2** (custom elements pass the denylist, open 59 days; load-bearing
  because `<tosi-md>` sanitizes with kilpi by default), tosijs-platform #3, tjs-lang #55 (§N2),
  lukko #2.

### N10. Scoreboard: 4 fact cells refreshed with this report

`bun tools/scoreboard.ts`: `tosijs` → 1.10.12, `tosijs-ui` → 1.19.2, `tjs-lang` → 0.14.0 (⚠️
cleared), `tosijs-3d` → 0.13.2. "As of" advanced on verified rows. Task board, `kith-email` and
`tosijs-virta` were unreachable, so those rows were left alone. Prose cells were left to the
owner; the `tjs-lang` Activity cell is now stale (§N2).
