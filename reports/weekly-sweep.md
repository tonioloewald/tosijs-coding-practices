# Weekly security & health sweep — 2026-08-28 (UTC)

Reconnaissance only at sweep time. Prior weeks live in git history (this file is overwritten,
never appended).

**Scanned:** 14 GitHub repos, **20 dependency trees** (6 nested workspaces found and audited
separately, including the two that were UNCHECKED last week).

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, lukko, tosijs-platform | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-editor` — back-burnered per the scoreboard.
- `tosijs-3d-ensemble`, `manta-recon` — local-only repos, no GitHub link.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full.
  `package.json` sets `private: true`, so its npm 404 is correct.

**Tooling:** `bun 1.3.11` / `bun audit --json` (**exit code read before output** — bun's clean
tree is exit 0 + a 3-byte `{}`, and its JSON is `{pkg: [advisories]}`, *not* npm's
`{vulnerabilities}` shape; parsing it as npm's silently reports every tree clean, which is the
`practices/dependencies.md` §1 unearned pass and was caught mid-sweep). `npm audit --json` on
package-lock trees; `npm view` for registry state; `git ls-remote --tags` for tags; `npm pack`
+ grep for published-tarball contents.

---

## Last week's majors: three of five are fixed

Verified fixed in the repos this week — worth saying plainly, because most of the work landed:

- **`tjs-lang/functions`** — `firebase-admin` `^13.6.1` → **`^14.3.0`**, `firebase-functions`
  `^7.3.2`. **3 criticals / 21 highs → 0 critical / 0 high** (7 moderate remain). Closes
  [tjs-lang#30](https://github.com/tonioloewald/tjs-lang/issues/30).
- **`haltija/apps/desktop`** — `electron` `^40.6.1` → **`^43.4.1`**, and `electron-builder`
  dropped as a dependency (285 packages → 14, invoked via `npx` in the `build:*` scripts).
  **1 critical / 54 high → CLEAN.** Closes [haltija#35](https://github.com/tonioloewald/haltija/issues/35).
- **`haltija/apps/mcp`** — `@modelcontextprotocol/sdk` re-locked `1.25.2` → **`^1.30.0`**,
  `hono` 4.13.3. **CLEAN.** Closes [haltija#36](https://github.com/tonioloewald/haltija/issues/36).
- **`tosijs-ui` 1.10.1/1.10.2** ([#101](https://github.com/tonioloewald/tosijs-ui/issues/101))
  — cleared; 1.11.0 through 1.12.4 are all published. A **new** instance replaces it (§3).
- **`tosijs-3d` dist-tag drift** ([#33](https://github.com/tonioloewald/tosijs-3d/issues/33)) —
  cleared; the `next` dist-tag is gone entirely and `latest` = 0.7.2. The issue can be closed.

Still open, unchanged: `tosijs-platform/functions` (§2), `lukko` (§4), `wobbly`, the untagged
published releases, `storage.rules`, the react-tosijs eslint-8 dev tree.

---

## MAJOR findings

### 1. `haltija` — three unauthenticated endpoints give any caller on the port shell execution (live in published 1.12.5)

[haltija#40](https://github.com/tonioloewald/haltija/issues/40), opened **2026-08-27** by the
owner after an adversarial review. Confirmed by reading the source at HEAD (1.12.6): with
`HALTIJA_TOKEN` unset, these have **no auth gate at all**:

| Endpoint | Source | What it does |
| --- | --- | --- |
| `POST /terminal/command` | `src/server.ts:1973` | runs the body through `spawn('sh', ['-c', …])` |
| `POST /terminal/agent-prompt` | `src/server.ts:1783` | launches an agent with permission prompts disabled |
| `POST /files/write` | `src/server.ts:2266` | writes a file; the containment check is skipped for **absolute** paths (`body.path.startsWith('/')` bypasses the `..` guard) |

The `requireToken()` gate exists (`src/api-handlers.ts:1812`) and is correctly fail-closed —
it refuses when no token is set — but it is wired only to the **session-mirror** handlers.
The three routes above never call it. The server's own comment states the conditions that make
this reachable: *"The server binds beyond loopback and answers `Access-Control-Allow-Origin: *`,
so 'it is only localhost' is not true by default."*

**Severity is not audience-scaled** — this is a code-level security finding in a **published**
package (`haltija@1.12.5` is `latest` on npm), and haltija is the ecosystem's own agent CLI, run
on developer machines everywhere in the internal base.

**Recommended action:** the owner has deliberately framed this as a posture decision rather than
a quick patch, which is right — but the interim default is arbitrary code execution from any
page the developer visits. A stopgap worth landing before the design lands: default-bind to
loopback with explicit opt-in for LAN, and require `Origin`/`Sec-Fetch-Site` to be same-origin or
absent on these three routes. If `--token` is going to be the boundary, `requireToken()` needs to
be on the terminal and file routes too, not just the session mirror.

### 2. `tosijs-platform/functions` — 3 critical / 41 high, unchanged, in deployed auth-handling code

[tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2), filed 2026-08-23,
**no change this week.** `firebase-admin` is still pinned `^12.7.0` (resolved 12.7.0) while
upstream is 14.x — the sibling project fixed exactly this pin, so the path is now proven.

| Sev | Package | Installed | Advisory |
| --- | --- | --- | --- |
| **critical** | `protobufjs` | 7.5.4 | [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) arbitrary code execution (`<7.5.5`) |
| **critical** | `websocket-driver` | 0.7.4 | [GHSA-xv26-6w52-cph6](https://github.com/advisories/GHSA-xv26-6w52-cph6) message corruption via protocol length headers |
| **critical** | `fast-xml-parser` | 4.5.3 | [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) entity-encoding bypass via regex injection |
| **high** | `jws` | 3.2.2 / 4.0.0 | [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x) improperly verifies HMAC signature — **both** installed copies are in range |
| **high** | `node-forge` | 1.3.1 | Ed25519 forgery [GHSA-q67f-28xg-22rw](https://github.com/advisories/GHSA-q67f-28xg-22rw), RSA-PKCS forgery [GHSA-ppp5-5v6c-4jwp](https://github.com/advisories/GHSA-ppp5-5v6c-4jwp), basicConstraints bypass [GHSA-2328-f5f3-gj25](https://github.com/advisories/GHSA-2328-f5f3-gj25), ASN.1 unbounded recursion + validator desync (new this week) |
| **high** | `@grpc/grpc-js` 1.13.4, `lodash` 4.17.21, `path-to-regexp` 0.1.12, `brace-expansion`, `minimatch`, `js-yaml`, `picomatch`, `glob`, `form-data`, `flatted` | | 41 high total across 23 packages |

`jws` and `node-forge` sit on the **JWT-verification and certificate-chain** paths of the
internet-facing, token-verifying surface. Two *new* `node-forge` highs appeared since last week,
so the tree is drifting further, not holding still.

**Recommended action:** unchanged and now overdue — `firebase-admin` 12 → 13 → 14 (tjs-lang's
functions did it; copy that). If the major cannot land now, `overrides` for
`protobufjs >= 7.5.5`, `websocket-driver >= 0.7.5`, `fast-xml-parser >= 4.5.5`,
`node-forge >= 1.4.0`, `jws >= 3.2.3` plus a **time-boxed** exemption (§3) for the remainder.

### 3. `tosijs-ui` 1.12.5 is tagged but never published — and it fixes a regression that *is* published

| Repo | Tag | npm `latest` |
| --- | --- | --- |
| `package.json` **1.12.5** | `v1.12.5` exists on the remote | **1.12.4** |

Graded MAJOR under `releasing.md`'s calibration: tosijs-ui is one of the two packages with
**known private production consumers** (Nonono, Snowfox).

What consumers on `latest` are missing: 1.12.5 fixes a **narrow-screen navigation regression
introduced by 1.12.3, which they do have** — tapping a nav link changes the URL and leaves the
nav covering the article, because the full-screen exit path wrote `contentVisible = false` on
every navigation. It also fixes [#115](https://github.com/tonioloewald/tosijs-ui/issues/115)
(a lone custom element wrapped in `<p>`, resolving to a 33px box instead of 842px) — reported
by tosijs-3d, i.e. an in-ecosystem consumer is already waiting on it.

This is the **fourth consecutive sweep** finding a tagged-but-unpublished release somewhere in
the ecosystem, and the second on tosijs-ui specifically. `releasing.md`'s "confirm the publish"
step is not being executed as written; the check needs to be mechanical (a CI job comparing
`npm view <pkg> version` against the tag it just pushed), not procedural.

**Recommended action:** publish 1.12.5.

### 4. `lukko` — 2 criticals from the `tjs-lang ^0.3.0` pin, unchanged

[lukko#2](https://github.com/tonioloewald/lukko/issues/2), filed 2026-08-23, **no change**.
`tjs-lang@0.3.0` shipped `firebase@10.14.1` as a *runtime* dependency, so lukko's tree still
carries `protobufjs@7.5.4` (**critical** RCE), `websocket-driver@0.7.4` (**critical**),
`@grpc/grpc-js@1.9.15` ×2 and `undici@6.19.7` ×4 — 32 advisories, 2 critical / 11 high.
`tosijs: ^1.4.0` (current 1.8.0) and `tosijs-ui: ^1.2.1` (current 1.12.4) are equally drifted.

Private and unpublished bounds the blast radius to the app itself, but the app is
*capability-secured LLM agent middleware*. **One line fixes it:** `tjs-lang` → `^0.13.6`.

---

## Notable non-major findings

- **`haltija` 1.12.6 is tagged but unpublished — and it is the security release.** npm `latest`
  is 1.12.5. 1.12.6 carries the Electron 43 bump, the MCP SDK re-lock, and three silent-failure
  fixes in the server that *is* shipped on npm (the widget never sent `X-Haltija-Token`, so a
  `--token` server broke every page-side feature; `wss://` recording was a no-op `replace`;
  LAN/Bonjour access handed the browser `localhost`). Measured-zero on public instruments, so
  **notable, not major** per the calibration — but the internal base runs this CLI everywhere,
  and §1 above is a reason the token path wants to be working in the published build.
  (1.12.3 and 1.12.4 are also tagged-and-never-published, but 1.12.5 superseded them, so their
  content did reach npm — bookkeeping only.)
