# Weekly security & health sweep — 2026-10-16 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).
**Nothing was written to any repo except this one**: no issues, comments, pushes or PRs.

**Scanned:** 16 GitHub repos, **22 dependency trees** (6 nested workspaces audited separately),
**16 published tarballs**, **165 open issues enumerated in full**.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto`: marked *(private)*, out of scope.
- `tosijs-3d-ensemble`, `manta-recon`: local-only repos with no GitHub remote to clone.
  Ensemble's registry state *is* measurable (§N4).
- `tosijs-virta`: private repo, not scanned.

**Tooling:** `bun install --frozen-lockfile --ignore-scripts` + `bun audit --json` (clean means
exit 0 and a 3-byte `{}`). `npm ci --ignore-scripts` / `npm install --ignore-scripts` +
`npm audit --json`. `npm view … dist-tags|time`, `git ls-remote --tags`, `npm pack <pkg>@latest`
+ extract + grep. GitHub MCP `list_issues` (the anonymous REST lane returns 403 here, so all 16
repos were attached via `add_repo` to read issues). `bun tools/scoreboard.ts`. Audits ran
serially.

**Coverage:** all 17 bun trees and both `npm ci` trees installed against their committed
lockfiles (exit 0), so those readings describe the committed tree. Three trees have no lockfile
and were read from a fresh resolve (§N5). **Nothing is UNCHECKED this week.**

---

## MAJOR findings

### M1. `tosijs-ui` 1.16.24 is tagged on the remote but not on npm (real-consumer package). It was 25 min old at sweep time, so this is provisional

| package.json | remote tag | npm `latest` |
| --- | --- | --- |
| 1.16.24 | `v1.16.24` → `a986948` (committed 20:50 UTC) | **1.16.23** (published 16:44 UTC) |

Last re-checked at 21:16 UTC and 1.16.24 was still not on npm. HEAD reads *"fix: 1.16.24 review —
bounded rule chains…"*. The CHANGELOG lists one hardening fix: icon composition chains now stop at
four rules deep, *"which keeps a hostile icon name cheap to resolve"*. It also lists dev-server
access changes: `trustLan` source writes are now logged with a log-injection-safe filename, and
"Save to source" now works beyond localhost. 1.16.18 through 1.16.23 all shipped within hours of
their commits, so this is most likely a release still in flight, not a stall. **Graded major only
because tosijs-ui has real consumers and the unpublished part includes a DoS bound.**

**Recommended action:** confirm `npm view tosijs-ui version` reads 1.16.24. If it doesn't, publish
or record the hold. This is the ecosystem's most-recurring failure class.

### M2. `tosijs-platform/functions`: the node-forge signature-forgery high is still in the deployed production tree, 54 days on, with no lockfile

Unchanged from last week. Fresh resolve: **11 high, 28 moderate, 0 critical**.

- **Production-reaching:** `firebase-admin ^12.7.0` (direct, `dependencies`) →
  `node-forge` [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (RSA
  PKCS#1 v1.5 signature verification accepts extra nested `DigestAlgorithm` elements). The caret
  can't reach the fix, which needs `firebase-admin@14.x` (a semver-major).
- **Dev-only (doesn't deploy):** the other ten highs are one `@typescript-eslint` 5 / `eslint` 8 →
  `globby` → `micromatch` → `braces` chain ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)).
- There is still no committed lockfile in `functions/`, so each deploy re-resolves.
- The fix is proven in-ecosystem: `tjs-lang/functions` (`firebase-admin ^14.3.0`) audits
  **0** at every severity again this week.
- [tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2) is still open and
  still claims "3 critical / 41 high", which doesn't reproduce.

**Recommended action (unchanged):** `firebase-admin@^14.5.0` in `functions/`, commit a lockfile,
redeploy. Correct #2's numbers.

**tosijs** is clean on every instrument: frozen audit clean, repo, tag and npm agree at 1.10.9, and
the tarball has no secrets or internal material. **tosijs-ui** is clean too apart from M1.

---

## Notable, non-major

### N1. Cleared since last week

- **`haltija/apps/mcp` is clean: 0 advisories at every severity** (last week: 1 critical, 3 high,
  6 moderate). The committed `bun.lock` (updated 2026-10-16) now pins
  `@modelcontextprotocol/sdk@1.32.1` and `proxy-addr@2.0.8`, which is what last week's report
  recommended. [haltija#46](https://github.com/tonioloewald/haltija/issues/46) is now closed.
  [#47](https://github.com/tonioloewald/haltija/issues/47) (apps/mcp doesn't compile) is still
  open.

### N2. Security postures still open on `tosijs-platform` (in production)

- **`storage.rules` hasn't changed:** `/users/{userId}/{path=**}` still has `allow read: if true`
  (line 44). In Storage rules that includes `list`, so anyone who knows a uid can enumerate and
  download that user's uploads.
  [#3](https://github.com/tonioloewald/tosijs-platform/issues/3) is still unanswered at
  **54 days**.
- **New and related:** [#37](https://github.com/tonioloewald/tosijs-platform/issues/37) (10-14) says
  *public reads carry the writer's `_by` stamp (uid, role id, name)*. That is the channel that makes
  uids non-secret, so #37 and #3 together are the full exposure path. Fixing either one narrows it.
- [#36](https://github.com/tonioloewald/tosijs-platform/issues/36) (review the tjs-lang 0.14.0-rc.2
  VM tightening before final), #35 (fail-closed GET/LIST), #28 (provenance names the wrong
  principal) and #24 (silent role-doc invisibility) are all still open.

### N3. `lukko`: 2 critical / 13 high, seventh consecutive week, same one-line fix

The counts are byte-identical to last week: `protobufjs` (critical: ACE
[GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg), plus 5 high),
`websocket-driver` (critical), `undici` ×5 high and `@grpc/grpc-js` ×3 high. They are all transitive
through the `tjs-lang ^0.3.0` pin's firebase runtime subtree. HEAD is still `94d25be` (2026-03-04).
The package is `private: true` and ships nothing. Fix: `bun add tjs-lang@^0.13.13`
([#2](https://github.com/tonioloewald/lukko/issues/2), 54 days).

### N4. Publish integrity (measured-zero packages, so bookkeeping)

| Repo | package.json | remote tag | npm | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.9 | v1.10.9 | 1.10.9 | ✅ |
| `tosijs-ui` | 1.16.24 | v1.16.24 | 1.16.23 | ⚠️ §M1 |
| `tosijs-schema` | 1.13.0 | v1.13.0 | 1.13.0 | ✅ |
| `tosijs-floorplan` | 0.5.2 | v0.5.2 | 0.5.2 | ✅ |
| `tjs-lang` | 0.14.0-rc.5 | v0.14.0-rc.5 | 0.13.13 · `rc` 0.14.0-rc.5 | ✅ correctly staged |
| `haltija` | 1.13.0-beta.3 | v1.13.0-beta.3 | 1.12.9 · `beta` 1.13.0-beta.3 | ✅ correctly staged |
| `react-tosijs` / `ngx-tosijs` | 1.2.1 / 0.9.1 | match | match | ✅ |
| `tosijs-3d` | 0.10.9 | v0.10.9 | 0.10.9 | ✅ |
| `tosijs-product` / `tosijs-editor` / `kilpi` | 0.8.0 / 0.7.0 / 1.0.1 | match | match | ✅ |
| `create-tosijs-platform-app` | 1.0.6 | (no own tag, by design) | 1.0.6 | ✅ |
| `tosijs-platform` (`service-compris`) | **0.4.0** | v0.3.0 | 0.3.0 | ⚠️ 0.4.0 untagged and unpublished, **9 days** (the re-review cleared 10-07) |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | ⚠️ zero tags on the remote ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2), 54 days) |
| `wobbly` (`wobbly-js`) | 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ five tagged releases never published ([#1](https://github.com/tonioloewald/wobbly/issues/1), 54 days) |
| `tosijs-3d-ensemble` (local) | **0.6.0** | v0.6.0 | **0.5.2** | ⚠️ **new**: 0.6.0 tagged, not published (from `scoreboard.ts`) |

Stale dist-tags haven't changed: `tosijs` `beta` 1.7.0-beta.2 / `rc` 1.8.0-rc.3, `haltija` `rc`
1.12.0-rc.5, and `service-compris` `beta` 0.2.0-beta.2, which sits *below* `latest`.
`npm dist-tag rm` when convenient.

### N5. Dev-tree advisories that reach no consumer (unchanged)

- `react-tosijs`: 13 high + 5 moderate, all from the eslint 8 dev tree (`brace-expansion`,
  `js-yaml`, `minimatch`, `flatted`). Covered by #4 and #5. HEAD has been quiet since 2026-07-27.
- `ngx-tosijs`: 3 moderate (Angular
  [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c),
  [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg)). Same as #1.
- `tosijs-platform` root: 2 high + 1 low (`@grpc/grpc-js`
  [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j), `braces`). The root
  has only devDependencies.
- No lockfile: `tosijs-platform/functions` (§M2), `tosijs-platform/create-script` (0 advisories),
  `tjs-lang/editors/vscode` (0 advisories).
- **Every other tree audits 0 at every severity**, including tosijs, tosijs-ui, tosijs-schema,
  tjs-lang, its `functions/`, and haltija with both its apps.

### N6. `tjs-lang#55` is unchanged: the published `latest` dynamic-imports `esm.sh/typescript@5`

