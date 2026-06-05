# HANDOFF — Kasinath Lab Website (read me first)

This explains what changed, **what you need to do right now to get back in sync**, and how
we work together from here so our changes never conflict.

---

## TL;DR

- We now have **ONE canonical branch: `master`.** It holds a clean, Squarespace-compatible
  template. Everything else branches off it.
- **Your two improvements were kept** — the 3D card-tilt effect and the circular logo badge —
  ported into this format. Nothing of yours was thrown away.
- The older "Bedford-layered" version that was briefly on `master` was replaced (reasoning below).
- The `squarespace-template` branch has been merged into `master` and removed — don't use it.

---

## ⚠️ DO THIS FIRST — re-sync your local copy

Your local `master` is now out of date. Reset it to match GitHub (this is safe — your old work
is preserved in git history and your improvements are already in `master`):

```bash
git fetch origin --prune
git checkout master
git reset --hard origin/master
```

If you had a local `squarespace-template` branch, you can delete it:
```bash
git branch -D squarespace-template
```

Your previous commits aren't gone — find them anytime with `git log --all --oneline` (look for
"Integrate custom Quantum Bio-Dark Mode…" and the logo commits).

---

## How this template is built (the format we standardized on)

It's a **single hand-coded page** served as a **minimal Squarespace Developer Mode template**.
We treat Squarespace as a static host:

```
template.conf      Manifest. One "site" region, empty "stylesheets" (we don't use Squarespace's LESS).
site.region        The whole page = plain HTML + 4 required Squarespace tags (see below).
assets/            Served verbatim at /assets/<file>:
  index.css          all styles      (linked: <link href="/assets/index.css">)
  index.js           all behavior    (loaded: <script src="/assets/index.js">)
  lab_logo.png       header logo
  *.png              hero/news/research images
README.md          full project + deploy docs
HANDOFF.md         this file
```

**The 4 required Squarespace tags in `site.region` — never remove them:**
| Tag | Where | Why |
|-----|-------|-----|
| `{squarespace-headers}` | last line of `<head>` | system scripts + page meta |
| `{squarespace-footers}` | last line before `</body>` | deferred system scripts |
| `{squarespace.main-content}` | hidden `<div>` near end of `<body>` | CMS anchor Squarespace expects |
| `{squarespace.page-id}` / `{squarespace.page-classes}` | on `<body>` | styling hooks |

Everything else in `site.region` is normal HTML you edit freely.

---

## Why we changed the master approach (so we're on the same page)

Your version was a *valid* template — but it layered the lab page onto the **full Bedford CMS**
(a separate `home.region`, `kasinath-lab.less` compiled through Squarespace's LESS pipeline, plus
the ~49 stock Bedford files). We standardized on the **minimal self-contained** version instead
because:

- **No LESS surprises.** Our CSS (`index.css`) opens with a Google-Fonts `@import` that must stay
  the first rule; routing it through Squarespace's LESS compiler risks breaking fonts. Serving it
  raw avoids that.
- **No script-loader timing bug.** `index.js` runs everything in one `DOMContentLoaded` handler.
  Squarespace's async `combo` loader can fire after that event and silently skip it; a plain
  `<script>` tag avoids it.
- **It only renders on the homepage if the CMS assigns the custom layout** — a hidden dependency.
  Our version renders the same everywhere with no CMS config.
- **One file to edit, no Bedford bloat.** Easier for two people to work on without conflicts.

**The valuable parts of your work were the improvements, and those are in `master` now:**
- 3D card-tilt parallax → `assets/index.js` (`init3DTilt()`) + the depth CSS in `assets/index.css`.
- Circular logo badge → `lab_logo.png` + `.header-logo` / `.logo-text` CSS + the header markup.

---

## How we collaborate from here (linear, conflict-free)

**Golden rule: never commit directly to `master`, never force-push it.** All work flows through
short-lived branches and Pull Requests.

```bash
# 1. Always start from the latest master
git checkout master
git pull origin master

# 2. Make a small, focused branch
git checkout -b feature/short-name        # e.g. feature/team-photos

# 3. Edit + preview locally (see below), then commit
git add -A
git commit -m "Clear message"

# 4. Push your branch (does NOT touch the live site)
git push -u origin feature/short-name

# 5. Open a Pull Request into master on GitHub. The other person reviews, then merge.
#    Merging into master is the only thing that publishes (once deploy is live — see below).
```

**To avoid stepping on each other:**
- Tell each other who's editing which file. Rough split: `site.region` (content/markup),
  `assets/index.css` (styles), `assets/index.js` (behavior). Editing different files = no conflicts.
- Keep branches small and merge often. Don't let a branch drift for days.
- When adding JS, add a new `initSomething()` function and call it inside the existing
  `DOMContentLoaded` block (the same pattern as `init3DTilt`) — that keeps additions isolated.
- Pull `master` before starting anything new.

---

## See your changes locally before pushing

```bash
npm install -g @squarespace/server     # one-time (needs Node.js)
squarespace-server https://vignesh-kasinath.squarespace.com
# open http://localhost:9000  → edit a file → refresh the tab
```

---

## Editing cheat-sheet

| Want to change… | Edit… | Notes |
|---|---|---|
| Text, sections, nav | `site.region` | keep the 4 Squarespace tags |
| Colors, layout, spacing | `assets/index.css` | theme variables are in `:root` at the top |
| Interactions (tabs, carousels, 3D viewer, tilt) | `assets/index.js` | add an `initX()` + call it in the `DOMContentLoaded` block |
| Add an image | drop in `assets/`, reference `/assets/name.png` | absolute path, leading slash, < 10 MB |

---

## Deploy status — important context

The **live site is still the old Squarespace CMS site.** Pushing to `master` does **not** currently
change it — the GitHub→Squarespace Developer-Mode connection isn't actively deploying yet (your
earlier push to `master` didn't change the live site either). So right now `master` is a safe
staging area. **When we're ready to actually replace the old site, we'll verify/activate that
connection together** — don't expect pushes to go live until then.

---

## Open TODOs (help welcome)

- [ ] Contact form is a front-end stub (it fakes "sent"). Wire to Formspree / a real endpoint / `mailto:`.
- [ ] Footer Twitter/X link is a placeholder (`https://KasLab-Twitter/`).
- [ ] `og:image` points at the `*.squarespace.com` URL; update to the custom domain when one is connected.
- [ ] Team avatars are initials-only; swap in real photos when available.

Questions? Ping me. Full project details are in `README.md`.
