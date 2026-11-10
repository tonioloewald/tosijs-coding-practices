# Licensing — the defaults, with no gotchas

The owner's defaults for everything published, so the question doesn't recur and nobody
adopting our work has to wonder what the catch is. A project's own `CLAUDE.md` may diverge
only where the owner has said so.

## The defaults

| What | Licence | SPDX |
| --- | --- | --- |
| **Code:** source, build scripts, tools, templates, shipped JS | Apache License 2.0 | `Apache-2.0` |
| **Content:** docs and other prose, icons, images, 3D models, textures, sounds, sample data, and the code samples in docs and demos | CC0 1.0 Universal (public-domain dedication) | `CC0-1.0` |
| **What people make with our tools:** exports, generated files, saves | Theirs. We claim nothing in it | — |

- **Apache for code because of patents.** Every contributor grants a patent licence, and anyone
  who sues claiming the code infringes their patent loses it. The owner opposes software
  patents; MIT and BSD say nothing about them.
- **CC0 for content because it asks nothing.** No attribution, no notice to carry, no
  share-alike: an icon or a paragraph goes into anything, commercial or not.
- **Code samples in docs are content.** Pasting a snippet from a docs page carries no Apache
  notice obligation. The published docs site counts as content even where its pages are
  generated from comments in code.
- **Contributions come in on the same terms:** code under Apache-2.0 (its §5 says so), content
  under CC0. Say so in `CONTRIBUTING.md` where a repo has one.

## What the defaults don't cover

- **Third-party material keeps its own licence.** A CC0 repo can still carry a CC BY asset or
  an MIT dependency; review lens 10 ([`review.md`](review.md) "Rights") keeps each one
  recorded, allowed and on the acknowledgements page.
- **Names and logos.** CC0 (§4a) and Apache (§6) both leave trademarks alone: the files are
  free, passing something off as ours isn't. Say it plainly where a logo ships, so it doesn't
  read as a catch.
- **Private and commercial repos** have no default until the owner publishes them; then these
  apply unless the owner says otherwise.
- **Creative works** (books, stories, blog posts) are not project content. The owner licenses
  each one.
- **A repo on MIT or BSD** stays there until the owner relicenses it, at a release. Versions
  already published keep the licence they shipped with. Don't relicense on your own; ask once,
  with the repo's current licence and its contributors.

## Stating it in a repo

- **`LICENSE`**: the Apache 2.0 text ([`templates/LICENSE`](../templates/LICENSE)), and
  `"license": "Apache-2.0"` in `package.json`.
- **`LICENSE-CONTENT`**: the CC0 legal code ([`templates/LICENSE-CONTENT`](../templates/LICENSE-CONTENT)).
  Every repo with docs has content, so nearly every repo has both files.
- **A "Licence" section in the README**, worded like this:

  > Code is [Apache-2.0](LICENSE). Documentation, images, icons, models and other content,
  > including the code samples in the docs, are [CC0 1.0](LICENSE-CONTENT): public domain,
  > no attribution needed. Third-party material keeps its own licence (see the
  > acknowledgements). What you make with it is yours.

- **List `LICENSE-CONTENT` in `files`** when the package ships content (icons, images, docs).
  npm packs `LICENSE` without being asked but drops `LICENSE-CONTENT` unless `files` names it.
- **A repo with no `LICENSE` is all rights reserved,** whatever its README implies. A public
  repo without one is a finding.

— asked by: Tonio (owner) · seen in: dramatis3d (asset licences carried into exports),
tosijs-coding-practices and tosijs-native (public with no LICENSE)
