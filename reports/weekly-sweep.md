# Weekly security & health sweep — 2026-09-11 (UTC)

Reconnaissance only at sweep time. Prior weeks live in git history (this file is overwritten,
never appended).

**Scanned:** 14 GitHub repos, **20 dependency trees** (6 nested workspaces audited separately),
**13 published tarballs**.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, lukko, tosijs-platform | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-editor` — back-burnered per the scoreboard. ⚠️ **That label looks wrong now:** the row's
  own Activity cell describes a substantial 2026-09-06 overhaul (new build, browser tests, audit
  gate). If it is no longer back-burnered, say so on the row and it enters scope next week —
  today it is an unscanned blind spot, by rule rather than by evidence.
- `tosijs-3d-ensemble`, `manta-recon` — local-only repos, no GitHub link.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full.
  `package.json` sets `private: true`, so its npm 404 is correct.

**Tooling:** `bun 1.3.11` / `bun audit --json` (exit code read before output — a clean bun tree is
exit 0 + a 3-byte `{}`, and its JSON is `{pkg: [advisories]}`, *not* npm's `{vulnerabilities}`);
`npm audit --json` on `package-lock` / lockfile-less trees, `npm install --ignore-scripts`
throughout; `npm view <pkg> dist-tags` for registry state; `git ls-remote --tags` for tags;
`npm pack <pkg>@latest` + extract + grep for published-tarball contents.

---

## Last week's majors: two of three closed, and the biggest one closed completely

- **`haltija` M1 — CLOSED, verified in the published artifact.** npm `latest` is now **1.12.9**.
  All four stranded security fixes are in the shipped tarball: `apps/desktop/terminal.html` loads
  `cdn.babylonjs.com/**v9.25.0**/babylon.js` with `integrity` attributes (4 present), and
  `dist/ws-origin.*` exists in the dist. The only remaining `cdn.babylonjs.com/babylon.js`
  strings in the tarball are a source comment and a CHANGELOG line describing the fix. Repo, tag
  and npm all agree on 1.12.9.
- **`tosijs` M2 — CLOSED.** 1.10.1 is tagged (`v1.10.1`) and published. **A new, one-minor-later
  instance of the same failure replaces it — §M2 below.**
- **`lukko` M3 — UNCHANGED**, 19 days open. §M3.
- Also cleared since last week: `tjs-lang` 0.13.12 tagged-not-published (now published);
  `tosijs-floorplan` had zero tags (now `v0.3.0`, `v0.4.0`).

---

## MAJOR findings

Ordered by *what needs you*, not by class. Three of the five are already filed by you; they are
listed because the sweep reports on published state, and published state has not moved.

### M1. `tosijs-schema` — 1.9.1 fixes the fail-open an **external** consumer reported, and is neither tagged nor published

| Signal | Value |
| --- | --- |
| `package.json` version | **1.9.1** |
| Latest git tag on remote | `v1.9.0` |
| npm `latest` | **1.9.0** |
| HEAD commit | `6f2b30f` — *"1.9.1 — expose affectedRoots(), add unknownPath:'refuse' (#10)"*, 2026-09-09 |
| CHANGELOG | `## [1.9.1] — 2026-09-09`, written as a completed release |

