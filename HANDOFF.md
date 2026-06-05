# HANDOFF — Kasinath Lab Website (read me first)

What changed, what to do right now to get back in sync, and how we work together so our changes
never conflict.

---

## ⚠️ DO THIS FIRST — re-sync

Your local copy is behind and the workflow changed. Reset to match GitHub:

```bash
git fetch origin --prune
git checkout master
git reset --hard origin/master
```

Also: the local **`dev_server.py`** is no longer part of the workflow (we preview on GitHub Pages
now — see below). You can delete your local copy: `rm -f dev_server.py`.

---

## The model — ONE source, ONE generated file

```
  index.html   ← EDIT THIS. The page source. Relative asset paths, no Squarespace tags.
       │           Preview it on GitHub Pages (push → see it on the web).
       │
       │   bash dev/build-region.sh   (generator)
       ▼
  site.region  ← GENERATED. DO NOT EDIT BY HAND. This is what Squarespace deploys.
```

- `index.html` → relative `assets/...` → renders on **GitHub Pages**.
- `site.region` → absolute `/assets/...` + `{squarespace-*}` tags → renders on **Squarespace**.
- `assets/index.css` + `assets/index.js` are **shared** — edit once, both pages update.

**Rule: only ever hand-edit `index.html` and the files in `assets/`. Never touch `site.region`
directly — run `bash dev/build-region.sh` to regenerate it.** (If you edit `site.region` by hand,
the next regenerate overwrites you, and the two files drift — the exact thing we're avoiding.)

---

## Your workflow

```bash
git checkout master && git pull            # always start fresh
git checkout -b feature/your-thing         # work on a branch

# edit index.html / assets/index.css / assets/index.js

git add -A && git commit -m "..." && git push -u origin feature/your-thing
# open a Pull Request into master on GitHub; we review, then merge.

# before it goes to Squarespace, sync the generated file:
bash dev/build-region.sh
git add site.region && git commit -m "Sync site.region"
```

**Preview:** push your branch and look at GitHub Pages, or just open `index.html` in a browser
locally. Pages URL: `https://kasinathlab.github.io/Kasinath_Laboratory_Website/`

---

## What I changed in this pass

- **Reconciled the two divergent templates into one clean format** (your logo badge + 3D card-tilt
  were kept; the Bedford-layered version was dropped — see the prior commits/history).
- **Added a light/dark theme toggle** (🌙/☀️ in the nav). Default = your light theme; toggles to the
  original dark bioluminescent theme. Persists via `localStorage`, no flash, and the particle canvas
  recolors automatically. Light lives in `:root`; dark in the `html[data-theme="dark"]` block at the
  bottom of `assets/index.css`.
- **Set up the `index.html` (source) → `site.region` (generated) pipeline** via `dev/build-region.sh`.
- **Standardized preview on GitHub Pages** and removed the local `dev_server.py` from the workflow.

---

## To avoid conflicts (please follow)

- **One source of truth:** edit `index.html` + `assets/`. Never hand-edit `site.region`.
- **Branch + PR**, don't commit straight to `master`; never force-push `master`.
- **Pull `master` before starting**, keep branches small, merge often.
- Rough file ownership to stay out of each other's way: `index.html` (markup/content),
  `assets/index.css` (styles), `assets/index.js` (behavior — add a new `initX()` and call it in the
  `DOMContentLoaded` block, like `init3DTilt` / `initThemeToggle`).
- **For your agent:** the canonical format is the minimal static template (single `index.html`
  source + `assets/`, `site.region` generated). Do **not** reintroduce the Bedford template, LESS,
  `home.region`, or a second hand-edited page file.

---

## Deploy status

The **live Squarespace site is still the old one** — pushing `master` does not change it yet (the
GitHub→Squarespace connection isn't actively deploying). GitHub Pages is our preview. We'll
activate the real Squarespace deploy together when we're ready to replace the old site.

---

## Open TODOs
- [ ] Contact form is a stub (fakes "sent") — wire to a real endpoint.
- [ ] Footer Twitter/X link is a placeholder.
- [ ] `og:image` uses the `*.squarespace.com` URL; update to the custom domain when connected.
- [ ] Team avatars are initials-only.

Full details in `README.md`. Questions → ping me.
