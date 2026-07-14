export const meta = {
  name: 'pre-release-review',
  description:
    'Nine-lens adversarial pre-release review: correctness, efficiency, DRYness, docs, test coverage, developer experience, ecosystem/abstraction health, practices self-review, and blast radius',
  phases: [
    { title: 'Review', detail: 'nine independent lens reviewers over the diff' },
    { title: 'Verify', detail: 'adversarially verify each finding' },
    { title: 'Triage', detail: 'dedupe, rank, GO / BLOCK recommendation' },
  ],
}

// ---- inputs -----------------------------------------------------------------
// args: { baseRef?: string, bump?: 'patch'|'minor'|'major', scope?: string }
const base = (args && args.baseRef) || 'main'
const bump = (args && args.bump) || 'minor'
const diffCmd = (args && args.scope) || `git diff ${base}...HEAD`

// ---- the nine lenses (criteria mirror practices/review.md) ------------------
// 1-6 look AT THE CHANGE, and 9 at what the change touches BEYOND THE REPO
// (global binaries, $HOME, other processes, ports — state with no test suite and
// no rollback). 7-8 look outward (the tools we depend on) and inward (our own
// practices) — the compounding ones.
const LENSES = [
  {
    key: 'correctness',
    title: 'Correctness',
    checks: `Behavior is right. Stack-specific: observant correctness (new state paths actually observed/bound — no manual re-render sneaking in; \`await updates()\` around post-mutation assertions; id-path surgical updates intact); boxed vs raw (no proxy-on-proxy nesting; \`===\` on a BoxedScalar and \`toDOM\` getting raw values are silent traps); component lifecycle (\`content()\` once vs \`render()\` structural-only; \`value\` never an initAttribute; boolean attrs default false; light-vs-shadow DOM — path bindings break inside shadow DOM; no \`on<Event>\` callback props); edge cases, async settling, form-association, error/failure paths.`,
  },
  {
    key: 'efficiency',
    title: 'Efficiency',
    checks: `Performance. Surgical updates not rebuilds; id-paths for in-place list mutation; bulk-mutate-raw-then-touch()-once for large updates. Bundle size: any new runtime dep in a core library is a red flag; peers must be external; never sideEffects:false on an element-registering lib. Hot paths: no revalidation in internals (validate at the edge, not per hop); high-frequency handlers throttled/debounced; heavy deps lazy-loaded; big work off the main thread.`,
  },
  {
    key: 'dryness',
    title: 'DRYness (reuse & simplification)',
    checks: `Duplicated non-trivial logic that should be one shared helper; reuse what the stack already provides (dom.ts, throttle/debounce, existing bindings, StyleSheet()/vars — never raw CSS strings) rather than reimplementing; copy-paste that has drifted. Over-abstraction / premature generalization is ALSO a smell — flag both.`,
  },
  {
    key: 'docs',
    title: 'Documentation accuracy & up-to-dateness',
    checks: `Regenerate generated docs and diff-check: run the build/doc generator then \`git diff --exit-code\` over docs/, llms.txt, version.ts, examples.md, API.md — a dirty tree means shipped docs are stale. Inline /*# */ doc-comments must match the changed public API; live-example fences valid (only html/css/js/test execute). CHANGELOG has an entry for this version. README / CLAUDE.md / AGENTS.md reflect the change. Deprecations warn once and name their replacement.`,
  },
  {
    key: 'coverage',
    title: 'Test coverage',
    checks: `RUN the suite first (\`bun test\`, and the doc/browser tiers if they exist) and read the output — reviewing coverage without running it is guessing. **Every failing or skipped test is IN SCOPE. Never dismiss a failure as "pre-existing", "flaky", or "not caused by this change".** A change easily slips out of context and causes a downstream failure that then gets waved away as someone else's; treat every red test as a finding (with the failing test name + suspected cause). Then: new behavior has tests; every bug fix ships a failing-first regression test. Right tier: pure logic extracted and unit-tested; DOM via Happy DOM with \`await updates()\`; integration/E2E actually starts its target; type-level tests in *.types.ts under tsc. Security-critical code (VM/runtime, capability registry, RBAC) held to its high coverage bar. No skip-guarded tests passing vacuously (green != ran); no Bun-only imports leaked into Playwright tests.`,
  },
  {
    key: 'dx',
    title: 'Developer experience',
    checks: `The DX we PROVIDE. API ergonomics: emitted types accurate (no required->optional .d.ts drift), good inference, no re-introduced footgun (on<Event>, value-as-attribute, boolean-defaulting-true). Error messages actionable; assignment-strictness / monadic errors used where apt. Conventions: handle<Event> callbacks; deprecations keep old names working + warn once. The "point an agent at it and it works" test: CLAUDE.md/AGENTS.md current, gotchas documented, and \`bun install\` -> \`bun start\`/\`bun test\`/\`bun run build\` succeed from a fresh clone (TLS certs, single lockfile).
**BREAKING CHANGES — check all four.** If this release removes or changes public API: (1) is the break JUSTIFIED (does it buy something a deprecation couldn't? an incidental break, made because the old API was in the way of a refactor, is the kind consumers resent); (2) does the VERSION reflect it; (3) is there a CHANGELOG ENTRY NAMING EXACTLY WHAT BROKE — a release that removes public API with no changelog entry is a trap, and an easy one to ship because the code still compiles; (4) are there MIGRATION NOTES (ecosystem convention: a \`Migration.md\` shipped in \`docPaths\`) telling a consumer precisely what to change, before -> after. Prefer the deprecation path; if you break, say why.`,
  },
  {
    key: 'ecosystem',
    title: 'Ecosystem & abstraction health (BOTH directions)',
    checks: `This lens runs in TWO DIRECTIONS AND BOTH HALVES ARE MANDATORY. Reviewers reliably do 7a and skip 7b — DO NOT. Run both and report both, as separate sections of your findings.

=== 7a. OUTGOING — are we paying for someone else's missing seam? ===
Look UP and OUT, not down. Lens 6 asks "is the DX we PROVIDE good?" — you ask "is the DX we CONSUME good, and is this code quietly paying for it being bad?" Hunt for:
- **Work happening in the wrong layer:** boilerplate or workarounds that exist here only because an upstream tool (tosijs, tosijs-ui, tjs-lang, tosijs-schema, the site builder, haltija) lacks a seam. If several consumers each hand-roll the same thing, that is ONE missing library affordance, not N local problems.
- **Nascent anti-patterns:** a clever workaround one copy-paste away from becoming convention; a pattern spreading because the right way is too hard; code fighting the observant model (reaching for a re-render because a binding was awkward to express).
- **Compensating complexity:** defensive unwrapping, sanitizing inputs the upstream should have handled, indirection routing around a limitation, a version pin that dodges a bug instead of fixing it.
- **Normalized friction:** loop steps we've stopped noticing (manual regeneration, port collisions, cert setup, two lockfiles, a script renamed to dodge a builtin). Familiarity is not the same as fine.
For each outgoing finding, name the UPSTREAM tool and the missing seam/affordance, and propose the upstream fix. The recommendation must be to **FILE A GITHUB ISSUE on the upstream repo** (the channel) and mirror it in this repo's UPSTREAM.md with the issue URL — NEVER to go edit the upstream repo directly (agents stay in their own repo; that requires human signoff). Do not accept a silent workaround.

=== 7b. INCOMING — what have our consumers filed against US? ===
ENUMERATE, DO NOT GLANCE. This is not a footnote; it is half the lens. Resolve the repo from \`git remote get-url origin\`, then run:
  gh issue list -R tonioloewald/<this-repo> --state open
- GIVE EVERY OPEN ISSUE A DISPOSITION. For each, state which: FIXED BY THIS RELEASE (-> close it naming the version, AND put it in the release notes), STILL OPEN (-> say so), or STALE (-> close it). An issue this release silently closes can REFRAME WHAT THE RELEASE IS — e.g. a library migration that also happens to unblock a downstream port is not just a library migration, and the notes must say so.
- CROSS-CHECK EVERY WORKAROUND FROM 7a AGAINST THE ISSUE LIST. Is there already an issue for it? A TEST LOOSENED, OR COMPLEXITY ADDED, TO ROUTE AROUND A BUG WE FILED AGAINST OURSELVES is the signature failure of this half — 7a flags the SHAPE of it and will not connect it to the open issue unless you deliberately do.
Report 7b findings even when they are not defects in the diff (e.g. "issue #N has been fixed since 1.6.11 and is still open — close it").`,
  },
  {
    key: 'practices',
    title: 'Practices & process self-review',
    checks: `The review reviews itself. Read the shared practices — the repo at https://github.com/tonioloewald/tosijs-coding-practices (or the sibling checkout ../tosijs-coding-practices, or this project's CLAUDE.md/AGENTS.md pointer) — and ask:
- Did this release **contradict, outdate, or vindicate** a documented practice? A practice that didn't match reality is a BUG IN THE KNOWLEDGE BASE — say so and propose the correction (with attribution), don't route around it.
- What did we learn here that **would have saved time if it had been written down**? Propose the entry and which doc it belongs in.
- Did the **process** hold — did a lens miss something that bit us, is a lens dead weight, did the gate work?
- Are this project's own CLAUDE.md / AGENTS.md still accurate after the change?
Findings here are proposed CHANGES TO THE PRACTICES (or to this repo's agent docs), not to the shipping code. Severity is usually minor/major, rarely a blocker. Returning zero findings is suspicious — it usually means nobody looked.`,
  },
  {
    key: 'blast-radius',
    title: 'Blast radius (state outside the repo)',
    checks: `Lenses 1-6 review the code. You review the FOOTPRINT — everything this change writes, spawns, binds, or kills that OUTLIVES THE PROCESS and is shared with software we do not own. That state has no test suite, no code review and no rollback. It is where a tool stops being wrong in its own repo and starts being wrong ON THE USER'S MACHINE.

FAST EXIT: if the diff writes nothing outside the repo, spawns nothing, binds nothing and kills nothing, say so in one line and return NO findings. Do not manufacture findings — on a pure library change this lens is correctly quiet.

Otherwise ENUMERATE the footprint (grep the diff for: homedir(), os.homedir, '~/', /usr/local, .local/bin, XDG_, process.kill, spawn, execSync, lsof, Bun.serve, listen, writeFileSync to paths outside the repo) and interrogate each:

- **Global binaries & PATH** (~/.local/bin, /usr/local/bin, shell rc files): ONE binary, EVERY project. If N versions of the tool can each install it, ask WHICH ONE WINS — "last process to boot" is a race, not a policy. Never clobber a symlink (it is a deliberate install; overwriting reverts someone's tooling under them).
- **Home-dir / XDG state** (~/.config, ~/.cache, dotdirs, registries, lockfiles): does it survive uninstall? Can a stale entry outlive its writer, and what reads it afterwards?
- **Other processes** — anything spawned, signalled or killed. KILLING IS A POLICY, NOT A FIX: state the predicate, and state how you IDENTIFY the victim.
  * The predicate: "older than me" is almost always WRONG — it never terminates, and two peers on adjacent versions kill each other forever. Key it on what makes the other process HARMFUL (e.g. below the version that fixed the harm) so it self-terminates.
  * The identification: BE ADVERSARIAL ABOUT HOW THE PID IS RESOLVED. Port-to-pid lookups are a classic trap — \`lsof -i :PORT\` matches sockets whose LOCAL **OR REMOTE** port is PORT, so it returns CONNECTED CLIENTS as well as the listener, and a long-lived client (a browser) usually sorts FIRST by pid. Killing pids[0] then SIGTERMs the user's browser while the actual target survives and the log cheerfully reports success. Require \`-sTCP:LISTEN\`, and sanity-check the process identity (\`ps -p PID -o comm=\`) before signalling. NEVER signal a pid you have not positively identified.
  * When it cannot act, it must COMPLAIN, not fail silently — an unfixed hazard the user does not know about is worse than a loud one.
- **Ports/sockets**: a well-known default port is shared state; squatting or reclaiming it affects whoever else wanted it.
- **THE TEST SUITE'S OWN FOOTPRINT — the sharpest edge on this lens.** Ask explicitly: DOES RUNNING THE TESTS DO ANY OF THE ABOVE? A SPAWNED process re-reads the real config path and the real \$HOME — an in-process \`dir\` option or DI seam does NOT contain it. Destructive startup behavior (killing, installing to ~/.local/bin) runs in EVERY test-spawned server unless a test explicitly disables it: grep for the opt-out env var and confirm the test spawns actually set it. This corrupts the developer's own environment, so it presents as "my tools got weird", never as a red test. CHECK THIS EVEN IF THE DIFF DOES NOT TOUCH TESTS.

Ask of each: WHO ELSE CAN THIS SURPRISE, AND CAN THEY UNDO IT? Prefer additive and reversible; where you cannot, be loud, and document the behavior and its opt-out somewhere the USER can see (README / --help / CHANGELOG — note that CLAUDE.md is usually NOT shipped to users).

Findings that touch the user's machine — a global binary, a kill policy, a test that writes to \$HOME — are BLOCKERS, not nits. A change that is correct in-repo and hostile on the machine has not passed review.`,
  },
]