The pin is unpinned and invisible to consumer lockfiles. It's still open at 40 days, and the
0.14.0 final is the cheap moment to pin it.

### N7. Secrets: clean

I grepped every tracked file in all 16 repos and all 16 published tarballs for `AIza`, `sk-`,
`ghp_`, `github_pat_`, `AKIA`, `xox*`, `pk.eyJ` / `sk.eyJ` and `-----BEGIN … PRIVATE KEY`, and
listed tracked `.env*` / `.pem` / `.key` / `.p12` / `id_rsa` files.

- **No `sk.` Mapbox secret, cloud key, PAT or Slack token anywhere.** Not in source, not in
  tarballs, and not in a looser `sk\.eyJ` / `ghp_` / `github_pat_` / `AKIA` pass either.
- The `sk-…` hits are all false positives: `task-list-items-extension` (a CodeMirror identifier
  in sourcemaps) and a test label in `tosijs/reviews/1.9.0-preminor-round3.md`. The single
  `-----BEGIN` hit is the *prose* of `tosijs-3d/reviews/0.7.0-pre-tag-gate.md`.
- Mapbox `pk.`: **accepted finding, not re-raised.** The class hasn't changed: it's still in
  tosijs-ui and downstream demo builds (tosijs-product, tosijs-timezone-picker), and no `sk.`
  appears.
