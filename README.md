# Vignesh Kasinath Lab — Website

Single hand-coded page for the Vignesh Kasinath Lab (CU Boulder). It deploys to **Squarespace
Developer Mode**, and we use **GitHub Pages** as a safe working preview.

---

## ⚠️ The two branches — this is the most important thing

```
  preview branch  ──►  GitHub Pages   = WORKING COPY. Push here freely; only the Pages preview
                                        changes. Squarespace is NOT affected.
  master branch   ──►  Squarespace    = LIVE PUBLIC SITE. Updated ONLY by a deliberate, reviewed
                                        merge of preview → master. Never push to it directly.
```

The Squarespace Developer Mode GitHub connection **auto-deploys every push to `master`** to the
public site. So **all day-to-day work happens on `preview`** (previewed on Pages), and the public
site only changes when we intentionally merge `preview → master`.

- **`preview`** — working copy. GitHub Pages serves it. This is where you build.
- **`master`** — production. Currently frozen on the **old site** (original Bedford template) until
  the new site is ready. Protected — changes require a PR.
- **`main`** — original standalone static version, kept for history. Unused.

---

## How the page is built (source vs generated)

```
  index.html   ← THE SOURCE you hand-edit. Relative asset paths, no Squarespace tags.
       │           Previewed on GitHub Pages.
       │   bash dev/build-region.sh   (generator)
       ▼
  site.region  ← GENERATED for Squarespace (adds tags + absolute paths). Don't hand-edit.
```
`assets/index.css` + `assets/index.js` are **shared** by both. `build-region.sh` only regenerates
the local `site.region` file — it does **not** deploy anything; pushing/merging to `master` is what
deploys.

---

## Repo structure
```
index.html            SOURCE — the page (edit this). Relative paths, no SQSP tags.
assets/
  index.css             shared styles (incl. light/dark themes)
  index.js              shared behavior (tabs, carousels, 3D viewer, tilt, theme toggle)
  *.png / *.jpg         logo, hero/news images, team photos
site.region           GENERATED for Squarespace. Do not hand-edit.
template.conf         Squarespace template manifest.
dev/build-region.sh   Generator: index.html → site.region.
photos.html           (temporary) picker for mapping the real team headshots.
.nojekyll
```

---

## Daily workflow

```bash
# 1. start from the working branch
git checkout preview && git pull

# 2. feature branch off preview
git checkout -b feature/your-thing

# 3. edit index.html / assets/index.css / assets/index.js, commit, push
git add -A && git commit -m "..." && git push -u origin feature/your-thing

# 4. open a PR INTO preview → it shows on the Pages URL after merge
```
Pages preview URL: `https://kasinathlab.github.io/Kasinath_Laboratory_Website/`
(Quick local check: open `index.html` in a browser.)

### Going live (publishing to Squarespace — only when we agree it's ready)
```bash
bash dev/build-region.sh                       # sync site.region from index.html
git add site.region && git commit -m "Sync site.region"
# open a PR: preview → master, review, merge.  THE MERGE is what publishes to Squarespace.
```

---

## GitHub Pages
Pages serves the **`preview`** branch (repo → Settings → Pages → Deploy from a branch → `preview` →
`/ (root)`). Every push to `preview` rebuilds it (~1 min). Pages is the public-but-staging preview;
it is separate from the Squarespace production site.

## Required Squarespace tags (injected into the generated site.region)
`{squarespace-headers}` (last in `<head>`), `{squarespace-footers}` (last before `</body>`),
`{squarespace.main-content}` (hidden CMS anchor), and `{squarespace.page-id}`/`{squarespace.page-classes}`
on `<body>`. The generator adds these — don't remove them from `dev/build-region.sh`.

## Theme toggle
Light/dark toggle (🌙/☀️ in the nav). Default light; toggles to the original dark bioluminescent
theme; persists via `localStorage`; canvas recolors with it. Dark lives in `html[data-theme="dark"]`
at the bottom of `assets/index.css`.

## Open TODOs
- [ ] Map the real team headshots onto the Team cards (see `photos.html`), then remove the picker.
- [ ] Contact form is a stub — wire to a real endpoint.
- [ ] Footer Twitter/X link is a placeholder.
- [ ] Fold in the `feature/fix-logo-hover` fix (logo text vanishing on hover).