const SEVERITY = ['blocker', 'major', 'minor', 'nit']

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'findings'],
  properties: {
    lens: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'file', 'failureScenario', 'recommendation'],
        properties: {
          severity: { type: 'string', enum: SEVERITY },
          title: { type: 'string', description: 'one-sentence statement of the issue' },
          file: { type: 'string', description: 'repo-relative path, or "(cross-cutting)"' },
          line: { type: ['integer', 'null'] },
          failureScenario: {
            type: 'string',
            description: 'concrete inputs/state -> wrong outcome; for non-correctness lenses, the concrete cost/risk',
          },
          recommendation: { type: 'string', description: 'what to do about it' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'reasoning'],
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'plausible', 'refuted'] },
    reasoning: { type: 'string' },
    adjustedSeverity: {
      type: ['string', 'null'],
      enum: ['blocker', 'major', 'minor', 'nit', null],
      description: 'set only if the original severity was wrong',
    },
  },
}

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendation', 'summary', 'reportMarkdown'],
  properties: {
    recommendation: { type: 'string', enum: ['GO', 'GO_WITH_FOLLOWUPS', 'BLOCK'] },
    summary: { type: 'string' },
    blockerCount: { type: 'integer' },
    reportMarkdown: { type: 'string', description: 'full formatted review report, ready to save/paste' },
  },
}

