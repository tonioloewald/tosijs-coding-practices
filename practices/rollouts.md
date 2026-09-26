# Standing rollouts — check your repo against these

Ecosystem-wide changes every repo should adopt. **An agent working in a repo checks it against
this list and adopts what is missing, without being asked** — that is the point of the list:
the owner decides a rollout once, here, instead of pasting a prompt into every repo.

How to use it:

- Early in a session (or when you finish a task), run each rollout's **"Adopted?"** check.
- If a rollout is missing, **do it** as its own piece of work, in its own commits. Don't fold
  it into an unrelated change.
- Anything marked **Owner** needs the maintainer. Do everything else first, then ask for
  exactly that step, in one message, with the exact values to enter.
- **Report** when done, in the form each rollout gives, so the owner can tick it off.
- A rollout that cannot apply to your repo (e.g. a repo that publishes nothing): say so once in
  your repo's CLAUDE.md (`Not applicable: <rollout> — <why>`), so the next agent doesn't re-ask.

When you add a rollout here, give it the same five parts. Retire it (move it to the bottom as
done) once every repo has it.

---

## 1. Onboard onto the virta task board

Tasks move off `TODO.md` / `UPSTREAM.md` / cross-repo GitHub issues onto
[virta](https://virta.tosijs.net/start/), which agents use through a CLI and MCP. What changes
once you're on it: [`cross-project.md`](cross-project.md) "If your repo is on the task board".

**Adopted?** `virta brief` in the repo prints the board state, and `.mcp.json` lists the virta
server. If `virta` is not installed, or `brief` says the repo is not on the board, it is not
adopted.

**Steps**

1. Install the CLI if needed: `bun add -g https://virta.tosijs.net/virta.tgz`, then
   `virta --version`.
2. `virta login` if this machine has no token yet (it keeps one in `~/local-secrets`; one login
   covers every repo on the machine). **Owner** — it opens a browser for approval.
3. `virta init` in the repo root. It registers the MCP server in `.mcp.json` and adds two
   Claude Code hooks to `.claude/settings.json` (session start runs `virta brief`; each message
   runs `virta brief --changes`). Commit both files.
4. `virta onboard --dry` and **read it**: per source, how many tasks it would create, how many
   arrive closed, how many are already on the board. Surprising numbers (hundreds of tasks, open
   items you believed closed) are a finding. Fix the source first.
5. `virta onboard`.
6. Turn `TODO.md` / `UPSTREAM.md` into pointers to the board (keep history sections; stop
   adding items there).

**Owner:** step 2, once per machine. After that, `ready` is the owner's go-ahead: agents put
work in the backlog and the owner promotes it.

**Done when** `virta brief` prints this repo's board, the hooks fire in a new session, and the
board at `https://virta.tosijs.net/host/#?virta.scope=<project>` shows the imported tasks.

**Report:** "On the virta board: N tasks imported (M closed on arrival); TODO.md/UPSTREAM.md
now point at the board."

---

## 2. Publish through the shared workflow (OIDC + staged publishing)

Publishing moves from a maintainer running `npm publish` to a GitHub Actions workflow that can
only **stage** a version; the maintainer approves it with 2FA from anywhere, including a phone.
Full practice and the evidence behind every requirement:
[`publishing-via-oidc.md`](publishing-via-oidc.md).

**Adopted?** `.github/workflows/publish.yml` exists and is **identical** to
[`templates/publish.yml`](../templates/publish.yml) (`diff` them; the template is the source of
truth and fixes land there). Not applicable to repos that publish nothing to npm.

**Steps** — the "Adopting it in a repo" checklist in
[`publishing-via-oidc.md`](publishing-via-oidc.md), in short:

1. `package.json` `repository.url` names this repo's actual GitHub URL (provenance rejects
   anything else, including a name GitHub merely redirects).
2. `bun.lock` committed; CI installs with `bun install --frozen-lockfile`.
3. `.bun-version` with your local Bun version. **Required** if build output is committed:
   rebuild with that Bun and commit the result.
4. Nothing non-reproducible ships: no `*.tsbuildinfo` in the tarball, no absolute paths in
   sourcemaps (`npm pack --dry-run` shows what ships).
5. Test lanes that cannot run in CI (e.g. they need an LLM): list them in `package.json` →
   `releaseDoctor.attestedLanes`, and run [`tools/attest.ts`](../tools/attest.ts) at release
   time.
6. Copy `templates/publish.yml` to `.github/workflows/publish.yml` **unchanged**.
7. `gh workflow run publish.yml -f tag=main -f dry_run=true`, and fix what it reports until the
   only failure left is release-doctor refusing an unbumped version (that one is correct).

**Owner:** once per package, on npmjs.com → the package → Settings → **Trusted Publisher** →
GitHub Actions: user `tonioloewald`, the repository name (the GitHub repo, which may differ from
the package name), workflow `publish.yml`, environment blank, **"Allow npm publish" unchecked**.
Ask for it with those exact values.

**Done when** the dry run is clean (apart from the unbumped-version refusal) and the owner has
added the Trusted Publisher entry. The first real release then goes: tag → run the workflow →
owner approves on npmjs.com → the run verifies (or `verify_only` if the approval came after the
one-hour wait).

**Report:** "Publish workflow adopted: dry run clean at <commit>; changed <list>; Trusted
Publisher needed for <package> with repo <owner/repo>."

---

## Done (every repo has it)

_None yet._
