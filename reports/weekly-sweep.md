# Weekly security & health sweep — 2026-08-23 (UTC)

Reconnaissance only. Nothing outside this repo was modified; no issues filed, no PRs opened.
Prior weeks live in git history (this file is overwritten, never appended).

**Scanned:** 14 GitHub repos, **19 dependency trees** (5 nested workspaces found and audited
separately — see the note below, it is where almost every serious finding lives).

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, lukko, tosijs-platform | `tjs-lang/functions`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions` (+2 UNCHECKED, below) |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-editor` — back-burnered per the scoreboard.
- `tosijs-3d-ensemble`, `manta-recon` — local-only repos, no GitHub link.
- `lukko` needed an `add_repo` attach before it would clone (anonymous clone was refused); it
  was then scanned in full. `package.json` sets `private: true`, so its npm 404 is correct.

**Tooling:** `bun 1.3.11` / `bun audit --json` (exit code read before output, per
`practices/dependencies.md` §1); `npm view` for registry state; `git ls-remote --tags` for tags.

---

## ⚠️ Read this first: a root-only sweep would have reported this week clean

**`haltija`'s root tree audits CLEAN. Its two app workspaces carry 1 critical and 54 high
advisories.** Same shape at `tosijs-platform` (root: 23 findings, browser-side; `functions/`:
75 findings, server-side) and `tjs-lang` (root: dev-only; `functions/`: 3 criticals).

Every genuinely serious finding this week is in a **nested `package.json` with its own
lockfile** — a deployed Cloud Function, an Electron shell, an MCP server. A gate that runs
`bun audit` at the repo root sees none of them and prints a green tick. That is a §1
unearned-pass in the exact shape the practice warns about, and it is worth fixing in the
gate rather than in this report.

---

## MAJOR findings

### 1. `tosijs-platform/functions` — 3 critical / 41 high in *deployed, auth-handling* server code

The Cloud Functions workspace (`functions/package.json`, own lockfile) is the internet-facing,
token-verifying surface of the platform. **75 advisories across 23 packages.**

