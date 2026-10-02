# Weekly security & health sweep — 2026-10-02 (UTC)

Reconnaissance only. Prior weeks live in git history (this file is overwritten, never appended).

**Scanned:** 16 GitHub repos, **21 dependency trees** (6 nested workspaces audited separately),
**15 published tarballs**, **152 open issues enumerated in full** via the GitHub API.

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, tosijs-editor, lukko, tosijs-platform, kilpi | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-3d-ensemble`, `manta-recon` — local-only git repos, no GitHub remote to clone.
- `tosijs-virta` — private repo, not attached or scanned.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full. `private: true`,
  so it has no registry state to check.

**Tooling:** `bun 1.3.14` + `bun audit --json` (exit code read before output; clean = exit 0 and a
3-byte `{}`), `npm 10.9.4` `install --ignore-scripts` + `npm audit --json`, `npm view <pkg>
dist-tags|versions`, `git ls-remote --tags`, `npm pack <pkg>@latest` + extract + grep, GitHub REST
API for issues.

**Two coverage notes, both about not reporting an unearned pass:**

- Last week's **lockfileVersion-2 wall is gone**: `kilpi` and `tosijs-platform` both now commit
  `"lockfileVersion": 1, "configVersion": 1` and install **frozen** under bun 1.3.14. No second
  toolchain needed this week.
- **A false "cannot check" nearly got recorded.** Running nine `bun install`s in parallel made three
  of them emit `UnknownLockfileVersion: failed to parse lockfile at bun.lock:2:22` → `warn: Ignoring
  lockfile` → frozen install fails → fallback audits a differently-resolved tree. Re-run **serially**,
  all three installed frozen and clean. The lockfile headers are byte-identical to the ones that
  worked. So the error was a shared-cache race, not a lockfile property — the inverse of
  `dependencies.md` §1: a *transient* cannot-check wearing the costume of a durable one, which a
  single-shot sweep would have written up as a toolchain wall. Worth a line in `dependencies.md`:
  **re-run a cannot-check serially before believing it.**

---

## Last week's majors

- **M1 `tosijs-ui` 1.15.3 blocked publish — CLEARED.** npm `latest` is **1.16.3**; repo · tag · npm
  all agree. The stale-artifact and reconciliation blockers are behind it.
- **M2 `tosijs-ui` `<tosi-md>` unsanitized `innerHTML` — CLOSED.** Verified in the published
  `tosijs-ui-1.16.3.tgz`: `sanitize` is on by default and only an explicit `sanitize="off"` renders
  raw HTML.
- **M3 the 1.16 sanitizer default would be silently unsafe — DID NOT MATERIALIZE.** See §N6; the
  prediction was wrong and the reason is worth keeping.
- **M4 `tosijs-platform` world-readable Storage — UNCHANGED**, now **40 days**. §N2 (regraded, with
  new evidence).
- **M5 `tosijs` #43 (untrusted props reach `innerHTML`) — UNCHANGED, still open.** §N9.
- **M6 `tosijs` #41 (cleartext secrets through the agent surface) — UNCHANGED, still open.** §N9.
- **M7 `lukko` 2 critical / 11 high — WORSE: now 2 critical / 13 high**, **40 days**. §N1.
- **M8 `tjs-lang` unpinned CDN major range — UNCHANGED**, reconfirmed in the 0.13.13 tarball. §N7.

---

## MAJOR findings

### M1. `tosijs` ships the pre-fix floorplan renderer (SVG attribute injection), and the fix is neither tagged nor published

| Signal | Value |
| --- | --- |
| `tosijs-floorplan` HEAD | `ed63e75`, **2026-10-02**, commit message `release: 0.5.1` |
| `package.json` | **0.5.1** |
| Latest remote tag | **`v0.5.0`** — no `v0.5.1` |
| npm `tosijs-floorplan` | `latest` **0.5.0**; published versions are only `0.3.0, 0.4.0, 0.5.0` |
| What 0.5.1 is | a `### Security` release |

`CHANGELOG.md` 0.5.1, *"Geometry fails closed (board #2739, found by this release's pre-tag review;
present in 0.5.0 and earlier)"*: coordinates are written into SVG attributes, and on a
`viewportFixed` record a string `x`/`y` **skipped every arithmetic check and was written verbatim**
into `x="…"`/`y="…"` — so `'1" onmouseover="…'` adds an attribute, and a hostile `y` can forge a
`<text>` node, *"defeating the `secret` and forged-glyph guarantees."* The `pad` and `fontSize`
options and `within` reached the viewBox, `font-size` and the pinned offsets the same way.

