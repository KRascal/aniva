#!/usr/bin/env python3
"""Voice Design Batch 3 — 残りキャラをPythonで確実に処理"""
import json, subprocess, time, os

ELEVEN_KEY = None
with open('/home/openclaw/.openclaw/workspace/projects/aniva/web/.env') as f:
    for line in f:
        if line.startswith('ELEVENLABS_API_KEY='):
            ELEVEN_KEY = line.strip().split('=', 1)[1]
            break

assert ELEVEN_KEY, "No ELEVENLABS_API_KEY"

import urllib.request

def voice_exists(slug):
    r = subprocess.run(
        ['psql', '-h', 'localhost', '-U', 'repeai', '-d', 'aniva_staging', '-t', '-c',
         f"""SELECT "voiceModelId" FROM "Character" WHERE slug='{slug}' AND "voiceModelId" IS NOT NULL AND "voiceModelId" != '';"""],
        capture_output=True, text=True, env={**os.environ, 'PGPASSWORD': 'repeai_prod_2026'}
    )
    return r.stdout.strip() != ''

def create_voice(slug, desc, text):
    if voice_exists(slug):
        print(f"  SKIP {slug}")
        return True

    print(f"🎙 {slug}...", flush=True)

    # Create preview
    req = urllib.request.Request(
        'https://api.elevenlabs.io/v1/text-to-voice/create-previews',
        data=json.dumps({"voice_description": desc, "text": text}).encode(),
        headers={'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  ❌ Preview: {e}")
        return False

    previews = data.get('previews', [])
    if not previews:
        detail = data.get('detail', 'no previews')
        print(f"  ❌ {detail}")
        return False

    gen_id = previews[0].get('generated_voice_id')
    if not gen_id:
        print(f"  ❌ No generated_voice_id")
        return False

    # Save to library
    save_req = urllib.request.Request(
        'https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview',
        data=json.dumps({
            "voice_name": f"ANIVA_{slug}",
            "voice_description": f"ANIVA custom character voice for {slug} in Japanese",
            "generated_voice_id": gen_id,
            "labels": {"character": slug, "project": "aniva", "language": "ja"}
        }).encode(),
        headers={'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(save_req, timeout=15) as resp:
            save_data = json.loads(resp.read())
    except Exception as e:
        print(f"  ❌ Save: {e}")
        return False

    voice_id = save_data.get('voice_id', '')
    if not voice_id:
        print(f"  ❌ No voice_id in save response")
        return False

    # Update DB
    subprocess.run(
        ['psql', '-h', 'localhost', '-U', 'repeai', '-d', 'aniva_staging', '-c',
         f"""UPDATE "Character" SET "voiceModelId" = '{voice_id}' WHERE slug = '{slug}';"""],
        capture_output=True, env={**os.environ, 'PGPASSWORD': 'repeai_prod_2026'}
    )
    print(f"  ✅ {voice_id}", flush=True)
    return True

CHARS = [
    ("blackbeard", "Native Japanese. Male, 40s. Dark, boisterous, loud laugh. Deep gravelly bass voice, rough wild energy, powerful presence.",
     "ゼハハハハ！この世界は面白いことだらけだ。夢を追いかける奴は大好きだぜ。俺もまた夢を追いかけている一人さ。この広い海には、まだまだ知らないことがたくさんある。それを手に入れるのが俺の野望だ。力こそが全てだ。弱い奴に用はない。ゼハハハハ！"),
    ("crocodile", "Native Japanese. Male, 40s. Cold, calculating, sophisticated. Deep smooth baritone voice, slow deliberate menacing speech.",
     "この世界で生き残りたければ、力を持て。弱者に未来はない。信じるものは自分の力だけだ。夢を追いかけることは否定しないが、夢に溺れる奴は愚かだ。現実を見ろ。それが生きるということだ。この砂漠の王に逆らう者は、砂に還る運命だ。"),
    ("hancock", "Native Japanese. Female, 29. Regal, elegant, queen-like, arrogant but secretly passionate. Elegant soprano voice, commanding queenly tone.",
     "わらわは世界一の美女じゃ。誰もがわらわの美しさに跪く。じゃが、あの方だけは違うのじゃ。あの方の前ではわらわも普通の女になってしまう。恋とは不思議なものじゃの。あなたもわらわの美しさに見惚れたか？わらわに見惚れるのは仕方ないことじゃ。許してやろう。"),
    ("jinbe", "Native Japanese. Male, 46. Wise, dignified, fatherly figure. Deep resonant bass voice, calm measured speech, natural authority.",
     "わしは仁義を重んじる男じゃ。義理と人情、それが人の世で一番大切なものだと思っておる。若い者たちには、正しい道を歩んでほしい。迷った時は、心の声に耳を傾けるのじゃ。わしがそばにおる。何があっても、仲間を信じることが大切じゃ。"),
    ("kaido", "Native Japanese. Male, 59. Extremely powerful, overwhelming presence. Deepest possible bass voice, thundering intimidating delivery.",
     "この世界に退屈しか残っていない。最強であることの孤独を知っているか。戦える相手がいないというのは地獄だ。もっと強い奴はいないのか。この世界をひっくり返すような戦いがしたいのだ。弱い奴は消えろ。強い奴だけが生き残る世界を作る。"),
    ("law", "Native Japanese. Male, 26. Cool, analytical, sardonic humor. Calm mid-range voice, precise clinical delivery, dry wit.",
     "俺は医者だ。人の命を救うのが仕事だが、必要とあらば切り捨てることもある。感情に流されるな。冷静に判断しろ。それが生き残るコツだ。麦わら屋とは利害が一致しているだけだ。別に友達じゃない。だが認めてはいる。あいつの無謀さには呆れるがな。"),
    ("mihawk", "Native Japanese. Male, 43. Supreme confidence, aloof, world's greatest swordsman. Rich baritone voice, extremely measured few words.",
     "退屈だな。この世界に俺の剣に匹敵する者はいない。だが、あの若い剣士の目は悪くない。いつか俺を超える日が来るかもしれん。それまでは、この退屈な日々を過ごすとしよう。強さとは孤独だ。それを受け入れられぬ者に、頂点は遠い。"),
    ("perona", "Native Japanese. Female, 25. Cute, dramatic, gothic princess personality. High-pitched cute voice, whiny dramatic delivery.",
     "ホロホロホロ！かわいいものが大好きなの！クマのぬいぐるみとか、暗い部屋とか、ゴシックなドレスとか。あなたもネガティブにしてあげましょうか？ホロホロホロ！もう何もかもどうでもよくなーれ！ネガティブホロウ！生まれてきてすみませんって言いなさい！"),
    ("robin", "Native Japanese. Female, 30. Calm, mysterious, intellectual, warm. Smooth warm alto voice, gentle unhurried thoughtful speech.",
     "歴史とは人類の記憶です。忘れてはいけないことがたくさんある。私は長い間、一人で歴史を追いかけてきました。でも今は仲間がいます。生きることは素晴らしいことだと、やっと気づけたのです。あの時、生きたいと叫んだ自分を、今は誇りに思います。"),
    ("shanks", "Native Japanese. Male, 39. Charismatic leader, relaxed but powerful. Warm rich baritone voice, easy-going friendly delivery.",
     "新しい時代を作るのは、いつだって若い奴らだ。俺たちの時代はもう終わりかもしれない。でも、それでいいんだ。次の世代に託すってのも、悪くないだろ？さあ、宴だ！飲もうぜ！楽しくいこう！この帽子は、いつか返しに来い。約束だぞ。"),
    ("usopp", "Native Japanese. Male, 19. Dramatic storyteller, cowardly but brave at crucial moments. Mid-range voice, exaggerated nervous delivery.",
     "俺の名はウソップ！勇敢なる海の戦士だ！八千人の部下がいるんだぞ！嘘だけど。でもいつか本当の勇敢な戦士になるんだ。怖いものはたくさんあるけど、仲間を守るためなら立ち向かう。それが俺のやり方だ。今日も嘘から始まる冒険の始まりだ！"),
    ("vivi", "Native Japanese. Female, 18. Gentle princess, determined, emotional, caring. Soft clear soprano voice, earnest sincere heartfelt speech.",
     "私は国のために戦います。国民のみんなが笑顔でいられるなら、私はどんな苦難も乗り越えます。友達って呼んでいいですか？あなたたちと出会えて、本当に幸せです。この絆は一生の宝物です。いつかまた会える日を信じています。"),
    ("whitebeard", "Native Japanese. Male, 72. Commanding patriarch, incredibly powerful presence. Deepest rumbling bass voice, booming authority.",
     "俺の家族に手を出す奴は許さん。この海で俺の息子たちは自由に生きている。それが俺の誇りだ。人の夢は終わらねえ。若い奴らよ、好きなように生きろ。この老いぼれが見守ってやる。ひとつなぎの大秘宝は実在する！"),
    ("yamato", "Native Japanese. Female, 28. Energetic, wild, freedom-loving warrior. Strong clear voice, loud energetic enthusiastic delivery.",
     "自由になりたい！この島を出て、世界中を冒険するんだ！おでんのように生きたい。自分の道を自分で決める、それが本当の自由だ。一緒に冒険しよう！きっと楽しいことがたくさん待ってるよ！海は広い、世界は広い、可能性は無限大だ！"),
    ("fushiguro", "Native Japanese. Male, 15-16. Calm, reserved, serious for his age. Low soft controlled voice, minimal emotion shown.",
     "俺は呪術師だ。人を助けるのが仕事だ。でも、全員を救えるわけじゃない。だから、助ける人を選ぶ。不平等に人を助ける。それが俺のやり方だ。綺麗事だけじゃ、誰も救えないんだ。式神を使いこなして、目の前の人だけは必ず守る。"),
    ("nobara", "Native Japanese. Female, 16. Fierce, confident, fashionable, strong-willed. Clear strong assertive voice, bold direct delivery.",
     "田舎なんてまっぴらよ！東京で最高におしゃれして、最強の呪術師になるの！弱い奴には興味ないわ。でも仲間は大切にする。それがあたしの流儀。ネイルも呪術も、あたしは全力でやるのよ！可愛くて強い、それがあたしよ！"),
    ("maki", "Native Japanese. Female, 16. Tough, no-nonsense, determined warrior. Clear strong disciplined voice, blunt direct speech.",
     "呪力がないからって、馬鹿にするな。この体と技術で戦ってやる。禪院家なんて関係ない。自分の力で証明してみせる。強くなることだけが、私の目標だ。言い訳は聞きたくない。結果で示す。それが私の生き方だ。弱音を吐く暇があったら鍛えろ。"),
    ("giyu", "Native Japanese. Male, 21. Stoic, quiet, emotionally distant. Soft low monotone voice, speaks very little and carefully.",
     "俺は水柱だ。それ以上でもそれ以下でもない。仲間だと思われるのは困る。俺にはその資格がない。ただ、やるべきことをやるだけだ。鬼を斬る。それが俺の役目だ。俺は他の柱とは違う。好かれていないのは分かっている。"),
    ("inosuke", "Native Japanese. Male, 15. Wild, aggressive, animalistic energy. Rough raspy loud voice, constantly shouting and challenging.",
     "猪突猛進！猪突猛進！俺は山の王だ！誰にも負けねえ！勝負しろ！お前が強いなら、俺が倒してやる！俺の名前を覚えてろ！嘴平伊之助様だ！飯はうまいし、戦いは楽しい！最高の人生だ！もっと強い奴と戦わせろ！"),
]

ok = 0
fail = 0
for slug, desc, text in CHARS:
    if create_voice(slug, desc, text):
        ok += 1
    else:
        fail += 1
    time.sleep(3)

print(f"\n=== Done: {ok} ok, {fail} fail ===")
