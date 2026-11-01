#!/usr/bin/env bun
// Files the weekly maintenance task on every enrolled board project (practices/cross-project.md
// "Weekly maintenance"). A project whose last one is still open gets a comment, not a sibling.
//
//   bun tools/weekly-maintenance.ts [--dry]
//
// Run weekly by a launchd agent on the owner's Mac; it only writes the board.

const TAG = 'area:maintenance'

interface Project { name: string; enrolled: string; retired: string }
interface Task { num: number; title: string }

const dry = process.argv.includes('--dry')

const virta = (args: string[]): string => {
  const r = Bun.spawnSync(['virta', ...args], { stdout: 'pipe', stderr: 'pipe' })
  if (r.exitCode !== 0) throw new Error(`virta ${args[0]} … failed: ${r.stderr.toString().trim()}`)
  return r.stdout.toString()
}

export function weekOf(d: Date): string {
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  // Local date: toISOString would give Sunday for an early-Monday run east of UTC.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

export function enrolledProjects(list: Project[]): string[] {
  return list.filter((p) => p.enrolled && !p.retired).map((p) => p.name).sort()
}

const body = `Routine work inside the standing go-ahead (policy #3219). Do it when you next see this, commit as you go, and close with one line per item.

The checklist lives in tosijs-coding-practices, practices/cross-project.md "Weekly maintenance":
1. Triage what arrived: re-run \`virta project onboard\` for new GitHub issues, then the inbox (#2860).
2. Take minors and patches in every dependency tree, run the full gate, commit. A major becomes a task with a recommendation.
3. Clear advisories (bun audit): minimal fix or a time-boxed exemption.
4. Adopt missing rollouts (practices/rollouts.md).
5. Read the last CI run's annotations for deprecations.
6. Close with one line per item. Owner decisions go out with a default; publishing stays the owner's.`

if (import.meta.main) {
  const week = weekOf(new Date())
  const projects = enrolledProjects(JSON.parse(virta(['--json', 'project', 'list'])))
  for (const p of projects) {
    const open: Task[] = JSON.parse(virta(['--json', 'list', `project:${p} ${TAG}`]))
    if (open.some((t) => t.title.includes(week))) {
      console.log(`${p}: already filed for ${week}`)
    } else if (open.length) {
      console.log(`${p}: #${open[0].num} still open — commenting`)
      if (!dry) virta(['comment', String(open[0].num), `Another week (${week}) and this is still open. Take it next, or close what is done and say what is left.`])
    } else {
      console.log(`${p}: filing for ${week}`)
      if (!dry) virta(['new', `Weekly maintenance: week of ${week}`, '--project', p, '--tags', `kind:chore,${TAG},status:ready`, '--quiet', '--body', body])
    }
  }
}