**This is graded MAJOR, not bookkeeping, and the reason is the calibration's own escape clause.**
`practices/releasing.md` names non-owner issue authors as the *strongest* public adoption
instrument. [`tosijs-schema#10`](https://github.com/tonioloewald/tosijs-schema/issues/10) is
authored by **`anssip`** (not `tonioloewald`), is still **open**, and was last updated
**2026-09-09** — the same day as the unpublished fix commit. That is adoption measured at sweep
time on the strongest instrument available, so the measured-zero default does not apply here.

What is stranded: `agentContract().check()` answered a bare `true` both for *"valid"* and for
*"this path touches nothing I contract"*, so the natural `if (verdict !== true) refuse()` did no
validation at all over every uncontracted root. 1.9.1 adds `affectedRoots()` and
`unknownPath:'refuse'`. **The person who reported a fail-open in a capability-gated write path
cannot install the fix.**

**Recommended action:** publish 1.9.1, tag at publish, and close or update #10 so the reporter
knows. This is the single highest-value action in this sweep.

### M2. `tosijs` — 1.11.0 is in `package.json` with a dated CHANGELOG entry, but is neither tagged nor published

| Signal | Value |
| --- | --- |
| `package.json` version | **1.11.0** |
| Latest git tag on remote | `v1.10.1` |
| npm `latest` | **1.10.1** |
| CHANGELOG | `## [1.11.0] - 2026-09-07`, written as a completed release |
| HEAD | `0b59e5f` *"docs: post-build stamps"*, **2026-09-11** (today) |

tosijs is one of the two packages with **known private production consumers** (Nonono, Snowfox),
so publish integrity here is major by the calibration in `practices/releasing.md`.

This is the **second consecutive week** a tosijs minor has sat in `package.json` unpublished, and
it is the same shape as last week's M2 — which did land. **Honest caveat, so this triages in
seconds:** HEAD carries commits from today, so this is plausibly a release in flight rather than a
stalled one. It is reported because "a version sitting in `package.json` but never published" is
the ecosystem's known recurring failure and the sweep always reports it.

What consumers on 1.10.1 are missing: 1.11.0's `auditAccessibility()` rework — the vendored
floorplan copies deleted in favour of tosijs-floorplan 0.4.0's exported `isInteractive` /
`targetSizeFinding`, ending a rules divergence the repo had written down rather than fixed.
Deliberately a minor: the same input now produces different findings in both directions.

**Recommended action:** finish the 1.11.0 release (tag *at* publish), or move the version back if
it is not ready.

### M3. `lukko` — 2 critical / 11 high, all from one dependency edge, unchanged since 2026-08-23

`bun audit`: **2 critical, 11 high, 16 moderate, 3 low** — byte-identical in shape to last week.

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs@<7.5.5` | Arbitrary code execution |
| critical | `websocket-driver@<0.7.5` | Message corruption via protocol length headers |
| high ×2 | `@grpc/grpc-js@<1.9.16` | Malformed request / compressed message crashes client or server |
| high ×5 | `protobufjs` | Code-generation gadget after prototype pollution; code injection via bytes-field defaults; unbounded recursion; unsafe option paths; unbounded `Any` expansion |
| high ×4 | `undici@<6.27.0` | WebSocket permessage-deflate memory exhaustion; 64-bit length overflow; `server_max_window_bits` unhandled exception; fragment-count DoS |

**Single root cause, unchanged.** `lukko` pins `tjs-lang: ^0.3.0`; its `bun.lock` holds
`tjs-lang@0.3.0`, which carried `firebase@10.14.1` as a **runtime** dependency. Every advisory
above lives in that subtree. Current tjs-lang (0.13.x) has firebase as a *devDependency* only, so
the subtree disappears on upgrade.

`lukko` is `private: true` and unpublished — nothing reaches a consumer — but the tree installs on
the dev machine. [lukko#2](https://github.com/tonioloewald/lukko/issues/2), open **19 days**.

**Recommended action:** `bun add tjs-lang@^0.13.12` and re-lock. One line, and it is the same one
line as last week.

### M4. `tosijs` — published 1.10.1 returns cleartext secrets through the agent surface (your #41, listed because it is *shipped*)

[`tosijs#41`](https://github.com/tonioloewald/tosijs/issues/41), opened 2026-09-09, reopened,
last updated **today**. Your own filing states it is present in **every released version**,
verified back to v1.10.1 — i.e. in what production consumers are running right now.

- A light-DOM **wrapper** carrying the value binding over a contained `<input type="password">` is
  never learned as a secret path, because `refreshSecretPaths` walks up only across a shadow
  boundary (`getRootNode()?.host`), which light DOM does not have.
- Because the miss is in *path learning*, it defeats `read()` and `changes()`, not just
  `describe()` — `agent.read('lc.password')` returns the cleartext with no `describe()` involved.
- `describe()` emits a self-contradicting record: `secret: true` beside the cleartext value.
- Reproduces for a plain `<form>` with any custom `fromDOM` binding, so it is not component-specific.

**Graded major on class, not on novelty:** a credential-disclosure path in a *published* artifact
on the one package with known production consumers keeps its severity regardless of measured base.
**Your sequencing reasoning is recorded and not disputed** — it is not a regression, and this code
path produced a blocker in three consecutive pre-release review rounds, so it deserves its own
change with its own review. The sweep's job is to keep it visible until published code changes.
Note it also supersedes last week's N7 ([#32](https://github.com/tonioloewald/tosijs/issues/32),
spelling-sensitive secret paths) as the widest instance of this family.

### M5. `tjs-lang` — published 0.13.12 dynamic-imports an **unpinned major range** from a CDN

Confirmed **in the published tarball**, not merely in the repo —
`tjs-lang-0.13.12.tgz` → `package/dist/tjs-browser-from-ts.js`:

```js
var Je = "https://esm.sh/typescript@5"        // DEFAULT_TYPESCRIPT_URL
function Ve(e = Je) { … import(e).then(…) }   // loadTypeScript()
```

`typescript@5` is a rolling major range; a dynamic `import()` of a cross-origin module cannot carry
`integrity`, so there is no SRI backstop either. Whatever esm.sh serves for that range executes in
the consumer's page. Same class as last week's haltija M1 (unpinned, un-SRI'd CDN code in a
published artifact) — you closed that one by pinning `v9.25.0` with `integrity`.

**Blast radius stated honestly, because it is narrower than M1's:** this is an *opt-in* entry point
(`tjs-browser-from-ts`), overridable per call via `typescriptUrl`, and it lands in a browser page
context — not, as haltija's did, in a frame holding a relay to `spawn('sh', …)`.

Already filed as [tjs-lang#55](https://github.com/tonioloewald/tjs-lang/issues/55) (2026-09-06),
which also notes the range is **invisible to every consumer lockfile**. Unchanged in published
code, so it is reported.

**Recommended action:** pin an exact version in `DEFAULT_TYPESCRIPT_URL` (the haltija fix, applied
to a module specifier), and keep the `typescriptUrl` override for consumers who want their own.

---

## Notable, non-major

### N1. Publish integrity elsewhere — bookkeeping on measured-zero packages

| Repo | package.json | Latest tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `wobbly` | 0.6.0 | `v0.6.0` | `wobbly-js` **0.1.0** | five releases unpublished ([wobbly#1](https://github.com/tonioloewald/wobbly/issues/1)), unchanged |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | published, still untagged ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2)) — `v0.6.0` at `f013750` is safe when wanted |
| `tosijs-platform` | 1.0.6 | **none** | 1.0.6 | published, repo has zero tags |
| `tosijs-ui` | 1.14.1 | `v1.14.1` | 1.14.1 | ✅ clean |
| `tjs-lang` | 0.13.12 | `v0.13.12` | 0.13.12 | ✅ clean (last week's gap cleared) |
| `tosijs-floorplan` | 0.4.0 | `v0.4.0` | 0.4.0 | ✅ clean (last week's zero-tags item cleared) |
| `haltija` | 1.12.9 | `v1.12.9` | 1.12.9 | ✅ clean (M1 cleared) |
| `tosijs-3d` / `tosijs-product` / `react-tosijs` / `ngx-tosijs` | 0.8.1 / 0.7.0 / 1.2.1 / 0.9.1 | match | match | ✅ clean |

Nine of thirteen published packages now agree across repo, tag and registry — the best reading
this sweep has recorded. The two majors above are both *fresh* divergences, not stale ones, which
is the shape `releasing.md` predicts when the release step and the tag step are separate habits.

### N2. Stale npm dist-tags on two packages — unchanged from last week

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.1 |
| `haltija` | 1.3.0-beta.12 | 1.12.0-rc.5 | 1.12.9 |

Nobody is served by an `rc` tag three minors back. `npm dist-tag rm <pkg> beta|rc` each.

### N3. Dev-tree advisories that reach no consumer

- **`react-tosijs`** — **11 high / 4 moderate**, every one descended from `eslint@8.57.1` (EOL):
  `brace-expansion` ×3, `minimatch` ×3, `js-yaml` ×3, `flatted` ×2, plus `ajv` (moderate). The
  package has **zero runtime dependencies** (peers only: `react`, `tosijs`), so nothing reaches a
  consumer. One new `brace-expansion` high since last week (`<1.1.18`, bypassing the CVE-2026-14257
  mitigation) — the tally keeps climbing, which is exactly the §7 "advisory count per package is a
  code smell" signal. [react-tosijs#4](https://github.com/tonioloewald/react-tosijs/issues/4),
  open since 2026-08-23.
- **`tjs-lang`** (root) — 3 high / 5 moderate / 1 low: `flatted` ×2 (eslint), `form-data@<2.5.6`
  (CRLF injection, via the firebase dev deps), `protobufjs` ×2, `qs` ×2, `uuid`, `esbuild` (low,
  Windows dev-server only). Runtime deps are `acorn`, `acorn-loose`, `acorn-walk`,
  `tosijs-schema` — **all clean**.
- **`haltija/apps/mcp`** — 5 moderate (was 2): three new `hono@<4.13.5` advisories (`toSSG()`
  path traversal — incomplete fix for CVE-2026-39408; `parseBody()` memory exhaustion; query-parser
  cache-key differential) plus `qs` ×2. A one-line `hono` bump clears three.
- **`tjs-lang/functions`** — 7 moderate, 0 high/critical (`uuid` → `gaxios`/`teeny-request`, `qs`,
  `@google-cloud/storage`, `firebase-admin`, `retry-request`). Improved by one since last week.
- **Clean trees (0 of everything):** `tosijs`, `tosijs-ui`, `tosijs-schema`, `tosijs-floorplan`,
  `tosijs-3d`, `tosijs-product`, `tosijs-timezone-picker`, `wobbly`, `haltija` (root),
  `haltija/apps/desktop`, `tosijs-platform` (root), `tosijs-platform/create-script`,
  `tjs-lang/editors/vscode`.

### N4. `ngx-tosijs` — 3 new moderates, and one of them is a message for *consumers*

New since last week, all against Angular 22.0.x in the dev tree:

| Severity | Package | Advisory |
| --- | --- | --- |
| moderate | `@angular/common@>=22.0.0 <22.1.1` | Information leak via `HttpTransferCache` bypass when using `withRequestsMadeViaParent` |
| moderate | `@angular/core` / `@angular/compiler@>=22.0.0 <22.1.0` | Sanitization bypass via directive host bindings on concrete host elements |

ngx-tosijs ships **zero runtime dependencies** (peers only: `@angular/core >=16 <23`, `tosijs`), so
nothing is shipped vulnerable. But the declared peer range *admits* the affected versions, so a
consumer on Angular 22.0.x is exposed through their own tree. A line in the README or CHANGELOG
saying "on Angular 22, take ≥ 22.1.1" costs minutes and is the kind of thing a bridge package is
uniquely placed to say.

### N5. `tosijs-platform/functions` — still clean of criticals, still unpinned

Audited fresh today: **0 critical / 0 high / 10 moderate** (`@google-cloud/firestore`,
`@google-cloud/storage`, `firebase-admin`, `firebase-functions-test`, `gaxios`, `google-gax`,
`retry-request`, `teeny-request`, `ts-deepmerge`, `uuid`).

[`tosijs-platform#2`](https://github.com/tonioloewald/tosijs-platform/issues/2) still reads
*"3 critical / 41 high"* — **second week running that it does not reproduce**. An issue whose
headline is measurably false is worse than no issue: re-scope it to "firebase-admin is two majors
behind (12.x vs 14.x)" rather than leaving a number nobody can reproduce.

⚠️ **Caveat that limits this result, unchanged:** `functions/` commits **no lockfile**
(`package-lock.json` is gitignored), so what deploys is whatever resolves at deploy time. Today's
clean result is a point-in-time resolution, not a pinned one.

### N6. Security-relevant open issues, unchanged and unaged-out

- [`tosijs-platform#3`](https://github.com/tonioloewald/tosijs-platform/issues/3) —
  `storage.rules`: user-scoped paths are world-readable, "confirm this is deliberate". Open since
  2026-08-23, no movement. On the repo the scoreboard now calls *the ecosystem's service layer*,
  this is the one open item that is a live data-exposure question rather than a design one.
- [`haltija#44`](https://github.com/tonioloewald/haltija/issues/44) (2026-09-06) — "the REST
  surface answers any origin, so socket-level gating is theatre — decide `--token`'s role". A
  posture question directly adjacent to the exposure 1.12.9 just closed; worth deciding while the
  context is fresh.
- [`tosijs-ui#135`](https://github.com/tonioloewald/tosijs-ui/issues/135) — the live-example pins
  **tjs-lang 0.13.4, which is deprecated on npm**; 0.13.12 is published and clean. Open since
  2026-09-04. `releasing.md` is explicit that deprecation strings pointing at superseded versions
  are simply wrong and cost minutes to correct, regardless of audience size.

### N7. Issues opened in the last 14 days (2026-08-28 → today)

**45 still-open issues** were opened in this window (closed ones not counted); the
security-relevant ones are covered above
(`tosijs#41`, `tjs-lang#55`, `haltija#44`, `haltija#45`). The rest are design/correctness work,
concentrated in `tosijs-floorplan` (**9 of 9 open issues opened in this window** — #7–#15, the
post-convergence audit of the newly-shared renderer) and `tjs-lang` (#49, #50, #53, #55, #56).
`tosijs-product` and `ngx-tosijs` have **zero** open issues.

`tosijs-floorplan#8` is worth one line here because it is this repo's own rule turned on a
consumer: *"targetSizeFinding inherits the renderer's producer-flag supersession, so an audit
built on it reports a pass it did not earn."* That is `dependencies.md` §1 verbatim, discovered
independently — and tosijs 1.11.0 (unpublished, §M2) is the release that adopts that very code.

### N8. Secrets: nothing new, and the one recurring hit is the accepted token

- **Mapbox `pk.` public token** — verified again to be a **single token** (identical SHA-256)
  across `tosijs-ui/src/mapbox.ts` + `dist/`, the **published** `tosijs-ui@1.14.1` tarball
  (`dist/mapbox.js`, `dist/iife.js.map`), `tosijs-product`'s README + the doc-demo block inside
  `src/tosi-scroll-map.ts`, `tosijs-3d`'s docs sourcemaps and `tosijs-timezone-picker`'s docs
  sourcemap. That is the accepted long-standing public demo token, appearing exactly where the
  accepted-findings note says it does. **Not re-raised.** The `src/tosi-scroll-map.ts` hit was
  checked specifically against the re-raise condition: it sits inside the file's inline
  `<tosi-product class="doc-demo">` documentation block, not in runtime code.
- **No `sk.` secret token anywhere** in any repo or any of the 13 published tarballs. No `AKIA`,
  no `ghp_`/`github_pat_`, no `xox*`, no `sk-`.
- **Firebase web API keys (`AIza`)** in `tjs-lang/demo/src/{firebase-auth,agent-client,user-store}.ts`
  — public-class (identifies the project, does not authorize). Notable, not major; the rules are
  the actual boundary, which is why `tosijs-platform#3` still matters. **Not in any tarball.**
- **`tosijs-3d/reviews/0.7.0-pre-tag-gate.md`** matches `-----BEGIN … PRIVATE KEY` — the same
  **false positive** as last week: prose quoting `head -1 tls/key.pem.bak` in the review that
  caught the mkcert key. No key material, no `-----END` marker, `tls/` absent from the tree.
  `tosijs-ui/src/no-secrets.test.ts` matches for the same reason — it is the guard, not a leak.
- **No committed `.env`** anywhere.
- **Tarball hygiene:** no `reviews/`, no `journal/`, no `.env` in any of the 13 published packages.
  One benign note — `tosijs-ui@1.14.1` ships `tls/create-dev-certs.sh`; read in full, it is an
  mkcert wrapper containing **no key material**.

---

## Scoreboard correction applied

`README.md`'s haltija row still carried the standing ⚠️ *"1.12.9 tagged, NOT published — carries
four security fixes"*. That is now false (verified in the published tarball, §"Last week's majors"),
so the Activity cell was corrected in the same commit as this report, per the scoreboard's
"any agent that notices a stale row should fix it". No other row needed a fact corrected — the
tosijs, tosijs-schema and wobbly rows already carry accurate ⚠️ version cells.

---

## Coverage — what this sweep did NOT earn

- **Private production consumers (Nonono, Snowfox) — UNCHECKED, and uncheckable.** They are
  private repos, invisible to every instrument. Whether M2 or M4 affects them has to come from you.
- **`tosijs-editor` — UNCHECKED.** Skipped by the scope rule (back-burnered), which its own
  scoreboard row now contradicts. See the skip list.
- **`tosijs-ui`, `tosijs-platform/functions`, `tosijs-platform/create-script`,
  `tjs-lang/editors/vscode` were audited against a FRESH resolution**, not a committed lockfile
  (tosijs-ui gitignores `bun.lock` by design; the others commit no lockfile). Their clean results
  describe today's registry, not a pinned tree, and are not reproducible by version alone.
- **GitHub REST API is not directly reachable from this session** (egress policy returns 403 for
  `api.github.com`). Open issues were read through the GitHub MCP tools after attaching each repo
  — equivalent data, but recorded since the sweep prompt names the REST endpoint.
- **Only `latest` tarballs were scanned** for published-artifact secrets. Older published versions
  were not re-scanned.
- **Adoption was not re-measured from scratch.** M1's grading rests on `tosijs-schema#10`'s author
  being a non-owner, which is directly observable; it does **not** rest on downloads, dependents
  graphs or jsDelivr, none of which were queried this week. Whether `anssip` is the friend already
  named in `releasing.md`'s baseline is still **your call to confirm** — it was flagged last week
  and the baseline paragraph has not been updated either way.
- **No runtime/dynamic testing.** M4 and M5 are established by reading the filed repro and the
  published tarball respectively, not by exploiting them.
