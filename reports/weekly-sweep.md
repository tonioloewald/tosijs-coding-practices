# Weekly security & health sweep — 2026-09-04 (UTC)

Reconnaissance only at sweep time. Prior weeks live in git history (this file is overwritten,
never appended).

**Scanned:** 14 GitHub repos, **20 dependency trees** (6 nested workspaces audited separately).

| Scanned | Nested trees also audited |
| --- | --- |
| tosijs, tosijs-ui, tosijs-schema, tosijs-floorplan, tjs-lang, react-tosijs, ngx-tosijs, tosijs-3d, tosijs-product, tosijs-timezone-picker, haltija, wobbly, lukko, tosijs-platform | `tjs-lang/functions`, `tjs-lang/editors/vscode`, `haltija/apps/desktop`, `haltija/apps/mcp`, `tosijs-platform/functions`, `tosijs-platform/create-script` |

**Skipped, with reason:**

- `kith-email`, `static-assets`, `ariosto` — marked *(private)* in the scoreboard, out of scope.
- `tosijs-editor` — back-burnered per the scoreboard.
- `tosijs-3d-ensemble`, `manta-recon` — local-only repos, no GitHub link.
- `lukko` again needed an `add_repo` attach before it would clone; then scanned in full.
  `package.json` sets `private: true`, so its npm 404 is correct.

