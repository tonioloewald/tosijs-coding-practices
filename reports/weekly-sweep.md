# Weekly security & health sweep — 2026-11-06 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).
**Nothing was written to any repo except this one**: no issues, comments, pushes or PRs.

**Scanned:** 17 GitHub repos (**tosijs-encrypt is new this week**), **23 dependency trees**
(6 nested workspaces audited separately), **16 published tarballs**, open issues on all 17 repos.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tosijs-encrypt, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto`: marked *(private)*, out of scope.
- `tosijs-virta`: private repo, not scanned.
- `tosijs-3d-ensemble`, `manta-recon`: local-only, no GitHub remote.
- `lukko`: not published (`private: true`), so no tarball. That makes 16 tarballs for 17 repos.

**Tooling:** `bun install --frozen-lockfile --ignore-scripts` + `bun audit --json` (17 trees);
`npm ci --ignore-scripts` (2 lockfile trees) and `npm install --ignore-scripts` (4 trees with no
lockfile) + `npm audit --json`; `npm view … dist-tags`; `git ls-remote --tags`;
`npm pack <pkg>@latest` + extract + grep; issues via `search/issues` (anonymous REST still 403s;
`lukko` needed `add_repo` to clone); `bun tools/scoreboard.ts`.

**Coverage:** all 23 installs exited 0.

**UNCHECKED:**

- **tosijs #56 was not reproduced.** Running the package was refused by the session's sandbox
  policy, so I read the code instead (§M1).
- **The Electron inside haltija's notarized desktop download** was not read from the binary
  (§N1). The GitHub releases page was unreachable from this session.

---

## MAJOR findings

### M1. NEW: tosijs (real consumers) has two open injection sinks, both hit in Snowfox, with no fix on `main` or npm

Both issues were opened 11-02, with production evidence from Snowfox (SNOW-8794). Neither
appears in `CHANGELOG.md` `[Unreleased]` at `main` `2f0a9e6`, and npm `latest` 1.10.10 predates
both.

- **[#56](https://github.com/tonioloewald/tosijs/issues/56): prototype pollution through proxy
  indexing.**
  - `s.map['__proto__'].x = true` is reported to write `Object.prototype`. `'constructor'` is
    refused there; `'__proto__'` and `'prototype'` are not.
  - Snowfox reached it from markup (`storage-key="__proto__"`) and from `JSON.parse`d saved
    settings.
  - Static read: the `get` trap in `src/xin.ts` (~L1403) wraps any `target[prop] !== undefined`,
    and that includes `__proto__`. `by-path.ts`'s `FORBIDDEN_SEGMENTS` guard covers the
    `setByPath` sink. Whether that guard catches this route is **unverified** (see UNCHECKED).
  - The issue's repro stands until a test says otherwise.
- **[#55](https://github.com/tonioloewald/tosijs/issues/55): a plain-object positional child is
  read as a props bag.**
  - So `span({}, JSON.parse(untrusted))` can set `innerHTML`, `bind` or `style`.
  - Snowfox reports nearly every text-showing component was an XSS sink, and `bind` got around
    its state-path allowlist.
  - It is the call-site cousin of [#43](https://github.com/tonioloewald/tosijs/issues/43)
    (open 55 days).
- Snowfox has app-level workarounds in place. Nonono and any other consumer gets no protection
  until a release ships.

**Recommended action:**

- **#56:** extend the proxy key guard to `__proto__` / `prototype`, reusing `UnsafePathError`,
  with a regression test, and ship a patch.
- **#55 / #43:** decide on the opt-in strict mode now, ship it in the next minor, and make it
  the default at the next major.

**Last week's MAJORs are resolved:**

- **haltija Electron:** `apps/desktop` now locks `electron` 43.8.6, and the tree audits 0. But
  the release that carries it is unpublished (§N1).
- **tosijs-ui:** 1.17.1 agrees across repo, tag and npm, and `beta` 1.17.0-beta.5 matches its
  tag.

**tosijs-ui** has no MAJOR findings: 1 dev moderate (`minimatch`), tarball clean.

---

## Notable, non-major

### N1. haltija `v1.13.1` tagged 11-01, not on npm, and it carries security fixes

- npm `latest` is still 1.13.0.
- The 1.13.1 `### Security` section fixes the bundled `dist/mcp.js`:
  - `zod` 3.25.76 → 4.6.7 (GHSA-mrhx-c7xc-m3w5)
  - `fast-uri` 3.1.8 → 3.1.9 (4 advisories)
- So **published 1.13.0 still ships both**. The changelog judges them unreachable: the MCP
  server's only caller is the local client over stdio.