| Sev | Package | Installed | Advisory | Path |
| --- | --- | --- | --- | --- |
| **critical** | `protobufjs` | 7.5.4 | [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) Arbitrary code execution | transitive ← `@google-cloud/firestore` ← `firebase-admin@12.7.0` |
| **critical** | `websocket-driver` | 0.7.4 | [GHSA-xv26-6w52-cph6](https://github.com/advisories/GHSA-xv26-6w52-cph6) Message corruption via protocol length headers | transitive ← `faye-websocket` ← `@firebase/database` ← `firebase-admin` |
| **critical** | `fast-xml-parser` | <4.5.4 | [GHSA-m7jm-9gc2-mpf2](https://github.com/advisories/GHSA-m7jm-9gc2-mpf2) Entity-encoding bypass via regex injection | transitive ← `firebase-admin` |
| **high** | `jws` | 3.2.2 | [GHSA-869p-cjfg-cm3x](https://github.com/advisories/GHSA-869p-cjfg-cm3x) Improperly verifies HMAC signature (`<3.2.3`) | transitive ← `jsonwebtoken@9.0.2` ← `firebase-admin@12.7.0` |
| **high** | `node-forge` | 1.3.1 | [GHSA-q67f-28xg-22rw](https://github.com/advisories/GHSA-q67f-28xg-22rw) Ed25519 signature forgery (missing `S > L`), [GHSA-ppp5-5v6c-4jwp](https://github.com/advisories/GHSA-ppp5-5v6c-4jwp) RSA-PKCS signature forgery via ASN.1 extra field (both `<1.4.0`), [GHSA-2328-f5f3-gj25](https://github.com/advisories/GHSA-2328-f5f3-gj25) basicConstraints bypass in cert-chain verification | **direct dep of `firebase-admin@12.7.0`** |
| **high** | `lodash` | 4.17.21 | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) Code injection via `_.template` imports key names (`<=4.17.23`) | dev ← `firebase-functions-test` |
| **high** | `path-to-regexp` | 0.1.12 | ReDoS (`<0.1.13`) | transitive ← `express@4.21.2` ← `firebase-functions@7.0.2` |

`jws` and `node-forge` are the ones to look at first: they sit directly under `firebase-admin`
on the **JWT-verification and certificate-chain paths**. A signature-forgery advisory in the
library that checks your auth tokens is a different category from the ReDoS noise around it.

**Root cause is one number:** `firebase-admin: ^12.7.0` (resolved 12.7.0) while upstream is
**14.3.0** — two majors behind. This is `practices/dependencies.md` §11 exactly: nothing broke,
nothing prompted, and the security fix is now a major migration.

**Recommended action:** treat as this week's top item. Upgrade `firebase-admin` to 13.x → 14.x
(read the migration notes; it is a decision, not hygiene). If the majors cannot land now, pin
`protobufjs >= 7.6.5`, `websocket-driver >= 0.7.5`, `node-forge >= 1.4.0`, `jws >= 3.2.3` via
`overrides` and record a **time-boxed exemption with a near-term expiry** (§3) for whatever
remains — do not add an open-ended allowlist.

### 2. `tjs-lang/functions` — 3 critical / 21 high, also deployed

Same shape, one major less stale: `firebase-admin: ^13.6.1`, `firebase-functions: ^7.0.5`.
Backs `tjs-platform.web.app`.

- **critical** `protobufjs` (GHSA-xq3m-2v4x-88gg, arbitrary code execution)
- **critical** `websocket-driver <0.7.5` (GHSA-xv26-6w52-cph6)
- **critical** `fast-xml-parser >=4.1.3 <4.5.4` (GHSA-m7jm-9gc2-mpf2)
- **high** `node-forge <1.4.0` — the same Ed25519 / RSA-PKCS signature-forgery pair
- **high** `@grpc/grpc-js`, `form-data`, `path-to-regexp`, `undici` (WebSocket parser overflow, unbounded permessage-deflate)

**Recommended action:** `firebase-admin` 13 → 14, then re-audit; the same four `overrides` pins
as §1 clear the criticals if the major has to wait.

### 3. `haltija/apps/desktop` — Electron 40.6.1 with two context-isolation bypasses

haltija *is* browser control for AI agents. **Context isolation is its security boundary**, and
that is precisely what is advisory-affected here.

- **high** Electron: **Context isolation bypass via `contextBridge` VideoFrame** (`<40.7.0`)
- **high** Electron: **Context isolation bypass via `Function.prototype.bind`** (`<40.9.2`)
- **high** Electron: **Sandboxed iframe can bypass the `allow-popups` restriction** (`<41.10.3`)
- **high** Electron: renderer command-line switch injection via undocumented switch (`<40.7.0`)
- **high** Electron: use-after-free ×3 — offscreen child window paint, WebContents fullscreen, PowerMonitor
- **high** Electron: custom protocol with `supportFetchAPI` but not `corsEnabled` (`<40.9.3`)
- **critical** `tar <=7.5.18` decompression/parse DoS; plus `tar` hardlink/symlink path-traversal and arbitrary-file-overwrite chain (installed **6.2.1**)
- **high** `app-builder-lib <26.15.0` uncontrolled search-path elements; `builder-util-runtime <9.7.0` **cross-origin redirect leaks `PRIVATE-TOKEN`** (installed 24.13.3 / 9.2.4 — the `electron-updater` pair)
- **high** `extract-zip <=2.0.1` unvalidated symlink path traversal (installed 2.0.1); `tmp <0.2.6` path traversal

**Recommended action:** bump `electron ^40.6.1` → **≥ 41.10.3** (latest 43.4.1) — one bump
clears all eight Electron advisories. Bump `electron-builder` off 24.x (drags
`app-builder-lib@24.13.3`, `tar@6.2.1`, `extract-zip@2.0.1` behind it). The `electron-updater`
token-leak advisory matters if auto-update is wired to a private feed.

### 4. `haltija/apps/mcp` — MCP SDK cross-client data leak + permissive CORS

The MCP server (20 endpoints restored in 1.12.4 per the changelog) sits on a stale SDK.

| Sev | Package | Installed | Advisory |
| --- | --- | --- | --- |
| **high** | `@modelcontextprotocol/sdk` | **1.25.2** | cross-client data leak via shared state (`>=1.10.0 <=1.25.3`) — **directly in range** |
| **high** | `hono` | 4.11.4 | CORS middleware **reflects any Origin with credentials** (`<4.12.25`); arbitrary file access via `serveStatic` (`<4.12.4`) |
| **high** | `@hono/node-server` | 1.19.8 | authorization bypass for protected static files (`<1.19.10`) |
| **high** | `fast-uri` | 3.1.0 | host confusion ×4 + path traversal via percent-encoded dots |

All four arrive under `@modelcontextprotocol/sdk`. The manifest already declares `^1.0.0` — the
**lockfile** is what pins 1.25.2, so this is a reinstall away, not a migration.

**Recommended action:** update `@modelcontextprotocol/sdk` to **1.30.0** and re-lock; verify
`hono` resolves ≥ 4.12.25. Cheapest major fix on this list.

### 5. `tosijs-schema` #8 — a published validator that fails open

[Issue #8](https://github.com/tonioloewald/tosijs-schema/issues/8), opened **2026-08-21**, against
the current published **1.7.0**: `validate()` **silently ignores 13 JSON Schema keywords** —
`oneOf`, `allOf`, `anyOf`, `not`, `exclusiveMinimum`/`exclusiveMaximum`, `uniqueItems`,
`prefixItems`, `contains`, `patternProperties`, `dependentRequired`, `if`/`then`, `$ref` — and
returns **`ok === true`** for data that violates them.

This is the same defect class as **[GHSA-3qw7-pvr3-2gpq](https://github.com/tonioloewald/tosijs-schema/security/advisories)**
(high, published 2026-08-07, "Validator fails open: `additionalProperties:false` and other
constraints silently unenforced, ≤1.4.0) — filed by the owner, for ≤1.4.0. **The class was not
closed by 1.5.0**; it was narrowed. Note the internal contradiction the reporter flags:
`agentContract` *rejects* schemas using unenforced keywords ("a gate must not fail open") while
`validate()` waves the same constraints through.

**Recommended action:** decide explicitly whether this warrants a second GHSA against ≤1.7.0.
Anything downstream treating `validate().ok` as an authorization or sanitization boundary is
the deciding factor. Minimum viable fix per the issue: enforce `oneOf` and the `exclusive*`
bounds, and export `unenforcedKeywords()` so consumers can lint their own schemas — a
fail-closed `validate()` that *errors* on an unenforced keyword would match the practice better
than one that quietly returns `true`.

### 6. Publish integrity — three failures, the recurring ecosystem defect

| Project | Repo / tag | npm | Verdict |
| --- | --- | --- | --- |
| **tosijs-ui** | `package.json` 1.10.2, tags `v1.10.1` **and** `v1.10.2` | `latest` = **1.10.0** | **two tagged releases never published** |
| **wobbly** | 0.6.0, tags through `v0.6.0` | `wobbly-js` = **0.1.0** | **five releases never published** |
| **tosijs-timezone-picker** | `main` `package.json` **0.5.3**, **no git tags at all**, no CHANGELOG | `latest` = **0.6.0** | **inverted — published ahead of committed source** |

- **tosijs-ui** is the urgent one: **1.10.2 carries a security-relevant fix.** Its changelog
  entry: `killStrayServer` was reclaiming a port after checking only that the holder was a JS
  runtime, so "a colleague's dev server, a language server or a test runner would all pass" —
  it now requires the process to be working in this project. 1.10.2 also fixes a stale-content
  cache in the dev server. Adopters on `latest` have neither.
- **tosijs-timezone-picker** is the worse *integrity* failure: 0.6.0 is live on npm and the
  scoreboard records the publish as landed, but `main` is at 0.5.3 with no tag and no changelog
  entry. **The source of a published release is not identifiable in the repo.** That is
  unauditable and unreproducible — and it is the mirror image of the failure the same row was
  created to record.
- **wobbly** is long-known (the scoreboard says so) but stays listed until it clears.

**Recommended action:** publish tosijs-ui 1.10.1 + 1.10.2 (or `npm deprecate` the tags if they
were deliberately withdrawn — but say so in the changelog). For the timezone picker, reconcile
`main` to 0.6.0 and tag it retroactively from whatever tree was published, or re-publish 0.6.1
from a known-good commit. `releasing.md` step "confirm the publish" is being tagged-and-forgotten;
this is the third consecutive sweep-class finding of the same shape and the check evidently
needs to be mechanical, not procedural.

### 7. `lukko` — 2 criticals from a dependency pinned 10 minors behind

`lukko` (capability-secured LLM agent middleware, Tauri desktop, `private: true`, unpublished)
declares `tjs-lang: ^0.3.0`. **tjs-lang 0.3.0 shipped `firebase@10.14.1` as a *runtime*
dependency** (current tjs-lang keeps firebase dev-only), so lukko's app tree inherits:

- **critical** `protobufjs@7.5.4` — GHSA-xq3m-2v4x-88gg arbitrary code execution
- **critical** `websocket-driver@0.7.4` — GHSA-xv26-6w52-cph6
- **high** `@grpc/grpc-js@1.9.15` ×2, `undici@6.19.7` ×4 (WebSocket parser overflow, unbounded decompression, fragment-count DoS)
- 32 advisories total (2 critical / 11 high / 16 moderate / 3 low) across 5 packages

Also badly drifted: `tosijs: ^1.4.0` (current 1.7.9), `tosijs-ui: ^1.2.1` (current 1.10.0).

Being private and unpublished bounds the blast radius to the app itself — but the app's stated
purpose is *capability security for LLM agents*, which is a poor place to carry a critical RCE.

**Recommended action:** bump `tjs-lang` to `^0.13.2`. That single change should drop the entire
firebase runtime subtree and, with it, both criticals.

---

## Notable non-major findings

- **`react-tosijs` — 14 advisories, 100% dev-only, 100% from `eslint@8.57.1`.** `brace-expansion`
  (3 high), `minimatch` (3 high), `js-yaml` (2 high), `flatted` (2 high), `ajv`. Zero runtime
  deps (peers only), so nothing reaches adopters. This is the **textbook case already written up
  in `practices/dependencies.md` §11** — including the `brace-expansion@5` → `minimatch@3` →
  forced eslint 8→10 migration. Take the eslint 10 upgrade on a calm day rather than on an
  incident; `tjs-lang` already runs `eslint@10.4.1`, so the path is known.
- **`tjs-lang` root — 23 advisories, all dev-only.** 11 of them `undici@6.19.7`, pinned *exactly*
  by `@firebase/auth@1.7.9` under a `firebase: ^10.12.0` **devDependency** (upstream firebase is
  12.18.0). The runtime deps (`acorn`, `acorn-loose`, `acorn-walk`, `tosijs-schema`) are clean.
  Bumping the firebase devDep clears most of it.
- **`tosijs-platform` root — 23 advisories incl. the same 2 criticals**, but via the browser
  `firebase@12.16.0` SDK. `@grpc/grpc-js` and `faye-websocket`/`websocket-driver` are firebase's
  **Node** entry points, so they are most likely absent from the shipped browser bundle. Listed
  as non-major *for the browser tree only* — the same criticals are genuinely live in
  `functions/` (finding §1). Worth confirming against the actual bundle rather than assuming.
- **`tosijs-platform/storage.rules` — user-scoped paths are world-readable.**
  `match /users/{userId}/{path=**} { allow read: if true; }` and a catch-all
  `match /{allPaths=**} { allow read: if true; }`. Writes are correctly scoped
  (`request.auth.uid == userId`) and **`firestore.rules` is deny-all** (`allow read, write: if
  false`) — so this is plausibly a deliberate public-CDN bucket. Flagging it because a path
  named `/users/{uid}/` reads like private storage and is not. Worth one deliberate confirmation.
- **Firebase web API key committed in `tjs-lang/demo/`** — `AIzaSyBYyEix…` appears in
  `demo/src/agent-client.ts`, `demo/src/firebase-auth.ts`, `demo/src/user-store.ts`, and `demo/`
  **is inside the npm `files` glob**, so it ships in the tarball. Firebase web API keys are public
  by design (they identify, they do not authorize) so this is **not a credential leak** — but it
  is the key behind `tjs-platform.web.app`, so confirm it carries HTTP-referrer restrictions and
  that the backing rules are locked down. No other secret patterns (`sk-`, `ghp_`, `AKIA`,
  `github_pat_`, `xox*`, PEM private keys) matched in any repo.
- **`tosijs-3d` dist-tag drift.** `0.7.0-rc.1` **is** published (it is in `npm view versions`)
  and tagged in git — but the `next` dist-tag still points at `0.7.0-beta.6`, so `install
  tosijs-3d@next` gets the older beta. `main`'s `package.json` also still reads `0.7.0-beta.6`
  while the `v0.7.0-rc.1` tag reads `0.7.0-rc.1` (the bump lives only on the tag). Not a publish
  failure; move the `next` tag and bump `main`.
- **Releases with no git tag at all:** `tosijs-floorplan` (0.3.0 on npm, **zero tags**),
  `tosijs-platform`, `tosijs-timezone-picker`. Untagged published releases cannot be diffed or
  reproduced later.
- **npm `files` globs are clean.** `npm pack --dry-run` verified: `tjs-lang`'s `!docs/reviews`
  exclusion works — the review reports are tracked in git but **not** in the 291-file tarball.
  `haltija` packs 64 files / 292 KB with nothing flagged. No repo ships `.env`; the only tracked
  env file anywhere is `tosijs/.env.example`, a template with placeholder values only.
- **Security-relevant open issues, last 14 days:**
  - `tosijs-ui` **#90** (Aug 19) — *"`/__docstore/source` is CSRF-able: any page can write
    `.git/hooks/*`"*. Arbitrary write to git hooks from any visited page while `bun start` runs
    is code execution on the dev machine. `tosijs/.env.example` already documents it as SEC-5 and
    ships the endpoint **off by default** — good — but the issue is still open upstream.
  - `tosijs-ui` **#96** (Aug 22) — static `resolveUnder` should assert path containment (traversal).
  - `tosijs-ui` **#94** (Aug 22) — `tunnel --link` exits 0 and prints a valid-looking link when no
    tunnel is up (a §1-shaped unearned pass).
  - `tosijs-ui` **#95** (Aug 22) — preview credentials currently live in a shell profile.
  - `tosijs-floorplan` **#5** (Aug 19) — provenance-arrow parsing should split on the **last**
    occurrence; forgeable from data.
- **Clean trees (root):** `tosijs`, `tosijs-ui`, `tosijs-schema`, `tosijs-floorplan`, `tosijs-3d`,
  `tosijs-product`, `tosijs-timezone-picker`, `ngx-tosijs`, `wobbly`, `haltija` — all audited,
  exit 0, `{}` returned.
- **Scoreboard drift.** Several rows are behind reality as of this sweep: tosijs-schema (says
  1.5.1, is **1.7.0**), tjs-lang (says 0.12.0 + "0.13.0 in flight, unpublished" — **0.13.2 is
  published**), haltija (says 1.12.2 + "1.12.3 tagged but never published" — **1.12.5 is
  published**, that failure has cleared), tosijs-ui (says 1.10.0, repo is at 1.10.2 — though npm
  agrees with the row, see §6), tosijs-timezone-picker (row says 0.6.0 landed; `main` says 0.5.3).
  Left unedited by this sweep — a scoreboard row should be refreshed by someone who verified the
  *activity* text too, not just the version cell.

---

## UNCHECKED — coverage gaps, stated honestly

A sweep must never report a pass it did not earn (`practices/dependencies.md` §1). These were
**not** checked; do not read their absence above as clean.

- **`tjs-lang/editors/vscode`** and **`tosijs-platform/create-script`** — `bun audit` returned
  **exit 1 with empty stdout**, which is *could-not-check* (no lockfile), **not** a clean tree.
  Both have empty `dependencies`, so the likely true answer is "nothing to audit" — but that is
  an inference, not a measurement.
- **Secret scanning covers only the tip of the default branch** of shallow (`--depth 1`) clones.
  **Git history was not scanned**, so a credential committed and later removed would not appear.
  No GitHub secret-scanning or Dependabot alerts were read (needs authenticated API access).
- **Issue lists were read from the public HTML issue pages**, not the REST API — `api.github.com`
  is blocked for these repos by this session's proxy (only `tosijs-coding-practices` and, after an
  `add_repo` attach, `lukko` are API-reachable). Consequence: **labels, closed issues, and issue
  comment threads were not enumerated**; only open-issue titles and dates. Counts are from the
  rendered page and may lag.
- **Private repos not scanned at all:** `kith-email`, `static-assets`, `ariosto`. **Local-only
  repos not scanned:** `tosijs-3d-ensemble`, `manta-recon`. **Back-burnered, skipped:**
  `tosijs-editor`. Each may carry findings; none were looked for.
- **Advisory *reachability* was not assessed.** Findings are reported as the auditor reports
  them — CVSS scores the worst case, context-free (§5). Whether a given ReDoS is reachable in
  your usage is the human judgment the time-boxed exemption exists to record.
- **Not run:** SAST / code-level review, license audit, npm provenance & attestation
  verification, `tosijs-platform` bundle analysis (to confirm the Node-only firebase paths really
  are absent from the browser build), and any check of the deployed hosts themselves.
