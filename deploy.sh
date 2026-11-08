#!/bin/sh
# Publie dist/ sur la branche gh-pages (GitHub Pages, mode « branche »).
# Utilisé tant que GitHub Actions est indisponible sur le compte ; aucune action GitHub requise.
# Usage : sh deploy.sh
set -e
cd "$(dirname "$0")"
node --test tests/*.test.mjs
node build.mjs
T=$(mktemp -d)
cp -r dist/. "$T/"
# Version hors ligne pour les PC du service sans Internet
( cd "$T" && if command -v zip >/dev/null; then zip -qr coeur-net-hors-ligne.zip . -x sw.js; \
  else powershell -NoProfile -Command "Compress-Archive -Path '$(cygpath -w "$T" 2>/dev/null || echo "$T")\\*' -DestinationPath '$(cygpath -w "$T" 2>/dev/null || echo "$T")\\coeur-net-hors-ligne.zip' -Force"; fi )
cd "$T"
git init -q -b gh-pages
git add -A
git -c core.autocrlf=false commit -q -m "Publication $(date +%Y-%m-%d\ %H:%M)"
git push -q -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
echo "Publié : https://aminechr54.github.io/coeur-net/ (1 à 2 minutes)"
