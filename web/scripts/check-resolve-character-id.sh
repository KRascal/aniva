#!/bin/bash
###############################################################################
# resolveCharacterId未適用API検出スクリプト（退化防止CI）
#
# Usage: bash scripts/check-resolve-character-id.sh
#
# [characterId] ルートが resolveCharacterId を呼んでいるか確認する。
# 呼んでいない場合は警告（slug非対応 = 退化バグの根本原因）。
#
# 終了コード:
#   0 = 全OK
#   1 = 未適用ルートあり（CIを失敗させる）
###############################################################################

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src/app/api"

MISSING=0
CHECKED=0

echo -e "${YELLOW}[check] resolveCharacterId 未適用 API ルート検出${NC}"
echo ""

# [characterId] を含むディレクトリのroute.tsを全て走査
while IFS= read -r route_file; do
  CHECKED=$((CHECKED + 1))
  dir=$(dirname "$route_file")
  
  # [characterId] を含むパスかチェック
  if echo "$route_file" | grep -q '\[characterId\]'; then
    # resolveCharacterId が使われているか確認
    if ! grep -q "resolveCharacterId" "$route_file"; then
      echo -e "  ${RED}✗ MISSING${NC}: $route_file"
      MISSING=$((MISSING + 1))
    else
      echo -e "  ${GREEN}✓${NC}: ${route_file##*/src/app/api/}"
    fi
  fi
done < <(find "$SRC_DIR" -name "route.ts" | sort)

echo ""
echo -e "チェック完了: ${CHECKED} ファイル, 未適用: ${MISSING} 件"

if [ $MISSING -gt 0 ]; then
  echo -e "${RED}[FAIL] resolveCharacterId 未適用ルートが ${MISSING} 件あります。${NC}"
  echo -e "${YELLOW}修正方法: 対象route.tsに以下を追加してください:${NC}"
  echo "  import { resolveCharacterId } from '@/lib/resolve-character-id';"
  echo "  const characterId = await resolveCharacterId(params.characterId);"
  exit 1
else
  echo -e "${GREEN}[PASS] 全 [characterId] ルートに resolveCharacterId が適用されています。${NC}"
  exit 0
fi