- **`tosijs-3d` 0.7.3 tagged, npm `latest` = 0.7.2.** Measured-zero → bookkeeping. Note the
  release ships a **breaking** biped control-layout change, so it wants a changelog-accurate
  publish rather than a quiet one.
- **`wobbly`** ([#1](https://github.com/tonioloewald/wobbly/issues/1)) — repo 0.6.0, tags through
  `v0.6.0`, `wobbly-js` on npm still **0.1.0**. Five releases never published. Unchanged.
- **Published releases with no git tag at all:** `tosijs-floorplan` (0.3.0 on npm, zero tags —
  [#6](https://github.com/tonioloewald/tosijs-floorplan/issues/6)), `tosijs-timezone-picker`
  (0.6.0 on npm, zero tags — [#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2),
  and the tree to tag is already identified as `f013750`), `tosijs-platform` (1.0.6, zero tags).
  Unchanged. Untagged published releases cannot be diffed or reproduced later.
- **Stale pre-release dist-tags.** `tosijs`: `rc` → 1.8.0-rc.3 and `beta` → 1.7.0-beta.2, both
  behind `latest` 1.8.0. `haltija`: `rc` → 1.12.0-rc.5, `beta` → 1.3.0-beta.12. `latest` is
  correct in both cases, so nobody gets an old build by default — but `install <pkg>@rc` hands
  out a superseded prerelease (and for tosijs the neighbouring rc.2 is the deprecated one).
- **`react-tosijs` — 10 high, 100% dev-only, 100% from `eslint@8.57.1`**
  ([#4](https://github.com/tonioloewald/react-tosijs/issues/4)): `brace-expansion@1.1.12`,
  `minimatch@3.1.2`, `js-yaml@4.1.0`, `flatted@3.3.3`. Zero runtime deps (peers only), so nothing
  reaches adopters. Unchanged; the eslint 10 migration is still the fix.
- **`tjs-lang` root — 3 high, all dev-only, and improved.** Last week's 11 `undici` advisories are
  gone (the `firebase` devDep went 10.x → 12.18.0). What remains: `flatted@3.3.3` (via
  `flat-cache` ← eslint) and `form-data@2.5.5` ([GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx),
  CRLF injection, `<2.5.6`). Runtime deps (`acorn`, `acorn-loose`, `acorn-walk`, `tosijs-schema`)
  are clean.
- **`tjs-lang/functions` — 7 moderate remain** after the firebase-admin 14 bump: `uuid <11.1.1`
  (missing buffer bounds check) and the `@google-cloud/storage` / `retry-request` / `teeny-request`
  / `gaxios` chain under it. No criticals, no highs.
- **`tosijs-platform` root — 2 criticals via the *browser* `firebase@12.16.0` SDK**
  (`protobufjs@7.5.4`, `websocket-driver@0.7.4`, plus `@grpc/grpc-js@1.9.15`). These are firebase's
  **Node** entry points and are most likely absent from the shipped browser bundle — listed
  non-major for the browser tree only; the same criticals are genuinely live in `functions/` (§2).
  Still worth confirming against the actual bundle rather than assuming.
- **`tosijs-platform/storage.rules` — user-scoped paths still world-readable**
  ([#3](https://github.com/tonioloewald/tosijs-platform/issues/3), unchanged):
  `match /users/{userId}/{path=**} { allow read: if true; }` plus a catch-all `allow read: if true`.
  Writes are correctly scoped and `firestore.rules` is deny-all, so this is plausibly a deliberate
  public-CDN bucket — it just needs one deliberate confirmation, because `/users/{uid}/` reads
  like private storage and is not.
- **The `tjs-lang` demo Firebase web key no longer ships.** `AIzaSy…` is still committed in
  `demo/src/{agent-client,firebase-auth,user-store}.ts` (public-class: it identifies, it does not
  authorize), but `demo/` is **no longer inside the npm `files` glob** — verified by grepping the
  published `tjs-lang@0.13.6` tarball, which contains no `AIza` match at all. Improvement over
  last week. Still worth confirming the key carries HTTP-referrer restrictions.
- **A live TLS private key was caught before it went public — verified.** `tosijs-3d`'s 0.7.0
  pre-tag review (`reviews/0.7.0-pre-tag-gate.md` B2) found `tls/key.pem.bak` + `certificate.pem.bak`
  tracked in an unpushed HEAD. Checked this sweep: **no `.pem` exists in any tree of the last 400
  commits** of the public history, and `.gitignore:183-184` is now an allowlist (`tls/*` +
  `!tls/.gitkeep`) rather than another suffix. Nothing to do — recorded because the near-miss is
  the practice working.
- **Security-relevant open issues, last 14 days:**
  - `haltija` **#40** (Aug 27) — §1 above.
  - `haltija` **#39** (Aug 26) — a `--private` instance has no lifetime bound; one found 12 days
    old at 5.7 GB and ~150% CPU. Resource exhaustion on the developer's own machine.
  - `tjs-lang` **#45** (Aug 28) — *"Discriminated unions are unenforced."* Same fail-open class as
    the tosijs-schema advisories: a validation surface that returns success for data it does not
    actually check.
  - `tosijs-ui` **#116** (Aug 28) — the dev server answers a missing static asset with the SPA
    shell (HTML, **200**) instead of 404. A §1-shaped unearned pass: every "is it deployed?" check
    against that server returns success.
  - `tosijs-ui` **#117** (Aug 28) — no safe stop/restart, so everyone reaches for
    `pkill -f 'bun bin/site.ts'`, which kills sibling checkouts silently. This is the same
    kill-the-wrong-process family as 1.10.2's `killStrayServer` fix; `haltija`
    [#34](https://github.com/tonioloewald/haltija/issues/34) says the reference implementation
    (`port-pid.ts`) already exists and two sibling copies have diverged from it — a
    negative-blast-radius candidate rather than a third local fix.
  - `tosijs-ui` **#114** (Aug 28) — dev-server auth sessions are in-memory, so every restart
    invalidates every issued edit link.
  - `tosijs-3d` **#46** (Aug 28) — `b3dWater` defaults `normalMap` to `/waterbump.png` which the
    package does not ship (a broken default in a published package, not a security issue).
- **Clean trees (0 advisories, exit code verified):** `tosijs`, `tosijs-ui`, `tosijs-schema`,
  `tosijs-floorplan`, `tosijs-3d`, `tosijs-product`, `tosijs-timezone-picker`, `ngx-tosijs`,
  `wobbly`, `haltija` (root), `haltija/apps/desktop`, `haltija/apps/mcp`, `tjs-lang/editors/vscode`,
  `tosijs-platform/create-script`.
- **Published tarballs are clean.** All 13 published packages were downloaded with `npm pack` and
  grepped: **no** `sk-`, `ghp_`, `github_pat_`, `AKIA`, `xox*`, `sk.eyJ` or PEM private-key
  matches; no `.env`, no `reviews/`, no `*.pem` shipped in any tarball. The only matches are the
  Mapbox **`pk.`** public demo token in `tosijs-ui/dist/mapbox.js`, its `dist/iife.js.map`, and
  `tosijs-product/README.md` — the owner-accepted finding, unchanged in class, not re-raised.
  No repo tracks a `.env`; the only tracked env file anywhere is `tosijs/.env.example`
  (placeholders only).
- **Scoreboard drift — fixed in this commit.** Six rows were behind reality (tosijs-ui 1.10.0 →
  1.12.5/npm 1.12.4, tosijs-schema 1.8.0 → 1.8.1, tjs-lang 0.12.0 → 0.13.6, tosijs-3d
  0.6.2/0.7.0-beta.6 → 0.7.3/npm 0.7.2, haltija 1.12.2 → 1.12.6/npm 1.12.5, timezone-picker
  status). Version cells, publish state and "As of" dates updated from measured registry/tag
  state; activity prose left as the owner wrote it except where a publish claim was wrong.

---

## UNCHECKED — coverage gaps, stated honestly

A sweep must never report a pass it did not earn (`practices/dependencies.md` §1). These were
**not** checked; do not read their absence above as clean.

- **GitHub API is blocked for every repo but `tosijs-coding-practices` and (after `add_repo`)
  `lukko`** — both `api.github.com` and direct `github.com` HTML return **403** through this
  session's proxy. Open issues were read via `WebFetch` of the public issue pages instead, which
  returns **titles and dates only**: labels, closed issues, comment threads, PRs, Dependabot
  alerts and GitHub secret-scanning alerts were **not** enumerated. Counts may lag.
- **Secret scanning covers only the tip of the default branch** of `--depth 1` clones, except
  `tosijs-3d` where 400 commits were fetched to verify the TLS-key near-miss. **Git history was
  not scanned elsewhere**, so a credential committed and later removed would not appear.
- **npm-lockfile trees were audited via `npm install --package-lock-only`**, which can in
  principle re-resolve. Checked: the only lockfile change was `haltija/apps/desktop`'s own
  `version` field (1.12.5 → 1.12.6, a `sync-version` drift in the repo, not a dependency change).
  No resolution moved, so those audits reflect the committed trees.
- **Private repos not scanned at all:** `kith-email`, `static-assets`, `ariosto`. **Local-only
  repos not scanned:** `tosijs-3d-ensemble`, `manta-recon`. **Back-burnered, skipped:**
  `tosijs-editor`. Each may carry findings; none were looked for.
- **Advisory *reachability* was not assessed.** Findings are reported as the auditor reports them;
  CVSS scores the worst case, context-free. Whether a given ReDoS is reachable in your usage is
  the human judgment the time-boxed exemption exists to record.
- **§1 was confirmed by reading the source, not by running the server.** No endpoint was
  exercised against a live haltija instance.
- **Not run:** SAST / code-level review beyond the specific checks above, license audit, npm
  provenance & attestation verification, `tosijs-platform` bundle analysis (to confirm the
  Node-only firebase paths really are absent from the browser build), and any check of the
  deployed hosts themselves.
