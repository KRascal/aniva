#!/bin/bash
###############################################################################
# main→staging 自動同期スクリプト
# 
# Usage: bash scripts/sync-main-to-staging.sh
#
# mainブランチの最新をstagingブランチに自動マージ＆push。
# 本番デプロイ前に必ずstagingで確認するフローを強制。
#
# 実行タイミング:
#   - deploy-staging.sh から自動呼び出し（mainがstagingより進んでいる場合）
#   - 手動: bash scripts/sync-main-to-staging.sh
###############################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_DIR"

echo -e "${YELLOW}[sync] main→staging 同期チェック開始${NC}"

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)

# リモートの最新状態を取得
git fetch origin --quiet

# mainとstagingの差分を確認
MAIN_HASH=$(git rev-parse origin/main 2>/dev/null || git rev-parse main)
STAGING_HASH=$(git rev-parse origin/staging 2>/dev/null || echo "")

if [ "$MAIN_HASH" = "$STAGING_HASH" ]; then
  echo -e "${GREEN}[sync] staging は main と同期済み。スキップ。${NC}"
  exit 0
fi

# 差分件数を表示
DIFF_COUNT=$(git log --oneline origin/staging..origin/main 2>/dev/null | wc -l | tr -d ' ')
echo -e "${YELLOW}[sync] main が staging より ${DIFF_COUNT} コミット進んでいます。${NC}"
git log --oneline origin/staging..origin/main 2>/dev/null | head -5

echo -e "${YELLOW}[sync] staging へマージ中...${NC}"

# stagingブランチに切り替えてマージ
git checkout staging 2>/dev/null || git checkout -b staging origin/staging

# マージ（競合が発生した場合はours戦略でstaging側の変更を優先）
if ! git merge origin/main --no-edit -m "chore: sync main→staging (auto)" 2>&1; then
  echo -e "${RED}[sync] マージ競合が発生。手動解決が必要。${NC}"
  git merge --abort 2>/dev/null
  git checkout "$CURRENT_BRANCH" 2>/dev/null
  exit 1
fi

# push
git push origin staging
echo -e "${GREEN}[sync] staging 同期完了: ${MAIN_HASH:0:7}${NC}"

# 元のブランチに戻る
git checkout "$CURRENT_BRANCH" 2>/dev/null

echo -e "${GREEN}[sync] 完了${NC}"
