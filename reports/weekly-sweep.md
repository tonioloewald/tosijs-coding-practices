# Weekly security & health sweep — 2026-10-09 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).

**Scanned:** 16 GitHub repos, **22 dependency trees** (6 nested workspaces audited separately),
**16 published tarballs**, **160 open issues enumerated in full** via the GitHub API.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-3d-ensemble`, `manta-recon` — local-only git repos, no GitHub remote to clone. (The
  scoreboard tool *can* reach ensemble's registry entry — see §N10.)
- `tosijs-virta` — private repo, not attached or scanned.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full.
  `private: true`, so it has no registry state to check.

**Tooling:** `bun 1.4.2` + `bun audit --json` (exit code read before output; clean = exit 0 and a
3-byte `{}`), `npm 10.9.4` `ci --ignore-scripts` / `install --ignore-scripts` + `npm audit --json`,
`npm view <pkg> dist-tags|versions`, `git ls-remote --tags`, `npm pack <pkg>@latest` + extract +
grep, GitHub REST API for issues, `bun tools/scoreboard.ts --check`.

**Coverage notes:**

- **All 17 bun trees installed `--frozen-lockfile` (exit 0)**, so every advisory below is a
  property of the committed lockfile, not of a fresh resolve. Last week's shared-cache race did
  not recur: the audits were run **serially** from the start, as last week's lesson directed.
- **Last week's `haltija/apps/desktop` UNCHECKED is resolved.** `npm ci` now succeeds there
  (exit 0 — the lockfile *is* in sync; last week's "Missing: electron-store@10.1.0 …" no longer
  reproduces) and `npm audit` reads **0 advisories at every severity**. The electron
  GHSA-qmv3-fv6v-rmhq high from last week's §N4 is gone.
- **Last week's `create-tosijs-platform-app` UNCHECKED is resolved** — see §N7.
- The GitHub REST API is scoped to repos attached to this session; the anonymous lane returns 403
  on `/repos/...`. All 16 repos were attached read-only via `add_repo` to enumerate issues.
  **Nothing was written to any repo**: no issues, no comments, no pushes, no PRs.

---

## Last week's majors

- **M1 `tosijs-floorplan` 0.5.1 untagged/unpublished SVG-injection fix — FULLY CLEARED.**
  `tosijs-floorplan` is now **0.5.2** with repo · tag · npm all agreeing, *and* the hardening went
  further than 0.5.1 (read-once bounds, `esc()` refuses non-strings, `<image>` draws only the
  checked `data:` URI). `tosijs` bumped its exact pin to `tosijs-floorplan@0.5.2` and re-vendored
  the renderer: verified in the published `tosijs-1.10.7.tgz` →
  `package/src/schematic.ts` greps **4** `isFinite` guards (was 0). The published-fix-nothing-
  depends-on gap is closed in both repos.
- **M2 `tosijs-platform/functions` node-forge signature-verification high — UNCHANGED, now 47
  days.** Still the week's only major: §M1 below.

---

## MAJOR findings

### M1. `tosijs-platform/functions` — the node-forge signature-forgery high is still in the deployed production tree, 47 days on, and the tree still has no lockfile

`npm install --ignore-scripts` + `npm audit` on the Cloud Functions tree: **11 high, 28 moderate,
0 critical** (last week: 2 high, 9 moderate). The count tripled, but **only one of the highs
reaches production** — the other ten are a dev-tooling chain, see below.

| Severity | Package | Where | Advisory |
| --- | --- | --- | --- |
| high | `node-forge` (all versions reachable) | transitive under a **runtime** dep | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) — RSA PKCS#1 v1.5 signature verification accepts extra nested `DigestAlgorithm` elements (**signature-forgery class**) |
| high | `firebase-admin` `5.0.0 – 14.3.0` | **`dependencies`** (runtime) | the above, via `@google-cloud/firestore` / `@google-cloud/storage` / `node-forge` / `uuid` |

- `functions/package.json` still pins **`firebase-admin: ^12.7.0`** in `dependencies`. Registry
  latest is **14.5.0**, and the caret **cannot** reach the fix: npm's own `fixAvailable` names
  `firebase-admin@14.5.0`, `isSemVerMajor: true`.
- `functions/` **still has no lockfile**, so this reading is one deploy-time resolve, not a
  property of what is deployed — the next deploy can resolve differently with nobody changing a
  line. This is the same objection as last week, unanswered.
- **The fix is still proven in-ecosystem:** `tjs-lang/functions` pins `firebase-admin: ^14.3.0`
  and audits **0 advisories at every severity** (verified this week via `npm ci`).
- [tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2) is open **47
  days** and still claims *"3 critical / 41 high"*, which still does not reproduce at that
  magnitude. Its actionable half is unchanged and one line long.

**The other ten highs are devDependencies and do not ship.** `@typescript-eslint/*` ×5,
`braces`, `micromatch`, `fast-glob`, `globby` — one chain, rooted in `@typescript-eslint/parser
^5.62.0` / `eslint ^8.57.1`, newly lit up by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (`braces`
stack-exhaustion DoS). `fixAvailable` is `@typescript-eslint/parser@8.71.1`, a major bump. The 28
moderates are the `jest` / `firebase-functions-test` / `@google-cloud/*` dev tail.

**Recommended action (unchanged from last week):** `firebase-admin@^14.5.0` in `functions/`,
commit a lockfile there, redeploy. Correct #2's numbers to what is measurable. The eslint chain is
a calm-day major bump, separately.

**Why this is the only major:** every other advisory this week is in a tree that neither ships to
a consumer nor deploys to production (dev trees, an unpublished workspace, a private repo).
Publish-integrity drift exists on three packages (§N6) but all three are measured-zero, so per
`releasing.md`'s calibration those are bookkeeping, never major. **tosijs and tosijs-ui — the two
packages with known private production consumers — are clean on every instrument this week:**
audit clean (frozen), repo · tag · npm in agreement, tarballs free of secrets and internal
material.

---

## Notable, non-major

### N1. `haltija/apps/mcp` — a **critical** and a credential-exfiltration high landed, and the open issue covers neither

Frozen install against the committed `bun.lock` (exit 0), then `bun audit`: **1 critical, 3 high,
6 moderate** (last week: 2 high, 6 moderate).

| Severity | Package | Advisory |
| --- | --- | --- |
| **critical** | `proxy-addr` `>=1.1.0 <2.0.8` | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) — IP spoofing via IPv4-mapped IPv6 trust subnet |
| high | `@modelcontextprotocol/sdk` `>=1.12.0 <1.31.0` | [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) — the OAuth client can send credentials to an authorization server **chosen by the MCP server** |
| high | `fast-uri` `>=3.0.0 <3.1.7` | [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) — authority injection via an unvalidated port in `serialize` |
| high | `fast-uri` `=3.1.6` | [GHSA-58mr-gqgx-xq4g](https://github.com/advisories/GHSA-58mr-gqgx-xq4g) — host confusion via an unclosed bracket in the URI authority |
| moderate ×6 | `hono` (jsx XSS), `ip-address` ×4, `fast-uri` (host case) | — |

Two of these are a different *class* from last week's. `proxy-addr` is a **trust-boundary bypass**
(a spoofed `X-Forwarded-For` reads as a trusted proxy address) and the SDK high is
**credential exfiltration to an attacker-named authorization server** — not the DoS/XSS shape of
the hono moderates. [haltija#46](https://github.com/tonioloewald/haltija/issues/46) names only the
hono moderates, so it under-describes its own subtree by two severity grades.

**Not graded major, for the same reason as last week:** `@haltija/mcp` is unpublished (npm 404),
`apps/mcp` is not in haltija's `files` — verified again in `haltija-1.12.9.tgz`, whose `apps/`
holds **only** `desktop/`'s built JS — and it still
**does not compile** ([#47](https://github.com/tonioloewald/haltija/issues/47), TS2589, 27 days).
Nothing reaches a consumer. But a tree that neither ships nor builds still installs on the dev
machine, and `dependencies.md` §4 says that counts.

**Recommended action:** `@modelcontextprotocol/sdk@^1.31.0` (which should drag `proxy-addr` and
`fast-uri` forward) folded into the 1.13 beta; widen #46 to the critical and the two highs, or
close it in favour of a fresh one; settle `apps/mcp`'s fate (#47 / #53).

### N2. `lukko` — 2 critical / 13 high, sixth consecutive week, same one-line fix, repo untouched since March

Frozen install against the committed `bun.lock`: **2 critical, 13 high, 16 moderate, 5 low.**

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs` `<7.5.5` | [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) — arbitrary code execution |
| critical | `websocket-driver` `<0.7.5` | [GHSA-xv26-6w52-cph6](https://github.com/advisories/GHSA-xv26-6w52-cph6) — message corruption via protocol length headers |
| high ×5 | `protobufjs` | bytes-field default code injection; code-generation gadget after prototype pollution; unbounded recursion; unsafe option paths; unbounded `Any` expansion |
| high ×5 | `undici` | WebSocket 64-bit length overflow; permessage-deflate memory exhaustion; invalid `server_max_window_bits`; fragment-count bypass; unrequested subprotocol |
| high ×3 | `@grpc/grpc-js` | malformed request crashes server; malformed compressed message crashes client; `getAuthContext` returns unauthorized certificates |

Single root cause, unchanged: `lukko` pins **`tjs-lang: ^0.3.0`**, whose lock holds `tjs-lang@0.3.0`
with `firebase` as a **runtime** dependency. Current tjs-lang has firebase in devDependencies only,
so the whole subtree disappears on upgrade. HEAD is still `94d25be` (2026-03-04).
[lukko#2](https://github.com/tonioloewald/lukko/issues/2), open **47 days**.

**Not graded major, deliberately:** `private: true`, nothing published, no shipped tree, no
consumer. Blast radius is the dev machine.

**Recommended action:** `bun add tjs-lang@^0.13.13` and re-lock. The same one line for the sixth week.

### N3. `tosijs-platform` Storage — `/users/{userId}/**` is still world-**readable**, and in Storage rules "read" includes `list`

`storage.rules` is unchanged byte-for-byte from last week: three `allow read: if true` at lines 32,
38 and 44 — `/blog/**`, `/public/**`, and **`/users/{userId}/{path=**}`**, whose own comment reads
*"User uploads - users can write to their own folder."* Write on that path is correctly
`request.auth.uid == userId`; read is unconditional.

The file's closing comment documents the posture for the first two (*"reads are an ALLOWLIST of the
legacy folders, mirrored from `functions/src/legacy-storage.ts`"*), which is why this dropped from
major last week. **That rationale still does not reach user uploads** — they are not a legacy
folder, and a test pinning rules against `legacy-storage.ts` cannot make them one.

One detail worth adding, because it widens the exposure beyond "you'd have to guess the filename":
in Firebase Storage rules `allow read` grants **`get` *and* `list`**. So an unauthenticated caller
who holds a uid can enumerate *and* download that user's entire upload folder — and uids are not
secret (cf. [#28](https://github.com/tonioloewald/tosijs-platform/issues/28), where provenance
stamps uids into documents).

[#3](https://github.com/tonioloewald/tosijs-platform/issues/3) has asked *"confirm this is
deliberate"* for **47 days** — the longest-unanswered security question anywhere in the ecosystem,
on a service in production.

**Recommended action:** close the `/blog` + `/public` half of #3 by recording the decision in
`DECISIONS.md`; then decide `/users/**` on its own terms — public asset area (say so in the rules
comment, and accept that it is listable) or owner+role scoped (change the rule). Access-control
defaults propagate to whatever adopts the platform.

### N4. Dev-tree advisories that reach no consumer

- **`react-tosijs`** — **13 high + 5 moderate** (unchanged in kind, same count as last week), all
  from the eslint 8 dev tree: `brace-expansion` ×4 high, `js-yaml` ×3 high, `minimatch` ×3 high,
  `flatted` ×2 high, `brace-expansion`/`js-yaml`/`ajv` moderates. Filed as
  [#4](https://github.com/tonioloewald/react-tosijs/issues/4) /
  [#5](https://github.com/tonioloewald/react-tosijs/issues/5). HEAD is still 2026-07-27 — quiet
  for ten weeks.
- **`ngx-tosijs`** — **3 moderate**, byte-identical to last week and to
  [#1](https://github.com/tonioloewald/ngx-tosijs/issues/1): `@angular/common`
  [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c),
  `@angular/core` + `@angular/compiler`
  [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) (sanitization bypass via
  directive host bindings).
- **`tosijs-platform` root — 2 high + 1 low, new this week** (the root tree read clean last week):
  `@grpc/grpc-js <1.13.6` [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j)
  (`getAuthContext` returns unauthorized certificates) plus its `low` sibling, and `braces`
  [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). **Root
  `dependencies` is `null`** — every one of its 18 deps is a devDependency (`firebase`, `chokidar`,
  `http-server`…), and the package ships only `dist-lib` / `README.md` / `LICENSE`. Dev-machine
  blast radius; the `functions/` tree in §M1 is the one that deploys.

Both bridge packages declare `dependencies: null` — everything is dev or peer.

### N5. `tjs-lang` — published `latest` still dynamic-imports an unpinned major range

Reconfirmed in this week's tarball: `esm.sh/typescript@5` appears in **6 files** of
`tjs-lang-0.13.13.tgz`, and in HEAD at `src/lang/browser-from-ts.ts:27`
(`DEFAULT_TYPESCRIPT_URL`), with `src/lang/browser-bundle.test.ts:113` still asserting that exact
string. A rolling major range fetched by a dynamic `import()` that cannot carry `integrity`,
executing in the consumer's page, invisible to every consumer lockfile.
[tjs-lang#55](https://github.com/tonioloewald/tjs-lang/issues/55), open **33 days**, unchanged
across the whole 0.14.0-rc series (now at rc.5).

**Recommended action:** pin an exact version in `DEFAULT_TYPESCRIPT_URL` (update the test with it);
keep the per-call `typescriptUrl` override. Landing it in 0.14.0 costs nothing extra.

### N6. Publish integrity

| Repo | package.json | Latest remote tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.7 | v1.10.7 | 1.10.7 | ✅ |
| `tosijs-ui` | 1.16.10 | v1.16.10 | 1.16.10 | ✅ |
| `tosijs-schema` | 1.13.0 | v1.13.0 | 1.13.0 | ✅ |
| `tosijs-floorplan` | 0.5.2 | v0.5.2 | 0.5.2 | ✅ **last week's M1 cleared** |
| `tjs-lang` | 0.14.0-rc.5 | v0.14.0-rc.5 | 0.13.13 · `rc` **0.14.0-rc.5** | ✅ correctly staged, `latest` untouched |
| `haltija` | 1.13.0-beta.3 | v1.13.0-beta.3 | 1.12.9 · `beta` **1.13.0-beta.3** | ✅ correctly staged |
| `react-tosijs` | 1.2.1 | v1.2.1 | 1.2.1 | ✅ |
| `ngx-tosijs` | 0.9.1 | v0.9.1 | 0.9.1 | ✅ |
| `tosijs-3d` | 0.9.0 | v0.9.0 | 0.9.0 | ✅ |
| `tosijs-product` | 0.8.0 | v0.8.0 | 0.8.0 | ✅ (tag `v0.6.3` was never published — historical) |
| `tosijs-editor` | `tosijs-styled-editor` 0.7.0 | v0.7.0 | 0.7.0 | ✅ |
| `kilpi` | `tosijs-kilpi` 1.0.1 | v1.0.1 | 1.0.1 | ✅ |
| `tosijs-platform` | `service-compris` **0.4.0** | **v0.3.0** | **0.3.0** | ⚠️ **new** — 0.4.0 neither tagged nor published |
| `tosijs-timezone-picker` | 0.6.0 | **none — zero tags on the remote** | 0.6.0 | ⚠️ 5 versions published, repo has no tags at all ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2), **47 days**) |
| `wobbly` | `wobbly-js` 0.6.0 | v0.6.0 | **0.1.0** | ⚠️ v0.2.0–v0.6.0 tagged, **five releases never published** ([#1](https://github.com/tonioloewald/wobbly/issues/1), **47 days**) |

**Twelve of fifteen** published packages agree across repo · tag · registry — up from eleven, and
the one that moved (`tosijs-floorplan`) was last week's major. All three remaining are
**measured-zero** packages, so per `releasing.md` they are bookkeeping: **notable, never major.**
But *"land the plane before touching the throttle again"* outranks that calibration, and two of the
three have had an open issue naming the exact fix for 47 days.

- **`service-compris` 0.4.0 is a release in flight, not a stall — but it is in the stall position.**
  `package.json` is 0.4.0 and `CHANGELOG.md` opens at `## 0.4.0 — 2026-10-07`, so B4 from
  `reviews/0.4.0-pre-tag-rereview.md` is closed; HEAD (2026-10-07) says the re-review *"cleared on
  its named checks"*. Only the tag and the publish are missing, two days on. Worth a glance before
  any 0.5.0 work starts. Separately, `v0.2.0-beta.3/4/5` are tagged and were never published, and
  the `beta` dist-tag still points at **0.2.0-beta.2** — i.e. *below* `latest` 0.3.0.
- Old published-without-tag versions exist on `tosijs` (1.0.3–1.5.9 era), `tosijs-ui` (1.0.x–1.1.1),
  `tosijs-schema` (0.0.x), `tosijs-3d` (0.2.1/0.2.2/0.2.5) and `tjs-lang` (0.2.7–0.6.x). All
  pre-date the tagging convention; recorded once so future sweeps don't re-raise them.

### N7. Stale npm dist-tags — and `create-tosijs-platform-app`, now checked

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.7 |
| `haltija` | 1.13.0-beta.3 ✅ current | 1.12.0-rc.5 | 1.12.9 |
| `service-compris` | 0.2.0-beta.2 | — | 0.3.0 |

tosijs's `beta`/`rc` and haltija's `rc` sit three minors behind `latest`, so nobody is pulled
*forward* onto a pre-release by accident — drift, not exposure. A consumer who deliberately follows
`rc` gets an abandoned line. `npm dist-tag rm` when convenient. `tosijs-ui` carries **only**
`latest`, which is the tidy end state.

**`create-tosijs-platform-app` (last week's UNCHECKED): not a finding.** npm `latest` is **1.0.6**
and `tosijs-platform/create-script/package.json` is **1.0.6** — they agree. It is a sub-package of a
repo whose tags track the platform version, so it has no tag of its own by design, and its tree
audits **0 advisories** (no lockfile; fresh resolve).

### N8. Secrets: clean, with one accepted finding and one cosmetic regression inside it

Every repo tree and all **16** published tarballs grepped for `AIza`, `sk-`, `ghp_`, `github_pat_`,
`AKIA`, `xox*`, Mapbox `pk.`/`sk.`, and `-----BEGIN … PRIVATE KEY`, plus committed `.env` files and
`files`-glob leakage.

- **No** `sk-`, `sk.`, `AKIA`, `ghp_`, `github_pat_` or `xox*` material anywhere, in any tracked
  file of any of the 16 repos or in any of the 16 tarballs. **No `.pem`, `.key`, `.p12` or
  `id_rsa` file is tracked in any repo.** (`-----BEGIN PRIVATE KEY` hits exist only in installed
  `node_modules` fixtures — happy-dom's dev certificate, firebase-admin/gtoken doc strings — and in
  `tosijs-3d/reviews/0.7.0-pre-tag-gate.md`, which is the *prose* of the review that got the real
  key removed. `tosijs-3d/tls/` still holds nothing but `.gitkeep`.)
- **Published tarballs are clean of internal material**: no `reviews/`, `journal/`, `designs/`,
  `proposals/`, `.env*` or `.npmrc` in any of the 16. `tosijs-ui` ships a `tls/` directory
  containing only `create-dev-certs.sh`. `haltija` ships `apps/desktop`'s built JS and no
  `apps/mcp`.
- **Accepted finding, not re-raised.** The Mapbox `pk.` public demo token remains in
  `tosijs-ui` (`src/mapbox.ts`, `dist/mapbox.js`, `dist/iife.js.map`, `docs/`) and in downstream
  demo builds: `tosijs-product` (`src/tosi-scroll-map.ts` inside a `<tosi-product
  class="doc-demo">` block, `README.md`, `docs/` incl. two sourcemaps),
  `tosijs-timezone-picker/docs/hydrate.js.map`, and **now also `tosijs-3d/docs/`** (two
  sourcemaps — a new downstream copy, same token, same class). It is in the published
  `tosijs-ui-1.16.10.tgz` and `tosijs-product-0.8.0` README. **Class unchanged — public-class
  token, deliberate, working as intended.** One cosmetic note: last week `dist/mapbox.js` carried
  the literal *split* so it stopped matching GitHub's scanner; in 1.16.10 it matches again, so the
  scanner noise is back if that was the point of the split.
- `tjs-lang/demo/src/{firebase-auth,agent-client,user-store}.ts` carry a Firebase **web** `apiKey`
  (`AIza…`) — public-class (identifies, does not authorize), demo only, and `files` ships `docs`
  but not `demo`. Notable, not major. Unchanged.
- **`tosijs-platform/functions/.env.sandbox` and `.env.liquid-force-425209-g2` are committed and
  are NOT a finding.** Each holds only documented feature flags (`PLATFORM_CONFIGS_FROM_REGISTRY`,
  `RENDER_ON_STORE`, `SITE_HOST`) with seed instructions and a rollback note. No credentials.
  Recorded again so next week's sweep does not re-raise them. `tosijs/.env.example` is a template
  with `example.com` placeholders.

### N9. Lockfile hygiene

- **No lockfile:** `tosijs-platform/functions` (§M1 — the one that matters, a production deploy
  target), `tosijs-platform/create-script`, `tjs-lang/editors/vscode`. The latter two audit clean on
  a fresh resolve; neither reading is a property of a pinned tree.
- **Frozen / `npm ci` installs succeeded** — so the audit reflects the committed tree — for all 19
  other trees: tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs,
  ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, haltija/apps/mcp, wobbly,
  tosijs-editor, tosijs-platform, kilpi, lukko (bun) and tjs-lang/functions,
  haltija/apps/desktop (npm ci).

### N10. Scoreboard — 7 fact cells stale

`bun tools/scoreboard.ts --check` reports seven stale fact cells. I have **run the tool and
committed its output with this report** (README "Any agent that notices a stale row should fix
it"; the fact cells are tool-generated, so this is the sanctioned mechanism, not a hand edit):

| Row | was | now |
| --- | --- | --- |
| `tosijs-ui` | 1.16.6 | **1.16.10** |
| `tjs-lang` | package.json 0.14.0-rc.1 | **0.14.0-rc.5** |
| `tosijs-3d` | 0.8.10 | **0.9.0** |
| `tosijs-3d-ensemble` | 0.4.0 all agree | ⚠️ **npm 0.4.0 · package.json 0.5.0 · tag v0.5.0** |
| `haltija` | package.json 1.13.0-beta.2 | **1.13.0-beta.3** |
| `tosijs-editor` | 0.5.2 | **0.7.0** |
| `tosijs-platform` | 0.3.0 all agree | ⚠️ **npm 0.3.0 · package.json 0.4.0 · tag v0.3.0** |

The tool behaved correctly on what it could not reach: `kith-email` and `tosijs-virta` are
unreachable from here, and it left both rows alone **without advancing their "As of"** — a
cannot-check that does not masquerade as a check. It also reported the virta task board
unreachable and fell back to its built-in project list.

**One finding came out of the tool rather than the clone sweep:** `tosijs-3d-ensemble` has
**v0.5.0 tagged but never published** (npm `latest` is 0.4.0). The repo is local-only, so the
sweep cannot clone or audit it — but its registry state is measurable, and it is a fourth instance
of the ecosystem's most-recurring defect class. Measured-zero, so bookkeeping.

Prose Activity cells are left to the owner, per README ("the prose columns are written").

### N11. Issues — 160 open, fully enumerated, still zero non-owner authors

**38 issues opened in the last 14 days** (2026-09-25 → 2026-10-09):

| Repo | Open issues | New in 14 days |
| --- | --- | --- |
| `tosijs-ui` | 53 | #218, #217, #216, #214, #213, #212, #211, #210, #209, #207, #205, #198, #197, #196, #195, #190, #186, #185, #184 |
| `tjs-lang` | 29 | #59, #58 |
| `tosijs-platform` | 26 | #36, #35, #34, #33, #32, #31, #30, #29, #28 |
| `haltija` | 16 | #55, #54 |
| `tosijs` | 15 | #49 |
| `tosijs-3d` | 10 | #102, #100, #94, #92 |
| `react-tosijs` | 3 | — |
| `kilpi` / `lukko` | 2 / 2 | — |
| `tosijs-schema` | 1 | #12 |
| `ngx-tosijs` / `wobbly` / `tosijs-timezone-picker` | 1 each | — |
| `tosijs-floorplan` / `tosijs-product` / `tosijs-editor` | 0 | — |

- **Every one of the 160 open issues is authored by `tonioloewald`.** The strongest public adoption
  instrument, re-measured today, still reads **zero non-owner humans** ecosystem-wide.
- `tosijs-ui` is **up from 43 to 53** open issues (19 new in 14 days) — the ecosystem's busiest
  backlog by a wide margin. `tosijs-schema` is down to **1** open issue and `tosijs-floorplan`,
  `tosijs-product` and `tosijs-editor` are at **zero**.
- **Security-relevant and open, beyond the sections above:**
  `tosijs-schema#12` (new, 10-03 — *injectable pattern engine so `validate()` need not run
  untrusted input through the host's backtracking `RegExp`*; ReDoS hardening on the validator
  itself), `tosijs-ui#205` (*opaque-origin sandbox for untrusted live examples*),
  `tosijs-platform#35` (*a token with methods `[GET]` can't list* — fail-**closed**, so a
  correctness bug rather than an exposure), `#28` (*provenance stamps the matched role document's
  first uid, not the caller's* — a principal matched by contact is recorded as someone else; see
  §N3), `#24` (*a hand-written role document without `_created` is silently invisible to role
  resolution* — fail-open in the authority layer), `haltija#44` (*the REST surface answers any
  origin, so socket-level gating is theatre*), `haltija#45` (arrow-token neutralization now MUST
  for untrusted-content producers), `haltija#55` (new — *`key` dispatches untrusted
  `KeyboardEvent`s with no native default action*), `kilpi#1` (SECURITY.md does not state which
  release lines get fixes — on what is now tosijs-ui's runtime sanitizer), `kilpi#2` (the denylist
  passes custom elements and `is=`; **tosijs-ui is not exposed** — it closed the gap at its own
  layer, verified last week — but any other kilpi consumer is), `tjs-lang#56` (*bare context
  bindings return their own name in return position* — fail-open shape).
- **One issue no longer reproduces:** [tjs-lang#57](https://github.com/tonioloewald/tjs-lang/issues/57)
  reports *"3 medium advisories in the functions/ subtree (qs ×2, uuid)"* via Dependabot;
  `npm ci` + `npm audit` in `tjs-lang/functions` reads **0 advisories at every severity** this week.
  Closeable.

### N12. `tosijs`'s own open security issues — all three unchanged, on a real-consumer package

- [#41](https://github.com/tonioloewald/tosijs/issues/41) (open **30 days**) — a light-DOM wrapper
  carrying the `value` binding over a password field is never learned as secret, so `read()` /
  `changes()` / `describe()` return cleartext.
- [#43](https://github.com/tonioloewald/tosijs/issues/43) (open **27 days**) — an unknown prop is
  assigned as a DOM property, so a props object from untrusted data can set `innerHTML`.
- [#32](https://github.com/tonioloewald/tosijs/issues/32) (open **37 days**) — secret-path matching
  is spelling-sensitive: `list[0].pw` returns cleartext where `list[id=a1].pw` redacts.

Listed again for the same reason as the last three sweeps: the sweep reports **published** state,
and published state has not moved (1.10.7 ships all three). Sequencing is the owner's call and is
not disputed — these are on the queue, not ignored.

---

## UNCHECKED — gaps this sweep did not earn a pass on

- **Unpushed local work.** The sweep reads remote clones only, so a `main` that exists solely on the
  dev machine is invisible to it — the exact failure an earlier sweep caught on
  `tosijs-timezone-picker` at 0.5.3. No access to that machine from here. `service-compris` 0.4.0
  (§N6) may be mid-flight locally; only the dev machine can say.
- **`tosijs-3d-ensemble` and `manta-recon`** — local-only repos, no remote to clone, so **no
  dependency audit, no secret scan, no tarball check**. Ensemble's registry/tag state is in §N10
  via the scoreboard tool; nothing else about either was examined.
- **`tosijs-virta`** — private repo, not attached or scanned. `kith-email`, `static-assets`,
  `ariosto` — private, out of scope by the sweep's own rules.
- **Open pull requests were not enumerated or author-checked**, so the "zero non-owner authors"
  claim in §N11 covers **issues only**.
- **Dependabot alert state is not readable** from here. All advisories in this report come from
  `bun audit` / `npm audit` against installed trees — which is why §N11's last bullet can only say
  tjs-lang#57 does not reproduce *on my resolve*, not that Dependabot agrees.
- **Adoption instruments not re-run.** Grading uses the 2026-08-25 baseline as the sweep's own
  rules direct; jsDelivr per-file breakdowns and the GitHub dependents graphs were not
  re-measured. The one instrument that *was* re-measured — non-owner issue authors — still reads
  zero (§N11).
- **No runtime or behavioural verification.** Everything here is static: manifests, lockfiles,
  registry metadata, tarball contents, greps. Nothing was built, started, or exercised; the
  `/users/**` Storage finding in §N3 is read from the rules file, not probed against the live
  bucket.
- **Transitive-path attribution is `npm`/`bun`'s, not independently traced** — `isDirect` came back
  `null` for every bun advisory, so "direct vs transitive" in §M1 is from each manifest's own
  `dependencies` / `devDependencies` split, which is reliable for the runtime/dev distinction that
  drove the grading but not a full path trace.
