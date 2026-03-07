#!/bin/bash
# ANIVA 負荷テスト — 100同時接続
# Usage: bash scripts/load-test.sh [staging|production]

set -e

ENV="${1:-staging}"
if [ "$ENV" = "production" ]; then
  BASE="http://localhost:3050"
else
  BASE="http://localhost:3061"
fi

echo "========================================="
echo "  ANIVA Load Test ($ENV)"
echo "  Target: $BASE"
echo "  100 concurrent connections, 500 total"
echo "========================================="
echo ""

# 1. トップページ
echo "── / (トップページ) ──"
ab -n 500 -c 100 -q "$BASE/" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests|Complete requests"
echo ""

# 2. Health API
echo "── /api/health ──"
ab -n 500 -c 100 -q "$BASE/api/health" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests|Complete requests"
echo ""

# 3. Characters API
echo "── /api/characters ──"
ab -n 200 -c 50 -q "$BASE/api/characters" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests|Complete requests"
echo ""

# 4. Explore ページ
echo "── /explore ──"
ab -n 200 -c 50 -q "$BASE/explore" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests|Complete requests"
echo ""

# 5. Pricing ページ
echo "── /pricing ──"
ab -n 200 -c 50 -q "$BASE/pricing" 2>/dev/null | grep -E "Requests per second|Time per request|Failed requests|Complete requests"
echo ""

echo "========================================="
echo "  負荷テスト完了"
echo "========================================="