const GAPS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['gaps'],
  properties: {
    gaps: {
      type: 'array',
      items: { type: 'string', description: 'a subsystem, claim, or lens that was NOT adequately reviewed' },
    },
  },
}

const READONLY = `You are REVIEWING, read-only. Do NOT edit, write, or create any file, and do NOT run any mutating command (no git add/commit/push/checkout/stash, no formatter). Running the test suite (\`bun test\`) or a read-only build to OBSERVE results is fine — just don't commit or hand-edit anything.`

const reviewPrompt = (lens) =>
  `${READONLY}

You are the **${lens.title}** reviewer in a pre-release review of THIS repository.

Scope: run \`${diffCmd}\` and \`git diff --stat ${base}...HEAD\` to see everything that changed since the last release (base = \`${base}\`). Read the changed files, and the tests/docs/config around them, as needed for real judgment.${
    bump === 'major' ? ' This is a MAJOR release — also review the whole affected subsystems, not only the diff.' : ''
  }

Review ONLY through the ${lens.title} lens:
${lens.checks}

Report concrete, ranked findings. Each finding needs a real failure scenario (or, for non-correctness lenses, the concrete cost/risk) and an actionable recommendation. Prefer a few high-signal findings over an exhaustive dump; if the diff is clean on this lens, return an empty findings array. Severity: blocker (must fix before release) / major / minor / nit.`

