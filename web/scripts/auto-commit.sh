#!/bin/bash
###############################################################################
# ANIVA 自動コミット＆プッシュ（セッション死亡によるコード消失防止）
#
# Usage: bash scripts/auto-commit.sh
# Cron: */20 * * * *
###############################################################################

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_DIR"

CHANGES=$(git status --porcelain 2>/dev/null | grep -v '^\?\?' | wc -l | tr -d ' ')
UNTRACKED=$(git status --porcelain 2>/dev/null | grep '^\?\?' | grep -E '\.(ts|tsx|js|jsx|css|json|md|sh|sql)$' | wc -l | tr -d ' ')

if [ "$CHANGES" = "0" ] && [ "$UNTRACKED" = "0" ]; then
  exit 0
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

git add -A
STAGED=$(git diff --cached --stat | tail -1)
git commit -m "auto: WIP保存 ${TIMESTAMP} (${STAGED})" --no-verify 2>/dev/null || exit 0
git push origin main --quiet 2>/dev/null

echo "[auto-commit] ${TIMESTAMP}: ${STAGED}"
