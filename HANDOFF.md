# HANDOFF — Kasinath Lab Website (read me first)

## ⚠️ How deploys actually work (this caused a problem — please read)

The repo's **`master` branch is connected to the LIVE Squarespace site** (Developer Mode GitHub
sync). **Every push to `master` auto-deploys to the public lab site.** There is no separate
"upload" step — `dev/build-region.sh` only regenerates a local file; the **push/merge to `master`**
is the deploy. We learned this the hard way (our in-progress redesign briefly went live). It's now
reverted and re-structured so it can't happen by accident.

## The model — two branches

```
  preview branch  ──►  GitHub Pages   = WORKING COPY. Push here freely → only the Pages preview
                                        changes. Squarespace is untouched.
  master branch   ──►  Squarespace    = LIVE PUBLIC SITE. Frozen on the OLD site. Protected.
                                        Updated ONLY by a deliberate, reviewed merge preview → master.
```

**Push to `preview`. Never push `master`.** Updating `master` is the only thing that changes the
public site, and it's protected so it can only happen via a reviewed PR.

## ⚠️ Re-sync your local copy

```bash
git fetch origin --prune
git checkout preview          # the working branch (NOT master)
git reset --hard origin/preview
```
Do your work on `preview` (or feature branches off it). `master` is the old site / production —
leave it alone.

## Your workflow

```bash
git checkout preview && git pull
git checkout -b feature/your-thing
# edit index.html / assets/index.css / assets/index.js
git add -A && git commit -m "..." && git push -u origin feature/your-thing
# open a PR INTO preview → after merge it shows on the Pages URL:
#   https://kasinathlab.github.io/Kasinath_Laboratory_Website/
```

## How the page is built
- **`index.html`** = the source you hand-edit (relative paths, no Squarespace tags). Pages serves it.
- **`site.region`** = GENERATED from it via `bash dev/build-region.sh` (adds Squarespace tags +
  absolute paths). **Never hand-edit it.** Only needed when we publish.
- **`assets/index.css` / `assets/index.js`** = shared by both.

## Going live (only when we both agree it's ready)
```bash
bash dev/build-region.sh
git add site.region && git commit -m "Sync site.region"
# PR: preview → master, review, merge → THAT publishes to Squarespace.
```

## Please follow / for your agent
- Canonical format = **minimal static template**: one `index.html` source + `assets/`,
  `site.region` generated. Do **not** reintroduce the Bedford template, LESS, `home.region`, or a
  second hand-edited page file.
- **Team photos: use the REAL headshots** from the old site's photoshoot — please **don't** generate
  AI "3D avatars" (the `feature/team-avatars` ones are fake faces, e.g. "Dr. Evan Chen"). George is
  mapping the real photos now.
- Your `feature/fix-logo-hover` looks like a genuine bug fix — let's fold it into `preview`.
- Add JS as a new `initX()` called in the `DOMContentLoaded` block (like `init3DTilt` /
  `initThemeToggle`).

**TL;DR: push to `preview` (safe, Pages preview). Never push `master` (that's the live site).**
