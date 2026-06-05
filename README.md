# Vignesh Kasinath Lab — Website

The lab website for the [Vignesh Kasinath Lab](https://www.colorado.edu/) at CU Boulder,
deployed on **Squarespace Developer Mode**. It is a single, hand-coded page (no Squarespace
CMS pages) served through a minimal custom Squarespace template.

---

## How deployment works (read this first)

This Squarespace site runs in **Developer Mode** and is linked to this GitHub repo via the
**Squarespace GitHub integration**. The integration watches the **`master`** branch.

```
  edit files  ─►  git push origin master  ─►  Squarespace auto-syncs  ─►  live site updates
                                                (seconds to a few minutes)
```

- **`master` is the production branch.** Anything merged to `master` deploys to the live site.
- Pushing to any **other** branch does **nothing** to the live site — that's why feature work
  happens on branches and only reaches production through a reviewed merge into `master`.
- There is no build step on our side. Squarespace just serves the files.

> Note: a plain GitHub push only deploys because the Squarespace GitHub integration is
> connected (Squarespace → Settings → Developer Tools). If that link is ever removed, pushes
> to GitHub stop reaching the site.

---

## Repo structure

```
template.conf          Squarespace template manifest (declares the "site" region). Required.
site.region            The entire page. Plain HTML + 4 required Squarespace tags (see below).
assets/                All static files, served verbatim at /assets/<file>:
  index.css              site styles (loaded via <link href="/assets/index.css">)
  index.js               site behavior (loaded via plain <script src="/assets/index.js">)
  *.png                  7 images (hero carousel, news cards, research figure)
README.md              this file
.gitignore
```

We deliberately treat Squarespace as a **static host**: CSS, JS, and images are all served
raw from `/assets/`. This bypasses Squarespace's LESS compiler and async script-loader so the
page renders exactly as authored. (See "Why it's built this way" below.)

### The 4 required Squarespace tags in `site.region`
Do not remove these — the page won't render correctly without them:
| Tag | Location | Purpose |
|-----|----------|---------|
| `{squarespace-headers}` | last thing in `<head>` | injects system scripts + page meta |
| `{squarespace-footers}` | last thing before `</body>` | injects deferred system scripts |
| `{squarespace.main-content}` | hidden `<div>` near the end of `<body>` | CMS content anchor Squarespace expects (kept hidden) |
| `id`/`class` on `<body>` | `{squarespace.page-id}` / `{squarespace.page-classes}` | per-page styling hooks |

Everything else in `site.region` is normal HTML you can edit freely.

---

## One-time setup (each developer)

1. **Get added to the GitHub repo** (`KasinathLab/Kasinath_Laboratory_Website`).
2. **Clone it:**
   ```bash
   git clone https://github.com/KasinathLab/Kasinath_Laboratory_Website.git
   cd Kasinath_Laboratory_Website
   ```
3. **(Optional but recommended) Install the local preview server** so you can see changes
   before pushing. Requires Node.js (https://nodejs.org):
   ```bash
   npm install -g @squarespace/server
   ```

---

## Local preview (see changes before they go live)

From the repo root, point the preview server at the live site (this pulls the live config and
renders your **local** template files on top of it):

```bash
squarespace-server https://vignesh-kasinath.squarespace.com
# then open http://localhost:9000
```

> Our site slug is `vignesh-kasinath` (admin: https://vignesh-kasinath.squarespace.com/config/).
> If the site is password-protected, add `--auth`.

Because the page is plain static files, you can **also** just open `assets/index.css` /
`assets/index.js` logic against a copy of the markup in any browser for quick CSS/JS tweaks —
but the preview server is the source of truth since it renders the real Squarespace shell.

---

## Making a change & deploying

### Solo / quick change
```bash
git checkout master
git pull origin master           # always start from latest
# ...edit site.region or assets/...
git add -A
git commit -m "Update publications list"
git push origin master           # this deploys
```
Refresh the live site after a minute. Hard-refresh (Cmd+Shift+R) to bypass browser cache.

### Common edits
- **Text / sections** → edit `site.region`.
- **Colors, spacing, layout** → edit `assets/index.css` (CSS variables live in `:root` at the top).
- **Behavior** (tabs, carousels, 3D viewer) → edit `assets/index.js`.
- **Images** → drop a file in `assets/` and reference it as `/assets/yourfile.png`
  (always absolute, leading slash; max 10 MB/file).

---

## Collaborating (recommended workflow for the team)

We protect `master` (production) by doing all work on branches and merging via Pull Request so
changes are reviewed before they go live.

```bash
# 1. Start from the latest production code
git checkout master
git pull origin master

# 2. Make a feature branch
git checkout -b feature/team-photos

# 3. Edit, preview locally (squarespace-server), then commit
git add -A
git commit -m "Add real team headshots"

# 4. Push the branch (this does NOT touch the live site)
git push -u origin feature/team-photos

# 5. Open a Pull Request on GitHub: base = master, compare = your branch
#    The other person reviews the diff, then we click "Merge".
#    Merging into master is what deploys.
```

**Reviewer checklist (what to audit on a PR):**
- Pull the branch and run `squarespace-server` locally — does the page look right?
- Are the 4 required Squarespace tags still present in `site.region`?
- Do all `assets/*` references use absolute paths (`/assets/...`)?
- No secrets/large binaries committed; images under 10 MB.

**Golden rules**
- Never force-push `master`.
- Always `git pull origin master` before starting work to avoid conflicts.
- If two people edit the same file, resolve conflicts locally before merging.
- Only merge to `master` when you intend to publish.

---

## Why it's built this way (design notes)

This started as a standalone static site (`index.html` + `index.css` + `index.js`). Squarespace
Developer Mode can't serve a bare `index.html`; it needs a template (`template.conf` + a
`.region`). We did the **minimum** conversion to make it deployable while keeping the original
code intact:

- `index.html` → `site.region` (same markup + the 4 required Squarespace tags; image paths
  made absolute `/assets/...`).
- `index.css` / `index.js` → moved into `assets/` and linked with **plain** `<link>` / `<script>`
  tags instead of Squarespace's pipeline. Two specific reasons:
  - `index.css` begins with an `@import` for Google Fonts, which must remain the first CSS rule;
    routing it through Squarespace's LESS compiler risks breaking that.
  - `index.js` does all its work inside a single `DOMContentLoaded` handler; Squarespace's async
    `combo` script-loader can run after that event fires and silently skip the handler. A plain
    synchronous `<script>` avoids this.

**External dependencies** (loaded from CDNs, need internet at view time): Font Awesome 6.4,
jQuery 3.6, 3Dmol.js, Google Fonts.

### Known follow-ups / TODO
- [ ] `og:image` is set to `https://vignesh-kasinath.squarespace.com/assets/molecular_header.png`.
      Update it to the custom domain if/when one is connected.
- [ ] Fix the placeholder Twitter/X link in the footer (`https://KasLab-Twitter/`).
- [ ] The contact form is front-end only (it simulates sending). Wire it to a real endpoint
      (e.g. Formspree) or replace with a `mailto:`.
- [ ] Replace the initials-only team avatars with real photos when available.

---

## The other branches
- **`master`** — production (this branch's content; what deploys).
- **`main`** — the original standalone static-site version (`index.html`-based), kept for
  reference/history. Not used for deployment.
- **`master`'s original commit** — the stock Squarespace "Bedford" template export that the
  site shipped with. Replaced by this minimal custom template.