**Why this is major rather than measured-zero bookkeeping:** the vulnerable code is not only in
floorplan. `tosijs` **vendors the renderer** as `src/schematic.ts` and pins `tosijs-floorplan`
**exactly at `0.5.0`** (`package.json:90`, devDependency), so — as floorplan's own changelog says —
*"`bun update` does not deliver this fix."* Verified in the published artifact:

```
tosijs-1.10.6.tgz → package/src/schematic.ts   grep -c isFinite → 0
```

`schematicSVG` is public API (`import { enableAgentInterface, schematicSVG } from 'tosijs'`), and
`/src` is in tosijs's `files`. `tosijs` is one of the **two** packages with known private production
consumers (Nonono, Snowfox), so this is a code-level security finding in shipped code on a
real-consumer package — severity does not scale down.

**Two honest caveats.** The 0.5.1 commit is dated **today**, so the tag-and-publish may simply be in
flight — this is the one finding to check before anything else. And both in-ecosystem *producers*
emit numeric bounds (tosijs's `describe()` `Math.round`s a `DOMRect`; haltija reads `DOMRect`
fields), so the realistic path is a **consumer-supplied option of the wrong type**, or a description
that arrived over a wire — which `src/schematic.ts`'s own doc comment advertises as a supported
use (*"on the far side of a wire from an app nobody is viewing"*).

**Recommended action:** tag and publish `tosijs-floorplan@0.5.1`; then bump tosijs's exact pin to
`0.5.1`, re-vendor `src/schematic.ts`, and cut the tosijs release. The pin is what makes the second
step mandatory — a published fix nothing depends on reaches no one.

### M2. `tosijs-platform/functions` — a signature-verification high landed this week, in production, on a tree with no lockfile

`npm audit` on the deployed Cloud Functions tree: **2 high, 9 moderate, 0 critical.** Last week this
tree read **0 high**; the high is new.

| Severity | Package | Direct | Advisory |
| --- | --- | --- | --- |
| high | `node-forge` (all versions reachable) | no | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) — RSA PKCS#1 v1.5 signature verification accepts extra nested `DigestAlgorithm` elements (**signature-forgery class**) |
| high | `firebase-admin` `5.0.0 – 14.3.0` | **yes** | the above, via `@google-cloud/firestore` / `@google-cloud/storage` / `node-forge` / `uuid` |
| moderate ×9 | `@google-cloud/firestore`, `@google-cloud/storage`, `firebase-functions-test`, `gaxios`, `google-gax`, `retry-request`, `teeny-request`, `ts-deepmerge`, `uuid` | mixed | — |

- `functions/package.json` pins **`firebase-admin: ^12.7.0`** (resolves 12.7.0, pulling
  `node-forge@1.4.0`). Registry latest is **14.5.0** — two majors behind, and the caret **cannot
  reach the fix**: npm's own `fixAvailable` names `firebase-admin@14.5.0`, `isSemVerMajor: true`.
- `functions/` still has **no lockfile**, so this reading is one deploy-time resolve, not a property
  of what is deployed — and the next deploy can resolve differently without anyone changing a line.
- **The fix is already proven in-ecosystem:** `tjs-lang/functions` pins `firebase-admin: ^14.3.0`
  and audits **0 advisories at every severity**.
