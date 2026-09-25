# Weekly security & health sweep — 2026-09-25 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).

**Scanned:** 16 GitHub repos, **23 dependency trees** (7 nested workspaces audited separately),
**16 published tarballs**, **173 open issues enumerated in full** via the GitHub API.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script`, plus the two lockfileVersion-2 roots re-audited under bun 1.4.2 |

`tosijs-editor` is **back in scope** this week — the scoreboard's back-burnered label is gone and the
row shows an active 0.5.0. Two sweeps flagged that label as wrong; the divergence it hid
(`tosijs-styled-editor` 0.4.4 / v0.4.4 / 0.4.5) has since been reconciled: repo, tag and npm all
read **0.5.0**.

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-3d-ensemble`, `manta-recon`, `tosijs-virta` — local-only or private repos, no public remote.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full. Its
  `package.json` sets `private: true`, so it has no registry state to check.

**Tooling:** `bun 1.3.11` + `bun audit --json` (exit code read before output; clean = exit 0 and a
3-byte `{}`), `npm ci --ignore-scripts` / `npm install --ignore-scripts` + `npm audit --json`,
`npm view <pkg> dist-tags|versions` for registry state, `git ls-remote --tags` for tags,
`npm pack <pkg>@latest` + extract + grep for published contents, and the GitHub REST API for
issues, PRs, workflow runs and job logs.

**Coverage improved in two ways this week**, both of which closed a gap the last two sweeps
declared:

- **Issue enumeration is complete**, not first-page-only. The API needs each repo attached to the
  session; all 16 were attached read-only-in-practice (nothing was written to any repo). Last
  week's page-scrape missed a great deal: `tosijs-ui` alone has **60** open issues, not the 12 a
  single page showed.
- **The two lockfileVersion-2 trees were audited against their committed lockfiles.** `bun 1.3.11`
  cannot parse them; installing `bun 1.4.2` alongside made `kilpi` and `tosijs-platform` audit
  frozen-and-clean rather than clean-on-a-different-resolve.

---

## Last week's majors

- **M1 `tosijs-ui` v1.14.2 unpublished — CLOSED.** 1.14.2 **and** 1.14.3 are on the registry; the
  CHANGELOG's "also shipped as 1.14.2" line is now true. **Recurred one minor later** as §M1 below.
- **M2 `tosijs-platform` world-readable Storage — UNCHANGED.** §M4.
- **M3 `tosijs` #43 (untrusted props reach `innerHTML`) — UNCHANGED, still open.** §M5.
- **M4 `tosijs` #41 (cleartext secrets through the agent surface) — UNCHANGED in published code.** §M6.
- **M5 `lukko` 2 critical / 11 high — UNCHANGED**, now **33 days** open; the repo's HEAD is still
  `94d25be` from 2026-03-04. §M7.
- **M6 `tjs-lang` unpinned CDN major range — UNCHANGED**, reconfirmed in the 0.13.13 tarball. §M8.

Cleared since last week: `tosijs` (1.10.3 agrees three ways), `tosijs-editor` (0.5.0 agrees three
ways), and `tosijs-ui`'s missing lockfile — it now commits `bun.lock` (#178).

---

## MAJOR findings

### M1. `tosijs-ui` — the 1.15.3 publish FAILED 13 minutes before this sweep, and a security fix is stuck behind it

| Signal | Value |
| --- | --- |
| npm `latest` | **1.15.2** (no 1.15.3 under any dist-tag; `npm view tosijs-ui@1.15.3` → E404) |
| Remote tag | **`v1.15.3`** at `7a5e144`, dated **2026-09-25** |
| `package.json` at tag and on `main` | **1.15.3** |
| Publish workflow run | **`36188243710`**, `workflow_dispatch`, 2026-09-25T20:51Z → **failure** |
| Failed step | step 11, **`release-doctor`** — steps 12–17 (stage, approve, verify, registry smoke) all skipped |

This is not a bookkeeping slip, and it is not a stale tag nobody noticed: the publish was
*attempted* and the gate stopped it. Two checks failed, and the first one has already been fixed on
`main` without the tag being moved:

```
❌ artifact freshness — committed build output is stale — rebuilding changed 76 code artifact(s).
   The tested source is not the shipped source:  dist/iife.js | 178 +++---, dist/iife.js.map, docs/_chunks/…
❌ tag/publish reconciliation — tags ahead of npm (1.15.2): v1.15.3 — land the plane before any new version work
✅ …21 other checks, including tests, typecheck, packaged exports, consumer smoke test on the packed tarball
2 failed, 2 warnings, 0 skipped (skips are NOT passes)
```

- **Blocker 1 is fixed on `main`, one commit past the tag.** `622b210` — *"ci: pin Bun in
  `.bun-version`; 1.15.3 rebuilt with Bun 1.4.2 (#178)"` — is the only commit after `v1.15.3`, and
  the only shipped difference between them is `dist/iife.js` + its map (91 lines each way). So the
  tag still points at the stale build: **re-dispatching Publish against `v1.15.3` fails the same
  check again.** The workflow checks out `refs/tags/${{ inputs.tag }}`, so the fix has to reach the
  tag, not just `main`.
- **Blocker 2 is fixed too, in this repo.** `release-doctor`'s reconciliation check fired on the
  very tag being published — a tag ahead of npm is the definition of a release in flight.
  `main`'s `publish.yml` now sets `RELEASE_DOCTOR_PUBLISHING: ${{ inputs.tag }}` (the tag's copy
  does not), and `tools/release-doctor.ts` here honours it as of `c437244`. The failed run predates
  both. Because the workflow checks the practices repo out at its default branch, this one needs no
  further action.

**Recommended action:** re-cut `v1.15.3` at `622b210` (or cut 1.15.4 from it, if moving a published
tag is unwelcome) and re-dispatch Publish **from `main`** so the `RELEASE_DOCTOR_PUBLISHING` env
lands. Then confirm §M2 is live on the registry.

### M2. `tosijs-ui` published 1.15.2 — `<tosi-md>` renders untrusted markdown to `innerHTML` with no sanitizer at all

`tosijs-ui-1.15.2.tgz` → `package/dist/markdown-viewer.js:171`:

```js
this.innerHTML = marked(source, this.options);
```