- haltija's measured user base is zero, so this is bookkeeping by the calibration. It is still
  the one place this week where a security fix sits in a tag and not on npm.
- The changelog calls the Electron bump "development installs only, nothing shipped". The README
  advertises "a downloadable notarized desktop app". If that download is built from
  `apps/desktop`, an Electron < 43.8.1 shipped in it. Settle which statement is true (UNCHECKED
  here).
- All three haltija trees (root, `apps/desktop`, `apps/mcp`) audit **0 at every severity**, down
  from last week's highs.

**Recommended action:** `npm publish` 1.13.1. If the desktop download is a shipped artifact,
rebuild it on 43.8.6 and correct the changelog line.

### N2. happy-dom highs (test-only): four dev trees, down from five

- **Advisories:** `happy-dom` ≤20.14.x, GHSA-834v-8h66-3h79 (high), GHSA-c8p4-j97h-3vg8 (high),
  GHSA-5fpq-26gf-qwcr (moderate). Fix: `^21.0.4`.
- **Still affected:** kilpi, ngx-tosijs, tosijs-timezone-picker, react-tosijs.
- **Cleared:** tosijs-editor and tosijs-platform.
- **Do kilpi first:** its publish gate feeds a hostile-HTML corpus through the test DOM, which
  is the SSRF advisory's input class.

### N3. tosijs-platform (in production)

- **`storage.rules`:** `/users/{userId}/**` is still `allow read: if true`.
  - The file was touched 11-03. The comment now says the path is "READ-ONLY since 2026-10-17"
    and "the production bucket has no users/ folder".
  - That mitigates exposure today. It does not close the rule: any object that lands there is
    world-readable and listable.
  - [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) has been open **75 days**. If
    the folder really is empty and unused, delete the match block and close #3.
- **`functions/` has no lockfile.** A fresh resolve audits 0 high, 4 moderate, 1 low
  (`glob`, `minimatch`, `ts-deepmerge`, `uuid`; `deepmerge` low).
  - The deployed tree is whatever resolved at the last deploy.
  - `firebase-admin ^12.7.0` vs registry 14.5.0.
  - #2's "3 critical / 41 high" is stale and can be rewritten or closed.
- **Root tree (devDependencies only):** 1 high, `@grpc/grpc-js` GHSA-m9gg-hp2v-232j (<1.13.6),
  plus 1 low. Down from 6 high. Fix with `bun update`.
- **Publish:** `service-compris` 0.4.0 has been in `package.json` for 30 days, untagged and
  unpublished (`latest` 0.3.0). The package is measured-zero, so this is bookkeeping.

### N4. lukko: 2 critical / 15 high, tenth consecutive week

- 40 advisories in total, unchanged. All are transitive through the `tjs-lang ^0.3.0` pin's
  firebase subtree.