- [tosijs-platform#2](https://github.com/tonioloewald/tosijs-platform/issues/2) still claims *"3
  critical / 41 high"*, which still does not reproduce at that magnitude. Its actionable half is now
  sharper than when it was filed, not softer.

**Recommended action:** `firebase-admin@^14.5.0` in `functions/`, commit a lockfile there, redeploy.
Correct #2's numbers to what is measurable so it is not read as a false alarm next time.

No third major. The loudest non-major item is **lukko's 2 criticals** — see §N1, and the one-line
fix that has been available for 40 days.

---

## Notable, non-major

### N1. `lukko` — 2 critical / 13 high (up from 11), one dependency edge, untouched since March

Frozen install against the committed `bun.lock`: **2 critical, 13 high, 16 moderate, 5 low.**

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs` | [GHSA-xq3m-2v4x-88gg](https://github.com/advisories/GHSA-xq3m-2v4x-88gg) — arbitrary code execution |
| critical | `websocket-driver` | [GHSA-xv26-6w52-cph6](https://github.com/advisories/GHSA-xv26-6w52-cph6) — message corruption via protocol length headers |
| high ×5 | `protobufjs` | code injection via bytes-field defaults; code-generation gadget after prototype pollution; unbounded recursion; unsafe option paths; unbounded `Any` expansion |
| high ×5 | `undici` | WebSocket 64-bit length overflow; permessage-deflate memory exhaustion; invalid `server_max_window_bits`; fragment-count DoS; unrequested subprotocol DoS |
| high ×3 | `@grpc/grpc-js` | malformed request crashes server; malformed compressed message crashes client; `getAuthContext` returns unauthorized certificates |

Single root cause, unchanged for a fifth week: `lukko` pins **`tjs-lang: ^0.3.0`**, whose lock holds
`tjs-lang@0.3.0` with `firebase` as a **runtime** dependency. Current tjs-lang has firebase in
devDependencies only, so the whole subtree disappears on upgrade. HEAD is still `94d25be`
(2026-03-04). [lukko#2](https://github.com/tonioloewald/lukko/issues/2), open **40 days**.

**Not graded major, deliberately:** `private: true`, nothing published, so there is no shipped tree
and no consumer. The blast radius is the dev machine — which `dependencies.md` §4 says still counts,
hence top of this list rather than buried.

**Recommended action:** `bun add tjs-lang@^0.13.13` and re-lock. The same one line for the fifth week.

### N2. `tosijs-platform` Storage reads — now documented as deliberate, except for the one path the documentation does not cover

`storage.rules` has three `allow read: if true` (lines 32, 38, 44): `/blog/**`, `/public/**`, and
**`/users/{userId}/{path=**}`**. Write on the last is correctly owner-scoped; read is unconditional.

**New evidence this week** — the file now answers the question
[#3](https://github.com/tonioloewald/tosijs-platform/issues/3) asked, for two of the three:

```
// NOTHING ELSE. No default rule, so anything not matched above is denied:
// reads are an ALLOWLIST of the legacy folders, mirrored from
// functions/src/legacy-storage.ts (scripts/storage-rules.test.ts checks the
// two agree).
```

That is a deliberate, tested posture, and it downgrades this from last week's major. But
`/users/{userId}/**` is **user uploads, not a legacy folder** — the stated rationale does not reach
it, and a test that pins rules against `legacy-storage.ts` does not make a user-upload path a legacy
one. #3 has asked *"confirm this is deliberate"* for **40 days**, on a service in production that the
scoreboard calls *"a load-bearing pillar."*

**Recommended action:** record the decision for `/blog` and `/public` in `DECISIONS.md` and close
that part of #3; then decide `/users/**` separately — public asset area (say so) or owner+role
scoped (change it). Access-control defaults propagate to whatever adopts the platform.

### N3. `haltija/apps/mcp` — two **high** advisories, on a tree nothing notices

Frozen install against the committed `bun.lock` (exit 0), then `bun audit`: **2 high, 6 moderate.**

| Severity | Package | Advisory |
| --- | --- | --- |
| high | `fast-uri` | [GHSA-58mr-gqgx-xq4g](https://github.com/advisories/GHSA-58mr-gqgx-xq4g) — host confusion via an unclosed bracket in the URI authority |
| high | `fast-uri` | [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) — authority injection via an unvalidated port in `serialize` |
| moderate | `hono` | [GHSA-hxh3-vqpv-xpqv](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv) — `hono/jsx` renders plain strings unescaped in boundary components (XSS) |
| moderate ×4 | `ip-address` | NAT64 range unrecognized; unbounded parse diagnostic; cross-family subnet comparison; `isLinkLocal()` recognizes `fe80::/64` not `fe80::/10` |
| moderate | `fast-uri` | inconsistent host case normalization |

Two corrections to last week, both from a frozen install rather than a fresh resolve: `apps/mcp`
**does** reach `hono` (transitively, through `@modelcontextprotocol/sdk`), so
[haltija#46](https://github.com/tonioloewald/haltija/issues/46) is **not** a false negative to be
closed — and the two `fast-uri` **highs** are newer than that issue, which only names the hono
moderates. `@haltija/mcp` is unpublished (npm 404) and `apps/mcp` is not in haltija's `files`, so
nothing reaches a consumer — it also **does not compile**
([#47](https://github.com/tonioloewald/haltija/issues/47), TS2589), which is exactly why nothing
notices. A tree that neither ships nor builds still installs.

**Recommended action:** fold the SDK bump into the 1.13 beta, and settle `apps/mcp`'s fate
(#47 / #53) — an uncompiled, unshipped, unaudited-by-CI workspace is where advisories go to retire.

### N4. `haltija/apps/desktop` — electron high, dev-machine only

`npm audit`: **2 high, 0 moderate.** `electron` **`43.0.0-beta.1 – 43.4.1`**, **direct**,
[GHSA-qmv3-fv6v-rmhq](https://github.com/advisories/GHSA-qmv3-fv6v-rmhq) — sandboxed preload code
cache can be poisoned by a compromised renderer; fix available. Plus `undici` (transitive, 10
advisories rolled into one high).

`apps/desktop` is `private: true` with electron as a **devDependency**, and haltija's `files` ships
only its built `*.js` / `*.html` / `*.css` / `package.json` — a consumer installing `haltija` never
resolves electron. Blast radius is the dev machine.

### N5. Dev-tree advisories that reach no consumer — unchanged in kind, slightly worse in count

- **`react-tosijs`** — **13 high + 5 moderate** (was 11 + 4), all from the eslint 8 dev tree:
  `brace-expansion` ×5 high, `js-yaml` ×3 high, `minimatch` ×3 high, `flatted` ×2 high.
  Filed as [#4](https://github.com/tonioloewald/react-tosijs/issues/4) /
  [#5](https://github.com/tonioloewald/react-tosijs/issues/5). HEAD is 2026-07-27 — quiet.
- **`ngx-tosijs`** — **3 moderate**, identical to last week and to
  [#1](https://github.com/tonioloewald/ngx-tosijs/issues/1): `@angular/common`
  [GHSA-p297-fm68-3q8c](https://github.com/advisories/GHSA-p297-fm68-3q8c) (HttpTransferCache leak
  via `withRequestsMadeViaParent`), `@angular/core` + `@angular/compiler`
  [GHSA-hh8m-fm6v-7cvg](https://github.com/advisories/GHSA-hh8m-fm6v-7cvg) (sanitization bypass via
  directive host bindings).

Both packages declare `dependencies: null` — everything is dev or peer.

### N6. Last week's M3 was wrong, and the reason is worth keeping

Last week predicted that tosijs-ui 1.16 flipping `sanitize` on by default would be *silently* unsafe,
because [kilpi#2](https://github.com/tonioloewald/kilpi/issues/2) (the denylist passes custom
elements, and `is=` too) was still open. **kilpi#2 is still open — and tosijs-ui is not exposed,
because it closed the gap at its own layer.** Verified in the published
`tosijs-ui-1.16.3.tgz → package/dist/markdown-viewer.js:205-224`:

```js
sanitizeInPlace(template.content);
// Custom elements are code, not markup (B1, 1.16.0 review). kilpi keeps unknown elements by
// design … a nested `<tosi-md sanitize="off">` rendered its text as raw HTML …
for (const el of [...template.content.querySelectorAll('*')]) {
  el.removeAttribute('is');
  if (el.localName.includes('-') && !allowed.has(el.localName)) {
    el.replaceWith(...el.childNodes);      // unwrap: content kept, element dropped
  }
}
```

Plus an `ALWAYS_UNWRAPPED` set that outranks `allowedElements`, and every `href` held to
`isSafeNavigationUrl`. The nested-`<tosi-md>` scenario last week's M3 described by name is the
scenario the comment cites. The right lesson for `review.md`: **a predicted-but-unverified downstream
consequence is rung 1 (judgement), and the artifact can refute it.** This one did.

kilpi#2 remains a real upstream gap for *any other* kilpi consumer, and
[kilpi#1](https://github.com/tonioloewald/kilpi/issues/1) (SECURITY.md does not state which release
lines get fixes) is still open on what is now tosijs-ui's runtime sanitizer.

### N7. `tjs-lang` — published 0.13.13 still dynamic-imports an unpinned major range

Reconfirmed in this week's tarball: `esm.sh/typescript@5` appears **6 times** in
`tjs-lang-0.13.13.tgz` — `src/lang/browser-from-ts.ts`, `dist/tjs-browser-from-ts.js` + its map +
`.d.ts`, `CLAUDE.md`, `llms.txt`. A rolling major range fetched by a dynamic `import()` that cannot
carry `integrity`, executing in the consumer's page, invisible to every consumer lockfile.
[tjs-lang#55](https://github.com/tonioloewald/tjs-lang/issues/55), open **26 days**, unchanged across
two releases, with a test pinning the exact string in place.

**Recommended action:** pin an exact version in `DEFAULT_TYPESCRIPT_URL` (update the test with it);
keep the per-call `typescriptUrl` override.

### N8. Publish integrity — the rest

| Repo | package.json | Latest remote tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `tosijs` | 1.10.6 | v1.10.6 | 1.10.6 | ✅ |
| `tosijs-ui` | 1.16.3 | v1.16.3 | 1.16.3 | ✅ **last week's M1 cleared** |
| `tosijs-schema` | **1.13.0** | **v1.13.0** | **1.13.0** | ✅ |
| `tosijs-floorplan` | 0.5.1 | v0.5.0 | 0.5.0 | ⚠️ **§M1** — security release untagged + unpublished |
| `tjs-lang` | 0.14.0-rc.1 | v0.14.0-rc.1 | 0.13.13 · `rc` **0.14.0-rc.1** | ✅ correctly staged, `latest` untouched |
| `haltija` | 1.13.0-beta.2 | v1.13.0-beta.2 | 1.12.9 · `beta` **1.13.0-beta.2** | ✅ correctly staged |
| `react-tosijs` | 1.2.1 | v1.2.1 | 1.2.1 | ✅ |
| `ngx-tosijs` | 0.9.1 | v0.9.1 | 0.9.1 | ✅ |
| `tosijs-3d` | 0.8.7 | v0.8.7 | 0.8.7 | ✅ |
| `tosijs-product` | 0.8.0 | v0.8.0 | 0.8.0 | ✅ |
| `tosijs-editor` | `tosijs-styled-editor` 0.5.2 | v0.5.2 | 0.5.2 | ✅ |
| `kilpi` | `tosijs-kilpi` 1.0.1 | v1.0.1 | 1.0.1 | ✅ |
| `tosijs-timezone-picker` | 0.6.0 | **none, zero tags on the remote** | 0.6.0 | ⚠️ 5 versions published, repo has no tags at all ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2), 40 days) |
| `wobbly` | 0.6.0 | v0.6.0 | `wobbly-js` **0.1.0** | ⚠️ v0.2.0–v0.6.0 tagged, **five releases never published** ([#1](https://github.com/tonioloewald/wobbly/issues/1), 40 days) |
| `service-compris` | 0.3.0 | v0.3.0 | 0.3.0 · `beta` **0.2.0-beta.2** | ⚠️ `beta` now sits **below** `latest`; `v0.2.0-beta.3/4/5` tagged, never published |

**Eleven of fifteen** published packages agree across repo · tag · registry. Of the four that don't,
one is §M1 (real-consumer package, graded major on the shipped code, not the bookkeeping) and three
are measured-zero bookkeeping — **notable, never major** per `releasing.md`'s calibration. But "land
the plane before touching the throttle again" still outranks that calibration: wobbly is five
releases deep, timezone-picker has never tagged anything, and service-compris went two betas past
beta.2 and then shipped 0.3.0 without ever moving the `beta` tag.

Not re-checked this week: `create-tosijs-platform-app` (last week: published 1.0.6, no tag anywhere) —
see UNCHECKED.

### N9. Stale npm dist-tags — unchanged

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.6 |
| `haltija` | 1.13.0-beta.2 | 1.12.0-rc.5 | 1.12.9 |
| `service-compris` | 0.2.0-beta.2 | — | 0.3.0 |

tosijs's and haltija's `rc` tags sit three minors behind `latest`, so nobody is pulled *forward* onto
a pre-release by accident — drift, not exposure. A consumer who deliberately follows `rc` gets an
abandoned line. `npm dist-tag rm` when convenient.

### N10. `tosijs`'s own open security issues — all three unchanged, on the real-consumer package

- [#41](https://github.com/tonioloewald/tosijs/issues/41) (`bug`, open since 09-09, 23 days) — a
  light-DOM wrapper carrying the `value` binding over a password field is never learned as secret, so
  `read()` / `changes()` / `describe()` return cleartext.
- [#43](https://github.com/tonioloewald/tosijs/issues/43) (open since 09-12) — an unknown prop is
  assigned as a DOM property, so a props object from untrusted data can set `innerHTML`.
- [#32](https://github.com/tonioloewald/tosijs/issues/32) (open since 09-02) — secret-path matching
  is spelling-sensitive: `list[0].pw` returns cleartext where `list[id=a1].pw` redacts.

Listed again for the same reason as the last two sweeps: the sweep reports **published** state, and
published state has not moved. Sequencing is the owner's call and is not disputed.

### N11. Secrets: nothing new, one remediation confirmed, one accepted finding unchanged

Every repo tree and all **15** published tarballs grepped for `AIza`, `sk-`, `ghp_`, `github_pat_`,
`AKIA`, `xox*`, Mapbox `pk.`/`sk.`, and `-----BEGIN … PRIVATE KEY`, plus committed `.env` files and
`files`-glob leakage.

- **No** `sk-`, `sk.`, `AKIA`, `ghp_`, `github_pat_` or `xox*` material anywhere, in any repo or any
  tarball. **No `.pem` or `.key` file is tracked in any of the 16 repos.**
- ✅ **tosijs-3d's committed TLS private key is remediated.** The B2 finding in
  `reviews/0.7.0-pre-tag-gate.md` (`tls/key.pem.bak`) is now only prose in that review; `tls/` holds
  nothing but `.gitkeep`, i.e. the allowlist-ignore fix the review asked for landed.
- **Published tarballs are clean**: no secrets, no `.env`, and no `reviews/` · `journal/` · `designs/`
  directory in any of the 15. The only tarball pattern hit is tosijs-product's `README.md` carrying
  the accepted Mapbox public token.
- **Accepted finding, not re-raised.** One Mapbox `pk.` token (fingerprint `sha256:52a561124595`,
  byte-identical everywhere) in `tosijs-product` (`src/tosi-scroll-map.ts:64`, `README.md`, `docs/`
  including two sourcemaps) and `tosijs-timezone-picker/docs/hydrate.js.map`. The `src/` occurrence is
  still inside a `<tosi-product class="doc-demo">` documentation block — markup in a doc page, not
  runtime code. **Class unchanged.** Worth noting: `tosijs-ui/dist/mapbox.js` **no longer contains the
  literal** — it now carries a comment explaining the string was split so it stops matching GitHub's
  scanner. The same trick would clear the two remaining repos, if the scanner noise is bothering
  anyone.
- `tjs-lang/demo/src/{firebase-auth,agent-client,user-store}.ts` carry a Firebase **web** `apiKey`
  (`AIza…`) — public-class (identifies, does not authorize), demo only, `files` ships `docs` but not
  `demo`. Notable, not major.
- **`tosijs-platform/functions/.env.sandbox` and `.env.liquid-force-425209-g2` are committed and are
  NOT a finding.** Each holds exactly one documented feature flag —
  `PLATFORM_CONFIGS_FROM_REGISTRY`, a 4-byte value — with seed instructions and a rollback note in
  comments. No credentials. Recorded here so next week's sweep does not re-raise them.

### N12. Lockfile hygiene

- **No lockfile:** `tosijs-platform/functions` (§M2 — the one that matters, a production deploy
  target), `tosijs-platform/create-script`, `tjs-lang/editors/vscode`. The latter two audit clean on
  a fresh resolve; neither reading is a property of a pinned tree.
- **Frozen installs succeeded** (so the audit reflects the committed tree) for: tosijs, tosijs-ui,
  tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product,
  tosijs-timezone-picker, haltija, haltija/apps/mcp, wobbly, tosijs-editor, kilpi, tosijs-platform,
  lukko, and `tjs-lang/functions` (npm lock).

### N13. Issues — 152 open, fully enumerated, still zero non-owner authors

**35 issues opened in the last 14 days** (2026-09-18 → 2026-10-02):

| Repo | Open issues | New in 14 days |
| --- | --- | --- |
| `tosijs-ui` | 43 | #205, #198, #197, #196, #195, #190, #186, #185, #184, #174 |
| `tjs-lang` | 29 | #59, #58 |
| `tosijs-platform` | 25 | #35, #34, #33, #32, #31, #30, #28, #24, #15, #14 |
| `tosijs` | 16 | #48, #47, #46 |
| `haltija` | 15 | #54, #53, #52 |
| `tosijs-3d` | 14 | #96, #95, #94, #93, #92, #80 |
| `react-tosijs` | 3 | — |
| `lukko` / `kilpi` | 2 / 2 | — / #2 |
| `ngx-tosijs` / `wobbly` / `tosijs-timezone-picker` | 1 each | — |
| `tosijs-schema` / `tosijs-floorplan` / `tosijs-product` / `tosijs-editor` | 0 | — |

- **Every one of the 152 open issues is authored by `tonioloewald`.** The strongest public adoption
  instrument, re-measured today, still reads **zero non-owner humans** ecosystem-wide. (The 6 open
  pull requests, all on `tosijs-ui`, were not author-checked — see UNCHECKED.)
- `tosijs-ui` is **down from 60 to 43** open issues since last week — 17 closed, the largest backlog
  movement anywhere in the ecosystem.
- Security-relevant and open beyond the sections above: `tosijs-platform#35` (*a token with methods
  `[GET]` can't list: `GET /docs` is checked as LIST, so "read-only" quietly reads nothing* — new,
  10-02), `#28` (*provenance stamps the matched role document's first uid, not the caller's* — a
  principal matched by condition is mis-attributed), `#24` (*a hand-written role document without
  `_created` is silently invisible to role resolution* — fail-open in the authority layer),
  `haltija#44` (*the REST surface answers any origin, so socket-level gating is theatre*),
  `haltija#45` (arrow-token neutralization now MUST for untrusted-content producers), `kilpi#1`,
  `tjs-lang#56` (*bare context bindings return their own name in return position — the fail-open
  shape of #52*).

### N14. Scoreboard rows a day stale

The fact cells are tool-generated — `bun tools/scoreboard.ts` is the fix, **not** a hand edit. Left
for the owner rather than run unattended, since the tool rewrites cells across every row:

- `tosijs-schema` shows **1.12.0**; repo · tag · npm all agree at **1.13.0**.
- `tosijs-floorplan` shows **0.5.0**; repo is **0.5.1**, untagged and unpublished (§M1) — this row is
  the one that would have surfaced M1 a day earlier.
- `tjs-lang`'s Activity says `0.14.0-rc.0` is on the `rc` dist-tag; it is **0.14.0-rc.1**, and
  `v0.14.0-rc.1` is tagged.
- `haltija`'s Version cell says tag **v1.12.9**; `v1.13.0-beta.1` and `v1.13.0-beta.2` are both on
  the remote and `beta` → 1.13.0-beta.2. The ⚠️ is no longer warranted — it is correctly staged.
- `service-compris`'s Activity warns that `beta.3`/`beta.4` are tagged ahead of the `beta` tag;
  **`beta.5` has since been tagged too**, and `latest` has moved to 0.3.0 past all of them.

---

## UNCHECKED — gaps this sweep did not earn a pass on

- **Unpushed local work.** The sweep reads remote clones only, so a `main` that exists solely on the
  dev machine is invisible to it — the exact failure a previous sweep caught on
  `tosijs-timezone-picker` at 0.5.3. No access to that machine from here. §M1's floorplan 0.5.1 may
  be an instance mid-flight rather than stalled; only the dev machine can say.
- **`haltija/apps/desktop` lockfile sync.** Last week `npm ci` refused there (*"Missing:
  electron-store@10.1.0, conf@14.0.0, type-fest@4.41.0, ajv@8.20.0 from lock file"*). This week the
  command needed to re-verify it was **blocked by the session's permission classifier**, so the
  advisories in §N4 come from `npm install`, not `npm ci`, and the sync question is **unresolved**.
  Re-run `npm ci` in `haltija/apps/desktop` to settle it.
- **`create-tosijs-platform-app`** registry/tag state — the command that would have checked it was
  caught in the same blocked call. Last week: published 1.0.6, no tag anywhere in the repo.
- **Open pull requests.** Counted (6, all on `tosijs-ui`) but not read, so the "zero non-owner
  authors" claim covers issues only.
- **Dependabot alert state** — not readable. All advisories here come from `bun audit` / `npm audit`.
- **`tosijs-virta`** — private; listed in scope-with-a-repo but not attached or scanned.
- **Adoption instruments not re-run.** Grading uses the 2026-08-25 baseline as the sweep's own rules
  direct; jsDelivr per-file breakdowns and the GitHub dependents graphs were not re-measured. The one
  instrument that *was* re-measured — non-owner issue authors — still reads zero (§N13).
- **GitHub API access required attaching all 16 repos** (`add_repo`, `access: "push"`); the
  anonymous git lane serves clones but not the API. Nothing was written to any repo: no issues, no
  comments, no pushes, no PRs.
