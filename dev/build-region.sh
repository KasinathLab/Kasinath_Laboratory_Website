#!/usr/bin/env bash
#
# build-region.sh — generates site.region (the Squarespace deploy file) from index.html (the source).
#
#   index.html  = the file you HAND-EDIT and preview (browser / GitHub Pages).
#   site.region = GENERATED from it for Squarespace. NEVER edit site.region by hand.
#
# Run from anywhere:  bash dev/build-region.sh
#
# The transform: inject the 4 required Squarespace tags and rewrite /assets paths to absolute.
#
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SRC="index.html"
OUT="site.region"

if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC not found in repo root." >&2
  exit 1
fi

perl -0777 -pe '
  # 1. make all relative asset refs absolute (Squarespace serves /assets from site root)
  s!"assets/!"/assets/!g;
  # 2. og:image needs an absolute URL for social/SEO scrapers
  s!<meta property="og:image" content="/assets/!<meta property="og:image" content="https://vignesh-kasinath.squarespace.com/assets/!;
  # 3. body gets Squarespace per-page hooks
  s!<body>!<body id="{squarespace.page-id}" class="{squarespace.page-classes}">!;
  # 4. headers tag must be the last thing in <head>
  s!</head>!  {squarespace-headers}\n</head>!;
  # 5. hidden CMS anchor + footers tag must be the last thing before </body>
  s!</body>!  <div class="sqs-main-content" data-content-field="main-content" aria-hidden="true" style="display:none">{squarespace.main-content}</div>\n  {squarespace-footers}\n</body>!;
' "$SRC" > "$OUT.tmp"

{
  echo '<!-- GENERATED from index.html by dev/build-region.sh — DO NOT EDIT BY HAND. Edit index.html, then re-run. -->'
  cat "$OUT.tmp"
} > "$OUT"
rm -f "$OUT.tmp"

echo "✓ Generated $OUT from $SRC"
