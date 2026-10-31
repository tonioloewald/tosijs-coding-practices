# Standing rollouts — check your repo against these

Ecosystem-wide changes every repo should adopt. **An agent working in a repo checks it against
this list and adopts what is missing, without being asked**, so the owner decides a rollout
once instead of prompting every repo.

This file only **points**. Each rollout's instructions live with the thing being adopted, and
are not restated here, where they would drift. **If those instructions are unclear or wrong,
flag it to their owner** (as a task or issue on that project); don't work around it or explain
it here.

- Adopt a missing rollout as its own piece of work, in its own commits.
- Ask the owner only for steps that need them, once, with the exact values.
- A rollout that cannot apply to your repo: say so once in your repo's CLAUDE.md
  (`Not applicable: <rollout> — <why>`), so the next agent doesn't re-ask.

| Rollout | Instructions | Adopted? |
| --- | --- | --- |
| The virta task board | <https://virta.tosijs.net/start/> — **the owner runs or approves the two setup commands** (`project init` writes agent hooks, so an agent's own safety checks rightly refuse it); the repo's agent does the rest | `virta brief` prints this repo's board |
| Prettier never touches markdown | [`code-quality.md`](code-quality.md): the `requirePragma` override for `*.md`/`*.markdown`/`*.mdx` in the Prettier config (optionally `tosijs-format` as the `format` script, for repos that already depend on tosijs-ui) | the override is in the Prettier config, and `prettier --check .` does not list any `.md` file |
| Actions run on Node 24 | GitHub removed the Node 20 action runtime. Pin every action to a release whose `action.yml` says `using: node24` (`checkout`, `setup-node` v5+; `upload-artifact` v6+; `download-artifact` v7+), by SHA. Set `package-manager-cache: false` on `setup-node` v5+ in any job that publishes or holds a credential: from v5 it restores a cache by default. Copy the pins from [`templates/publish.yml`](../templates/publish.yml), which carries the current ones | no workflow under `.github/workflows/` names a Node 20 release of those actions (`grep -rn "checkout@v4\|setup-node@v4\|artifact@v4\|# v4\." .github/workflows` prints nothing) |
| Publishing through the shared workflow | [`publishing-via-oidc.md`](publishing-via-oidc.md) "Adopting it in a repo" | `.github/workflows/publish.yml` is identical to [`templates/publish.yml`](../templates/publish.yml) (repos that publish to npm) |

Retire a row once every repo has it.
