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
