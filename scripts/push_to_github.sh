#!/usr/bin/env bash
set -e

TOKEN="${1:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  # Check /tmp/dragopedia_github_config.json
  if [ -f "/tmp/dragopedia_github_config.json" ]; then
    TOKEN=$(node -e 'try{const c=JSON.parse(require("fs").readFileSync("/tmp/dragopedia_github_config.json","utf8"));console.log(c.token||"")}catch(e){}')
  fi
fi

if [ -z "$TOKEN" ]; then
  echo "Error: Se requiere un GitHub Personal Access Token (PAT) con permisos de escritura (repo)."
  echo "Uso: ./scripts/push_to_github.sh <TU_GITHUB_TOKEN>"
  exit 1
fi

REPO="tirianworld/Cdd-Dragopedia-DEFINITIVA"
BRANCH="main"

echo "Preparando push hacia https://github.com/$REPO ($BRANCH)..."

cd /tmp/repo-to-push
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/${REPO}.git"

git push origin "$BRANCH"

echo "¡Subida completada con éxito a GitHub!"
