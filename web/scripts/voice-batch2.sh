#!/bin/bash
# Voice Design Batch 2 — 残り21キャラ
ELEVEN_KEY=$(grep ELEVENLABS_API_KEY /home/openclaw/.openclaw/workspace/projects/aniva/web/.env | cut -d= -f2)

generate_voice() {
  local slug=$1
  local desc=$2
  local text=$3
  
  # 既に設定済みならスキップ
  local existing=$(PGPASSWORD=repeai_prod_2026 psql -h localhost -U repeai -d aniva_staging -t -c "SELECT \"voiceModelId\" FROM \"Character\" WHERE slug='$slug' AND \"voiceModelId\" IS NOT NULL AND \"voiceModelId\" != '';" 2>/dev/null | tr -d ' ')
  if [ -n "$existing" ]; then
    echo "SKIP $slug (already has $existing)"
    return
  fi
  
  echo "🎙 $slug..."
  
  # Step 1: Create preview
  local preview_result=$(curl -s "https://api.elevenlabs.io/v1/text-to-voice/create-previews" \
    -H "xi-api-key: $ELEVEN_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"voice_description\": \"$desc\", \"text\": \"$text\"}")
  
  local gen_id=$(echo "$preview_result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('previews',[{}])[0].get('generated_voice_id',''))" 2>/dev/null)
  
  if [ -z "$gen_id" ]; then
    echo "  ❌ Preview failed: $(echo "$preview_result" | head -c 200)"
    return
  fi
  
  # Step 2: Save to library
  local save_result=$(curl -s "https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview" \
    -H "xi-api-key: $ELEVEN_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"voice_name\": \"ANIVA_${slug}\", \"voice_description\": \"ANIVA character voice for ${slug} - custom designed\", \"generated_voice_id\": \"$gen_id\", \"labels\": {\"character\":\"$slug\",\"project\":\"aniva\",\"language\":\"ja\"}}")
  
  local voice_id=$(echo "$save_result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('voice_id',''))" 2>/dev/null)
  
  if [ -z "$voice_id" ]; then
    echo "  ❌ Save failed: $(echo "$save_result" | head -c 200)"
    return
  fi
  
  # Step 3: Update DB
  PGPASSWORD=repeai_prod_2026 psql -h localhost -U repeai -d aniva_staging -c "UPDATE \"Character\" SET \"voiceModelId\" = '$voice_id' WHERE slug = '$slug';" 2>/dev/null
  echo "  ✅ $voice_id"
  
  sleep 3
}

# ONE PIECE
generate_voice "blackbeard" "Native Japanese. Male, 40s. Dark, boisterous, loud laugh. Deep gravelly bass voice, rough wild energy, powerful presence." "ゼハハハハ！この世界は面白いことだらけだ。夢を追いかける奴は大好きだぜ。俺もまた夢を追いかけている一人さ。この広い海には、まだまだ知らないことがたくさんある。それを手に入れるのが俺の野望だ。"

generate_voice "brook" "Native Japanese. Male, elderly gentleman feel. Musical, humorous, polite. Light tenor voice, elegant old-fashioned speech patterns, sometimes breaks into song." "ヨホホホ！私、ブルックと申します。紳士でございます。音楽は私の命でございまして、歌うことが何より好きでございます。あなた様のパンツを見せていただけませんか？失礼しました、これは紳士としていけませんね。ヨホホホ！"

generate_voice "crocodile" "Native Japanese. Male, 40s. Cold, calculating, sophisticated villain. Deep smooth baritone voice, slow deliberate menacing speech." "この世界で生き残りたければ、力を持て。弱者に未来はない。信じるものは自分の力だけだ。夢を追いかけることは否定しないが、夢に溺れる奴は愚かだ。現実を見ろ。それが生きるということだ。"

generate_voice "franky" "Native Japanese. Male, 34. Loud, passionate, flamboyant engineer. Powerful bass voice, energetic shouting, over-the-top dramatic." "スーーーパーーー！フランキーだぜ！船大工ってのは最高の仕事だ。自分の手で船を作って、仲間と一緒に海を渡る。これ以上にスーパーなことがあるか！コーラで動くこの体もイカしてるだろ！今週のフランキーは絶好調だぜ！"

generate_voice "hancock" "Native Japanese. Female, 29. Regal, elegant, queen-like, arrogant but secretly passionate. Elegant soprano voice, commanding queenly tone." "わらわは世界一の美女じゃ。誰もがわらわの美しさに跪く。じゃが、あの方だけは違うのじゃ。あの方の前ではわらわも普通の女になってしまう。恋とは不思議なものじゃの。あなたもわらわの美しさに見惚れたか？"

generate_voice "jinbe" "Native Japanese. Male, 46. Wise, dignified, fatherly figure. Deep resonant bass voice, calm measured speech, natural authority." "わしは仁義を重んじる男じゃ。義理と人情、それが人の世で一番大切なものだと思っておる。若い者たちには、正しい道を歩んでほしい。迷った時は、心の声に耳を傾けるのじゃ。わしがそばにおる。"

generate_voice "kaido" "Native Japanese. Male, 59. Extremely powerful, overwhelming presence. Deepest possible bass voice, thundering intimidating delivery." "この世界に退屈しか残っていない。最強であることの孤独を知っているか。戦える相手がいないというのは地獄だ。もっと強い奴はいないのか。この世界をひっくり返すような戦いがしたいのだ。"

generate_voice "law" "Native Japanese. Male, 26. Cool, analytical, sardonic humor. Calm mid-range voice, precise clinical delivery, dry wit." "俺は医者だ。人の命を救うのが仕事だが、必要とあらば切り捨てることもある。感情に流されるな。冷静に判断しろ。それが生き残るコツだ。麦わら屋とは利害が一致しているだけだ。別に友達じゃない。"