There is no sanitize option in the published build — not off-by-default, **absent**. Any consumer
rendering text it did not write (issue bodies, comments, notes, anything from a user or an API)
through `<tosi-md>` has a stored XSS. [`tosijs-ui#179`](https://github.com/tonioloewald/tosijs-ui/issues/179),
opened 2026-09-22, records the reproduction: tosijs-virta's pre-release review read a token out of
`localStorage` through an issue body carrying `<img onerror>`.

Graded major on class — **script injection reachable from data, in published code, on one of the two
packages with known private production consumers.** Code-level security findings keep their severity
regardless of measured base.

The fix exists (`sanitize="on"` via kilpi, `src/markdown-viewer.ts:213`, plus an `href` held to the
navigation rule) and is tagged as 1.15.3. It is unreachable for every consumer until §M1 clears.
The same unpublished tag also carries **#183**, the `<tosi-dialog>` Escape bug that left
`confirm`/`alert`/`prompt` permanently unresolved — *"Reported by snowfox-app, which carried a
workaround at nine sites."* A known production consumer is working around a bug whose fix is sitting
behind a failed publish job.

**Recommended action:** §M1. Until it ships, `tosijs-ui#179`'s own advice is the only mitigation
available to a consumer on npm: do not pass untrusted text to `<tosi-md>`.

### M3. The sanitizer that 1.16 will make the default does not close the hole it was written for

[`kilpi#2`](https://github.com/tonioloewald/kilpi/issues/2), opened 2026-09-22, from virta's 0.5.0
re-review. Verified in the **published** `tosijs-kilpi-1.0.1` tarball (`package/dist/index.js`):

- `FORBIDDEN_TAGS` is a denylist — `script`, `iframe`, `object`, `embed`, `form`, `style`, `meta`,
  `base`, `noscript`, `template`, SVG animation. **No rule for custom elements** (any `localName`
  containing `-`), and `FORBIDDEN_ATTRIBUTES` is `{ping}` only — **`is=` is not stripped.**
- `tosijs-ui` v1.15.3's `sanitize="on"` parses into an inert `<template>`, runs `sanitizeInPlace`,
  then `this.replaceChildren(template.content)`. A `<tosi-md>` that survived the denylist **upgrades
  at that moment**, and its `connectedCallback` assigns `this.innerHTML = marked(this.textContent)`
  — the escaped text becomes live markup. `<tosi-md src="https://…">` fetches remote markdown the
  same way.

So on any page that registers tosijs-ui's elements — which is every page using the doc system, at
module load — `sanitize="on"` is **not** sufficient for stored content from untrusted authors. The
README is honest about the trade-off; the problem is that **1.16 plans to make this the default**,
at which point the safe-looking setting silently isn't, for exactly the input class it advertises.

**Recommended action:** land one of kilpi#2's asks before 1.16 flips the default —
`sanitizeInPlace(root, { customElements: 'unwrap' | 'drop' | 'keep' })` plus an `is=` strip, or an
allowlist mode. A denylist that passes unknown elements through cannot be the default sanitizer for
a component library that registers elements.

### M4. `tosijs-platform` — every user's Storage uploads are still world-readable, 33 days on, in production

`storage.rules` on current `main`, unchanged from last week, line for line:

```
match /users/{userId}/{path=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

Write is owner-scoped; **read is unconditional**, and so are the three sibling rules (lines 32, 38,
50) — this is the bucket's posture, not one stray match.
[tosijs-platform#3](https://github.com/tonioloewald/tosijs-platform/issues/3) — *"confirm this is
deliberate"* — has been **open 33 days**, and the service has now been running in production for a
week (the cutover was last sweep's HEAD).

Stated as honestly as last week: the sweep cannot read intent from a rules file. If `/users/**` is a
public asset area by design, close #3 saying so. If any of it is user-private, this is a live data
exposure on the repo the scoreboard calls *"a load-bearing pillar: the ecosystem's service layer"* —
and access-control defaults propagate to whatever adopts it.

### M5. `tosijs` — an unknown prop is assigned as a DOM property, so untrusted props can set `innerHTML`

[`tosijs#43`](https://github.com/tonioloewald/tosijs/issues/43), opened 2026-09-12, **still open**,
present in published 1.10.3:

```js
b3dLight({ intensity: 0.9, innerHTML: '<img src=x onerror=BOOM>' })  // executes on append
```

Unchanged from last week including the two aggravating details: it contradicts the documented
behaviour in tosijs#26 (*unknown props are silently dropped*), so a consumer reading the docs
concludes they are safe; and the reporting project had to build its own allow-list across every
data-to-element path — the propagation path severed, which is what `review.md` lens 9 asks you not
to leave standing. Note the **shape it shares with §M2 and §M3**: three separate paths in the stack
end at a raw `innerHTML` assignment, each mitigated locally.

**Recommended action:** decide the seam in tosijs — assign only declared attributes (which also
closes #26), or deny-list the dangerous sinks.

### M6. `tosijs` — published 1.10.3 still returns cleartext secrets through the agent surface

[`tosijs#41`](https://github.com/tonioloewald/tosijs/issues/41), opened 2026-09-09, **open**, last
touched 2026-09-19. A light-DOM wrapper carrying the value binding over a contained
`<input type="password">` is never learned as a secret path (`refreshSecretPaths` walks up only
across a shadow boundary), so `agent.read('lc.password')` returns cleartext and `describe()` emits
`secret: true` beside the cleartext value.

Listed again for the same reason as last week: the sweep reports **published** state, and published
state has not moved. Your sequencing reasoning is recorded and not disputed.
[`#32`](https://github.com/tonioloewald/tosijs/issues/32) (spelling-sensitive secret paths) remains
the narrower instance of the same family.

### M7. `lukko` — 2 critical / 11 high, one dependency edge, untouched since March

`bun audit` against the committed `bun.lock` (frozen install, lockfile honoured): **2 critical,
11 high, 16 moderate, 3 low** — identical in shape to the last three sweeps. The repo's HEAD is
`94d25be` (2026-03-04), so nothing has moved at all.

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs` | Arbitrary code execution (<7.5.5) |
| critical | `websocket-driver` | Message corruption via protocol length headers (<0.7.5) |
| high ×2 | `@grpc/grpc-js` | Malformed request / malformed compressed message crashes client or server |
| high ×4 | `protobufjs` | Code-generation gadget after prototype pollution; code injection via bytes-field defaults; unbounded recursion; unsafe option paths |
| high ×1 | `protobufjs` | Unbounded `Any` expansion during JSON conversion |
| high ×4 | `undici` | WebSocket 64-bit length overflow; permessage-deflate memory exhaustion; `server_max_window_bits` unhandled exception; fragment-count DoS |

Single root cause, unchanged: `lukko` pins `tjs-lang: ^0.3.0`, whose lock holds `tjs-lang@0.3.0`
carrying `firebase@10.14.1` as a **runtime** dependency. Current tjs-lang has firebase as a
devDependency only, so the whole subtree disappears on upgrade. `private: true` and unpublished —
nothing reaches a consumer — but it installs on the dev machine.
[lukko#2](https://github.com/tonioloewald/lukko/issues/2), open **33 days**.

**Recommended action:** `bun add tjs-lang@^0.13.13` and re-lock. The same one line for the fourth
week; the row's suggested floor in the scoreboard is already this.

### M8. `tjs-lang` — published 0.13.13 still dynamic-imports an unpinned major range from a CDN

Reconfirmed **in this week's tarball**: `tjs-lang-0.13.13.tgz` →
`package/dist/tjs-browser-from-ts.js` still contains `https://esm.sh/typescript@5`. On `main` it is
`src/lang/browser-from-ts.ts:27` (`DEFAULT_TYPESCRIPT_URL`), and `browser-bundle.test.ts:67`
asserts that exact string — so the unpinned range is currently **pinned in place by a test**.

A rolling major range, fetched by a dynamic `import()` that cannot carry `integrity`, executing in
the consumer's page, invisible to every consumer lockfile.
[tjs-lang#55](https://github.com/tonioloewald/tjs-lang/issues/55), open 19 days, unchanged across
two releases.

Blast radius stated honestly: an opt-in entry point, overridable per call via `typescriptUrl`,
landing in a browser page — narrower than the haltija CDN case you closed by pinning with SRI.

**Recommended action:** pin an exact version in `DEFAULT_TYPESCRIPT_URL` (update the test with it);
keep the override.

---

## Notable, non-major

### N1. Publish integrity — the rest

| Repo | package.json | Latest tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `tosijs-ui` | 1.15.3 | **v1.15.3** | 1.15.2 | ⚠️ §M1 — publish attempted and blocked |
| `haltija` | 1.13.0 | v1.12.9 | 1.12.9 | in-flight, **not** a divergence: CHANGELOG top is `1.13.0 (unreleased)`, no 1.13.0 tag exists |
| `tjs-lang` | 0.14.0 | v0.13.13 (stable); `v0.14.0-rc.0` exists | 0.13.13 · `rc` **0.14.0-rc.0** | in-flight and correctly staged — the rc is on the `rc` tag, not `latest` |
| `service-compris` | 0.2.0-beta.4 | v0.2.0-beta.4 | 0.1.0 · `beta` **0.2.0-beta.2** | ⚠️ **beta.3 and beta.4 tagged, never published** — bookkeeping (measured-zero) |
| `wobbly` | 0.6.0 | v0.6.0 | `wobbly-js` **0.1.0** | five releases unpublished ([wobbly#1](https://github.com/tonioloewald/wobbly/issues/1)), unchanged |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | published, still untagged ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2)); `v0.6.0` at `f013750` is safe when wanted |
| `create-tosijs-platform-app` | 1.0.6 | **none** | 1.0.6 | published, no tag anywhere in the repo for it |
| `tosijs` | 1.10.3 | v1.10.3 | 1.10.3 | ✅ |
| `tosijs-schema` | 1.10.2 | v1.10.2 | 1.10.2 | ✅ |
| `tosijs-floorplan` | 0.5.0 | v0.5.0 | 0.5.0 | ✅ |
| `tosijs-editor` | `tosijs-styled-editor` 0.5.0 | v0.5.0 | 0.5.0 | ✅ **last week's divergence reconciled** |
| `kilpi` | `tosijs-kilpi` 1.0.1 | v1.0.1 | 1.0.1 | ✅ |
| `tosijs-3d` / `tosijs-product` / `react-tosijs` / `ngx-tosijs` | 0.8.3 / 0.8.0 / 1.2.1 / 0.9.1 | match | match | ✅ |

Twelve of sixteen published packages agree across repo · tag · registry. The four that don't split
cleanly: one is a blocked publish on a real-consumer package (§M1), and three are measured-zero
bookkeeping, all already filed. Per `releasing.md`'s calibration these three are **notable, never
major** — but "land the plane before touching the throttle again" still outranks the calibration,
and `service-compris` is now two betas deep into that.

### N2. Stale npm dist-tags — unchanged

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.3 |
| `haltija` | 1.3.0-beta.12 | 1.12.0-rc.5 | 1.12.9 |

Both pre-release tags sit **behind** `latest` on both packages, so nobody can be pulled forward onto
a pre-release by accident — drift, not exposure. `npm dist-tag rm` when convenient.

### N3. Dev-tree advisories that reach no consumer

- **`react-tosijs`** — 11 high + 4 moderate, all from the eslint 8 dev tree: `brace-expansion`
  (3 high + 1 moderate), `js-yaml` (3 high + 2 moderate), `minimatch` (3 high), `flatted` (2 high),
  `ajv` (moderate).
- **`ngx-tosijs`** — 3 moderate against `@angular/common` / `@angular/compiler` / `@angular/core`
  (HttpTransferCache leak via `withRequestsMadeViaParent`; sanitization bypass via directive host
  bindings).

Both packages declare **`dependencies: null`** — everything is dev or peer — so no consumer install
pulls any of it. Filed as [react-tosijs#4](https://github.com/tonioloewald/react-tosijs/issues/4),
[#5](https://github.com/tonioloewald/react-tosijs/issues/5),
[ngx-tosijs#1](https://github.com/tonioloewald/ngx-tosijs/issues/1).

### N4. `tosijs-platform/functions` — still 10 moderate, still unpinned, still no lockfile

`npm audit` on the deployed Cloud Functions tree: **10 moderate, 0 high, 0 critical** — `uuid`
(missing buffer bounds check in v3/v5/v6) and `ts-deepmerge` (prototype-method override DoS),
reaching `firebase-admin`, `@google-cloud/firestore`, `@google-cloud/storage`, `gaxios`,
`google-gax`, `retry-request`, `teeny-request`, `firebase-functions-test`.

[tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2) still says *"3 critical
/ 41 high"*, which still does not reproduce; its other claim still does — `firebase-admin` is pinned
`^12.7.0` while the registry's latest is **14.5.0**, two majors behind, on a tree in production.
Correct the issue to what is measurable, or it will be read as a false alarm when it next matters.
`functions/` has **no lockfile**, so this reading is one deploy-time resolve, not a property of what
is deployed.

### N5. Three filed advisories are closed in fact but open on the tracker

- [tjs-lang#57](https://github.com/tonioloewald/tjs-lang/issues/57) (*3 medium: qs ×2, uuid in
  `functions/`*) — `npm ci` on the committed lock resolves clean, 0 advisories. Second week.
- [haltija#46](https://github.com/tonioloewald/haltija/issues/46) (*3 hono advisories in
  `apps/mcp`*) — `apps/mcp` does not depend on hono; `bun audit` on its lockfile is clean. Second week.
- [react-tosijs#5](https://github.com/tonioloewald/react-tosijs/issues/5) (*browserslist high +
  baseline-browser-mapping*) — **`browserslist` does not appear in the committed `bun.lock` at all**
  (zero matches), and the frozen audit's 15 advisories are entirely the eslint-8 set from #4.

Close them, or each sweep re-derives the same negatives.

### N6. Secrets: nothing new, and nothing that changed class

Every repo tree and all **16** published tarballs grepped for `AIza`, `sk-`, `ghp_`, `github_pat_`,
`AKIA`, `xox*`, Mapbox `pk.`/`sk.`, and `-----BEGIN … PRIVATE KEY-----`, plus committed `.env` files
and `files`-glob leakage.

- **No** `sk-`, `sk.`, `AKIA`, `ghp_`, `github_pat_`, `xox*` or private-key material anywhere, in
  any repo or any tarball. No committed `.env` (only `tosijs/.env.example`).
- Every `pk.eyJ…` hit is the **accepted** Mapbox public demo token — **one** token, confirmed
  byte-identical across tosijs-product, tosijs-3d and tosijs-timezone-picker (same SHA-256 prefix
  `52a561124595`) and tosijs-ui's `dist/mapbox.js` + sourcemap. In the tarballs only
  `tosijs-ui` (dist) and `tosijs-product` (README) carry it. The one `src/` occurrence
  (`tosijs-product/src/tosi-scroll-map.ts:64`) is still inside a `<tosi-product class="doc-demo">`
  documentation block, not runtime code. **Class unchanged, so not re-raised.**
- `tjs-lang/demo/src/{firebase-auth,agent-client,user-store,settings}.ts` carry a Firebase **web**
  API key (`AIza…`), commented as public client-side values — public-class, demo only, not shipped
  in the tarball. Notable, not major.
- `tosijs-ui/src/no-secrets.test.ts` matches `AIza` because it **is** a secrets gate: it holds the
  pattern table (`AKIA[0-9A-Z]{16}`, `gh[pousr]_…`, `AIza[0-9A-Za-z_-]{35}`, `xox…`, private-key
  block). Worth noting as the good outcome — the largest package in the ecosystem now tests itself
  for this class.
- `tosijs-3d/reviews/0.7.0-pre-tag-gate.md` matches the private-key pattern in **prose** — the
  record of the TLS key rewritten out before that release. No key material.
- `files`-glob check: **no** `reviews/`, `journal/`, `designs/` or `.github/` directory ships in any
  of the 16 tarballs.

### N7. Lockfile hygiene — one gap closed, one toolchain wall, one lockfile out of sync

- ✅ **`tosijs-ui` now commits `bun.lock`** (`lockfileVersion: 1`), and `bun install
  --frozen-lockfile` succeeds. Last week's "largest dependency surface in the ecosystem has no
  reproducible install" is closed, via #178.
- ⚠️ **`kilpi` and `tosijs-platform` commit `lockfileVersion: 2`**, which **bun 1.3.11 cannot
  parse** (`UnknownLockfileVersion` → `warn: Ignoring lockfile` → a frozen install fails and a
  fallback silently audits a differently-resolved tree). Under **bun 1.4.2** both install frozen and
  audit clean, so this sweep's reading is earned — but any consumer or CI runner on bun ≤1.3.x hits
  the wall. `tosijs-ui` and `haltija` now pin `.bun-version` (1.4.2); these two do not.
  `dependencies.md` §1 names "bun too old" as a way a gate reports an unearned pass; this is that
  failure arriving from the other direction — **lockfile newer than the tool** — and the doc still
  does not say so.
- ⚠️ **`haltija/apps/desktop`'s `package-lock.json` is out of sync with its `package.json`**:
  `npm ci` refuses outright — *"Missing: electron-store@10.1.0, conf@14.0.0, type-fest@4.41.0,
  ajv@8.20.0 from lock file"*. The tree audits clean on a fresh resolve (0 advisories), but `npm ci`
  cannot be used there — in CI or by a contributor — until the lock is regenerated.
- No lockfile at all: `tosijs-platform/functions`, `tosijs-platform/create-script`,
  `tjs-lang/editors/vscode`. All three audited clean on a fresh resolve; none of those readings is a
  property of a pinned tree.

### N8. Issues and PRs — 173 open, fully enumerated, still zero outside authors

75 issues were opened in the last 14 days (2026-09-11 → 2026-09-25):

| Repo | Open | New in 14 days |
| --- | --- | --- |
| `tosijs-ui` | 60 | #190, #189, #188, #187, #186, #185, #184, #183, #181, #180, #179, #178, #177, #176, #175, #174, #173, #172, #171, #170, #169, #168, #166, #165, #164, #162, #161, #160 |
| `tosijs-3d` | 28 | #91–#85, #83–#76 |
| `tjs-lang` | 27 | #57, #56 |
| `tosijs-platform` | 17 | #26, #24, #15, #14, #13, #12, #11, #10, #9, #8, #7, #6, #5 |
| `haltija` | 16 | #53–#46 |
| `tosijs` | 14 | #46, #44, #43, #42 |
| `react-tosijs` / `lukko` / `kilpi` | 3 / 2 / 2 | #5 / — / #2, #1 |
| `ngx-tosijs` / `wobbly` / `tosijs-timezone-picker` / `tosijs-floorplan` | 1 each | #1 / — / — / #16 |
| `tosijs-schema` / `tosijs-product` / `tosijs-editor` | 0 | — |

- **Every one of the 173 is authored by `tonioloewald`.** The single open PR anywhere is
  `tosijs-ui#167` (dependabot). So the strongest public adoption instrument still reads **zero
  non-owner humans**, ecosystem-wide, and last week's one exception (`anssip`) stays closed.
- Security-relevant and open beyond the majors: `kilpi#1` (*SECURITY.md does not state which release
  lines receive fixes* — on the package that is now tosijs-ui's sanitizer **and** a runtime
  dependency, so it is the one place a supported-versions statement earns its keep),
  `haltija#44` (*the REST surface answers any origin, so socket-level gating is theatre*),
  `haltija#45` (arrow-token neutralization now MUST for untrusted-content producers),
  `tjs-lang#56` (*bare context bindings return their own name in return position — the fail-open
  shape of #54*), `tosijs-platform#24` (*a hand-written role document without `_created` is silently
  invisible to role resolution* — a fail-open in the authority layer).
- `tosijs-ui#167` (dependabot dev-dependency group) has **failing CI** on its last two runs
  (2026-09-24 and 2026-09-25). A dependency bump nobody can merge is a bump that isn't happening.

### N9. This repo's own tooling — two defects found while trying to use it, both fixed in this commit

Running `bun tools/scoreboard.ts --check` to refresh the fact columns surfaced two failures that had
been silently stopping it from doing its job:

- **`repoVersion()` shells out to `gh api` only.** `gh` is not installed in this sweep container (or
  in a plain CI runner), so **every row** returned *"could not be verified (repo/registry
  unreachable)"* — the fact cells had no way to be refreshed from here at all. Added an anonymous
  `raw.githubusercontent.com` fallback for public rows; `gh` still runs first, so private rows keep
  working where it exists. 16 of 18 rows now verify; `lukko` and `kith-email` correctly remain
  unverifiable anonymously.
- **The row parser split on every `|`, including escaped ones.** The `tosijs-ui` Activity cell
  contains a peer range (`^0.13.1 || ^0.14.0`), so its row read as 8 cells and the tool refused to
  touch it — *for as long as that text has been there*. It now splits on unescaped pipes only, and
  the cell's pipes are escaped. That row's Version cell was **wrong** as a direct result: it claimed
  `1.15.2 (repo · tag · npm all agree)` while §M1 was live.

A third, smaller thing is worth naming rather than patching around: with zero rows verified the tool
still printed **"scoreboard: all verified rows already accurate"** — vacuously true over an empty
set, and exactly the shape `dependencies.md` §1 forbids (*never infer success from absence*). Its
exit code was honest (1), which is what the practice says to read first. The summary line now
reports the count and says plainly when nothing was verified.

### N10. Scoreboard rows refreshed

Fact cells were **machine-written** by `bun tools/scoreboard.ts` (not hand-edited), which corrected
three: `tosijs-ui` (→ the §M1 divergence), `tjs-lang` (`0.14.0-rc.0` → `0.14.0` in package.json),
`tosijs-platform` (`0.2.0-beta.3` → `0.2.0-beta.4`). Prose Activity cells the facts contradicted
were updated by hand, per the README's division of labour.

---

## Coverage — what this sweep did NOT earn

- **GitHub dependents graphs were NOT checked.** `/network/dependents` is HTML on `github.com`,
  which this session's proxy refuses (403) even for attached repos; only `api.github.com` is
  reachable. So one of `releasing.md`'s adoption instruments is **UNCHECKED** this week. The
  strongest instrument (non-owner humans) was measured in full and reads zero.
- **jsDelivr per-file hit shape was NOT measured** — no CDN instrument was run at all.
- **`tosijs-platform/functions`, `create-script` and `tjs-lang/editors/vscode` have no committed
  lockfile**, so their clean readings are one resolve each, not a stable property.
- **`haltija/apps/desktop` was audited on a fresh resolve**, because its committed `package-lock.json`
  does not match its `package.json` (§N7) — its "0 advisories" is not clean-against-the-lock.
- **No runtime, deployment or behavioural testing anywhere.** §M2/§M3's exploit paths were verified
  by reading the published bytes and the sanitizer's tag/attribute sets, **not** by executing the
  attack. §M4 is a rules-file reading, not a probe against the live bucket.
- **Unpushed local work is invisible** — every repo was read from its remote.
- **Private consumers (Nonono, Snowfox) remain unmeasurable** by any instrument here; per
  `releasing.md`, the owner's own knowledge is the only instrument for those. Snowfox surfaces this
  week only indirectly, as the reporter named in tosijs-ui#183.
- **The two private repos in the tool's metadata (`lukko`, `kith-email`) cannot have their fact cells
  verified anonymously**, so those rows keep their prior "As of" dates by design.
