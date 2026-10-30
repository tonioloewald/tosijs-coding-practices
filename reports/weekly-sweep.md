# Weekly security & health sweep — 2026-10-30 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).
**Nothing was written to any repo except this one**: no issues, comments, pushes or PRs.

**Scanned:** 16 GitHub repos, **22 dependency trees** (6 nested workspaces audited separately),
**16 published tarballs**, open issues enumerated on all 16 repos.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto`: marked *(private)*, out of scope.
- `tosijs-3d-ensemble`, `manta-recon`: local-only repos with no GitHub remote. Ensemble's
  registry state was refreshed by `scoreboard.ts` (0.9.0, all agree).
- `tosijs-virta`: private repo, not scanned.

**Tooling:** `bun install --frozen-lockfile --ignore-scripts` + `bun audit --json`;
`npm ci --ignore-scripts` (lockfile trees) / `npm install --ignore-scripts` (no-lockfile trees) +
`npm audit --json`; `npm view … dist-tags|versions`; `git ls-remote --tags`; `npm pack <pkg>@latest`
+ extract + grep; GitHub MCP `list_issues` / `list_releases` (anonymous REST still 403s, so the
repos were attached via `add_repo`; `lukko` needed that to clone); `bun tools/scoreboard.ts`.

**Coverage:** all 16 bun trees and both `npm ci` trees installed against their committed
lockfiles (exit 0). Four trees have no lockfile and were read from a fresh resolve (§N3, §N6).
**UNCHECKED:** the Electron version inside haltija's *published notarized desktop download* —
inferred from the lockfile, not read from the binary (§M1).

---

## MAJOR findings

### M1. NEW: haltija desktop app pins an Electron with a high advisory (compromised CA intermediates)

- `haltija/apps/desktop/package-lock.json` resolves `electron` **43.7.9** (direct dependency,
  `^43.4.1`). [GHSA-jr5w-w6x2-84p9](https://github.com/advisories/GHSA-jr5w-w6x2-84p9) (high):
  "Mitigation for compromised eMudhra intermediate certificates", affects `>=43.0.0-alpha.1
  <43.8.1`. Electron 43.8.5 is current.
- Why it matters here: the desktop app is a browser that agents point at arbitrary origins, so
  trusting a compromised intermediate is directly in its threat surface. The README advertises
  "a downloadable notarized desktop app"; v1.13.0 was released 10-18 and the lockfile was last
  touched 10-19, so the shipped binary most likely embeds ≤43.7.9 (UNCHECKED — binary not
  inspected).
- Graded MAJOR because it is a code-level high in a shipped artifact; haltija's measured user
  base is still zero, so the urgency is "next release", not "tonight".
- Also in that tree (non-shipping): `undici` 7.30.0 high ×8 via `electron → @electron/get`
  (download-time only); `fast-uri` moderates.

**Recommended action:** bump `electron` to `^43.8.1` in `apps/desktop`, refresh the lockfile,
rebuild and re-notarize the desktop download.

### M2. tosijs-ui `v1.17.0-beta.2` tagged on the remote, not on npm — beta only, no security content

- `package.json` 1.17.0-beta.2, tag `v1.17.0-beta.2` at `f6eb076` (committed 10-29 23:43 UTC);
  npm `beta` is still **1.17.0-beta.1**. ~22 h old at sweep time.
- Graded by rule (tosijs-ui has real consumers), but the blast radius is small: `latest`
  (1.16.41) is consistent repo · tag · npm, and the beta.2 changelog is doc-build /
  accessibility fixes with no security fix stranded.

**Recommended action:** `npm publish --tag beta` (or record the hold). Re-check next week.

**tosijs** is clean on every instrument: frozen audit 0, 1.10.10 repo · tag · npm agree, tarball
carries no secrets or internal material. **Last week's M1 (node-forge in `tosijs-platform/functions`)
no longer resolves** — see §N3 for why that isn't the same as fixed in production.

---

## Notable, non-major

### N1. NEW: happy-dom highs in five dev trees (test-only)

`happy-dom` ≤20.14.x (devDependency, `^20.x`) in **kilpi, tosijs-editor, tosijs-timezone-picker,
tosijs-platform, ngx-tosijs**:
[GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79) (high, host code
execution via unsanitized import alias, `<=21.0.3`),
[GHSA-c8p4-j97h-3vg8](https://github.com/advisories/GHSA-c8p4-j97h-3vg8) (high, SSRF via
iframe / link stylesheet when parsing untrusted HTML),
[GHSA-5fpq-26gf-qwcr](https://github.com/advisories/GHSA-5fpq-26gf-qwcr) (moderate). Fix is
`happy-dom@^21.0.4` (major). Nothing ships it. **Do kilpi first:** its publish gate feeds a
hostile-HTML corpus through the test DOM on the dev machine and CI — exactly the input class
of the SSRF advisory.

### N2. haltija root tree: zod still bundled, body-parser new but dev-only

- `zod` [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (high): published
  1.13.0 `dist/mcp.js` still inlines `node_modules/zod/v3/*` alongside the SDK's own v4. Reach
  analysis unchanged from last week (no length-constrained collections, local stdio) — move
  `apps/mcp` to `zod@^4.6.6`. Same advisory in tosijs-schema's bench-only devDep (not shipped).
- NEW `body-parser` 2.3.0 [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828)
  (high, DoS) via `@modelcontextprotocol/sdk → express`: **not** bundled into `dist/mcp.js` (no
  express in the bundle). `bun update body-parser` (→ ≥2.4.0).
- NEW `fast-uri` <3.1.9: 2 moderate + 2 low.

### N3. tosijs-platform (in production)

- **`functions/` (no lockfile):** a fresh resolve now gets `node-forge` 1.4.2 and audits
  **0 high**, 10 moderate, 5 low — last week's signature-forgery high cleared upstream within the
  caret. But with no lockfile, **the deployed tree is whatever resolved at the last deploy**; only
  a redeploy (ideally with a committed lockfile) picks the fix up. The moderates still collapse
  into `firebase-admin@14.5.0` / `@google-cloud/firestore@9.4.0` (semver-major).
- Root tree (devDependencies only): 6 high, 2 moderate, 1 low — `follow-redirects` ×2 and
  `@grpc/grpc-js` (unchanged), happy-dom ×2 (§N1), and NEW `re2js` <2.8.7
  [GHSA-gg6h-894w-4m9c](https://github.com/advisories/GHSA-gg6h-894w-4m9c) (quadratic lookbehind
  DoS) via `firebase → @firebase/firestore`. The firebase web SDK is bundled into the deployed
  client, but this is client-side self-DoS at worst. `bun update` clears the lot.
- `storage.rules` / #3: unchanged since last week's read-only change; #3 still open (68 days).
- `service-compris` **0.4.0** in `package.json`, untagged and unpublished (`latest` 0.3.0) —
  **23 days**. Measured-zero, so bookkeeping.

### N4. `lukko`: 2 critical / 15 high, ninth consecutive week

40 advisories (was 36), all transitive through the `tjs-lang ^0.3.0` pin's firebase subtree.
HEAD still `94d25be` (2026-03-04); `private: true`, ships nothing. Fix: `bun add tjs-lang@^0.13.13` (#2).

### N5. Publish integrity (measured-zero packages, so bookkeeping)

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.10 | v1.10.10 | 1.10.10 | ✅ |
| `tosijs-ui` | 1.17.0-beta.2 | v1.17.0-beta.2 | 1.16.41 · `beta` 1.17.0-beta.1 | ⚠️ §M2 |
| `tosijs-schema` | 1.14.0 | v1.14.0 | 1.14.0 | ✅ |
| `tosijs-floorplan` | 0.7.0 | v0.7.0 | 0.7.0 | ✅ |
| `tjs-lang` | 0.14.0-rc.9 | v0.14.0-rc.9 | 0.13.13 · `rc` 0.14.0-rc.9 | ✅ correctly staged |
| `haltija` | 1.13.0 | v1.13.0 | 1.13.0 | ✅ |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.11.5 | v0.11.5 | 0.11.5 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` | 0.8.0 / 0.7.0 / 1.0.1 | match | match | ✅ |
| `tosijs-3d-ensemble` (local) | 0.9.0 | v0.9.0 | 0.9.0 | ✅ (per `scoreboard.ts`) |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ §N3 |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on the remote (#2) |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases never published (#1) |

- Tagged-but-unpublished on older lines, not previously listed: haltija `v1.11.1`, `v1.11.3`,
  `v1.12.3`, `v1.12.4`, `v1.12.0-rc.1` — superseded, harmless; note or delete when convenient.
- Reverse direction: only historic gaps on old lines plus timezone-picker. Every current
  `latest` except timezone-picker has its tag on the remote.
- Stale dist-tags unchanged: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3; `haltija` `rc`
  1.12.0-rc.5 / `beta` 1.13.0-beta.5; `service-compris` `beta` 0.2.0-beta.2.

### N6. Dev-tree advisories that reach no consumer

- `react-tosijs`: 15 high + 6 moderate (was 13 + 5), eslint 8 dev tree + browserslist (#4, #5).
  HEAD quiet since 2026-07-27.
- `ngx-tosijs`: 3 Angular moderates (unchanged) + happy-dom (§N1). HEAD quiet since 2026-07-23.
- No lockfile: `tosijs-platform/functions` (§N3), `tosijs-platform/create-script` (0),
  `tjs-lang/editors/vscode` (0), `haltija/apps/mcp` (0 own deps; see §N2 for what it bundles).
- **Audit 0 at every severity:** tosijs, tosijs-ui, tosijs-floorplan, tjs-lang + `functions/`,
  tosijs-3d, tosijs-product, wobbly.

### N7. Secrets: clean

Grepped every tracked file in all 16 repos and all 16 published tarballs for `AIza`, `sk-`,
`ghp_`, `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ`, `-----BEGIN … PRIVATE KEY`, and listed
tracked `.env*` / `.pem` / `.key` / `.p12` / `id_rsa` / `.npmrc`. Same hit set as last week:

- **No `sk.` Mapbox secret, cloud key, PAT or Slack token anywhere**, source or tarball.
- `sk-` hits are the known false positives (GFM `task-list-items` in CodeMirror sourcemaps,
  including tosijs-ui's published `dist/iife.js.map`; a test label in a tosijs review).
  `-----BEGIN` is prose in `tosijs-3d/reviews/0.7.0-pre-tag-gate.md`.
- Mapbox `pk.`: accepted finding, class unchanged (tosijs-product README/docs/src and
  timezone-picker docs sourcemap).
- Firebase web `apiKey` in `tjs-lang/demo/src/` — public-class, demo-only, not shipped.
- Tracked `tosijs-platform/functions/.env.sandbox` / `.env.liquid-force-425209-g2` hold feature
  flags only; `tosijs/.env.example` is a template.
- No tarball ships `reviews/`, `journal/`, `proposals/`, `.env*`, `.npmrc` or keys.

### N8. Issues: 175 open, all authored by the owner

Still **zero non-owner authors**, so the public adoption instrument reads zero. Open: tosijs-ui
66, tjs-lang 29, tosijs-platform 27, tosijs 19, tosijs-3d 14, haltija 9, react-tosijs 3, kilpi 2,
lukko 2, and 1 each for schema, ngx, wobbly and timezone-picker. Floorplan, product, editor: 0.

**Opened in the last 14 days and still open (since 10-16), 21:** tosijs #51–#54; tosijs-ui #229,
#231, #236–#238, #240, #241, #243–#246; tosijs-3d #117, #122–#124, #126, #127.
Security-relevant among them:

- tosijs-ui **#245 / #246** — live-example always compiles via `AsyncFunction`/eval, so doc sites
  can't run under a strict CSP; a no-code mode is proposed. Hardening, not a vuln.
- tosijs **#52** — tosijs-schema 1.14.0's path-parsing gate refuses respelled agent writes:
  fails *closed*, a functional regression for agent writes, not an exposure.
- tosijs **#54** — declarative `data-tosi-*` binding, opt-in and closed by default. Worth a
  security review before it ships, since it binds from markup.
- tosijs-3d #127 — row leak per repaint in `foldSections` (resource, not security).

**Still open on real-consumer `tosijs` / `tosijs-ui`:** tosijs
[#43](https://github.com/tonioloewald/tosijs/issues/43) (untrusted props can set `innerHTML`, 48
days), [#41](https://github.com/tonioloewald/tosijs/issues/41) (password-field secrecy, 51 days),
[#32](https://github.com/tonioloewald/tosijs/issues/32) (spelling-sensitive secret paths, 58
days); tosijs-ui #222 (debug sink), #214 (`isBreached()` fails closed on 429/5xx), #205
(opaque-origin sandbox for untrusted live examples).

**Also still open:** tosijs-platform #2 (its numbers are stale again — fresh resolve is 0 high),
#3, #24, #28, #35, #36, #37; kilpi #1/#2; tjs-lang #55 (unpinned `esm.sh/typescript@5`) / #56;
tosijs-schema #12; haltija #55; lukko #2. tjs-lang #57 still doesn't reproduce (`functions/` audits
0) and can be closed.

### N9. Scoreboard: 6 fact cells refreshed with this report

`bun tools/scoreboard.ts` run and committed: `tosijs` → 1.10.10, `tosijs-ui` → ⚠️ (1.17.0-beta.2
tagged, §M2), `tosijs-schema` → 1.14.0, `tjs-lang` → rc.9, `tosijs-3d` → 0.11.5,
`tosijs-3d-ensemble` → 0.9.0. Task board, `kith-email` and `tosijs-virta` were unreachable; those
rows were left alone. Prose Activity cells are left to the owner; the **tjs-lang** cell still says
"rc.5" and the **tosijs-schema** cell doesn't mention 1.14.0.
