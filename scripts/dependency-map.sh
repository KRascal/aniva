#!/bin/bash
# ANIVA 依存マップ生成
# 各ページが依存するコンポーネント/API/lib を一覧化
# 使い方: bash scripts/dependency-map.sh [ファイル名]

WEB_DIR="$(dirname "$0")/../web/src"
OUTPUT="/tmp/aniva-dep-map.md"

echo "# ANIVA 依存マップ ($(date '+%Y-%m-%d %H:%M'))" > "$OUTPUT"
echo "" >> "$OUTPUT"

analyze_file() {
  local file="$1"
  local rel_path="${file#$WEB_DIR/}"
  echo "## $rel_path" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  
  # importされてるコンポーネント/ライブラリ
  echo "### Imports" >> "$OUTPUT"
  grep -E "^import " "$file" | sed 's/import /- /' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  
  # 使用しているAPI endpoints
  echo "### API Calls" >> "$OUTPUT"
  grep -oE "fetch\(['\"]\/api\/[^'\"]*['\"]" "$file" | sort -u | sed 's/fetch(/- /' >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  
  # このファイルを import しているファイル
  local basename=$(basename "$file" .tsx)
  local dirname=$(dirname "$rel_path")
  echo "### Used By" >> "$OUTPUT"
  grep -rl "from.*['\"].*${basename}['\"]" "$WEB_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null | \
    sed "s|$WEB_DIR/|- |" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  echo "---" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
}

if [ -n "$1" ]; then
  # 特定ファイル
  analyze_file "$WEB_DIR/$1"
else
  # 全ページファイル
  for f in $(find "$WEB_DIR/app" -name "page.tsx" | sort); do
    analyze_file "$f"
  done
  
  # 共有コンポーネント
  echo "## 共有コンポーネント依存数" >> "$OUTPUT"
  echo "" >> "$OUTPUT"
  for f in $(find "$WEB_DIR/components" -name "*.tsx" | sort); do
    local rel="${f#$WEB_DIR/}"
    local count=$(grep -rl "$(basename $f .tsx)" "$WEB_DIR/app" --include="*.tsx" 2>/dev/null | wc -l)
    if [ "$count" -gt 1 ]; then
      echo "- **$rel**: ${count}ページで使用" >> "$OUTPUT"
    fi
  done
fi

echo ""
echo "生成完了: $OUTPUT"
cat "$OUTPUT" | head -100
