# Weekly security & health sweep — 2026-09-18 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).

**Scanned:** 15 GitHub repos, **21 dependency trees** (6 nested workspaces audited separately),
**15 published tarballs**.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

`kilpi` is new in scope this week (published as `tosijs-kilpi` 1.0.0 on 2026-09-17).

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-editor` — back-burnered per the scoreboard, so out of scope **by rule**. ⚠️ **Second week
  running that this label looks wrong**: the row's own Activity cell describes a 2026-09-06
  overhaul (new build, browser tests, audit gate), and `kilpi` — extracted *from* tosijs-editor —
  shipped 1.0.0 this week. Its `tosijs-styled-editor` npm/tag/package.json divergence
  (0.4.4 / v0.4.4 / 0.4.5) therefore went unverified again. Drop the label on the row and it
  enters scope next week.
- `tosijs-3d-ensemble`, `manta-recon`, `tosijs-virta` — local-only repos, no GitHub remote.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full.
  `package.json` sets `private: true`, so it has no registry state to check.

**Tooling:** `bun 1.3.11` + `bun audit --json` (exit code read before output; clean = exit 0 and a
3-byte `{}`), `npm ci --ignore-scripts` / `npm install --ignore-scripts` + `npm audit --json` on
`package-lock` and lockfile-less trees, `npm view <pkg> dist-tags|versions` for registry state,
`git ls-remote --tags` for tags, `npm pack <pkg>@latest` + extract + grep for published contents.
Every tree was audited against its **committed** lockfile where the toolchain could read it — the
three exceptions are named under **Coverage** and are not reported as clean-by-lockfile.

---

## Last week's majors

- **M1 `tosijs-schema` 1.9.1 unpublished — CLOSED.** Repo, tag and npm all agree at **1.10.2**;
  the `affectedRoots()` / `unknownPath:'refuse'` work the external reporter (`anssip`, #10) was
  blocked on is published, and the repo's issue list is now empty.
- **M2 `tosijs` 1.11.0 unpublished — CLOSED**, by renumbering rather than by publishing: there is
  no 1.11.0 anywhere now. `package.json`, tag and npm all read **1.10.2**, and the CHANGELOG's
  top entry is `[1.10.2] - 2026-09-14`. The plane landed.
- **M3 `lukko` 2 critical / 11 high — UNCHANGED**, now **26 days** open. §M5 below.
- **M4 `tosijs` #41 (cleartext secrets through the agent surface) — UNCHANGED in published code.** §M4.
- **M5 `tjs-lang` unpinned CDN major range — UNCHANGED in published code**, and reconfirmed in the
  newer 0.13.13 tarball. §M6.

Also cleared since last week: `tjs-lang`, `tosijs-floorplan`, `haltija`, `tosijs-schema` and
`tosijs` all sit clean across repo · tag · npm.

---

## MAJOR findings

### M1. `tosijs-ui` — v1.14.2 is tagged, its CHANGELOG tells consumers to upgrade to it, and it was never published

| Signal | Value |
| --- | --- |
| npm `latest` | **1.14.1** |
| Full npm version list, tail | `1.12.7, 1.12.8, 1.13.0, 1.14.0, 1.14.1` — **no 1.14.2, under any dist-tag** |
| Remote tag | **`v1.14.2`** at `141c749`, annotated, dated **2026-09-16** |
| `package.json` at that tag | **1.14.2** |
| `package.json` on `main` | 1.14.1 (CHANGELOG top section is `1.15.0 (unreleased)`) |

tosijs-ui is one of the two packages with **known private production consumers** (Nonono,
Snowfox), so publish integrity here is major by `practices/releasing.md` — and this instance is
worse than a bookkeeping slip in two specific ways:

1. **The shipped documentation points at a version that does not exist.** `CHANGELOG.md:82`, on
   `main`, reads: *"**Also shipped as 1.14.2** — if you are on 1.14.x, upgrade to that; you do
   not need this release to get the fix."* A 1.14.x consumer who follows that instruction gets
   `ETARGET` from the registry.
2. **The fix it carries is live in the published artifact.** Verified inside
   `tosijs-ui-1.14.1.tgz`: `exports["./doc-browser"]` still resolves to `dist/doc-browser.js`,
   the library module — there is no `doc-browser-entry.js` in the published dist at all. So
   `import 'tosijs-ui/doc-browser'`, the line every adoption doc prescribes, still fails to
   register `<tosi-doc-system>` for everyone on npm. Per the tag annotation the costly half is
   silent: no doc system means no `window.__docTestResults`, so an adopter's whole inline
   doc-test corpus stops existing **without one red test**.

The fix does exist on `main` (`src/doc-browser-entry.ts`, and the exports map points at it), so
this is not lost work — it is unreleased work, parked behind the in-progress 1.15.0 line while
the patch that was cut precisely to avoid that wait sits unpublished.

**Recommended action:** publish the `v1.14.2` tag as-is (it was deliberately cut from v1.14.1, so
it carries none of the 1.15.0 work). If 1.14.2 is being abandoned in favour of 1.15.0, delete the
"Also shipped as 1.14.2" line in the same change — a version that cannot be installed must not be
the documented remedy.

### M2. `tosijs-platform` — every user's Storage uploads are world-readable, and production cut over today

`storage.rules:42–46`, current `main`:

```
match /users/{userId}/{path=**} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

