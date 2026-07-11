export const meta = {
  name: 'pre-release-review',
  description:
    'Six-lens adversarial pre-release review of the diff since the last release: correctness, efficiency, DRYness, docs, test coverage, developer experience',
  phases: [
    { title: 'Review', detail: 'six independent lens reviewers over the diff' },
    { title: 'Verify', detail: 'adversarially verify each finding' },
    { title: 'Triage', detail: 'dedupe, rank, GO / BLOCK recommendation' },
  ],
}

// ---- inputs -----------------------------------------------------------------
// args: { baseRef?: string, bump?: 'patch'|'minor'|'major', scope?: string }
const base = (args && args.baseRef) || 'main'
const bump = (args && args.bump) || 'minor'
const diffCmd = (args && args.scope) || `git diff ${base}...HEAD`

// ---- the six lenses (criteria mirror practices/review.md) -------------------
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
    checks: `API ergonomics: emitted types accurate (no required->optional .d.ts drift), good inference, no re-introduced footgun (on<Event>, value-as-attribute, boolean-defaulting-true). Error messages actionable; assignment-strictness / monadic errors used where apt. Conventions: handle<Event> callbacks; deprecations keep old names working + warn once. The "point an agent at it and it works" test: CLAUDE.md/AGENTS.md current, gotchas documented, and \`bun install\` -> \`bun start\`/\`bun test\`/\`bun run build\` succeed from a fresh clone (TLS certs, single lockfile).`,
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
    `${READONLY}\n\nYou are the completeness critic for a MAJOR release review. The six lenses (correctness, efficiency, DRYness, docs, test coverage, DX) have run over \`${diffCmd}\`. Inspect the diff and repo and name what was NOT adequately reviewed — an untouched-but-affected subsystem, an unverified claim, a public-API surface or migration path nobody checked. Be specific and short.`,
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

reportMarkdown must be a complete, ready-to-read report: a one-line verdict, a per-lens summary, the blockers, then the follow-ups (as checkbox TODO lines), then any completeness gaps.`,
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
