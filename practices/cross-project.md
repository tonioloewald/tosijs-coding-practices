# Cross-project communication

These projects depend on each other (tosijs → tosijs-ui → apps; tjs-lang, tosijs-schema
underneath). Work in one constantly surfaces problems in another. This doc is how projects
talk to each other **without agents trampling each other's repos**.

## The boundary rule — stay in your repo

**An agent working in project A does not go make changes in project B.** Not a "quick fix,"
not a "while I'm here," not a one-liner. By default, you touch **only the repo you were asked
to work in**.

Why this is strict:

- The other repo has **its own tests, conventions, release state, and branch** you haven't
  read. A drive-by edit bypasses that repo's review and release gate entirely.
- It **strands work**: you leave uncommitted (or worse, committed) changes in a repo nobody
  is watching, and the next agent there finds a dirty tree it didn't make.
- It **surprises the owner** — the change lands with no issue, no rationale, and no record of
  who asked for it.
- The fix you'd make from outside is usually the *wrong* fix. From inside project A, an
  upstream gap looks like "add this one thing for me." The upstream maintainer sees five
  consumers wanting five variants and knows the right seam.

**The exception:** a specific, good reason **plus explicit human signoff.** Ask first, say
exactly what you'd change and why, and get a yes. Then do it *properly in that repo* — its
branch, its conventions, its tests, its own commit — not as a footnote to your current task.
Signoff for one change is not standing permission for the next.

**THIS repo (`tosijs-coding-practices`) is a standing exception — you do not need signoff to
write a practice back into it.** Contributing what you learned, from whichever project taught it
to you, is the entire point of the repo; "file an issue instead" would only add latency to
knowledge that is already in hand. Note that *every reason the rule is strict is a property of
code repos*, and none of them hold here: there are no tests, no build, no release gate, and no
API seam to get wrong — it is prose under git, so a bad edit shows up plainly in the diff and is
cheap to revert. Its history is the safety net.

What still applies, though: follow [`CONTRIBUTING.md`](../CONTRIBUTING.md) — find the right doc,
**sharpen an existing entry rather than stacking a parallel one** (contradictions are bugs), and
cite the projects it was learned in. And **commit it here**; don't strand a dirty tree for the
next agent. The point of the carve-out is to remove friction from *recording* a lesson, not to
license drive-by edits.

**What you do instead: file an issue.** That is the channel.

## The channel: GitHub Issues on the target repo

Every repo in the ecosystem has issues enabled and `gh` works against all of them. **An issue
on the target repo is the canonical way one project tells another something.** It is visible
to that repo's maintainer and to any agent working there; it has an ID, a state, and a home.

```bash
gh issue create -R tonioloewald/<target-repo> \
  --title "<concise problem statement>" \
  --body "$(cat <<'EOF'
**From:** <your-repo> @ <version or commit>

**Context**
What we were doing when we hit this.

**Problem**
The bug, or the missing seam/affordance.

**Workaround (what we're doing today)**
The compensating complexity we had to write because of it. This is the cost — be concrete.

**Suggestion**
The upstream change we think is right. Say if you'd be happy to be talked out of it.

**Impact**
Who else likely hits this (other consumers, or "just us").
EOF
)"
```

- **Always put `From: <your-repo>` in the body.** Labels are nice but optional (`gh` errors on
  a label that doesn't exist); the body always works.
- **Don't leak private context into a public issue.** `lukko` and `kith-email` are private;
  most others are public. Describe the shape of the problem, not private code.
- One issue per problem. A grab-bag issue gets triaged into nothing.

## File even when you might be wrong

Agents self-censor here: they hit what looks like an upstream problem, can't *prove* it from
outside the repo, and file nothing. **Don't.** If you genuinely think you've found a problem,
file it — uncertainty is a thing to state in the issue, not a reason to withhold it.

- **The economics are asymmetric.** A wrong issue costs the target's maintainer minutes to
  read and close. An unfiled real problem costs every consumer, indefinitely, and the
  upstream repo never learns it exists. You need to be wrong *very* often before filing
  stops paying.
- **A good-faith wrong issue is still signal** — the same principle as
  [`review.md`](review.md)'s refuted-findings rule: when a competent agent that read the
  docs believes "X is broken" and X is fine, at minimum a **communication failure has
  occurred** — the truth was undiscoverable from where they stood. The issue is precisely
  how the target repo learns *that*. "Closed: not a bug, but the docs implied it — docs
  fixed" is a *successful* outcome, not a wasted one.
- **State your confidence honestly.** "I believe X, but I'm reading from outside this repo
  and may be missing context — happy to be refuted" is a fine issue body. The template's
  *Suggestion* field already invites this ("say if you'd be happy to be talked out of it").
- The bar in [`review.md`](review.md) — "verify before filing" — is about the *review
  harness*, where adversarial verification is cheap and structured. It is **not** a
  certainty bar for cross-project filing. From outside the repo, your repro *is* the
  Context/Workaround you write in the issue; the target repo is where verification can
  actually happen, and filing is how the question gets there.

— raised by the repo owner after watching agents hesitate to file cross-project issues
they weren't certain of

## The three artifacts — don't confuse them

| Artifact | Lives in | Purpose |
| --- | --- | --- |
| **`TODO.md`** | your own repo | **Your** work. Issue tracking for yourself. Unchanged by this doc. |
| **GitHub issue** | the **target** repo | **The channel.** How you tell another project something. |
| **`UPSTREAM.md`** | your own repo | A **local mirror** of what you've raised upstream, so the context stays where you're working. Records `✅ RESOLVED` with the fixing version. |

**`UPSTREAM.md` is not a channel.** It's a note to yourself — the upstream repo never sees it.
An `UPSTREAM.md` entry **without a filed issue is a complaint nobody will ever read**. So:

1. File the issue on the target repo.
2. Mirror it in your `UPSTREAM.md` with the **issue URL**, plus your local Context/Suggestion.
3. When it lands, mark `✅ RESOLVED (fixed in <pkg>@<version>)` locally and **close the issue**.

## Checking issues — the other half

Filing is useless if nobody reads. Checking incoming issues is part of the routine:

- **At the start of substantive work in a repo**, look at what's open against it:
  ```bash
  gh issue list -R tonioloewald/<this-repo> --state open
  ```
  Those are your consumers telling you where the seams are missing.
- **Before a release** (see [`releasing.md`](releasing.md) and the ecosystem lens in
  [`review.md`](review.md)): check open incoming issues. Is this release silently ignoring a
  standing ask, or does it fix one? A release is the natural moment to pay that debt.
- **When you fix one, close it** and name the version. A downstream agent is waiting on that
  signal to drop its workaround.
- **When you're blocked on an upstream fix**, say so in the issue and keep the workaround
  logged in `UPSTREAM.md` — don't silently absorb the cost forever.

## Rule of thumb

> If the fix belongs in another repo: **file, don't fix.** If it truly can't wait, **ask,
> don't assume.**

— seen in: tosijs-product (`UPSTREAM.md` convention), and the whole ecosystem's `TODO.md`
issue-tracking norm
