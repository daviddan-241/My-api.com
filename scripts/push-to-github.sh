#!/usr/bin/env bash
set -e

TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  exit 1
fi

REMOTE_URL="https://${TOKEN}@github.com/daviddan-241/My-api.com.git"
REPO="https://github.com/daviddan-241/My-api.com"

echo "Pushing all files to $REPO ..."

git add -A
git -c user.email="agent@replit.com" -c user.name="Replit Agent" \
  commit -m "MyAI Gateway — full project sync" || echo "Nothing new to commit"

git push --force "$REMOTE_URL" HEAD:main

echo "Done! Code is live at $REPO"
