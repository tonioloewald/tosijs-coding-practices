# Did the added process make things better? — velocity and quality, January to October

**Status: DATA.** Owner question, 2026-10-10. No process change rides with this file.
Sources: `git log` and tags of tosijs, tosijs-ui, tjs-lang, tosijs-3d, haltija and
tosijs-virta; each repo's `reviews/` folder; the task board's full export (2519 tasks,
including imported GitHub issues).

Process dates: nine-lens review 07-11 · tiered review and release-doctor 09-01 · task
board from 09-15 · publish workflow 09-26 · lighter patches and re-reviews 10-07.

## Short answer

- **Velocity did not fall.** Output per working day rose in four of five repos through
  every process change. It cannot be credited to the process: July is also when work
  moved to many agent sessions at once.
- **Process cost shows up as release waves, not as slower coding.** Three releases
  absorbed most of it. After mid-September the waves stopped in tosijs and tosijs-ui.
- **Quality inputs rose.** Test code went from about a tenth to about a third or more
  of source added in three repos, starting the month the review arrived.
- **Quality outcomes cannot be trended.** Every defect-report channel was created by
  the process itself, so there is no "before". Nothing measurable got worse.

## Velocity

Commits per active day (source: non-merge commits, days with at least one):

| | Jun | Jul | Aug | Sep | Oct (9 days) |
| --- | --- | --- | --- | --- | --- |
| tosijs-ui | 6.4 | 7.7 | 7.6 | 8.8 | 12.4 |
| tosijs-3d | 8.3 | 14.0 | 16.8 | 20.2 | 20.0 |
| tjs-lang | 6.7 | 6.5 | 13.0 | 10.6 | 19.7 |
| tosijs | 2.3 | 5.4 | 7.6 | 9.3 | 4.6 |
| haltija | 3.2 | 6.3 | 6.7 | 4.8 | 4.7 |

Tagged releases per month:

| | Jun | Jul | Aug | Sep | Oct (9 days) |
| --- | --- | --- | --- | --- | --- |
| tosijs-ui | 16 | 16 | 18 | 15 | 9 |
| tosijs-3d | 0 | 6 | 6 | 13 | 9 |
| tjs-lang | 5 | 7 | 7 | 7 | 0 |
| tosijs | 1 | 15 | 3 | 10 | 2 |
| haltija | 0 | 20 | 12 | 3 | 0 |

- tjs-lang has shipped no final release since 0.13.13 on 09-13 (see waves below).
- haltija's drop tracks attention moving elsewhere (commits fell too), not review load.

## Where the process cost time

Review reports filed per release, in date order:

- **tosijs:** 1.8.3 ×4, 1.9.0 ×3, 1.10.0 ×3, 1.10.1 ×5, **1.11.0 ×11**, then 1.10.3 to
  1.10.7 at ×1 each (from 09-19).
- **tosijs-ui:** minors ×4 (1.13.0, 1.15.0, 1.16.0); every patch since 09-29 at ×1 or ×2.
- **tjs-lang:** 0.13.x at ×1 to ×6; **0.14.0 ×31, then 0.14.0-rc.2 ×53** (09-21 to
  10-05); rc.4 and rc.5 at ×1 each (after 10-07).
- **tosijs-virta:** 0.1.0 ×2, **0.5.0 ×12**.
- **tosijs-3d:** ×1 to ×4 where a report exists; 0.8.4 to 0.8.14 have none on file.

Share of commits whose subject is about review or remediation:

| | Jul | Aug | Sep | Oct |
| --- | --- | --- | --- | --- |
| tosijs | 8% | 8% | 31% | 8% |
| tosijs-ui | 19% | 11% | 22% | 29% |
| tjs-lang | 9% | 7% | 32% | 40% |
| haltija | 8% | 9% | 31% | 14% |
| tosijs-3d | 4% | 3% | 5% | 5% |

- In September about a third of all commits in three repos were review work.
- The tjs-lang wave is the largest single cost on record: 84 reports and four weeks
  without a release. Its blockers were real defects in a sandbox boundary (a Proxy lying
  about length, an Array subclass crossing unchecked), found before any release carried
  them.
- **Owner's reading of the tjs-lang wave (2026-10-10):** not a process cost. The project
  is closing on 1.0 and the remaining work is hard; the review is where that work shows
  up, and the slowness is accepted. Read the 84 reports as hardening, not as overhead.
- Rounds per release fell to one or two in tosijs and tosijs-ui after mid-September while
  release cadence held. This is the clearest measured improvement.

## Quality

**Inputs.** Test lines as a share of source lines added:

| | Jun | Jul | Aug | Sep | Oct |
| --- | --- | --- | --- | --- | --- |
| tosijs-ui | 11% | 27% | 40% | 44% | 47% |
| tosijs-3d | 11% | 19% | 30% | 27% | 20% |
| haltija | 1% | 28% | 34% | 36% | 46% |
| tosijs | 15% | 45% | 45% | 50% | 48% |
| tjs-lang | 47% | 42% | 39% | 84% | 46% |

**Outcomes.**
- **Fix share of commits is flat** at 30 to 40% in tosijs-ui, tosijs-3d and haltija from
  June to October. Reverts are zero or one a month throughout.
- **Defect reports have no baseline.** The five repos had two issues filed between 2023
  and July 2026; cross-project filing began with the practices repo (07-12), and the
  September counts are inflated by importing each repo's TODO file to the board.
- **Bugs found by a consumer project** (board, by month Jul/Aug/Sep/Oct): tosijs-ui
  5/2/1/2 · tjs-lang 4/0/0/3 · tosijs-3d –/0/9/14 · tosijs 0/0/0/0.
- **Suggestive, not proven:** tosijs-3d has the lowest review share, eleven patches with
  no review on file, and the most consumer-found bugs. It also has the most churn and the
  most active consumers, either of which could explain the count.

## What this cannot show

- The owner's time per release. Nothing records it.
- Token cost of review.
- Whether a release was better for its consumers. That needs defects tied to the version
  that shipped them.

## Two measures that would answer the question next time

1. **Escaped defects per release:** a bug task filed by a consumer names the version it
   was found in. Count per release.
2. **Rounds and days per release:** reports filed per version, and days from version
   bump to tag. Both are already derivable from each repo's history.

Method notes: source lines exclude generated folders, JSON, markdown and lockfiles;
"about review" is a subject-line match on review, remediation, gate, blocker or lens,
spot-checked on tjs-lang and tosijs; verdict counts per report were not used because a
first-match search on report text is unreliable.
