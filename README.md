# Vignesh Kasinath Lab — Website

Single hand-coded page for the Vignesh Kasinath Lab (CU Boulder), deployed on **Squarespace
Developer Mode**, with **GitHub Pages** used as a live preview.

---

## The model (read this first)

There are **two** copies of the page, and only **one** is edited by hand:

```
  index.html   ← THE SOURCE. You hand-edit this. Relative asset paths, no Squarespace tags.
       │           Previewed on GitHub Pages (push → see it on the web).
       │
       │   bash dev/build-region.sh   (generator: adds Squarespace tags + absolute paths)
       ▼
  site.region  ← GENERATED. Never edit by hand. This is what Squarespace deploys.
```

- **`index.html`** uses **relative** `assets/...` paths → works on **GitHub Pages** (a project
  page is served from a sub-path).
- **`site.region`** uses **absolute** `/assets/...` paths + the required `{squarespace-*}` tags →
  works on **Squarespace** (served from the domain root).
- `assets/index.css` and `assets/index.js` are **shared** by both — edit them once, both update.

**Golden rule: edit `index.html` (and the shared `assets/`). Never edit `site.region` by hand —
regenerate it with `bash dev/build-region.sh`.**

---

## Repo structure

```
index.html            SOURCE — the whole page (edit this). Relative paths, no SQSP tags.
assets/
  index.css             shared styles (incl. light/dark themes)
  index.js              shared behavior (tabs, carousels, 3D viewer, tilt, theme toggle)
  lab_logo.png          header logo
  *.png                 hero / news / research images
site.region           GENERATED from index.html for Squarespace. Do not hand-edit.
template.conf         Squarespace template manifest.
dev/build-region.sh   Generator: index.html → site.region.
.nojekyll             Tells GitHub Pages to serve files as-is.
README.md / HANDOFF.md
```

---

## Daily workflow

```bash
# 1. start from latest
git checkout master && git pull

# 2. edit the SOURCE + shared assets
#    index.html  /  assets/index.css  /  assets/index.js

# 3. preview on the web (GitHub Pages) — push and look:
git add -A && git commit -m "..." && git push
#    → wait ~30–60s, refresh the Pages URL (below)

# 4. when the page looks right, sync the Squarespace file:
bash dev/build-region.sh        # regenerates site.region from index.html
git add site.region && git commit -m "Sync site.region" && git push
```

> Quick local check (optional, no push): just open `index.html` in a browser, or use VS Code's
> *Simple Browser*. Pages is the shareable web preview.

### GitHub Pages preview URL
`https://kasinathlab.github.io/Kasinath_Laboratory_Website/`
(See "Enable GitHub Pages" below — one-time repo setting.)

---

## Enable GitHub Pages (one-time, repo admin)

GitHub → repo **Settings → Pages** → **Build and deployment** → Source: **Deploy from a branch**
→ Branch: **`master`**, folder **`/ (root)`** → **Save**. After ~1 minute the site is live at the
URL above. Every push to `master` rebuilds it. (This is separate from Squarespace and does not
touch the live lab site.)

---

## Required Squarespace tags (in the GENERATED site.region)

The generator injects these; don't remove them from `dev/build-region.sh`:

| Tag | Location | Purpose |
|-----|----------|---------|
| `{squarespace-headers}` | last in `<head>` | system scripts + page meta |
| `{squarespace-footers}` | last before `</body>` | deferred system scripts |
| `{squarespace.main-content}` | hidden `<div>` | CMS anchor Squarespace expects |
| `{squarespace.page-id}` / `{squarespace.page-classes}` | on `<body>` | styling hooks |

---

## Theme toggle

The page ships a **light/dark toggle** (🌙/☀️ button in the nav):
- Default is the **light** ("Quantum Bio-Light") theme; toggling switches to the original **dark**
  bioluminescent theme.
- Choice persists via `localStorage` (`kaslab-theme`) and applies before paint (no flash).
- The animated particle canvas recolors with the theme automatically.
- Light is the default in `:root`; dark lives in the `html[data-theme="dark"]` block at the bottom
  of `assets/index.css`. To make dark the default, set `<html data-theme="dark">` in `index.html`.

---

## Deploy status — important

The **live site is still the old Squarespace CMS site.** Pushing to `master` does **not** currently
change it — the GitHub→Squarespace Developer-Mode connection isn't actively deploying yet. So
`master` is a safe staging area, and GitHub Pages is the preview. **When you're ready to replace
the old site, verify/activate that connection** — until then, pushes don't go live on Squarespace.

---

## Branches
- **`master`** — canonical; GitHub Pages + (eventual) Squarespace deploy. All work merges here.
- **`main`** — original standalone static version, kept for history. Not used.

---

## Open TODOs
- [ ] Contact form is a front-end stub (fakes "sent"). Wire to Formspree / a real endpoint / `mailto:`.
- [ ] Footer Twitter/X link is a placeholder (`https://KasLab-Twitter/`).
- [ ] `og:image` uses the `*.squarespace.com` URL; update to the custom domain if one is connected.
- [ ] Team avatars are initials-only; swap in real photos when available.
