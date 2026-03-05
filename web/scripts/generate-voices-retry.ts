/**
 * ElevenLabs Voice Design - ブロックされたキャラのリトライ
 * 年齢記述を外してSafety Guidelinesに対応
 */

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVEN_API_KEY) throw new Error('ELEVENLABS_API_KEY required');

interface CharacterVoiceSpec {
  slug: string;
  name: string;
  description: string;
  sampleText: string;
}

// 年齢表記を外した安全版プロンプト
const RETRY_SPECS: CharacterVoiceSpec[] = [
  {
    slug: 'chopper',
    name: 'チョッパー',
    description: 'Native Japanese. High-pitched cute voice. Shy, innocent, sweet anime mascot character. Easily excited and sometimes nervous. Adorable soft voice with childlike innocence. Timid but brave when needed.',
    sampleText: 'おれは医者だ！みんなの傷を治すのが仕事だ。褒められても嬉しくないんだからな！本当だぞ！でも本当はちょっと嬉しい。怖いものは苦手だけど、仲間を守るためなら頑張れる。いつか何でも治せる医者になりたい。それがおれの夢なんだ。',
  },
  {
    slug: 'itadori',
    name: '虎杖悠仁',
    description: 'Native Japanese. Male. Earnest, kind, determined. Persona: athletic student, genuinely good-hearted. Emotion: compassionate, brave, sometimes conflicted. Youthful energetic voice, sincere delivery, speaks from the heart. Natural energetic voice.',
    sampleText: '正しい死って何だろう。じいちゃんが言ってた、人に囲まれて死ねって。だから俺は、目の前の人を助ける。それが俺にできることだ。強くなきゃ誰も救えない。でも強いだけじゃダメだ。心も強くないと。俺は絶対に諦めない。',
  },
  {
    slug: 'tanjiro',
    name: '竈門炭治郎',
    description: 'Native Japanese. Male. Kind, determined, empathetic. Persona: gentle warrior, protective caring person. Emotion: compassionate, resolute, warm. Clear youthful tenor, earnest sincere delivery, gentle but can become fierce. Speaks with deep empathy.',
    sampleText: '俺は家族を守るために強くなる。禰豆子を人間に戻すまで、絶対に諦めない。相手が鬼でも、その悲しみを感じ取ることができる。優しさと強さは矛盾しない。水の呼吸で、大切な人を守り抜く。頑張れ、俺。頑張ってきたんだから。',
  },
  {
    slug: 'zenitsu',
    name: '我妻善逸',
    description: 'Native Japanese. Male. Cowardly, dramatic, whiny but brave. Persona: scared thunder user who is actually powerful. Emotion: fearful, dramatic, passionate. High-pitched nasal voice, dramatic exaggerated delivery, cries and shouts a lot. Comic relief energy.',
    sampleText: '怖い怖い怖い！俺は弱いんだ、戦いたくないんだ！でも禰豆子ちゃんのためなら頑張れる。雷の呼吸は一つしか使えないけど、その一つを極めてみせる。寝てる時だけ本気出せるって、どういうことだよ。でもいざという時は、仲間を守ってみせる。',
  },
  {
    slug: 'nezuko',
    name: '禰豆子',
    description: 'Native Japanese. Female. Sweet, gentle, protective. Persona: kind girl, caring and protective of family. Emotion: warm, innocent, fierce when protecting loved ones. Soft sweet voice, gentle humming quality, few words but full of emotion. Cute and warm.',
    sampleText: 'お兄ちゃん。大丈夫。私は強いから。みんなを守りたい。優しい気持ちを忘れない。太陽の光は怖いけど、お兄ちゃんがいれば大丈夫。人間に戻れる日を信じてる。お兄ちゃんと一緒にいられるなら、何も怖くない。ありがとう、お兄ちゃん。',
  },
];

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateVoice(spec: CharacterVoiceSpec): Promise<{ voiceId: string; slug: string } | null> {
  try {
    console.log(`\n🎙 Generating voice for ${spec.name} (${spec.slug})...`);
    
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-previews', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_description: spec.description,
        text: spec.sampleText,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ Failed: ${res.status} ${err}`);
      return null;
    }

    const data = await res.json();
    const previews = data.previews || [];
    if (previews.length === 0) {
      console.error(`  ❌ No previews generated`);
      return null;
    }

    const voiceId = previews[0].generated_voice_id;
    console.log(`  ✅ Generated! voice_id: ${voiceId}`);
    
    const saveRes = await fetch('https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_name: `ANIVA_${spec.slug}`,
        voice_description: `ANIVA character voice for ${spec.name}`,
        generated_voice_id: voiceId,
        labels: {
          character: spec.slug,
          project: 'aniva',
          language: 'ja',
        },
      }),
    });

    if (saveRes.ok) {
      const savedData = await saveRes.json();
      const savedVoiceId = savedData.voice_id;
      console.log(`  💾 Saved! Permanent voice_id: ${savedVoiceId}`);
      return { voiceId: savedVoiceId, slug: spec.slug };
    } else {
      const err = await saveRes.text();
      console.error(`  ⚠️ Save failed: ${saveRes.status} ${err}`);
      return null;
    }
  } catch (e) {
    console.error(`  ❌ Error: ${e}`);
    return null;
  }
}

async function main() {
  console.log('🎙 ANIVA Voice Design — Retry blocked characters (age-neutral prompts)');
  console.log(`  Characters: ${RETRY_SPECS.length}\n`);

  const results: { slug: string; voiceId: string }[] = [];
  
  for (const spec of RETRY_SPECS) {
    await sleep(3000);
    const result = await generateVoice(spec);
    if (result) results.push(result);
  }

  console.log('\n\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  console.log('\n\n=== SQL UPDATE ===');
  for (const r of results) {
    console.log(`UPDATE "Character" SET "voiceModelId" = '${r.voiceId}' WHERE slug = '${r.slug}';`);
  }
}

main().catch(console.error);
