# Weekly security & health sweep — 2026-10-23 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).
**Nothing was written to any repo except this one**: no issues, comments, pushes or PRs.

**Scanned:** 16 GitHub repos, **22 dependency trees** (6 nested workspaces audited separately),
**16 published tarballs**, open issues enumerated on all 16 repos.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto`: marked *(private)*, out of scope.
- `tosijs-3d-ensemble`, `manta-recon`: local-only repos with no GitHub remote to clone.
  Ensemble's registry state *is* measurable (§N4).
- `tosijs-virta`: private repo, not scanned.

**Tooling:** `bun install --frozen-lockfile --ignore-scripts` + `bun audit --json`.
`npm ci --ignore-scripts` (lockfile trees) / `npm install --ignore-scripts` (no-lockfile trees) +
`npm audit --json`. `npm view … dist-tags|versions`, `git ls-remote --tags`, `npm pack <pkg>@latest`
+ extract + grep. GitHub MCP `list_issues` (anonymous REST still returns 403, so the repos were
attached via `add_repo`; `lukko` also needed that to clone). `bun tools/scoreboard.ts`.

**Coverage:** all 16 bun trees and both `npm ci` trees installed against their committed
lockfiles (exit 0). Four trees have no lockfile and were read from a fresh resolve (§N5).
**Nothing is UNCHECKED this week.**

---

## MAJOR findings

### M1. `tosijs-platform/functions`: the node-forge signature-forgery high is still in the deployed production tree, now 61 days on, with no lockfile

Fresh resolve: **2 high, 9 moderate, 0 critical** (last week 11 high; the ten dev-only
`braces` highs from the eslint 8 chain no longer resolve as vulnerable, the production one does).

- **Production-reaching:** `firebase-admin ^12.7.0` (direct, `dependencies`) → `node-forge`
  [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (RSA PKCS#1 v1.5
  signature verification accepts extra nested `DigestAlgorithm` elements). The caret can't reach
  the fix; `npm audit` names `firebase-admin@14.5.0` (semver-major).
- The 9 moderates (`@google-cloud/storage`, `gaxios`, `google-gax`, `retry-request`,
  `teeny-request`, `uuid` …) collapse into the same `firebase-admin` / `@google-cloud/firestore`
  bump.
- Still no committed lockfile in `functions/`, so each deploy re-resolves.
- The fix is proven in-ecosystem: `tjs-lang/functions` audits **0** at every severity again.
- HEAD (`599497a`, 10-21) is active — the repo is being worked on, this just isn't.

**Recommended action (unchanged):** `firebase-admin@^14.5.0` in `functions/`, commit a lockfile,
redeploy. Correct #2's stale "3 critical / 41 high" numbers while there.

**tosijs** and **tosijs-ui** (the real-consumer packages) are clean on every instrument: frozen
audit 0, repo · tag · npm agree (1.10.9 / **1.16.31**), tarballs carry no secrets or internal
material. **Last week's M1 (tosijs-ui 1.16.24 tagged, unpublished) is cleared**: 1.16.24 hit npm
10-17 06:25 UTC, and 1.16.31 is now `latest`.

---

## Notable, non-major

### N1. NEW: a high zod advisory is bundled into haltija's published `dist/mcp.js` — graded non-major after a reachability check

[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (zod < 4.6.6, CVSS 7.5,
CWE-770: memory exhaustion while validating oversized *constrained* collections) shows up as
1 high in both `haltija` and `tosijs-schema` root audits.

- **haltija — shipped.** `zod ^3.25.76` is a root *devDependency*, but `apps/mcp` declares "its
  dependencies are the root package's devDependencies" and `scripts/build.ts` bundles it into
  `dist/mcp.js`, shipped as the `haltija-mcp` bin. Verified in the published 1.13.0 tarball:
  `dist/mcp.js` inlines `node_modules/zod/v3/*` (the 3.25.76 copy) alongside the MCP SDK's own
  nested zod **4.6.7** (patched). Consumer `npm audit` can't see this — it's bundled, not declared.
- **Why not major:** the server's own schemas use no length-constrained collections
  (`apps/mcp/src/index.ts` builds `z.array(z.string())`, no `.max()`), and the transport is
  local stdio fed by the agent, not the network. The SDK's own validation already uses the
  patched 4.6.7.
- **tosijs-schema — not shipped.** `zod` is a devDependency used only by `bench.ts`; the
  18-file tarball has no zod.

**Recommended action:** haltija — move `apps/mcp` to `zod@^4.6.6` (the SDK already accepts
`^3.25 || ^4.0`, and v4 has no 3.x backport), so the bundle stops carrying the vulnerable copy;
consider a guard that audits bundled devDeps, since this class is invisible to every consumer
instrument. tosijs-schema — bump the bench dep when convenient.

### N2. Security postures on `tosijs-platform` (in production)

- **`storage.rules` changed (10-21):** `/users/{userId}/{path=**}` is now **read-only** — client
  writes removed (board #2486), and the comment states the production bucket has no `users/`
  folder. `allow read: if true` (which includes `list`) remains on line 43, so the exposure is
  now "nothing to read" rather than "user uploads enumerable". Materially narrowed; closing #3 with
  that rationale (or dropping the rule) would end the ecosystem's longest-open security question.
- Root tree: 3 high + 1 low, all dev-only — `follow-redirects` 1.16.0
  ([GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8),
  [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c), **new** this week,
  via `http-server` → `http-proxy`) and `@grpc/grpc-js`
  [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j). The root has only
  devDependencies; `bun update follow-redirects` (→ 1.16.1) clears the new pair.

### N3. `lukko`: 2 critical / 13 high, eighth consecutive week, same one-line fix

Byte-identical counts (36 advisories): `protobufjs` (critical ACE
[GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) + 5 high),
`websocket-driver` (critical), `undici` ×5 high, `@grpc/grpc-js` ×3 high — all transitive through
the `tjs-lang ^0.3.0` pin's firebase subtree. HEAD still `94d25be` (2026-03-04); `private: true`,
ships nothing, but installs on the dev machine. Fix: `bun add tjs-lang@^0.13.13` (#2).

### N4. Publish integrity (measured-zero packages, so bookkeeping)

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.9 | v1.10.9 | 1.10.9 | ✅ |
| `tosijs-ui` | 1.16.31 | v1.16.31 | 1.16.31 | ✅ (last week's M1 cleared) |
| `tosijs-schema` | 1.13.0 | v1.13.0 | 1.13.0 | ✅ |
| `tosijs-floorplan` | 0.7.0 | v0.7.0 | 0.7.0 | ✅ |
| `tjs-lang` | 0.14.0-rc.8 | v0.14.0-rc.8 | 0.13.13 · `rc` 0.14.0-rc.8 | ✅ correctly staged |
| `haltija` | 1.13.0 | v1.13.0 | 1.13.0 | ✅ (beta → final since last week) |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.11.4 | v0.11.4 | 0.11.4 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` | 0.8.0 / 0.7.0 / 1.0.1 | match | match | ✅ |
| `create-tosijs-platform-app` | 1.0.6 | (no own tag, by design) | 1.0.6 | ✅ |
| `tosijs-3d-ensemble` (local) | 0.8.1 | v0.8.1 | 0.8.1 | ✅ (last week's 0.6.0 gap cleared, per `scoreboard.ts`) |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ 0.4.0 untagged and unpublished, **16 days** |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on the remote; all 5 published versions untagged |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases never published |

Reverse direction (published but untagged): only historic gaps on older lines (e.g. tosijs ≤1.6,
tosijs-ui ≤1.5, tjs-lang ≤0.8, haltija 1.3 betas) plus timezone-picker. **Every current `latest`
except timezone-picker has its tag on the remote.**

Stale dist-tags unchanged: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3; `haltija` `rc`
1.12.0-rc.5 and now `beta` 1.13.0-beta.5 (both below `latest` 1.13.0); `service-compris` `beta`
0.2.0-beta.2 (below `latest`). `npm dist-tag rm` when convenient.

### N5. Dev-tree advisories that reach no consumer (unchanged)

- `react-tosijs`: 13 high + 5 moderate, eslint 8 dev tree (`brace-expansion`, `js-yaml`,
  `minimatch`, `flatted`). HEAD quiet since 2026-07-27.
- `ngx-tosijs`: 3 moderate (Angular
  [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c),
  [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg)). HEAD quiet since
  2026-07-23.
- No lockfile: `tosijs-platform/functions` (§M1), `tosijs-platform/create-script` (0),
  `tjs-lang/editors/vscode` (0), `haltija/apps/mcp` (0 — it has no dependencies of its own; see
  §N1 for what it bundles).
- **Every other tree audits 0 at every severity**: tosijs, tosijs-ui, tosijs-floorplan, tjs-lang
  + `functions/`, tosijs-3d, tosijs-product, tosijs-editor, tosijs-timezone-picker, kilpi, wobbly,
  `haltija/apps/desktop`.

### N6. `tjs-lang#55` still unfixed in the 0.14.0 line

`DEFAULT_TYPESCRIPT_URL = 'https://esm.sh/typescript@5'` is unchanged in rc.8 source
(`src/lang/browser-from-ts.ts:27`), as well as in the published 0.13.13. The final is the cheap
moment to pin it.

### N7. Secrets: clean

Grepped every tracked file in all 16 repos and all 16 published tarballs for `AIza`, `sk-`,
`ghp_`, `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ` and `-----BEGIN … PRIVATE KEY`, and
listed tracked `.env*` / `.pem` / `.key` / `.p12` / `id_rsa` / `.npmrc`.

- **No `sk.` Mapbox secret, cloud key, PAT or Slack token anywhere**, source or tarball.
- `sk-…` hits are the known false positives: the GFM `task-list-items` URL in CodeMirror
  sourcemaps (tosijs-ui `dist/iife.js.map`, doc builds) and a test label in
  `tosijs/reviews/1.9.0-preminor-round3.md`. The `-----BEGIN` hit is the prose of
  `tosijs-3d/reviews/0.7.0-pre-tag-gate.md`.
- Mapbox `pk.`: **accepted finding, not re-raised; class unchanged.** tosijs-ui now stores the demo
  token base64'd (`src/mapbox.ts`, with a comment saying why — not as concealment), so it no
  longer matches a plain grep there. It still appears in tosijs-product's README, doc builds and
  a usage example in a doc comment in `src/tosi-scroll-map.ts` (unchanged since 10-01; the
  published dist does not embed it).
- Firebase web `apiKey` in `tjs-lang/demo/` — public-class, demo-only, not shipped. Unchanged.
- Tracked `tosijs-platform/functions/.env.sandbox` / `.env.liquid-force-425209-g2` hold feature
  flags only; `tosijs/.env.example` is a template. Not findings.
- **No tarball ships internal material:** no `reviews/`, `journal/`, `designs/`, `proposals/`,
  `.env*`, `.npmrc` or keys.

### N8. Issues: 162 open, all authored by the owner

Still **zero non-owner authors** (open, and the 34 closed since 10-16), so the public adoption
instrument still reads zero. Open counts: tosijs-ui 57, tjs-lang 29, tosijs-platform 27, tosijs
16, tosijs-3d 13, haltija 9 (was 14), react-tosijs 3, kilpi 2, lukko 2, and 1 each for schema,
ngx, wobbly and timezone-picker. Floorplan, product and editor are at 0.

**13 opened in the last 14 days and still open** (since 10-09): tosijs-3d #103, #117, #122,
#123, #124, #126; tosijs-ui #220, #221, #222, #229, #231; tosijs #51; tosijs-platform #37. None
new this week is security-relevant.

**Closed this week (security-relevant):** haltija #44 (REST surface answers any origin / role of
`--token`) and #45 (arrow-token neutralization), tosijs-ui #227 (opt-in LAN trust for source
edit) and #232 (preview edit key expires after 24 h). haltija #47 (apps/mcp doesn't compile) is
closed too.

**Still open on real-consumer `tosijs` / `tosijs-ui`:**
[tosijs#43](https://github.com/tonioloewald/tosijs/issues/43) (an untrusted props object can set
`innerHTML`, 41 days), [#41](https://github.com/tonioloewald/tosijs/issues/41) (password-field
secrecy, 44 days), [#32](https://github.com/tonioloewald/tosijs/issues/32) (spelling-sensitive
secret paths, 51 days); tosijs-ui #222 (debug sink), #214 (`isBreached()` treats 429/5xx as
breached), #205 (opaque-origin sandbox for untrusted live examples).

**Also still open:** tosijs-platform #2, **#3 (61 days — now answerable, see §N2)**, #24, #28,
#35, #36, #37; kilpi #1/#2 (custom-element pass-through while tosijs-ui's sanitize default
depends on it); tjs-lang #55/#56; tosijs-schema #12 (ReDoS-safe pattern engine); haltija #55;
lukko #2. tjs-lang #57 (Dependabot moderates in `functions/`) still doesn't reproduce (0
advisories) and can be closed.

### N9. Scoreboard: 5 fact cells refreshed with this report

`bun tools/scoreboard.ts` run and committed (the sanctioned mechanism, not a hand edit):
`tosijs-ui` → 1.16.31, `tosijs-floorplan` → 0.7.0, `tjs-lang` → `package.json` 0.14.0-rc.8,
`tosijs-3d` → 0.11.4, `tosijs-3d-ensemble` → 0.8.1 — all agreeing. The task board and
`kith-email` / `tosijs-virta` were unreachable, so those rows were left alone without advancing
"As of". Prose Activity cells are left to the owner; note the **tjs-lang** cell still says
"rc.5" and the **service-compris** cell's `storage.rules` warning predates the 10-21 read-only
change (§N2).