const verifyPrompt = (f, lens) =>
  `${READONLY}

Adversarially verify ONE finding from the ${lens.title} pre-release reviewer. Default to skepticism: try to REFUTE it by inspecting the actual code (run \`${diffCmd}\`, read the file, check callers/tests).

Finding: "${f.title}"
File: ${f.file}${f.line ? ':' + f.line : ''}
Claimed failure/cost: ${f.failureScenario}
Claimed severity: ${f.severity}

Return: confirmed (real, reproducible as described), plausible (likely real but you couldn't fully confirm), or refuted (not a real issue, or already handled). Set adjustedSeverity only if the claimed severity is clearly wrong.`

// ---- phase 1+2: review each lens, verify its findings as they land ----------
phase('Review')
const reviewed = await pipeline(
  LENSES,
  (lens) =>
    agent(reviewPrompt(lens), {
      label: `review:${lens.key}`,
      phase: 'Review',
      schema: FINDINGS_SCHEMA,
      agentType: 'general-purpose',
    }),
  (result, lens) =>
    parallel(
      (result && result.findings ? result.findings : []).map((f) => () =>
        agent(verifyPrompt(f, lens), {
          label: `verify:${lens.key}`,
          phase: 'Verify',
          schema: VERDICT_SCHEMA,
          agentType: 'general-purpose',
        }).then((v) => ({ ...f, lens: lens.key, verdict: v }))
      )
    )
)

