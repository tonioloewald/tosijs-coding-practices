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
| The virta task board | <https://virta.tosijs.net/start/> | `virta brief` prints this repo's board |
| Publishing through the shared workflow | [`publishing-via-oidc.md`](publishing-via-oidc.md) "Adopting it in a repo" | `.github/workflows/publish.yml` is identical to [`templates/publish.yml`](../templates/publish.yml) (repos that publish to npm) |

Retire a row once every repo has it.