Write is correctly owner-scoped; **read is unconditional**. Anyone who can guess or obtain a path
under `/users/<uid>/…` reads that user's uploads without authenticating. The catch-all below it
is the same shape (`allow read: if true`), so this is the bucket's default posture, not one
stray rule.

Two things changed its grade since it was filed as
[tosijs-platform#3](https://github.com/tonioloewald/tosijs-platform/issues/3) on 2026-08-23
(open **26 days**, its title asking *"confirm this is deliberate"*):

- HEAD today is `78b4cc3` **"deploy: production functions — cutover, strict validation, /state
  removal"** — this is now the live posture of a production service, not a staging default.
- The scoreboard reclassified this repo as *"becoming a load-bearing pillar: the ecosystem's
  service layer."* An access-control default becomes other projects' default as it is adopted.

**Stated honestly:** the sweep cannot tell intent from the rules file. If `/users/**` is a public
asset area by design, this is a no-op and the issue should say so and close. If any of it is
user-private, it is a live data exposure. **That ambiguity, 26 days old on a service that cut over
to production today, is itself the finding** — it is the one item here whose answer you already
have and nobody else does.

### M3. `tosijs` — an unknown prop is assigned as a DOM property, so untrusted props can set `innerHTML` (shipped in 1.10.2)

[`tosijs#43`](https://github.com/tonioloewald/tosijs/issues/43), opened **2026-09-12**, open and
unfixed; new since last week's sweep. Element creators assign unrecognised props straight onto
the element, so a props object built from untrusted data reaches `innerHTML` and other sinks:

```js
b3dLight({ intensity: 0.9, innerHTML: '<img src=x onerror=BOOM>' })  // executes on append
```

Graded major on class: **script injection reachable from data**, in published code, on the one
package with known production consumers — code-level security findings keep their severity
regardless of measured base. Two aggravating details from the filing: it contradicts the
documented behaviour in tosijs#26 (*unknown props are silently dropped*), so a consumer reading
the docs concludes they are safe; and the reporting project had to build its own allow-list
(`declaredConfig`) across every data-to-element path — a local fix to a general problem, i.e. the
propagation path severed, which is exactly what `review.md` lens 9 asks you not to leave standing.

**Recommended action:** decide the seam in tosijs itself — assign only declared attributes (the
option that also closes #26), or deny-list the dangerous sinks. Documenting "props must be
trusted" is the third option in the filing and the weakest: it moves the burden to every consumer
and leaves the published default unsafe.

### M4. `tosijs` — published 1.10.2 still returns cleartext secrets through the agent surface (your #41)

[`tosijs#41`](https://github.com/tonioloewald/tosijs/issues/41), opened 2026-09-09, still **open**.
A light-DOM wrapper carrying the value binding over a contained `<input type="password">` is never
learned as a secret path (`refreshSecretPaths` walks up only across a shadow boundary), so
`agent.read('lc.password')` returns cleartext and `describe()` emits `secret: true` beside the
cleartext value. Present in every released version, 1.10.2 included.

Unchanged from last week, and listed for the same reason: the sweep reports on **published**
state, and published state has not moved. Your sequencing reasoning is recorded and not disputed.
[`#32`](https://github.com/tonioloewald/tosijs/issues/32) (spelling-sensitive secret paths) remains
the narrower instance of the same family.

### M5. `lukko` — 2 critical / 11 high, one dependency edge, unchanged since 2026-08-23

`bun audit` on the committed `bun.lock`: **2 critical, 11 high, 16 moderate, 3 low** — byte-identical
in shape to the last two sweeps.

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs` | Arbitrary code execution |
| critical | `websocket-driver` | Message corruption via protocol length headers |
| high ×2 | `@grpc/grpc-js` | Malformed request / malformed compressed message crashes client or server |
| high ×5 | `protobufjs` | Code-generation gadget after prototype pollution; code injection via bytes-field defaults; unbounded recursion; unsafe option paths; unbounded `Any` expansion |
| high ×4 | `undici` | WebSocket permessage-deflate memory exhaustion; 64-bit length overflow; `server_max_window_bits` unhandled exception; fragment-count DoS |

Single root cause, unchanged: `lukko` pins `tjs-lang: ^0.3.0`, whose lock holds `tjs-lang@0.3.0`
carrying `firebase@10.14.1` as a **runtime** dependency. Current tjs-lang has firebase as a
devDependency only, so the entire subtree disappears on upgrade. `private: true` and unpublished —
nothing reaches a consumer — but it installs on the dev machine.
[lukko#2](https://github.com/tonioloewald/lukko/issues/2), open **26 days**.

**Recommended action:** `bun add tjs-lang@^0.13.13` and re-lock. Same one line as the last two weeks.

### M6. `tjs-lang` — published 0.13.13 still dynamic-imports an unpinned major range from a CDN

Reconfirmed **in this week's tarball**, not merely in the repo — `tjs-lang-0.13.13.tgz` →
`package/dist/tjs-browser-from-ts.js:69` still contains `https://esm.sh/typescript@5`.

A rolling major range, fetched by a dynamic `import()` that cannot carry `integrity`, executing in
the consumer's page — and invisible to every consumer lockfile. Filed as
[tjs-lang#55](https://github.com/tonioloewald/tjs-lang/issues/55) on 2026-09-06, unchanged in
published code through two releases since.

Blast radius stated honestly: an opt-in entry point, overridable per call via `typescriptUrl`,
landing in a browser page — narrower than the haltija CDN case you closed by pinning with SRI.

**Recommended action:** pin an exact version in `DEFAULT_TYPESCRIPT_URL`; keep the override.

---

## Notable, non-major

### N1. Publish integrity — the rest

| Repo | package.json | Latest tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `tosijs-ui` | 1.14.1 | **v1.14.2** | 1.14.1 | ⚠️ §M1 |
| `wobbly` | 0.6.0 | `v0.6.0` | `wobbly-js` **0.1.0** | five releases unpublished ([wobbly#1](https://github.com/tonioloewald/wobbly/issues/1)), unchanged |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | published, still untagged ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2)); `v0.6.0` at `f013750` is safe when wanted |
| `tosijs-platform` / `create-script` | `create-tosijs-platform-app` 1.0.6 | **none** | 1.0.6 | published, no tag anywhere in the repo for it |
| `tosijs-platform` (root) | `service-compris` 0.1.0 | `v0.1.0` | 0.1.0 | ✅ agrees |
| `tosijs` | 1.10.2 | `v1.10.2` | 1.10.2 | ✅ |
| `tosijs-schema` | 1.10.2 | `v1.10.2` | 1.10.2 | ✅ |
| `tosijs-floorplan` | 0.5.0 | `v0.5.0` | 0.5.0 | ✅ |
| `tjs-lang` | 0.13.13 | `v0.13.13` | 0.13.13 | ✅ |
| `haltija` | 1.12.9 | `v1.12.9` | 1.12.9 | ✅ |
| `kilpi` | `tosijs-kilpi` 1.0.0 | `v1.0.0` | 1.0.0 | ✅ clean on its first sweep |
| `tosijs-3d` / `tosijs-product` / `react-tosijs` / `ngx-tosijs` | 0.8.1 / 0.8.0 / 1.2.1 / 0.9.1 | match | match | ✅ |

Eleven of fifteen published packages agree across repo · tag · registry — the best reading this
sweep has recorded, and the three stragglers below tosijs-ui are all measured-zero bookkeeping,
unchanged and already filed.

### N2. Stale npm dist-tags — unchanged

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.2 |
| `haltija` | 1.3.0-beta.12 | 1.12.0-rc.5 | 1.12.9 |

Both pre-release tags sit **behind** `latest` on both packages, so nobody can be pulled forward
onto a pre-release by accident — this is drift, not exposure. `npm dist-tag rm` when convenient.

### N3. Dev-tree advisories that reach no consumer

- **`react-tosijs`** — `ajv` (moderate), `brace-expansion` (3 high + 1 moderate), `flatted` (2 high),
  `js-yaml` (3 high + 2 moderate), `minimatch` (3 high). All from the eslint 8 dev tree.
- **`ngx-tosijs`** — 3 moderate against `@angular/common` / `@angular/compiler` / `@angular/core`
  (HttpTransferCache leak via `withRequestsMadeViaParent`; sanitization bypass via directive host
  bindings).

Both packages declare **zero runtime dependencies** (`dependencies: null`; everything is dev or
peer), so no consumer install pulls any of this. Already filed as
[react-tosijs#4](https://github.com/tonioloewald/react-tosijs/issues/4),
[#5](https://github.com/tonioloewald/react-tosijs/issues/5) and
[ngx-tosijs#1](https://github.com/tonioloewald/ngx-tosijs/issues/1).

### N4. `tosijs-platform/functions` — clean of criticals, still unpinned, and its own issue now overstates it

`npm audit` on the deployed Cloud Functions tree: **10 moderate, 0 high, 0 critical** — `uuid`
(missing buffer bounds check in v3/v5/v6) and `ts-deepmerge` (prototype-method override DoS),
reaching `firebase-admin`, `@google-cloud/firestore`, `@google-cloud/storage`, `gaxios`,
`google-gax`, `retry-request`, `teeny-request`, `firebase-functions-test`.

[tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2) still says *"3 critical
/ 41 high"*: that no longer reproduces — the upstream advisories aged out of the resolved tree. Its
**other** claim does hold: `firebase-admin` is pinned `^12.7.0` and resolves to 12.7.0, while the
registry's latest is **14.4.0** — two majors behind, on the tree that cut over to production today.
Update the issue to what is measurable now, or it will be read as a false alarm and ignored when it
next matters.

`functions/` still has **no lockfile**, so every deploy resolves fresh — today's 10-moderate reading
is a snapshot of one resolve, not a property of what is deployed.

### N5. Two filed advisories are closed in fact but open on the tracker

- [tjs-lang#57](https://github.com/tonioloewald/tjs-lang/issues/57) (*3 medium: qs ×2, uuid in
  `functions/`*) — `npm ci` on the committed `package-lock.json` resolves `qs@6.16.0` and
  `uuid@11.1.1`; audit is clean, 0 advisories.
- [haltija#46](https://github.com/tonioloewald/haltija/issues/46) (*3 new hono advisories in
  `apps/mcp`*) — `apps/mcp` no longer depends on hono at all; `bun audit` on its lockfile is clean.

Close them, or the next sweep re-derives the same two negatives.

### N6. Secrets: nothing new, and nothing that changed class

Repo trees and all 15 published tarballs were grepped for `AIza`, `sk-`, `ghp_`, `github_pat_`,
`AKIA`, `xox*`, Mapbox `pk.`/`sk.`, and `-----BEGIN … PRIVATE KEY-----`, plus committed `.env`
files and `files`-glob leakage.

- **No** `sk-`, `sk.`, `AKIA`, `ghp_`, `github_pat_`, `xox*` or private-key material anywhere, in
  any repo or any tarball. No committed `.env` (only `tosijs/.env.example`).
- Every `pk.eyJ…` hit is the **accepted** Mapbox public demo token — tosijs-ui's sourcemaps, and
  downstream demo builds in tosijs-product, tosijs-3d and tosijs-timezone-picker. The only
  occurrence in a `src/` file (`tosijs-product/src/tosi-scroll-map.ts:64`) is inside a
  `<tosi-product class="doc-demo">` documentation block, not runtime code, and the same snippet is
  in the README. **Class unchanged, so not re-raised.**
- `tjs-lang/demo/src/{firebase-auth,agent-client,user-store}.ts` carry a Firebase **web** API key
  (`AIza…`), commented in place as *"these are public client-side values"* — public-class
  (identifies, does not authorize), demo only, not shipped in the tarball. Notable, not major.
- `tosijs-3d/reviews/0.7.0-pre-tag-gate.md` matches `-----BEGIN PRIVATE KEY-----` in **prose**: it
  is the review record of the TLS key that was rewritten out before the release push. No key material.
- `files`-glob check: nothing internal ships. `tosijs-ui`'s published `tls/` holds only
  `create-dev-certs.sh`; `tjs-lang`'s `!docs/reviews` exclusion is holding.

### N7. Lockfile hygiene — two toolchain mismatches and one absence

- **`tosijs-ui` commits no lockfile at all** (no `bun.lock`, no `package-lock.json` in `git
  ls-files`). Its audit here is therefore a fresh resolve of its ranges, and so is every
  contributor's and every CI run's. On the ecosystem's largest dependency surface, that is the one
  place a reproducible install is worth most.
- **`kilpi` and `tosijs-platform` ship `bun.lock` with `"lockfileVersion": 2`**, which **bun 1.3.11
  cannot parse** (`error: Unknown lockfile version`). A `--frozen-lockfile` install fails outright
  and the fallback silently audits a *differently resolved* tree. Both audited clean, but not
  clean-against-the-committed-lockfile — and any consumer or CI runner on bun ≤1.3.11 hits the same
  wall. `practices/dependencies.md` already names "bun too old" as a way a gate reports an unearned
  pass; this is that failure mode arriving from the *other* direction (lockfile newer than the
  tool), and the practice doc does not yet say so.

### N8. Issues opened in the last 14 days (2026-09-04 → 2026-09-18)

37 across the ecosystem; all authored by `tonioloewald` — **still zero non-owner issue or PR
authors anywhere**, so the strongest public adoption instrument continues to read zero, and last
week's one exception (`anssip` on tosijs-schema#10) is now closed.

| Repo | New issues |
| --- | --- |
| `tosijs-ui` | #173, #172, #171, #170, #169, #168, #166, #165, #164, #162, #161, #160 |
| `tosijs-3d` | #78, #77, #76, #75, #74, #73 |
| `tosijs-platform` | #10, #9, #8, #7, #6, #5, #4 |
| `tosijs` | #45, #44, **#43 (security, §M3)**, #42, #39 |
| `haltija` | #50, #49, #48, #47, #46 |
| `tjs-lang` | #57, #56, #55 (security, §M6), #53 |
| `react-tosijs` / `ngx-tosijs` | #5 / #1 |

Security-relevant and still open beyond the majors: `haltija#44` (*the REST surface answers any
origin, so socket-level gating is theatre*, 2026-09-06), `tjs-lang#56` (*bare context bindings
return their own name in return position — same fail-open shape as #54*).

### N9. Scoreboard rows that drifted

Applied in this commit, verified against the registry and remotes at sweep time:

- **`tosijs`** — Activity led with *"1.11.0 pending publish"*. There is no 1.11.0: repo, tag and npm
  all read 1.10.2 and the CHANGELOG's top entry is `[1.10.2] - 2026-09-14`. Replaced with 1.10.2.
- **`tjs-lang`** — Activity said *"0.13.12 published"*; 0.13.13 is published, tagged and current.
- **`lukko`** — the row's remedy still said `tjs-lang@^0.13.11`; bumped the suggested floor to the
  current 0.13.13 and the age to 26 days.
- **`tosijs-ui`** — added the §M1 standing warning to the Activity cell. The Version cell already
  showed the three-way divergence correctly; nothing there needed touching.

Version/"As of" cells are machine-written (`bun tools/scoreboard.ts`) and were **not** hand-edited —
only the prose Activity cells the facts contradicted.

---

## Coverage — what this sweep did NOT earn

- **Issue lists came from the rendered GitHub issues page, not the JSON API.** This session's proxy
  denies `api.github.com` for repositories not attached to it, and attaching 14 public repos with
  push credentials to read issue titles was not a trade worth making. The page returns the **first
  page only**: `tosijs` reports 14 open but listed 12, `haltija` 13 but listed 12. **Two issues on
  each of those repos — the oldest ones — were not enumerated.** Everything else listed is complete.
  `lukko` is attached, so its issues came from the API in full.
- **`tosijs-editor` was not scanned at all** (back-burnered label, above), so its known
  0.4.4 / v0.4.4 / 0.4.5 divergence is unverified for a second week.
- **`tosijs-ui`, `kilpi` and `tosijs-platform` were audited against a fresh resolve, not their
  committed lockfile** — §N7. Their "clean" is a clean *resolve*, not a clean *lock*.
- **`tosijs-platform/functions` has no lockfile**, so its 10-moderate reading is one deploy-time
  resolve, not a stable property.
- **Unpushed local work is invisible to this sweep** — every repo was read from its remote. Last
  week's `main`-unpushed catch on tosijs-timezone-picker was luck of a local checkout, not a check
  this sweep can repeat.
- **Private consumers (Nonono, Snowfox) remain unmeasurable** by any instrument here; per
  `practices/releasing.md`, the owner's own knowledge is the only instrument for those.
- No runtime, deployment, or behavioural testing was performed anywhere — this is a static and
  registry-level sweep only.