- The Firebase web `apiKey` in `tjs-lang/demo/` is public-class and demo-only. `demo/` isn't
  shipped. Unchanged.
- The tracked `tosijs-platform/functions/.env.sandbox` and `.env.liquid-force-425209-g2` files hold
  feature flags only, and `tosijs/.env.example` is a template. Not findings, as recorded before.
- **No tarball ships internal material:** no `reviews/`, `journal/`, `designs/`, `proposals/`,
  `.env*`, `.npmrc` or keys.

### N8. Issues: 165 open, all authored by the owner

That's still **zero non-owner authors** ecosystem-wide, so the public adoption instrument still
reads zero. **25 issues were opened in the last 14 days** (since 10-02):

- `tosijs-ui` ×13: #229, #222, #221, #220, #217, #216, #214, #213, #212, #211, #210, #209, #207
- `tosijs-3d` ×5: #103–#107
- `tosijs-platform` ×3: #35, #36, #37
- `tosijs` #49, `tosijs-schema` #12 and `haltija` #55

Open counts: tosijs-ui 56, tosijs-platform 27, tjs-lang 29, tosijs 15, haltija 14, tosijs-3d 13,
react-tosijs 3, kilpi 2, lukko 2, and 1 each for schema, ngx, wobbly and timezone-picker.
Floorplan, product and editor are at 0.

**New and security-relevant:**

- [tosijs-ui#222](https://github.com/tonioloewald/tosijs-ui/issues/222) (10-13): the debug sink
  doesn't escape control characters and accepts cross-site posts (dev server).
- [tosijs-ui#214](https://github.com/tonioloewald/tosijs-ui/issues/214): `isBreached()` treats
  429/5xx as breached.
- [tosijs-platform#37](https://github.com/tonioloewald/tosijs-platform/issues/37) (§N2).

These are carried over and still open on real-consumer `tosijs`:
[#41](https://github.com/tonioloewald/tosijs/issues/41) (password-field secrecy, 37 days),
[#43](https://github.com/tonioloewald/tosijs/issues/43) (an untrusted props object can set
`innerHTML`, 34 days) and [#32](https://github.com/tonioloewald/tosijs/issues/32)
(spelling-sensitive secret paths, 44 days). Also still open: kilpi #1/#2, haltija #44/#45/#55,
tosijs-schema #12, tjs-lang #56. tjs-lang#57 (Dependabot moderates in `functions/`) still doesn't
reproduce (0 advisories) and can be closed.

### N9. Scoreboard: 3 fact cells refreshed with this report

`bun tools/scoreboard.ts` was run and its output committed. That's the sanctioned mechanism, not a
hand edit:

- `tosijs-ui` → ⚠️ npm 1.16.23 · package.json 1.16.24 · tag v1.16.24
- `tosijs-3d` → 0.10.9, all agreeing
- `tosijs-3d-ensemble` → ⚠️ npm 0.5.2 · package.json 0.6.0 · tag v0.6.0

The tool couldn't reach `kith-email` or `tosijs-virta`, so it left both rows alone without
advancing "As of". Prose Activity cells are left to the owner.
