#!/bin/bash
###############################################################################
# ANIVA デプロイ後全ページ巡回チェック
# 
# Usage: bash scripts/post-deploy-full-check.sh [BASE_URL]
# Default: http://localhost:3061
#
# 全ページのHTTPステータスを確認し、壊れているページを即座に検出する。
# 退化（regression）防止の最後の砦。
###############################################################################

set -euo pipefail

BASE_URL="${1:-http://localhost:3061}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
ERRORS=0
WARNINGS=0
TOTAL=0

log_ok() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=$((ERRORS + 1)); }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

check_page() {
  local path="$1"
  local expected="${2:-200,307,302}"
  TOTAL=$((TOTAL + 1))
  
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" --max-time 10 2>/dev/null || echo "000")
  
  if echo "$expected" | grep -q "$code"; then
    log_ok "$code $path"
  elif [ "$code" = "000" ]; then
    log_fail "TIMEOUT $path"
  elif [ "$code" = "500" ] || [ "$code" = "502" ] || [ "$code" = "503" ]; then
    log_fail "$code $path — サーバーエラー"
  elif [ "$code" = "404" ]; then
    log_warn "$code $path — ページ未発見"
  else
    log_warn "$code $path — 想定外ステータス（expected: $expected）"
  fi
}

check_api() {
  local path="$1"
  local expected="${2:-200}"
  TOTAL=$((TOTAL + 1))
  
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}" --max-time 10 2>/dev/null || echo "000")
  
  if echo "$expected" | grep -q "$code"; then
    log_ok "$code $path"
  else
    log_fail "$code $path — API異常（expected: $expected）"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ANIVA デプロイ後全ページ巡回チェック"
echo "  Target: $BASE_URL"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "── パブリックページ（認証不要）──"
check_page "/" "200"
check_page "/login" "200"
check_page "/discover" "200"
check_page "/moments" "200"
check_page "/privacy" "200"
check_page "/terms" "200"
check_page "/legal/tokushoho" "200"
check_page "/pricing" "200"

echo ""
echo "── 認証必要ページ（307リダイレクト=正常）──"
check_page "/explore" "200,307"
check_page "/mypage" "307"
check_page "/chat" "307"
check_page "/cards" "307"
check_page "/settings" "307"
check_page "/chat/group" "307"
check_page "/explore/gacha" "307"
check_page "/ranking" "307"
check_page "/story" "307"
check_page "/events" "307"
check_page "/diary" "307"
check_page "/letters" "307"
check_page "/notifications" "307"
check_page "/memory-cards" "307"
check_page "/onboarding" "200,307"

echo ""
echo "── 管理画面（認証必要=307 or 200）──"
check_page "/admin" "200,307"
check_page "/admin/characters" "200,307"
check_page "/admin/users" "200,307"
check_page "/admin/moments" "200,307"
check_page "/admin/gacha" "200,307"
check_page "/admin/stories" "200,307"
check_page "/admin/scenarios" "200,307"
check_page "/admin/contracts" "200,307"
check_page "/admin/guardrails" "200,307"
check_page "/admin/analytics" "200,307"
check_page "/admin/polls" "200,307"
check_page "/admin/shop" "200,307"
check_page "/admin/coins" "200,307"
check_page "/admin/lore" "200,307"
check_page "/admin/feedback" "200,307"
check_page "/admin/notifications" "200,307"
check_page "/admin/downloadable-content" "200,307"
check_page "/admin/addiction" "200,307"
check_page "/admin/tenants" "200,307"
check_page "/admin/approvals" "200,307"

echo ""
echo "── パブリックAPI ──"
check_api "/api/health" "200"
check_api "/api/characters" "200"
check_api "/api/moments?page=1&limit=1" "200"
check_api "/api/stories" "200"
check_api "/api/pricing" "200"
check_api "/api/geoip" "200"

echo ""
echo "── 認証必要API（401/403=正常）──"
check_api "/api/user" "401,403,302"
check_api "/api/chat/list" "401,403"
check_api "/api/coins/balance" "401,403"
check_api "/api/notifications" "401,403"

echo ""
echo "── エラーログ確認 ──"
RECENT_ERRORS=$(pm2 logs aniva-staging --nostream --lines 20 2>/dev/null | grep -iE "InvariantError|ENOENT|Cannot find|Internal Server Error" | wc -l)
if [ "$RECENT_ERRORS" -gt 0 ]; then
  log_fail "PM2エラーログに${RECENT_ERRORS}件のエラーあり"
  pm2 logs aniva-staging --nostream --lines 20 2>/dev/null | grep -iE "InvariantError|ENOENT|Cannot find|Internal Server Error" | head -5
else
  log_ok "PM2エラーログ: クリーン"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -gt 0 ]; then
  echo -e "  ${RED}FAIL${NC}: ${ERRORS}件のエラー / ${WARNINGS}件の警告 / ${TOTAL}件チェック"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "  ${YELLOW}WARN${NC}: ${WARNINGS}件の警告 / ${TOTAL}件チェック"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo -e "  ${GREEN}ALL PASS${NC}: ${TOTAL}件全てOK"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
fi
