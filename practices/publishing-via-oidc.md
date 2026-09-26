# Publishing via GitHub OIDC + npm staged publishing

**Adopted practice.** Piloted on tosijs-ui 1.15.3 (2026-09-26,
[tosijs-ui#178](https://github.com/tonioloewald/tosijs-ui/issues/178)). Repos that have not
adopted it yet keep the manual path in [releasing.md](./releasing.md).

## The model

- **The workflow can only _stage_.** OIDC trusted publishing gives `publish.yml` a short-lived
  credential, and the Trusted Publisher entry has direct `npm publish` **unchecked**, so the only
  thing CI can do is `npm stage publish`. No stored token exists anywhere.
- **The maintainer's 2FA approval is the human GO.** npmjs.com → the package → **Staged
  Packages** → Approve. It works from a phone, hours later. This replaces the old argument for a
  manual trigger as the gate; `workflow_dispatch` is still the trigger, but the approval is what
  publishes.
- **A green run is the canonical "published and verified" statement.** Agents read the run;
  they do not re-derive publication by polling npm.

## The flow

0. Agent, **before tagging**: run the workflow with `dry_run` on the branch
   (`gh workflow run publish.yml -f tag=main -f dry_run=true`). Every check up to staging, no
   tag, so a failure never means moving a tag. (The pilot moved its tag five times.)
1. Agent: release commit, tag, push the tag (as before).
2. Agent or maintainer: **Actions → Publish → Run workflow** with the tag, or
   `gh workflow run publish.yml -f tag=vX.Y.Z`.
3. The run checks: tag == `package.json` version, builds and requires every tracked file **that
   ships** to be unchanged (so a committed build must reproduce), packs, smoke-tests
   that tarball, runs `release-doctor` (including its rebuild-reproduces check), then stages.
   **Nothing touches the registry before every check passes**: a staged version burns its
   number exactly as a publish does.
4. Maintainer approves with 2FA.
5. The run verifies: published `integrity` equals the staged tarball's, dist-tags are right, a
   prerelease is never `latest`, and the consumer smoke test runs on the **registry's** copy.

**Approved after the run's 60-minute wait?** Run it again with `verify_only` ticked. A re-run of
the failed job starts over and stops at "already published". Verify-only re-packs the tag, which
works because `npm pack` is deterministic: re-packing v1.15.3 reproduced the published shasum
`eb3c854c…` exactly.

## Owner setup, once per package

npmjs.com → package → **Settings → Trusted Publisher → GitHub Actions**:

| Field | Value |
| --- | --- |
| Organization or user | `tonioloewald` |
| Repository | the repo name |
| Workflow filename | `publish.yml` (filename only) |
| Environment | blank |
| Allow `npm publish` | **unchecked** (npm itself labels it "not recommended"; staging is always allowed) |

After the first verified publish, optionally set **Publishing access → "Require two-factor
authentication and disallow tokens"**.

## Requirements, each learned the hard way

- **npm ≥ 11.15.0** for `npm stage` and **Node ≥ 22.14**. The runner's bundled npm is older;
  the workflow upgrades it.
- **`permissions: id-token: write`**, or no OIDC token is minted.
- **Private repos work, without provenance.** Trusted publishing works from a private repo
  publishing a public package, but npm generates provenance only for public repos. Key checks on
  `package.json` (`private`, `files`), never on repo visibility (see [releasing.md](./releasing.md)).
- **`package.json` `repository.url` must name the actual repo.** Provenance rejected tosijs-ui
  with E422 because it still named the pre-rename `xinjs-ui`; GitHub's redirect hid that
  everywhere else.
- **Commit `bun.lock`; install with `--frozen-lockfile`.** Without it, a fresh clone of
  tosijs-ui bundled newer CodeMirror and `marked` 18: not the build that was tested.
- **Pin Bun in `.bun-version` in any repo that commits build output.** Bun 1.4.0 and 1.4.2
  built different `dist/iife.js` from one lockfile. Make the local build refuse a mismatch, so
  it fails at your desk rather than at publish time.
- **Sourcemaps must not encode absolute paths.** tosijs-ui's doc-site maps named
  `/Users/<name>/…` because the bundle was built in the OS temp dir; that leaks the builder's
  layout and makes output differ between machines.
- **The dist-tag is fixed at staging and immutable**, so it is derived from the version:
  `-beta.N` → `beta`, `-rc.N` → `rc`, `-alpha.N` → `alpha`, otherwise `latest`. Any other
  prerelease id refuses rather than guessing.
- **One `publish.yml` per repo; shared logic in scripts.** npm validates the *calling*
  workflow's filename and recommends against reusable workflows (`workflow_call`).
- **`RELEASE_DOCTOR_PUBLISHING=<tag>`** exempts the tag being published from `release-doctor`'s
  tag/publish reconciliation, which could otherwise never pass while publishing. It exempts
  only the tree's own version.

## The template and shared scripts

- [`templates/publish.yml`](../templates/publish.yml): copy it as `.github/workflows/publish.yml`.
- [`tools/publish-smoke.ts`](../tools/publish-smoke.ts): a generic consumer smoke test for repos
  without their own. A repo's own `test-consumer` script takes precedence.
- [`tools/attest.ts`](../tools/attest.ts): **local test attestation** for suites CI cannot run
  (tjs-lang's LLM-backed tests). After the release commit, run it on a clean tree: it runs the
  repo's declared lanes and writes `release-attestation.json` with the tree hash and results.
  Commit **only** that file and tag it. CI checks that the tagged commit changes only that file
  and that its parent's tree equals the attested tree, then skips re-running those lanes.
  **Honest limit:** it is a record, not a proof. Anyone who can push could write a false one,
  but they could already change the code; the 2FA approval stays the gate.

## Adopting it in a repo

1. Fix `repository.url` to the real repo.
2. Commit `bun.lock`; use `--frozen-lockfile` in CI.
3. If build output is committed: add `.bun-version`, rebuild with that Bun, commit.
4. Copy `templates/publish.yml` to `.github/workflows/publish.yml`.
5. Owner adds the Trusted Publisher entry (table above).
6. Nothing non-reproducible may SHIP: no `tsconfig.tsbuildinfo` in `dist/` (tosijs-ui's
   `emitLibrary` shipped one; incremental builds into a wiped `dist/` also emit NOTHING the
   second time — measured, 883 files gone), no absolute paths in sourcemaps.
7. If some test lanes cannot run in CI: declare them in `releaseDoctor.attestedLanes` and use
   `tools/attest.ts` at release time.
8. Before the first real release: `dry_run` on the branch, and read it through to the stop
   before staging.

## History

- **2026-09-26, tosijs-ui 1.15.3 (pilot).** The first run found four defects before anything
  reached npm: Bun version drift, the reconciliation check, the sourcemap path leak, and the
  stale `repository.url`. None of the four local lanes could have found any of them. Approval
  came from a phone about four hours after staging, which is how `verify_only` came to exist.
