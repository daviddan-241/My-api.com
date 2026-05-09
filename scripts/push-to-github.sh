#!/usr/bin/env bash
set -e

TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  exit 1
fi

REMOTE_URL="https://${TOKEN}@github.com/daviddan-241/My-api.com.git"
REPO="https://github.com/daviddan-241/My-api.com"

echo "Creating clean snapshot for push..."
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

git checkout --orphan _push_temp 2>/dev/null || git checkout _push_temp
git add -A
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "MyAI Gateway — full project push for Render deployment" || true

echo "Pushing to $REPO ..."
git push --force "$REMOTE_URL" _push_temp:main

echo "Cleaning up..."
git checkout "$ORIG_BRANCH"
git branch -D _push_temp

echo "Done! Code is live at $REPO"
