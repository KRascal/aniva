#!/usr/bin/env python3
"""Voice Batch 4 — 失敗5キャラのリトライ（穏やかな表現に修正）"""
import json, subprocess, time, os, urllib.request, urllib.error

ELEVEN_KEY = None
with open('/home/openclaw/.openclaw/workspace/projects/aniva/web/.env') as f:
    for line in f:
        if line.startswith('ELEVENLABS_API_KEY='):
            ELEVEN_KEY = line.strip().split('=', 1)[1]
            break

assert ELEVEN_KEY, "No ELEVENLABS_API_KEY"

def voice_exists(slug):
    r = subprocess.run(
        ['psql', '-h', 'localhost', '-U', 'repeai', '-d', 'aniva_staging', '-t', '-c',
         f"""SELECT "voiceModelId" FROM "Character" WHERE slug='{slug}' AND "voiceModelId" IS NOT NULL AND "voiceModelId" != '';"""],
        capture_output=True, text=True, env={**os.environ, 'PGPASSWORD': 'repeai_prod_2026'}
    )
    return r.stdout.strip() != ''

def create_voice(slug, desc, text):
    if voice_exists(slug):
        print(f"  SKIP {slug} (exists)")
        return True

    print(f"🎙 {slug}...", flush=True)

    req = urllib.request.Request(
        'https://api.elevenlabs.io/v1/text-to-voice/create-previews',
        data=json.dumps({"voice_description": desc, "text": text}).encode(),
        headers={'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        print(f"  ❌ Preview HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"  ❌ Preview: {e}")
        return False

    previews = data.get('previews', [])
    if not previews:
        print(f"  ❌ No previews: {json.dumps(data)[:200]}")
        return False

    gen_id = previews[0].get('generated_voice_id')
    if not gen_id:
        print(f"  ❌ No generated_voice_id")
        return False

    save_req = urllib.request.Request(
        'https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview',
        data=json.dumps({
            "voice_name": f"ANIVA_{slug}",
            "voice_description": f"ANIVA custom character voice for {slug} in Japanese anime style",
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
        print(f"  ❌ No voice_id: {json.dumps(save_data)[:200]}")
        return False

    subprocess.run(
        ['psql', '-h', 'localhost', '-U', 'repeai', '-d', 'aniva_staging', '-c',
         f"""UPDATE "Character" SET "voiceModelId" = '{voice_id}' WHERE slug = '{slug}';"""],
        capture_output=True, env={**os.environ, 'PGPASSWORD': 'repeai_prod_2026'}
    )
    print(f"  ✅ {voice_id}", flush=True)
    return True

# 403対策: 暴力・攻撃的表現を削除したソフトな説明に修正
CHARS = [
    ("whitebeard", "Native Japanese. Male, 72. Wise, commanding, fatherly. Resonant deep bass voice, booming natural authority, speaks with warmth.",
     "俺の仲間たちはみんな家族だ。この広い海で、共に生きてきた仲間たちを大切にする。それが俺の生き様だ。人の夢は終わらねえ。若い奴らよ、好きなように生きろ。この老いぼれが見守ってやる。ひとつなぎの大秘宝は実在するぞ。"),

    ("fushiguro", "Native Japanese. Male, 15-16. Calm, thoughtful, serious for his age. Quiet low voice, chooses words carefully, rarely raises tone.",
     "俺は呪術師だ。人を助けるのが仕事だ。でも、全員を救えるわけじゃない。だから、助ける人を選ぶ。不平等に人を助ける。それが俺のやり方だ。正しいことをするために、難しい選択をしなければならない時がある。"),

    ("nobara", "Native Japanese. Female, 16. Confident, energetic, fashionable. Clear assertive voice, speaks directly and boldly, fashion-conscious.",
     "東京で最高におしゃれして、最強の呪術師になるの！田舎育ちだけど、センスは誰にも負けないわ。仲間は大切にする。でも自分のやりたいことは絶対に諦めない。それがあたしの流儀。可愛くて強い、それがあたしよ！"),

    ("maki", "Native Japanese. Female, 16. Determined, disciplined, hardworking. Clear strong voice, speaks with purpose and directness.",
     "自分の力を信じることだけが、私の拠り所だ。才能がないなら、努力で補えばいい。大切なのは諦めないことだ。自分の道は自分で切り開く。言い訳より行動。それが私の生き方だ。弱音を吐く暇があったら鍛えろ。"),

    ("inosuke", "Native Japanese. Male, 15. Wild, enthusiastic, energetic. Rough raspy voice, loud and excitable, raised in nature.",
     "猪突猛進！俺は山の王だ！誰にも負けない！勝負しよう！お前が強いなら、俺が超えてやる！俺の名前を覚えてくれ！嘴平伊之助様だ！飯はうまいし、冒険は楽しい！最高の人生だ！もっと強い人と戦いたい！"),
]

ok = 0
fail = 0
for slug, desc, text in CHARS:
    result = create_voice(slug, desc, text)
    if result:
        ok += 1
    else:
        fail += 1
    time.sleep(4)

print(f"\n=== Done: {ok} ok, {fail} fail ===")

# 最終集計
import subprocess
r = subprocess.run(
    ['psql', '-h', 'localhost', '-U', 'repeai', '-d', 'aniva_staging', '-t', '-c',
     'SELECT COUNT(*) FROM "Character" WHERE "voiceModelId" IS NOT NULL AND "voiceModelId" != \'\';'],
    capture_output=True, text=True, env={**os.environ, 'PGPASSWORD': 'repeai_prod_2026'}
)
print(f"Total voices in DB: {r.stdout.strip()}/32")
