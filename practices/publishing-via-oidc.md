# Plan: publish via GitHub OIDC (npm Trusted Publishing)

**Status: PLAN, not yet implemented.** Written 2026-07-30. Pilot target: `tosijs-ui`.
Interim workaround in use: `bun publish --otp=<code>`.

---

## Why

npm is restricting tokens that bypass 2FA for direct publishing
(<https://gh.io/npm-gat-bypass2fa-deprecation>). A token created specifically to avoid
the 2FA prompt now can't even read its own account profile (`npm profile get` → 403),
and publishing needs an OTP again.

Trusted Publishing replaces the long-lived credential with a short-lived OIDC token
minted per workflow run. Two wins, in order of importance:

1. **No publish credential lives on a laptop.** The single most valuable thing an
   attacker can steal from a package maintainer is the ability to publish — a fresh
   release is exactly how a hijacked package ships. Removing the credential removes
   that class of compromise, and no amount of dependency auditing downstream helps if
   the maintainer's own token leaks.
2. **No OTP dance**, which is what prompted this.

It also gets **provenance attestations** for free, so consumers can verify a tarball
was built from the commit it claims.

**The trade-off, stated honestly:** setup is per package *and* per repo. There is no
account-level switch. For a maintainer with six-plus published packages that's six web
forms and six workflow files, so this is worth piloting on the high-traffic packages
first rather than migrating everything at once. `--otp` remains a perfectly reasonable
permanent answer for the long tail.

## What has to be true

| Where | What |
| --- | --- |
| npmjs.com, **per package** | Trusted Publisher entry: GitHub owner, repo, **exact workflow filename**, optional environment |
| The repo | A workflow at exactly that path, with `permissions: id-token: write` |
| The workflow | A recent npm CLI (OIDC support); `npm publish`, not `bun publish` (see gotcha 6) |

The binding to one exact workflow path *is* the security property — that's why it can't
be shared across repos.

> Verify field names against npm's current docs when implementing. This area moved
> recently (that deprecation notice is days old), so treat the shape below as the
> intent rather than a transcription.

## The workflow (draft)

```yaml
name: Publish

# Tag-triggered: the existing release ritual already ends in `git push --tags`.
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # REQUIRED — mints the OIDC token
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with: { bun-version: latest }

      # npm CLI does the OIDC publish; bun does everything else.
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - run: bun install

      # ── Gate 1: the tag must match package.json ──────────────────────────────
      # Cheap, and catches the classic "tagged v1.8.0, forgot the bump" mistake
      # before anything is published.
      - name: Tag matches package.json version
        run: |
          TAG="${GITHUB_REF_NAME#v}"
          PKG=$(node -p "require('./package.json').version")
          [ "$TAG" = "$PKG" ] || {
            echo "::error::tag v$TAG != package.json $PKG"; exit 1; }

      - run: bunx tsc --noEmit
      - run: bun test

      # The dev server refuses to start without a cert; CI uses a throwaway
      # (tests already set ignoreHTTPSErrors). Mirrors ci.yml.
      - name: Throwaway dev TLS cert
        run: |
          mkdir -p tls
          openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
            -keyout tls/key.pem -out tls/certificate.pem \
            -subj "/CN=localhost" \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

      - run: bunx playwright install --with-deps chromium
      - run: bunx playwright test --project=chromium

      # ── Gate 2: committed build output must match a fresh build ──────────────
      # This repo COMMITS dist/ and docs/. Without this check a tag can publish
      # artifacts that don't correspond to the source at that commit — the exact
      # thing provenance is supposed to promise. See gotcha 1.
      - name: Committed build output is current
        run: |
          bun run build
          if ! git diff --quiet -- dist; then
            echo "::error::dist/ differs from a fresh build — rebuild and re-tag"
            git diff --stat -- dist
            exit 1
          fi

      - run: npm publish --provenance --access public
```

## Gotchas (the reason this is a plan and not a paste)

1. **Generated files are committed.** `dist/`, `docs/`, `demo/docs.json`, `llms.txt`,
   `src/version.ts` are build outputs *and* tracked. A tag-triggered publish must
   verify the committed `dist/` matches a fresh build, or you can ship artifacts that
   don't match the tagged source. Gate 2 above. **Expect this to be noisy first:**
   `docs/*.epub` is not byte-reproducible between builds (it has been showing up as a
   spurious `M` all session), so scope the check to `dist` — or make the ePub
   deterministic, which is the better fix.
2. **The dependency-audit gate now runs in CI** and is not downgraded there. That is
   deliberate — but it means a *new advisory published against an unchanged lockfile*
   can fail a release for a tag that was green yesterday. That's the gate working. The
   escape hatch is a time-boxed `audit.allow` entry, not `TOSIJS_AUDIT=off` in the
   workflow. Never put the off-switch in CI; that's how the gate dies quietly.
3. **The haltija lane can't run in CI** (it drives a real Electron). Chromium
   Playwright covers the doc-test tier via `tests/doc-tests.pw.ts`. Run
   `bun run test-browser` locally before tagging; the workflow can't.
4. **`--provenance` requires the repo to be public** and the workflow to be the
   registered one. It fails closed if either is untrue, which is correct.
5. **Environments add a manual approval gate** if you want a human "yes" between tag
   and publish. Worth it for a package with real downstream users; skip it while
   piloting.
6. **Use `npm publish`, not `bun publish`, in the workflow.** OIDC support lives in the
   npm CLI. Bun is still the right tool for install/test/build in the same job.
7. **A failed publish leaves a pushed tag behind.** Decide whether to delete-and-retag
   or bump a patch. Deleting a pushed tag is fine *only* while nothing consumed it —
   the same reasoning that made moving an unpublished `v1.8.0` acceptable.

## Rollout

1. **Pilot on `tosijs-ui`** — most-published, and the one whose release ritual is best
   documented (`CLAUDE.md` → Publishing).
2. Run one release end-to-end. Confirm the tarball matches what a local
   `npm pack` produces, and that provenance shows up on npmjs.com.
3. If it feels good, **promote this file's workflow to the canonical template** and
   copy it into each repo as you touch that repo — not as a big-bang migration. One
   known-good file beats six drifting near-copies.
4. Keep `--otp` documented as the fallback. It is not a failure to use it.

## Interim

```bash
bun publish --otp=123456
```

`bun publish` does accept `--otp` (and `--auth-type`), so this needs no second browser
tab. Fine to stay here indefinitely for low-traffic packages.