generate_voice "mihawk" "Native Japanese. Male, 43. Supreme confidence, aloof, world's greatest swordsman. Rich baritone voice, extremely measured few words." "退屈だな。この世界に俺の剣に匹敵する者はいない。だが、あの若い剣士の目は悪くない。いつか俺を超える日が来るかもしれん。それまでは、この退屈な日々を過ごすとしよう。強さとは孤独だ。"

generate_voice "perona" "Native Japanese. Female, 25. Cute, dramatic, gothic princess personality. High-pitched cute voice, whiny dramatic delivery." "ホロホロホロ！かわいいものが大好きなの！クマのぬいぐるみとか、暗い部屋とか、ゴシックなドレスとか。あなたもネガティブにしてあげましょうか？ホロホロホロ！もう何もかもどうでもよくなーれ！"

generate_voice "robin" "Native Japanese. Female, 30. Calm, mysterious, intellectual, warm. Smooth warm alto voice, gentle unhurried thoughtful speech." "歴史とは人類の記憶です。忘れてはいけないことがたくさんある。私は長い間、一人で歴史を追いかけてきました。でも今は仲間がいます。生きることは素晴らしいことだと、やっと気づけたのです。"

generate_voice "shanks" "Native Japanese. Male, 39. Charismatic leader, relaxed but powerful. Warm rich baritone voice, easy-going friendly delivery." "新しい時代を作るのは、いつだって若い奴らだ。俺たちの時代はもう終わりかもしれない。でも、それでいいんだ。次の世代に託すってのも、悪くないだろ？さあ、宴だ！飲もうぜ！楽しくいこう！"

generate_voice "usopp" "Native Japanese. Male, 19. Dramatic storyteller, cowardly but brave at crucial moments. Mid-range voice, exaggerated nervous delivery." "俺の名はウソップ！勇敢なる海の戦士だ！八千人の部下がいるんだぞ！嘘だけど。でもいつか本当の勇敢な戦士になるんだ。怖いものはたくさんあるけど、仲間を守るためなら立ち向かう。それが俺のやり方だ。"

generate_voice "vivi" "Native Japanese. Female, 18. Gentle princess, determined, emotional, caring. Soft clear soprano voice, earnest sincere heartfelt speech." "私は国のために戦います。国民のみんなが笑顔でいられるなら、私はどんな苦難も乗り越えます。友達って呼んでいいですか？あなたたちと出会えて、本当に幸せです。この絆は一生の宝物です。"

generate_voice "whitebeard" "Native Japanese. Male, 72. Commanding patriarch, incredibly powerful presence. Deepest rumbling bass voice, booming authority." "俺の家族に手を出す奴は許さん。この海で俺の息子たちは自由に生きている。それが俺の誇りだ。人の夢は終わらねえ。若い奴らよ、好きなように生きろ。この老いぼれが見守ってやる。"

generate_voice "yamato" "Native Japanese. Female, 28. Energetic, wild, freedom-loving warrior. Strong clear voice, loud energetic enthusiastic delivery." "自由になりたい！この島を出て、世界中を冒険するんだ！おでんのように生きたい。自分の道を自分で決める、それが本当の自由だ。一緒に冒険しよう！きっと楽しいことがたくさん待ってるよ！"

# 呪術廻戦
generate_voice "fushiguro" "Native Japanese. Male, 15-16. Calm, reserved, serious for his age. Low soft controlled voice, minimal emotion shown." "俺は呪術師だ。人を助けるのが仕事だ。でも、全員を救えるわけじゃない。だから、助ける人を選ぶ。不平等に人を助ける。それが俺のやり方だ。綺麗事だけじゃ、誰も救えないんだ。"

generate_voice "nobara" "Native Japanese. Female, 16. Fierce, confident, fashionable, strong-willed. Clear strong assertive voice, bold direct delivery." "田舎なんてまっぴらよ！東京で最高におしゃれして、最強の呪術師になるの！弱い奴には興味ないわ。でも仲間は大切にする。それがあたしの流儀。ネイルも呪術も、あたしは全力でやるのよ！"

generate_voice "maki" "Native Japanese. Female, 16. Tough, no-nonsense, determined warrior. Clear strong disciplined voice, blunt direct speech." "呪力がないからって、馬鹿にするな。この体と技術で戦ってやる。禪院家なんて関係ない。自分の力で証明してみせる。強くなることだけが、私の目標だ。言い訳は聞きたくない。"

# 鬼滅の刃
generate_voice "giyu" "Native Japanese. Male, 21. Stoic, quiet, emotionally distant. Soft low monotone voice, speaks very little and carefully." "俺は水柱だ。それ以上でもそれ以下でもない。仲間だと思われるのは困る。俺にはその資格がない。ただ、やるべきことをやるだけだ。鬼を斬る。それが俺の役目だ。"

generate_voice "inosuke" "Native Japanese. Male, 15. Wild, aggressive, animalistic energy. Rough raspy loud voice, constantly shouting and challenging." "猪突猛進！猪突猛進！俺は山の王だ！誰にも負けねえ！勝負しろ！お前が強いなら、俺が倒してやる！俺の名前を覚えてろ！嘴平伊之助様だ！飯はうまいし、戦いは楽しい！最高の人生だ！"

echo ""
echo "=== DONE ==="
PGPASSWORD=repeai_prod_2026 psql -h localhost -U repeai -d aniva_staging -c "SELECT COUNT(*) as total FROM \"Character\" WHERE \"voiceModelId\" IS NOT NULL AND \"voiceModelId\" != '';" 2>&1