const survived = reviewed
  .flat()
  .filter(Boolean)
  .filter((f) => f.verdict && f.verdict.verdict !== 'refuted')
  .map((f) => ({ ...f, severity: (f.verdict && f.verdict.adjustedSeverity) || f.severity }))

const blockerCount = survived.filter((f) => f.severity === 'blocker').length
log(`${survived.length} findings survived verification (${blockerCount} blockers)`)

// ---- phase 3: completeness critic (major only) + triage/report ---------------
phase('Triage')
let gaps = null
if (bump === 'major') {
  gaps = await agent(
    `${READONLY}\n\nYou are the completeness critic for a MAJOR release review. The nine lenses (correctness, efficiency, DRYness, docs, test coverage, DX, ecosystem/abstraction health, practices self-review, blast radius) have run over \`${diffCmd}\`. Inspect the diff and repo and name what was NOT adequately reviewed — an untouched-but-affected subsystem, an unverified claim, a public-API surface or migration path nobody checked. Be specific and short.`,
    { label: 'completeness-critic', phase: 'Triage', schema: GAPS_SCHEMA, agentType: 'general-purpose' }
  )
}

const report = await agent(
  `${READONLY}

You are the release manager triaging a pre-release review of THIS repo (base \`${base}\`, ${bump} bump).

Verified findings (JSON):
${JSON.stringify(survived, null, 2)}
${gaps ? `\nCompleteness gaps (major release):\n${JSON.stringify(gaps.gaps, null, 2)}` : ''}

Produce a triaged report:
- Dedupe near-identical findings across lenses; keep the sharpest wording.
- Group by severity; within a group, correctness/security first.
- Recommendation: BLOCK if any confirmed blocker (or unresolved correctness/security) remains; GO_WITH_FOLLOWUPS if only non-blocking findings remain (list them as TODO items to file); GO if clean.
- Never silently drop a finding — deferred ones must appear as explicit follow-ups.
- **A failing test is never dismissed as "pre-existing" or "not caused by this change."** Any red/skipped test in the coverage findings must appear in the report — fixed if easy, otherwise flagged as a follow-up that is still scheduled, never waved away.
- **ROUTE BY LENS — findings do not all belong in the same place.** Put each follow-up under the right destination heading:
  - lenses correctness/efficiency/dryness/docs/coverage/dx -> fix now, or file to this repo's \`TODO.md\`.
  - lens **ecosystem** -> a **GitHub issue filed on the UPSTREAM repo** (name the tool and the missing seam), mirrored in this repo's \`UPSTREAM.md\` with the issue URL. NEVER a direct edit to another repo — agents stay in their own repo unless the human signs off. Also list any incoming open issues this release should have addressed or should now close.
  - lens **practices** -> a change to the shared \`tosijs-coding-practices\` repo (name the doc), and/or this repo's CLAUDE.md/AGENTS.md.
- **ecosystem and practices findings rarely BLOCK** — they compound. Do not let them drag the verdict to BLOCK unless something is actively broken; but never drop them either.

reportMarkdown must be a complete, ready-to-read report: a one-line verdict, a per-lens summary, the blockers, then follow-ups as checkbox TODO lines **grouped by destination** (\`TODO.md\` / \`UPSTREAM.md\` + upstream repo / shared practices), then any completeness gaps.`,
  { label: 'triage', phase: 'Triage', schema: REPORT_SCHEMA, agentType: 'general-purpose' }
)

return {
  base,
  bump,
  findingCount: survived.length,
  blockerCount,
  recommendation: report.recommendation,
  summary: report.summary,
  reportMarkdown: report.reportMarkdown,
}
