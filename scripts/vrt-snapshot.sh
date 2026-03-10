#!/bin/bash
# ANIVA Visual Regression Testing — スナップショット撮影
# 使い方: 
#   bash scripts/vrt-snapshot.sh baseline  — 「正」のスクショを保存
#   bash scripts/vrt-snapshot.sh check     — 現在の状態と「正」を比較
#
# 前提: headless browser (playwright) が使える環境

SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SNAPSHOT_DIR="$PROJECT_DIR/tests/vrt/snapshots"
BASELINE_DIR="$PROJECT_DIR/tests/vrt/baseline"
DIFF_DIR="$PROJECT_DIR/tests/vrt/diff"

BASE_URL="${ANIVA_URL:-http://localhost:3061}"

MODE="${1:-baseline}"

# スナップ対象ページ
PAGES=(
  "/" 
  "/explore"
  "/chat"
  "/mypage"
  "/ranking"
  "/cards"
  "/login"
  "/discover"
)

echo "🎯 VRT $MODE mode — $BASE_URL"
echo ""

if [ "$MODE" = "baseline" ]; then
  mkdir -p "$BASELINE_DIR"
  echo "📸 ベースラインスナップショット撮影中..."
  
  for page in "${PAGES[@]}"; do
    safe_name=$(echo "$page" | sed 's|/|_|g; s|^_||; s|^$|home|')
    echo "  撮影: $page → ${safe_name}.png"
    
    # playwright CLIでスクショ
    if command -v npx &> /dev/null; then
      cd "$PROJECT_DIR/web" && npx playwright screenshot \
        --browser=chromium \
        --device="iPhone 13" \
        --full-page \
        "${BASE_URL}${page}" \
        "$BASELINE_DIR/${safe_name}.png" 2>/dev/null
      
      if [ $? -eq 0 ]; then
        echo "    ✓ 保存完了"
      else
        echo "    ✗ 撮影失敗"
      fi
    fi
  done
  
  echo ""
  echo "✅ ベースライン保存: $BASELINE_DIR"
  ls -la "$BASELINE_DIR"/*.png 2>/dev/null | awk '{print "  " $NF " (" $5 " bytes)"}'
  
elif [ "$MODE" = "check" ]; then
  mkdir -p "$SNAPSHOT_DIR" "$DIFF_DIR"
  CHANGES=0
  
  echo "🔍 現在の状態をベースラインと比較中..."
  
  for page in "${PAGES[@]}"; do
    safe_name=$(echo "$page" | sed 's|/|_|g; s|^_||; s|^$|home|')
    
    if [ ! -f "$BASELINE_DIR/${safe_name}.png" ]; then
      echo "  ⚠ ベースラインなし: $page (スキップ)"
      continue
    fi
    
    # 現在のスクショ撮影
    cd "$PROJECT_DIR/web" && npx playwright screenshot \
      --browser=chromium \
      --device="iPhone 13" \
      --full-page \
      "${BASE_URL}${page}" \
      "$SNAPSHOT_DIR/${safe_name}.png" 2>/dev/null
    
    # 比較（pixel diff）
    if command -v compare &> /dev/null; then
      diff_result=$(compare -metric AE \
        "$BASELINE_DIR/${safe_name}.png" \
        "$SNAPSHOT_DIR/${safe_name}.png" \
        "$DIFF_DIR/${safe_name}_diff.png" 2>&1)
      
      if [ "$diff_result" -gt 100 ] 2>/dev/null; then
        echo "  ❌ $page — ${diff_result}px 差分あり"
        CHANGES=$((CHANGES + 1))
      else
        echo "  ✓ $page — 変化なし"
      fi
    else
      echo "  📸 $page — スクショ撮影済み (ImageMagick未インストール: 手動比較要)"
    fi
  done
  
  echo ""
  if [ "$CHANGES" -eq 0 ]; then
    echo "✅ 全ページ変化なし"
  else
    echo "⚠️ $CHANGES ページで視覚的な変化検知"
    echo "差分画像: $DIFF_DIR/"
  fi
fi
