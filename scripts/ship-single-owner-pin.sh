#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Ship the single-owner PIN refactor: branch -> commit -> test -> push.
# Run from the repo root ON YOUR MACHINE (Git Bash / WSL / macOS / Linux).
# The Cowork sandbox can't build (platform SWC binary) or safely commit
# (its file mount corrupts edited files), so this must run locally.
# ---------------------------------------------------------------------------
set -euo pipefail

BRANCH="feat/single-owner-pin"

echo "==> Pre-flight"
if [ ! -f .env.local ]; then
  echo "!! .env.local not found — the build/runtime needs SUPABASE_SERVICE_ROLE_KEY and APP_SESSION_SECRET."
fi
grep -q '^SUPABASE_SERVICE_ROLE_KEY=..' .env.local 2>/dev/null \
  && echo "   SUPABASE_SERVICE_ROLE_KEY: set" || echo "!! SUPABASE_SERVICE_ROLE_KEY looks empty"
grep -q '^APP_SESSION_SECRET=..' .env.local 2>/dev/null \
  && echo "   APP_SESSION_SECRET: set" || echo "!! APP_SESSION_SECRET looks empty"

echo "==> Branching off develop"
git checkout develop
git pull --ff-only origin develop || true
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

echo "==> Staging all changes (adds, edits, deletes)"
git add -A

echo "==> Committing"
if git diff --cached --quiet; then
  echo "   Nothing staged (already committed?) — skipping commit."
else
  git commit -F docs/commit-single-owner-pin.txt
fi

echo "==> Installing dependencies"
npm install

echo "==> Test: lint + production build"
npm run lint
npm run build

echo "==> Pushing (Vercel builds a PREVIEW deploy for this branch)"
git push -u origin "$BRANCH"

cat <<'NEXT'

Done.
  * A Vercel PREVIEW deploy is now building for feat/single-owner-pin.
  * Open the preview URL, verify: first run asks you to SET a PIN, then unlock
    works; every module loads live data; Settings changes the PIN.
  * To ship PRODUCTION: open a PR feat/single-owner-pin -> develop, merge it,
    then open develop -> main and merge (Vercel deploys main to production).
NEXT
