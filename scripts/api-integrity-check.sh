#!/bin/bash
# ANIVA API整合性チェック
# ページが呼ぶAPIエンドポイントが実際に存在するか確認
# 使い方: bash scripts/api-integrity-check.sh

WEB_DIR="$(dirname "$0")/../web/src"
ERRORS=0
CHECKED=0

echo "🔍 API整合性チェック開始..."
echo ""

# 全ページ/コンポーネントから使われているAPIエンドポイントを抽出
ENDPOINTS=$(grep -rohE "fetch\(['\"]\/api\/[^'\"]*['\"]" "$WEB_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | \
  sed "s/fetch(['\"]//; s/['\"]$//" | sort -u)

for ep in $ENDPOINTS; do
  CHECKED=$((CHECKED + 1))
  
  # テンプレートリテラル部分を除去
  clean_ep=$(echo "$ep" | sed 's/\${[^}]*}/[param]/g')
  
  # APIルートファイルを探す
  route_path=$(echo "$clean_ep" | sed 's|^/api/||; s|\[param\]|[^/]*|g')
  
  # Next.js App Router: src/app/api/... にroute.tsが存在するか
  dir_path="$WEB_DIR/app/api/$(echo "$clean_ep" | sed 's|^/api/||; s|\[param\]|*/|g' | sed 's|/$||')"
  
  # 簡易チェック: route.ts か route.tsx が存在するか
  found=false
  # 正確なパスマッチ
  api_dir="$WEB_DIR/app$(echo "$clean_ep" | sed 's|\[param\]|*|g')"
  for candidate in $api_dir/route.ts $api_dir/route.tsx; do
    if ls $candidate 2>/dev/null | head -1 > /dev/null 2>&1; then
      found=true
      break
    fi
  done
  
  if [ "$found" = false ]; then
    # パラメータ付きパスの場合、[xxx] ディレクトリを探す
    base_dir="$WEB_DIR/app$(dirname "$clean_ep" | sed 's|\[param\]|*|g')"
    last_seg=$(basename "$clean_ep")
    if [ "$last_seg" = "[param]" ]; then
      for d in $(ls -d $base_dir/\[*\] 2>/dev/null); do
        if [ -f "$d/route.ts" ] || [ -f "$d/route.tsx" ]; then
          found=true
          break
        fi
      done
    fi
  fi
  
  if [ "$found" = true ]; then
    echo "  ✓ $ep"
  else
    echo "  ✗ $ep — route file NOT FOUND"
    # どのファイルが使っているか表示
    users=$(grep -rl "$ep" "$WEB_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | head -3 | sed "s|$WEB_DIR/|    |")
    echo "$users"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━"
echo "チェック: $CHECKED エンドポイント"
echo "エラー: $ERRORS"

if [ "$ERRORS" -eq 0 ]; then
  echo "✅ 全APIエンドポイント正常"
  exit 0
else
  echo "❌ $ERRORS 件のエンドポイントが見つかりません"
  exit 1
fi