**Tooling:** `bun 1.3.11` / `bun audit --json` (exit code read before output — a clean bun tree is
exit 0 + a 3-byte `{}`, and its JSON is `{pkg: [advisories]}`, *not* npm's `{vulnerabilities}`);
`npm audit --json` on `package-lock` trees, `npm install --ignore-scripts` throughout; `npm view`
for registry state; `git ls-remote --tags` for tags; `npm pack <pkg>@latest` + grep for
published-tarball contents. `tosijs-platform/functions` was audited **twice**, once per engine,
because a GitHub issue claims a much worse result than either engine now reports (see §N4).

---

## Last week's majors: three of five moved

- **`haltija#40`** (unauthenticated `/terminal/command`, `/terminal/agent-prompt`, `/files/write`)
  — **fixed, and the fix is published.** `dist/server.js` in the **1.12.8 tarball** carries the
  `MACHINE_CONTROL_PREFIXES = ['/terminal/', '/files/']` default-deny, placed before the token
  check and before any routing. The issue is still open on GitHub for the remaining part (a
  non-TCP channel to restore the desktop tabs); the network-reachable RCE itself is closed.
  **A new, different haltija exposure replaces it — §M1.**
- **`tosijs-platform/functions`** — last week's *3 critical / 41 high* **no longer reproduces**:
  0 critical / 0 high on both engines (§N4). `tosijs-platform#2` needs re-scoping, not closing.
- **`tosijs-ui` publish gap** — cleared and then some: repo, tag and npm all agree on **1.13.0**.
  The 1.12.5-tagged-not-published item from last week is gone.
- Still open, unchanged: `lukko` (§M3), `wobbly`, the untagged published releases,
  `tosijs-platform#3` (`storage.rules`), the react-tosijs eslint-8 dev tree.

---

## MAJOR findings

### M1. `haltija` — published `latest` (1.12.8) loads an unpinned, un-SRI'd CDN script into a frame that reaches a shell

Confirmed **in the published tarball**, not merely in the repo:

- `haltija-1.12.8.tgz` → `package/apps/desktop/terminal.html:2038-2039`

  ```
  await load('https://cdn.babylonjs.com/babylon.js')
  await load('https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js')
  ```

  Rolling `latest`, no version pin, no `integrity`, no `crossorigin`. Per the project's own
  1.12.9 review notes, the app strips CSP headers globally and that iframe has no `sandbox`, and
  the frame holds a `postMessage` relay that reaches `spawn('sh', ['-c', …])` and the filesystem.
  A CDN compromise, a bad Babylon publish, or a TLS-intercepting proxy is arbitrary code
  execution on the developer's machine. It shipped in 1.12.7 — the release that *removed* a
  network-reachable RCE.

**The fix exists and is not published.** `v1.12.9` is tagged on the remote; npm `latest` is
**1.12.8**; `npm view haltija@1.12.9` is a 404. HEAD pins `cdn.babylonjs.com/v9.25.0/babylon.js`
with `integrity`. Three further security fixes are stranded in the same unpublished tag:

| Fix (in tagged 1.12.9) | Verified absent from published 1.12.8 |
| --- | --- |
| Renderer relay default-denies its sender (was shape-validation only, so any frame in the renderer reached shell + filesystem) | — |
| `/ws/terminal` + `/ws/agent` require a local origin (they accepted unauthenticated cross-origin upgrades and volunteered `{shellId, cwd}` on connect) | `src/ws-origin.ts` exists at HEAD; **no `ws-origin` module in the 1.12.8 dist** |
| `HALTIJA_MACHINE_CHANNEL=1` no longer spreads into spawned child processes | — |

This is a code-level security finding in a *published artifact*, so it keeps its severity
regardless of haltija's measured-zero external base — and haltija is `bunx`-installable and used
across the ecosystem (4 in-ecosystem manifests plus CLI use everywhere).

**Recommended action:** publish 1.12.9. That single step retires all four.

### M2. `tosijs` — 1.10.1 is in `package.json` with a dated CHANGELOG entry, but is neither tagged nor published

| Signal | Value |
| --- | --- |
| `package.json` version | **1.10.1** |
| Latest git tag on remote | `v1.10.0` |
| npm `latest` | **1.10.0** (`npm view tosijs@1.10.1` → 404) |
| CHANGELOG | `## [1.10.1] - 2026-09-04`, written as a completed release |

tosijs is one of the two packages with **known private production consumers** (Nonono, Snowfox),
so publish integrity here is major by the calibration in `practices/releasing.md`.

What consumers on 1.10.0 are missing:

- **[#38](https://github.com/tonioloewald/tosijs/issues/38) — `withAttributes()` makes downstream
  `.d.ts` emit impossible.** `tsc --noEmit` is clean but `tsc --declaration` fails with
  TS2742/TS2883 on every migrated class. `withAttributes` is 1.10.0's *headline* API, so anyone
  adopting it ships JS with no types. This is what blocks tosijs-ui's own migration.
- Four public types (`AgentPathRef`, `AgentObserveRef`, `ComponentClass`, `DeclaredAttributes`)
  named in shipped signatures but exported from no entry — the entry modules use explicit export
  lists, the same trap that stranded 22 `Xin*` aliases for four releases.

**Honest caveat, so this can be triaged in seconds:** the CHANGELOG entry is dated *today* and
HEAD carries commits after it, so this may simply be a release in flight rather than a stalled
one. It is reported because "a version sitting in `package.json` but never published" is the
ecosystem's known recurring failure and the sweep always reports it.

**No downstream damage yet, verified:** published `tosijs-ui@1.13.0` peers on `tosijs ^1.9.1` and
its dist contains no `withAttributes` usage — the migration has not shipped.

**Recommended action:** finish the 1.10.1 release (tag *at* publish, per
`practices/releasing.md`), or move the version back if it is not ready.

### M3. `lukko` — 2 critical / 11 high, all from one dependency edge, unchanged since 2026-08-23

`bun audit`: **2 critical, 11 high, 16 moderate, 3 low.**

| Severity | Package | Advisory |
| --- | --- | --- |
| critical | `protobufjs@7.5.4` | Arbitrary code execution (`<7.5.5`) |
| critical | `websocket-driver@0.7.4` | Message corruption via protocol length headers (`<0.7.5`) |
| high ×2 | `@grpc/grpc-js@1.9.15` | Malformed request/compressed message crashes client or server |
| high ×5 | `protobufjs@7.5.4` | Code-generation gadget after prototype pollution; code injection via bytes-field defaults; unbounded recursion; unsafe option paths; unbounded `Any` expansion |
| high ×4 | `undici@6.19.7` | WebSocket permessage-deflate memory exhaustion; 64-bit length overflow; `server_max_window_bits` unhandled exception; fragment-count DoS |

**Single root cause.** `lukko` pins `tjs-lang: ^0.3.0` and its `bun.lock` holds `tjs-lang@0.3.0`,
which carried `firebase@10.14.1` as a **runtime** dependency; every advisory above is inside that
subtree. Current tjs-lang (0.13.x) has firebase as a *devDependency* only, so the whole subtree
disappears on upgrade.

`lukko` is `private: true` and unpublished, so nothing reaches a consumer — but the tree installs
on the developer's machine, and this is [lukko#2](https://github.com/tonioloewald/lukko/issues/2),
open since 2026-08-23.

**Recommended action:** `bun add tjs-lang@^0.13.11` in lukko and re-lock. One line.

---

## Notable, non-major

### N1. A non-owner opened an issue — the strongest adoption instrument just moved

[`tosijs-schema#10`](https://github.com/tonioloewald/tosijs-schema/issues/10), opened
**2026-09-02** by **`anssip`** — not `tonioloewald`. `practices/releasing.md`'s baseline
(2026-08-25) records "**zero** non-owner issue or PR authors ever, on any repo (dependabot
aside)", and names non-owner humans as the *strongest* public instrument.

The content is security-adjacent too: *"`agentContract().check()` fails open on uncontracted
paths, and the root matcher is private"* — the fail-open family tosijs-schema 1.8.0/1.9.0 have
been closing.

**Not written back to the practice**, because identifying `anssip` needs owner knowledge: the
baseline already names "a friend of the owner who kicked AJS's tires early on (two experimental
repos consuming tosijs + tosijs-schema)", and this may simply be that person. **Flagged for the
owner to confirm**, then `practices/releasing.md`'s baseline paragraph should be updated either
way — the baseline's own instruction is to re-measure at each decision.

### N2. Publish integrity on measured-zero packages — bookkeeping, but two are new this week

| Repo | package.json | Latest tag | npm `latest` | State |
| --- | --- | --- | --- | --- |
| `tjs-lang` | 0.13.12 | **`v0.13.12`** | **0.13.11** | **NEW** — tagged, never published |
| `wobbly` | 0.6.0 | `v0.6.0` | `wobbly-js` **0.1.0** | five releases unpublished ([wobbly#1](https://github.com/tonioloewald/wobbly/issues/1)) |
| `tosijs-floorplan` | 0.3.0 | **none** | 0.3.0 | published, repo has zero tags ([#6](https://github.com/tonioloewald/tosijs-floorplan/issues/6)) |
| `tosijs-timezone-picker` | 0.6.0 | **none** | 0.6.0 | published, still untagged ([#2](https://github.com/tonioloewald/tosijs-timezone-picker/issues/2)) |
| `tosijs-3d` | 0.8.0 | `v0.8.0` | 0.8.0 | ✅ clean (last week's 0.7.3 gap cleared) |
| `tosijs-product` | 0.7.0 | `v0.7.0` | 0.7.0 | ✅ clean |
| `tosijs-ui` | 1.13.0 | `v1.13.0` | 1.13.0 | ✅ clean |
| `tosijs-schema` / `react-tosijs` / `ngx-tosijs` | 1.9.0 / 1.2.1 / 0.9.1 | match | match | ✅ clean |
| `tosijs-platform` | 1.0.6 | **none** | 1.0.6 | published, repo has zero tags |

The `tjs-lang` row is the second consecutive week in which a tag ran ahead of a publish somewhere
in the ecosystem — the exact failure `practices/releasing.md` ("a tag is part of publishing, never
a step ahead of it") was written for. It is *bookkeeping* here because tjs-lang is measured-zero,
but the recurrence rate is the signal, not this instance.

Related: [`tosijs-ui#135`](https://github.com/tonioloewald/tosijs-ui/issues/135) (opened today)
notes the live-example pins **tjs-lang 0.13.4, which is deprecated on npm** — deprecation strings
pointing at vulnerable/superseded versions cost minutes to correct regardless of audience size.

### N3. Stale npm dist-tags on two packages

| Package | `beta` | `rc` | `latest` |
| --- | --- | --- | --- |
| `tosijs` | 1.7.0-beta.2 | 1.8.0-rc.3 | 1.10.0 |
| `haltija` | 1.3.0-beta.12 | 1.12.0-rc.5 | 1.12.8 |

Nobody is served by a `rc` tag three minors back. `npm dist-tag rm <pkg> beta|rc` each.
(`tosijs@1.8.0-rc.2` remains correctly deprecated.)

### N4. `tosijs-platform/functions` — the criticals are gone, but the tree is unpinned

Audited on both engines against `firebase-admin ^12.7.0` resolved fresh today:

- `bun audit`: 0 critical / 0 high / 2 moderate.
- `npm audit`: 0 critical / 0 high / **10 moderate** (npm counts affected *packages*, bun counts
  advisories — both agree on the severity ceiling).

[`tosijs-platform#2`](https://github.com/tonioloewald/tosijs-platform/issues/2) ("3 critical / 41
high") therefore **no longer reproduces**; the vulnerable transitive versions were patched
upstream inside the `^12` range. `firebase-admin` is still two majors behind (12.x vs 14.x), so
re-scope the issue rather than close it.

⚠️ **Caveat that limits this result:** `functions/` commits **no lockfile** — `package-lock.json`
is gitignored — so what deploys is whatever resolves at deploy time. Today's clean result is a
point-in-time resolution, not a pinned one.

### N5. Dev-tree advisories that reach no consumer

- **`react-tosijs`** — 10 high / 4 moderate, **every one** from `eslint@8.57.1` (EOL):
  `brace-expansion`, `minimatch`, `flatted`, `js-yaml`, `ajv`. The package has **zero runtime
  dependencies** (peers only: `react`, `tosijs`), so nothing reaches a consumer.
  [react-tosijs#4](https://github.com/tonioloewald/react-tosijs/issues/4), open since 2026-08-23.
- **`tjs-lang`** (root) — 3 high / 5 moderate / 1 low: `flatted` (eslint), `form-data@2.5.5`
  (CRLF injection, via the firebase dev deps), `protobufjs`, `qs`, `uuid`, `esbuild` (low, Windows
  dev-server only). Runtime deps are `acorn`, `acorn-loose`, `acorn-walk`, `tosijs-schema` —
  **all clean**.
- **`tjs-lang/functions`** — 8 moderate, 0 high/critical (`uuid` → `gaxios`/`teeny-request`, `qs`).
  Last week's firebase-admin 14 bump is holding.
- **`haltija/apps/mcp`** — 2 moderate (`qs`). **`haltija/apps/desktop`** — clean.
- Clean trees (0 of everything): `tosijs`, `tosijs-ui`, `tosijs-schema`, `tosijs-floorplan`,
  `tosijs-3d`, `tosijs-product`, `tosijs-timezone-picker`, `ngx-tosijs`, `wobbly`, `haltija`
  (root), `tosijs-platform` (root), `tosijs-platform/create-script`, `tjs-lang/editors/vscode`.

### N6. Secrets: nothing new, and the one recurring hit is the accepted token

- **Mapbox `pk.` public token** — verified to be a **single token** (identical SHA-256) across
  `tosijs-ui/src/mapbox.ts`, `tosijs-ui/dist/mapbox.js`, the **published** `tosijs-ui@1.13.0`
  tarball, `tosijs-product`'s README + doc-site demo block, `tosijs-3d`'s docs sourcemaps and
  `tosijs-timezone-picker`'s docs sourcemap. That is the accepted long-standing public demo
  token, appearing exactly where the accepted-findings note says it does. **Not re-raised.** No
  `sk.` secret token anywhere, and no `pk.` in non-demo runtime code.
- **Firebase web API keys (`AIza`)** in `tjs-lang/demo/src/{firebase-auth,agent-client,user-store}.ts`
  — public-class (identifies the project, does not authorize). Notable, not major; Firestore/
  Storage rules are the actual boundary, which is why `tosijs-platform#3` still matters.
- **`tosijs-3d/reviews/0.7.0-pre-tag-gate.md`** matches `-----BEGIN PRIVATE KEY-----` — a **false
  positive**: it is prose quoting `head -1 tls/key.pem.bak` in the review that caught the mkcert
  key. No key material, no `-----END` marker anywhere in the file, and `tls/` is absent from the
  tree. The 2026-08 remediation holds.
- **No committed `.env` anywhere.** `tosijs/.env.example` is a placeholder template (every value
  is a comment-documented blank).
- **No tarball ships internal material** — no `reviews/`, no `journal/`, in any of the 13
  published packages. `tjs-lang`'s `!docs/reviews` negation is doing its job.

### N7. Known, documented, still-open residual

[`tosijs#32`](https://github.com/tonioloewald/tosijs/issues/32) — secret-path matching is
spelling-sensitive (`list[0].pw` returns cleartext where `list[id=a1].pw` redacts). Explicitly
**"narrowed, not closed"** in the CHANGELOG and called out inline in `src/agent.ts`, so this is a
disclosed limitation of published 1.10.0 rather than a silent one. Listed so it does not fall off
the radar.

---

## Coverage — what this sweep did NOT earn

- **Private production consumers (Nonono, Snowfox) — UNCHECKED, and uncheckable.** They are
  private repos, invisible to every instrument. Any statement about whether M1/M2 affect them has
  to come from the owner.
- **`tosijs-ui`, `tosijs-platform/functions`, `tosijs-platform/create-script`,
  `tjs-lang/editors/vscode` were audited against a FRESH resolution**, not a committed lockfile
  (tosijs-ui gitignores `bun.lock` by design; the others commit no lockfile). Their clean results
  describe today's registry, not a pinned tree, and are not reproducible by version alone.
- **GitHub REST API is not directly reachable from this session** (egress policy returns 403 for
  `api.github.com`). Open issues were read through the GitHub MCP tools after attaching each
  repo — equivalent data, but worth recording since the sweep prompt names the REST endpoint.
- **Only `latest` tarballs were scanned** for published-artifact secrets. Older published
  versions were not re-scanned.
- **No runtime/dynamic testing** was done: M1 is established by reading the published tarball,
  not by exploiting it.
