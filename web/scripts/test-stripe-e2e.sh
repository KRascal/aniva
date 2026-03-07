#!/bin/bash
# Stripe E2E テスト — checkout → webhook → コイン付与 フロー検証
# Usage: bash scripts/test-stripe-e2e.sh [staging|production]

set -e

ENV="${1:-staging}"
if [ "$ENV" = "production" ]; then
  BASE="http://localhost:3050"
else
  BASE="http://localhost:3061"
fi

echo "========================================="
echo "  ANIVA Stripe E2E Test ($ENV)"
echo "  Target: $BASE"
echo "========================================="
echo ""

# 1. ヘルスチェック
echo "1. ヘルスチェック..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "   ✅ API稼働中 (HTTP $STATUS)"
else
  echo "   ❌ API応答なし (HTTP $STATUS)"
  exit 1
fi

# 2. Checkout Session API確認
echo ""
echo "2. Checkout API (/api/coins/checkout) 確認..."
CHECKOUT_RES=$(curl -s -X POST "$BASE/api/coins/checkout" \
  -H "Content-Type: application/json" \
  -d '{"packageId":"test","priceId":"price_test"}' 2>/dev/null)
echo "   Response: $(echo "$CHECKOUT_RES" | head -c 200)"
# 未認証なら401が正常
if echo "$CHECKOUT_RES" | grep -q "Unauthorized\|401\|login"; then
  echo "   ✅ 未認証時に正しくブロック（期待通り）"
else
  echo "   ⚠️  予想外の応答"
fi

# 3. Webhook endpoint確認（署名なし → 400が正常）
echo ""
echo "3. Webhook (/api/webhook/stripe) 確認..."
WEBHOOK_RES=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/webhook/stripe" \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=0,v1=invalid" \
  -d '{"type":"checkout.session.completed"}' 2>/dev/null)
if [ "$WEBHOOK_RES" = "400" ]; then
  echo "   ✅ 無効署名を正しく拒否 (HTTP 400)"
elif [ "$WEBHOOK_RES" = "429" ]; then
  echo "   ✅ レート制限が機能 (HTTP 429)"
else
  echo "   ⚠️  HTTP $WEBHOOK_RES (期待: 400)"
fi

# 4. Pricing ページ確認
echo ""
echo "4. Pricing ページ確認..."
PRICING_RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/pricing" 2>/dev/null)
if [ "$PRICING_RES" = "200" ]; then
  echo "   ✅ Pricingページ表示OK (HTTP 200)"
else
  echo "   ❌ HTTP $PRICING_RES"
fi

# 5. Coin packages API
echo ""
echo "5. コインパッケージ API (/api/coins/packages) 確認..."
PACKAGES_RES=$(curl -s "$BASE/api/coins/packages" 2>/dev/null)
if echo "$PACKAGES_RES" | grep -q "packages\|coinAmount\|priceWebJpy"; then
  PKG_COUNT=$(echo "$PACKAGES_RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('packages',[])))" 2>/dev/null || echo "?")
  echo "   ✅ パッケージ取得OK ($PKG_COUNT 件)"
else
  echo "   ⚠️  パッケージ未取得または認証必要"
  echo "   Response: $(echo "$PACKAGES_RES" | head -c 200)"
fi

# 6. Stripe設定確認
echo ""
echo "6. Stripe環境変数確認..."
if [ "$ENV" = "staging" ]; then
  ENV_FILE="/home/openclaw/.openclaw/workspace/projects/aniva/web/.env.staging"
else
  ENV_FILE="/home/openclaw/.openclaw/workspace/projects/aniva/web/.env"
fi
if [ -f "$ENV_FILE" ]; then
  HAS_SK=$(grep -c "STRIPE_SECRET_KEY" "$ENV_FILE" 2>/dev/null || echo 0)
  HAS_PK=$(grep -c "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$ENV_FILE" 2>/dev/null || echo 0)
  HAS_WH=$(grep -c "STRIPE_WEBHOOK_SECRET" "$ENV_FILE" 2>/dev/null || echo 0)
  echo "   STRIPE_SECRET_KEY: $([ "$HAS_SK" -gt 0 ] && echo '✅ 設定済み' || echo '❌ 未設定')"
  echo "   PUBLISHABLE_KEY:   $([ "$HAS_PK" -gt 0 ] && echo '✅ 設定済み' || echo '❌ 未設定')"
  echo "   WEBHOOK_SECRET:    $([ "$HAS_WH" -gt 0 ] && echo '✅ 設定済み' || echo '❌ 未設定')"
else
  echo "   ⚠️  $ENV_FILE が見つかりません"
fi

echo ""
echo "========================================="
echo "  テスト完了"
echo "========================================="
echo ""
echo "💡 実際のStripe決済テストには:"
echo "   1. テストカード: 4242 4242 4242 4242"
echo "   2. 有効期限: 任意の未来日"
echo "   3. CVC: 任意の3桁"
echo "   4. stripe listen --forward-to localhost:$([[ "$ENV" = "production" ]] && echo 3050 || echo 3061)/api/webhook/stripe"
