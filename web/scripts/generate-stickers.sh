#!/bin/bash
# キャラクタースタンプ一括生成スクリプト
# grok-imagine-image を使用

XAIKEY=$(grep XAI_API_KEY /home/openclaw/.openclaw/workspace/projects/aniva/web/.env | cut -d= -f2)
OUTDIR="/home/openclaw/.openclaw/workspace/aniva/web/public/stickers"
mkdir -p "$OUTDIR"

generate() {
  local slug=$1
  local char_name=$2
  local emotion=$3
  local emoji=$4
  local prompt=$5
  local outfile="$OUTDIR/${slug}-${emotion}.png"
  
  if [ -f "$outfile" ]; then
    echo "SKIP: $outfile exists"
    return
  fi
  
  echo "🎨 Generating ${slug}-${emotion}..."
  
  curl -s "https://api.x.ai/v1/images/generations" \
    -H "Authorization: Bearer $XAIKEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"grok-imagine-image\",
      \"prompt\": \"$prompt\",
      \"n\": 1,
      \"response_format\": \"b64_json\"
    }" | python3 -c "
import json, sys, base64
data = json.load(sys.stdin)
if 'data' in data and data['data']:
    b64 = data['data'][0].get('b64_json', '')
    if b64:
        with open('$outfile', 'wb') as f:
            f.write(base64.b64decode(b64))
        print('  ✅ OK')
    else:
        print('  ❌ No b64 data')
else:
    print(f'  ❌ Error: {json.dumps(data)[:200]}')
" 2>/dev/null
  
  sleep 2  # Rate limit
}

# ルフィ
generate "luffy" "Monkey D. Luffy" "happy" "😄" "Chibi anime sticker, Luffy with straw hat, big happy smile laughing, white background, cute kawaii LINE sticker style"
generate "luffy" "Monkey D. Luffy" "angry" "😠" "Chibi anime sticker, Luffy with straw hat, angry fierce expression punching, white background, cute kawaii style"
generate "luffy" "Monkey D. Luffy" "sad" "😢" "Chibi anime sticker, Luffy with straw hat, crying with tears, white background, cute kawaii style"
generate "luffy" "Monkey D. Luffy" "love" "❤️" "Chibi anime sticker, Luffy with straw hat, hearts around face, blushing, white background, cute kawaii style"
generate "luffy" "Monkey D. Luffy" "hungry" "🍖" "Chibi anime sticker, Luffy with straw hat, drooling with meat, white background, cute kawaii style"

# ゾロ
generate "zoro" "Roronoa Zoro" "cool" "😎" "Chibi anime sticker, Zoro green hair three swords, cool smirk, white background, cute kawaii style"
generate "zoro" "Roronoa Zoro" "training" "💪" "Chibi anime sticker, Zoro green hair, lifting weights training, white background, cute kawaii style"
generate "zoro" "Roronoa Zoro" "lost" "❓" "Chibi anime sticker, Zoro green hair, confused lost looking at map, white background, cute kawaii style"

# ナミ
generate "nami" "Nami" "happy" "😊" "Chibi anime sticker, Nami orange hair, cheerful smile, white background, cute kawaii style"
generate "nami" "Nami" "angry" "💢" "Chibi anime sticker, Nami orange hair, angry hitting gesture, white background, cute kawaii style"
generate "nami" "Nami" "money" "💰" "Chibi anime sticker, Nami orange hair, eyes turned to coins money, white background, cute kawaii style"

# サンジ
generate "sanji" "Sanji" "love" "😍" "Chibi anime sticker, Sanji blonde hair suit, heart eyes love struck, white background, cute kawaii style"
generate "sanji" "Sanji" "cooking" "🍳" "Chibi anime sticker, Sanji blonde hair, chef hat cooking, white background, cute kawaii style"

# チョッパー
generate "chopper" "Tony Tony Chopper" "happy" "🩷" "Chibi anime sticker, Chopper reindeer small cute, happy blushing, white background, cute kawaii style"
generate "chopper" "Tony Tony Chopper" "shy" "😳" "Chibi anime sticker, Chopper reindeer small, embarrassed wiggling, white background, cute kawaii style"

# エース
generate "ace" "Portgas D. Ace" "cool" "🔥" "Chibi anime sticker, Ace shirtless hat freckles, fire around, cool smile, white background, cute kawaii style"
generate "ace" "Portgas D. Ace" "sleeping" "💤" "Chibi anime sticker, Ace shirtless hat, falling asleep narcolepsy, white background, cute kawaii style"

# 五条
generate "gojo" "Gojo Satoru" "smirk" "😏" "Chibi anime sticker, Gojo white hair blindfold, cocky smirk, white background, cute kawaii style"
generate "gojo" "Gojo Satoru" "cool" "✨" "Chibi anime sticker, Gojo white hair, removing blindfold blue eyes, white background, cute kawaii style"

# 炭治郎
generate "tanjiro" "Tanjiro Kamado" "kind" "🌸" "Chibi anime sticker, Tanjiro earrings scar, gentle kind smile, white background, cute kawaii style"
generate "tanjiro" "Tanjiro Kamado" "determined" "⚔️" "Chibi anime sticker, Tanjiro earrings, determined battle stance water breathing, white background, cute kawaii style"

echo ""
echo "=== Done! ==="
ls -la "$OUTDIR"/*.png 2>/dev/null | wc -l
echo "stickers generated"
