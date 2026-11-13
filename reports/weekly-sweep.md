# Weekly security & health sweep — 2026-11-13 (UTC)

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

**Coverage:** all 23 installs exited 0; every frozen-lockfile install succeeded without fallback.

**UNCHECKED:**

- **tosijs #55 was not reproduced** — status read from `CHANGELOG.md` and the issue tracker only.
- **The Electron inside haltija's notarized desktop download** — still not read from the binary;
  GitHub releases unreachable from this session (carried from last week).
- **Task board (virta)** unreachable, so board-side status of the findings below is unknown.

---

## MAJOR findings

### M1. tosijs (real consumers): #55 props-bag injection sink still unfixed on `main` and npm

- [#55](https://github.com/tonioloewald/tosijs/issues/55) (opened 11-02, from Snowfox): a
  plain-object positional child is read as a props bag, so `span({}, JSON.parse(untrusted))`
  can set `innerHTML`, `bind` or `style`.
- Not mentioned in `CHANGELOG.md` at `main` `2d61d43` (1.10.11); still open. Cousin
  [#43](https://github.com/tonioloewald/tosijs/issues/43) is now open **62 days**.
- Snowfox has app-level workarounds; Nonono and any other consumer has no protection.

**Recommended action:** decide the opt-in strict mode now, ship it in the next minor, make it the
default at the next major.

### M2. tosijs 1.10.11's deprecation step was not done — older versions point users at a vulnerable release

- 1.10.11 (published 11-11) fixes #56 (`__proto__` via proxy indexing). Its own changelog says:
  "Deprecation, after 1.10.11 is published: `>=1.8.0-0 <1.10.11`, pointing at 1.10.11 and
  replacing 1.10.10's notice."
- Registry today:
  - `tosijs@1.10.10` — **not deprecated**, though it is affected by #56.
  - `tosijs@1.8.0` … `1.10.9` — still carry the old notice ending "**Upgrade to 1.10.10.**"
- So an npm user on an old line is steered to a version with an open prototype-pollution hole.
  The fix is published, so this is a signalling gap, not an unpublished fix — but it's on a
  real-consumer package and it's the exact recurrence `practices/releasing.md` calls out
  ("deprecation strings that point at vulnerable versions are simply wrong… Do that part always").
- [#56](https://github.com/tonioloewald/tosijs/issues/56) is also still **open** although the
  fix shipped.

**Recommended action:** `npm deprecate tosijs@">=1.8.0-0 <1.10.11" "<security notice> Upgrade to
1.10.11."`, then close #56.

**tosijs-ui** has no MAJOR findings: 1.17.8 agrees across repo, tag and npm; 1 dev moderate
(`minimatch`); tarball clean.

**Resolved since last week:**

- tosijs #56 — fixed and published in 1.10.11 (bookkeeping left, §M2).
- haltija — 1.13.1 and 1.13.2 both published; npm `latest` 1.13.2 matches its tag. The bundled
  `zod` / `fast-uri` fixes are now on npm. All three haltija trees audit 0.

---

## Notable, non-major

### N1. tosijs-platform (in production)

- **`storage.rules`:** `/users/{userId}/**` still `allow read: if true` (file touched 11-13,
  block unchanged). [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) open
  **82 days**. If the folder is empty and unused, delete the match block and close #3.
- **`functions/` has no lockfile.** Fresh resolve: 0 high, 26 moderate / 3 low — but the same 5
  root advisories as last week (`glob`, `minimatch`, `ts-deepmerge`, `uuid`; `deepmerge` low);
  npm's count rose by cascade through `firebase-admin ^12.7.0` (registry latest now 14.5.1).
- **Root tree (dev only):** 1 high `@grpc/grpc-js` GHSA-m9gg-hp2v-232j (<1.13.6), 1 low.
  `bun update` clears it.
- **Publish:** `service-compris` 0.4.0 in `package.json` ~37 days, untagged, unpublished
  (`latest` 0.3.0). Measured-zero: bookkeeping.

### N2. happy-dom highs (test-only), unchanged

- `happy-dom` GHSA-834v-8h66-3h79 (high), GHSA-c8p4-j97h-3vg8 (high), GHSA-5fpq-26gf-qwcr
  (moderate); fix `^21.0.4`.
- Still in: **kilpi** (do first — its publish gate feeds hostile HTML through the test DOM),
  ngx-tosijs, tosijs-timezone-picker, react-tosijs.

### N3. lukko: 2 critical / 15 high, eleventh consecutive week

- 40 advisories, all transitive via the `tjs-lang ^0.3.0` pin (`protobufjs`, `websocket-driver`,
  `undici`, `@grpc/grpc-js`). HEAD `94d25be` (2026-03-04), `private: true`.
- Fix: `bun add tjs-lang@^0.13.13` (#2).

### N4. Publish integrity

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.11 | v1.10.11 | 1.10.11 | ✅ (deprecations: §M2) |
| `tosijs-ui` | 1.17.8 | v1.17.8 | 1.17.8 · `beta` 1.17.0-beta.5 | ✅ |
| `tosijs-schema` / `tosijs-floorplan` / `tosijs-encrypt` | 1.14.0 / 0.7.0 / 1.1.0 | match | match | ✅ |
| `tjs-lang` | 0.14.0-rc.10 | v0.14.0-rc.10 | 0.13.13 · `rc` 0.14.0-rc.10 | ✅ correctly staged |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.13.0 | v0.13.0 | 0.13.0 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` | 0.8.0 / 0.7.0 / 1.0.1 | match | match | ✅ |
| `haltija` | 1.13.2 | v1.13.2 | 1.13.2 | ✅ (was ⚠️) |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ §N1 |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on remote (#2) |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases never published (#1) |

- Reverse direction (npm version with no tag): only `react-tosijs` 1.0.1 / 1.0.2 — old, pre-1.1.0.
- Stale dist-tags, unchanged: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3; `haltija` `rc`
  1.12.0-rc.5 / `beta` 1.13.0-beta.5; `service-compris` `beta` 0.2.0-beta.2; `tosijs-ui` `beta`
  1.17.0-beta.5 (now behind `latest`).

### N5. Dev-tree advisories that reach no consumer

- `react-tosijs`: 15 high + 6 moderate (eslint-8-era tooling + happy-dom), unchanged.
- `ngx-tosijs`: 3 Angular moderates + happy-dom, unchanged.
- `tosijs-schema`: `zod` GHSA-mrhx-c7xc-m3w5 (high), bench-only devDependency.
- `minimatch` GHSA-g3hv-75wg-m249 (moderate) in tosijs, tosijs-ui, tjs-lang (+ `functions/`),
  tosijs-3d, tosijs-product; `glob` GHSA-3g3m-2fjr-6pw4 in tjs-lang. `bun update` clears them.
- **NEW:** `fast-xml-parser` GHSA-474x-hrwr-fgx4 (low) in tjs-lang and `tjs-lang/functions`.
- Audit 0 at every severity: haltija (3 trees), tosijs-editor, tosijs-encrypt, tosijs-floorplan,
  wobbly, `tjs-lang/editors/vscode`, `tosijs-platform/create-script`.

### N6. Secrets: clean

- Every tracked file in 17 repos and all 16 tarballs grepped for `AIza`, `sk-`, `ghp_`,
  `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ`, `-----BEGIN … PRIVATE KEY`, **plus the
  base64 forms of `pk.eyJ` / `sk.eyJ`** (`cGsuZXlK` / `c2suZXlK`) — this closes last week's blind
  spot for tosijs-ui's `atob(…)`-stored token.
- **No `sk.` Mapbox secret (plain or base64), cloud key, PAT or Slack token anywhere.**
- Mapbox `pk.`: the accepted demo token only (tosijs-ui `dist/mapbox.js`, sourcemaps, docs;
  downstream in tosijs-product, tosijs-3d and timezone-picker demo builds). Class unchanged.
- `sk-` hits are known false positives (GFM `task-list-items` / `Map-and-D…` in sourcemaps, prose
  in tjs-lang docs, a `sk-live-LABEL` test string in a tosijs review); `-----BEGIN` is prose in a
  tosijs-3d review.
- Firebase web `apiKey` in `tjs-lang/demo/src/`: public-class, demo-only.
- Tracked env files: `tosijs-platform/functions/.env.*` (feature flags + site host),
  `tosijs/.env.example` (placeholder values only).
- No tarball ships `reviews/`, `journal/`, `proposals/`, `.env*`, `.npmrc` or keys.

### N7. Issues: 180 open across the 17 repos, all by the owner

- Adoption instrument: zero non-owner authors in scope (only non-owner issues on the account are
  2 on `foresight-rpg`, not a scoreboard project).
- Open counts: tosijs-ui 68, tjs-lang 29, tosijs-platform 28, tosijs 21, tosijs-3d 14, haltija 9,
  react-tosijs 3, kilpi 2, lukko 2; 1 each for schema, ngx, wobbly, timezone-picker.
- **Opened in the last 14 days (since 10-30), still open:** tosijs #55–#57; tosijs-platform #38;
  tosijs-ui #250, #251, #254, #257, #258.
  - Security-relevant: tosijs #55 / #56 (§M1, §M2); **tosijs-ui #254** — `tosijs-tunnel`'s
    default ports can forward another project's dev server, i.e. a tunnel can expose the wrong
    app publicly. Worth a look before next tunnel use.
  - tosijs-platform #38 (500 instead of 400 on bad `p`) — robustness.
- Still open on real-consumer packages: tosijs #43, #41, #32; tosijs-ui #222, #214, #205, #245/#246.
- Also still open: kilpi #2 (custom elements pass the denylist — load-bearing since tosijs-ui
  defaults to kilpi), tosijs-platform #3, tjs-lang #55 (unpinned `esm.sh/typescript@5`), lukko #2.

### N8. Scoreboard: 3 fact cells refreshed with this report

`bun tools/scoreboard.ts`: `tosijs` → 1.10.11, `tosijs-ui` → 1.17.8, `tosijs-3d` → 0.13.0;
"As of" advanced on verified rows. Task board, `kith-email` and `tosijs-virta` unreachable — those
rows left alone. Prose cells left to the owner (the `tjs-lang` Activity cell still says "rc.5").