- HEAD is still `94d25be` (2026-03-04), and the package is `private: true`.
- **Fix:** `bun add tjs-lang@^0.13.13` (#2).

### N5. Publish integrity

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.10 | v1.10.10 | 1.10.10 | ✅ |
| `tosijs-ui` | 1.17.1 | v1.17.1 | 1.17.1 · `beta` 1.17.0-beta.5 | ✅ |
| `tosijs-schema` / `tosijs-floorplan` / `tosijs-encrypt` | 1.14.0 / 0.7.0 / 1.1.0 | match | match | ✅ |
| `tjs-lang` | 0.14.0-rc.10 | v0.14.0-rc.10 | 0.13.13 · `rc` 0.14.0-rc.10 | ✅ correctly staged |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.12.3 | v0.12.3 | 0.12.3 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` | 0.8.0 / 0.7.0 / 1.0.1 | match | match | ✅ |
| `haltija` | **1.13.1** | v1.13.1 | 1.13.0 | ⚠️ §N1 |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ §N3 |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on the remote (#2) |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases never published (#1) |

Stale dist-tags, unchanged from last week:

- `tosijs`: `beta` 1.7.0-beta.2, `rc` 1.8.0-rc.3
- `haltija`: `rc` 1.12.0-rc.5, `beta` 1.13.0-beta.5
- `service-compris`: `beta` 0.2.0-beta.2

### N6. Dev-tree advisories that reach no consumer

- **`react-tosijs`:** 15 high + 6 moderate. eslint-8-era tooling (`brace-expansion`, `minimatch`,
  `js-yaml`, `flatted`) plus happy-dom. HEAD has been quiet since 2026-07-27.
- **`ngx-tosijs`:** 3 Angular moderates, unchanged, plus happy-dom.
- **`tosijs-schema`:** `zod` GHSA-mrhx-c7xc-m3w5 (high) in a bench-only devDependency. Not
  shipped.
- **NEW, `minimatch` GHSA-g3hv-75wg-m249 (moderate):** in tosijs, tosijs-ui, tjs-lang (+
  `functions/`), tosijs-3d and tosijs-product. `glob` GHSA-3g3m-2fjr-6pw4 (moderate) is in
  tjs-lang. Build tooling only; `bun update` clears it.
- **Audit 0 at every severity:** haltija (all 3 trees), tosijs-editor, tosijs-encrypt,
  tosijs-floorplan, wobbly, `tjs-lang/editors/vscode`, `tosijs-platform/create-script`.

### N7. Secrets: clean

**Scope:** every tracked file in all 17 repos and all 16 published tarballs.

- **Patterns grepped:** `AIza`, `sk-`, `ghp_`, `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ`,
  `-----BEGIN … PRIVATE KEY`.
- **Files listed:** tracked `.env*`, `.pem`, `.key`, `.p12`, `id_rsa` and `.npmrc`.

**Results:**

- **No `sk.` Mapbox secret, cloud key, PAT or Slack token anywhere**, in source or in a tarball.
- **`sk-` hits are known false positives:** GFM `task-list-items` in CodeMirror sourcemaps, and
  a test label in a tosijs review. The `-----BEGIN` hit is prose in a tosijs-3d review.
- **Mapbox `pk.`:** the accepted demo token, class unchanged. One token (identical hash
  everywhere) appears in tosijs-product's README / docs / doc-comment demo in
  `src/tosi-scroll-map.ts`, and in timezone-picker's docs sourcemap.
- **Scan blind spot:** tosijs-ui now stores that token base64'd (`DEMO_TOKEN = atob(…)`), so
  this pattern scan **can no longer see it** in tosijs-ui's `dist/`. The class is the same,
  but a future `sk.` swapped in there would also be invisible to this grep.
- **Firebase web `apiKey`:** in `tjs-lang/demo/src/`. Public-class, demo-only.
- **Tracked `tosijs-platform/functions/.env.*`:** feature flags and a site host only.
- **Tarball contents:** no tarball ships `reviews/`, `journal/`, `proposals/`, `.env*`, `.npmrc`
  or keys.

### N8. Issues: 176 open across the 17 repos, all by the owner

- **Adoption instrument:** zero non-owner authors in scope. The only non-owner issues on the
  account are 2 on `foresight-rpg`, which is not a scoreboard project.
- **Open counts:** tosijs-ui 64, tjs-lang 29, tosijs-platform 27, tosijs 22, tosijs-3d 14,
  haltija 9, react-tosijs 3, kilpi 2, lukko 2, and 1 each for schema, ngx, wobbly and
  timezone-picker. Floorplan, product, editor and encrypt have 0.

**Opened since 10-23 and still open: 13.**

- tosijs #52–#57
- tosijs-3d #127
- tosijs-ui #236–#238, #244–#246, #250

Security-relevant among them:

- **tosijs #55 / #56:** §M1.
- **tosijs #54:** declarative `data-tosi-*` binding. Now in `[Unreleased]`, opt-in and closed by
  default. It binds from markup, so it deserves the pre-release security lens before it ships.
- **tosijs #57:** WebMCP adapter has an unhandled `AbortError`. Robustness, not exposure.
- **tosijs-ui #245 / #246:** live-example always builds an `AsyncFunction`, so it can't run under
  a strict CSP. Hardening.

Still open on real-consumer tosijs / tosijs-ui:

- **tosijs:** #43 (props → `innerHTML`, 55 days), #41 (password-field secrecy, 58 days), #32
  (spelling-sensitive secret paths, 65 days).
- **tosijs-ui:** #222 (debug sink), #214 (`isBreached()` fails closed), #205 (opaque-origin
  sandbox).

Also still open:

- **kilpi #2:** custom elements pass the denylist, so `<tosi-md>` is a raw-HTML sink. tosijs-ui
  now uses kilpi as its default sanitizer.
- tosijs-platform #3, tjs-lang #55 (unpinned `esm.sh/typescript@5`), lukko #2.
- **Can be closed:** tjs-lang #57 (Dependabot medium advisories in `functions/`) no longer
  reproduces: `functions/` audits 2 moderates, and neither is `qs` or `uuid`.

### N9. Scoreboard: 3 fact cells refreshed with this report

`bun tools/scoreboard.ts` was run and the result committed with this report:

- `tosijs-ui` → 1.17.1, all agree
- `tosijs-3d` → 0.12.3
- `haltija` → ⚠️ 1.13.1 tagged, unpublished

The task board, `kith-email` and `tosijs-virta` were unreachable, so those rows were left alone.
Prose Activity cells are left to the owner; the `tjs-lang` cell still says "rc.5".
