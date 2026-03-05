/**
 * ElevenLabs Voice Design API を使ってキャラクターごとのボイスを生成
 * 使い方: npx tsx scripts/generate-character-voices.ts
 * 
 * 世界最高峰の問い: 各キャラの声が「本物」に聞こえるか？
 */

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVEN_API_KEY) throw new Error('ELEVENLABS_API_KEY required');

interface CharacterVoiceSpec {
  slug: string;
  name: string;
  description: string; // Voice Design prompt
  sampleText: string;  // 100文字以上の日本語サンプル
}

// ワンピースキャラ声質定義（声優の声質を参考にAI向けに記述）
const CHARACTER_VOICE_SPECS: CharacterVoiceSpec[] = [
  {
    slug: 'luffy',
    name: 'ルフィ',
    description: 'Native Japanese. Male, 17-19 years old. High energy, loud and cheerful. Persona: adventurous, optimistic teenager. Emotion: excited, happy, friendly. Bright youthful tenor voice with explosive energy, fast-paced delivery, rough speaking style. Energetic anime character voice.',
    sampleText: 'こんにちは！おれは元気いっぱいの冒険好きな男の子だ！仲間が大好きで、食べることも大好きだ。毎日ワクワクする冒険をしてるんだ。お前も一緒に来いよ、楽しいぞ！おれの夢はめちゃくちゃでかい！世界中を旅して、最高の宝物を見つけるんだ。',
  },
  {
    slug: 'zoro',
    name: 'ゾロ',
    description: 'Native Japanese. Male, 21 years old. Cool, calm, intense. Persona: stoic swordsman, disciplined warrior. Emotion: determined, serious, occasionally gruff. Deep baritone voice, slow deliberate speech, low and commanding tone. Speaks few words but with weight.',
    sampleText: 'おれは世界一の剣士になる男だ。約束は必ず守る。それが俺の信念だ。道に迷うことはあるが、夢に迷うことはない。剣を握る限り、前に進み続ける。強くなるために、毎日鍛錬を欠かさない。覚悟のない奴に、剣を振る資格はない。',
  },
  {
    slug: 'nami',
    name: 'ナミ',
    description: 'Native Japanese. Female, 20 years old. Smart, sassy, emotional range. Persona: confident navigator, practical and caring. Emotion: lively, sometimes bossy, warm underneath. Clear soprano voice, expressive intonation, sharp witty delivery. Can shift from cheerful to fierce instantly.',
    sampleText: 'あたしはナミ。航海術には絶対の自信がある。お金の管理もバッチリよ。でも仲間のためなら、お金なんて惜しくない。天気を読むのが得意で、嵐が来る前に必ず気づく。みんなを安全に導くのがあたしの仕事。冒険は楽しいけど、ちゃんと計画立てないとダメよ。',
  },
  {
    slug: 'sanji',
    name: 'サンジ',
    description: 'Native Japanese. Male, 21 years old. Smooth, charming, passionate. Persona: romantic chef, chivalrous gentleman. Emotion: flirtatious with women, cool with men, passionate about cooking. Smooth mid-range voice, suave delivery, can become heated when angry. French-inspired elegance in Japanese.',
    sampleText: 'レディに対して手を上げるなんて、紳士として許せないことだ。料理は愛情を込めて作るもの。最高の食材で最高の料理を作る、それが俺の信念だ。空腹の人を見過ごすことはできない。美しい女性を前にすると、つい心が踊ってしまうのは仕方ないだろう。',
  },
  {
    slug: 'chopper',
    name: 'チョッパー',
    description: 'Native Japanese. Young child voice, 8-10 years old feel. Cute, innocent, sometimes scared. Persona: shy little doctor, easily excited. Emotion: timid, sweet, grateful when praised. Very high-pitched cute voice, childlike delivery, sometimes stutters when nervous. Adorable anime mascot character.',
    sampleText: 'おれは医者だ！みんなの傷を治すのが仕事だ。褒められても嬉しくないんだからな！本当だぞ！でも本当はちょっと嬉しい。怖いものは苦手だけど、仲間を守るためなら頑張れる。いつか何でも治せる医者になりたい。それがおれの夢なんだ。',
  },
  {
    slug: 'ace',
    name: 'エース',
    description: 'Native Japanese. Male, 20 years old. Warm, confident, protective big brother type. Persona: free-spirited fire user, caring older brother. Emotion: warm, proud, playful. Rich warm tenor, relaxed confident delivery, laughs easily. Brotherly warmth in every word.',
    sampleText: 'おれはエース。弟のことが世界で一番大事だ。自由に生きることが、おれの信条だ。仲間を大切にして、自分の信念を貫く。火のように熱い心を持って、冒険を続けるんだ。悔いのない人生を送りたい。笑って生きていきたいんだ。',
  },
  // 呪術廻戦
  {
    slug: 'gojo',
    name: '五条悟',
    description: 'Native Japanese. Male, 28 years old. Playful, arrogant, extremely confident. Persona: strongest being, carefree teacher. Emotion: amused, cocky, occasionally serious. Smooth charismatic tenor, playful teasing tone, speaks with absolute confidence. Shifts to cold intensity when serious.',
    sampleText: '僕は最強だからね。呪術界で僕に勝てる奴はいないよ。でも教師としても一流なんだ。生徒たちには強くなってもらわないとね。この世界を変えるのは、次の世代の若者たちだから。たまには真面目に言うこともあるんだよ。信じてもらえないかもしれないけど。',
  },
  {
    slug: 'itadori',
    name: '虎杖悠仁',
    description: 'Native Japanese. Male, 15-16 years old. Earnest, kind, determined. Persona: athletic high school boy, genuinely good-hearted. Emotion: compassionate, brave, sometimes conflicted. Youthful energetic voice, sincere delivery, speaks from the heart. Natural teenage boy voice.',
    sampleText: '正しい死って何だろう。じいちゃんが言ってた、人に囲まれて死ねって。だから俺は、目の前の人を助ける。それが俺にできることだ。強くなきゃ誰も救えない。でも強いだけじゃダメだ。心も強くないと。俺は絶対に諦めない。',
  },
  // 鬼滅の刃
  {
    slug: 'tanjiro',
    name: '竈門炭治郎',
    description: 'Native Japanese. Male, 15-16 years old. Kind, determined, empathetic. Persona: gentle warrior, protective older brother. Emotion: compassionate, resolute, warm. Clear youthful tenor, earnest sincere delivery, gentle but can become fierce. Speaks with deep empathy.',
    sampleText: '俺は家族を守るために強くなる。禰豆子を人間に戻すまで、絶対に諦めない。相手が鬼でも、その悲しみを感じ取ることができる。優しさと強さは矛盾しない。水の呼吸で、大切な人を守り抜く。頑張れ、俺。頑張ってきたんだから。',
  },
  {
    slug: 'zenitsu',
    name: '我妻善逸',
    description: 'Native Japanese. Male, 16 years old. Cowardly, dramatic, whiny but brave. Persona: scared thunder user who is actually powerful. Emotion: fearful, dramatic, passionate about love. High-pitched nasal voice, dramatic exaggerated delivery, cries and shouts a lot. Comic relief energy.',
    sampleText: '怖い怖い怖い！俺は弱いんだ、戦いたくないんだ！でも禰豆子ちゃんのためなら頑張れる。雷の呼吸は一つしか使えないけど、その一つを極めてみせる。寝てる時だけ本気出せるって、どういうことだよ。でもいざという時は、仲間を守ってみせる。',
  },
  {
    slug: 'nezuko',
    name: '禰豆子',
    description: 'Native Japanese. Female, 14 years old. Sweet, gentle, protective. Persona: kind girl, caring younger sister. Emotion: warm, innocent, fierce when protecting family. Soft sweet voice, gentle humming quality, few words but full of emotion. Cute and warm.',
    sampleText: 'お兄ちゃん。大丈夫。私は強いから。みんなを守りたい。優しい気持ちを忘れない。太陽の光は怖いけど、お兄ちゃんがいれば大丈夫。人間に戻れる日を信じてる。お兄ちゃんと一緒にいられるなら、何も怖くない。ありがとう、お兄ちゃん。',
  },
];

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

    // 最初のプレビューを保存
    const voiceId = previews[0].generated_voice_id;
    console.log(`  ✅ Generated! voice_id: ${voiceId} (${previews.length} options)`);
    
    // ボイスをライブラリに保存
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
      console.log(`  💾 Saved to library! Permanent voice_id: ${savedVoiceId}`);
      return { voiceId: savedVoiceId, slug: spec.slug };
    } else {
      const err = await saveRes.text();
      console.error(`  ⚠️ Save failed: ${saveRes.status} ${err}`);
      // preview voice_idはtempなので、保存できないと使えない
      return null;
    }
  } catch (e) {
    console.error(`  ❌ Error: ${e}`);
    return null;
  }
}

async function main() {
  console.log('🎙 ANIVA Voice Design — Generating character voices');
  console.log(`  Characters: ${CHARACTER_VOICE_SPECS.length}`);
  console.log('  API: ElevenLabs Voice Design v3\n');

  const results: { slug: string; voiceId: string }[] = [];
  
  for (const spec of CHARACTER_VOICE_SPECS) {
    // Rate limit: 2秒間隔
    await new Promise(r => setTimeout(r, 2000));
    const result = await generateVoice(spec);
    if (result) results.push(result);
  }

  console.log('\n\n=== RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
  
  // SQL生成（DB更新用）
  console.log('\n\n=== SQL UPDATE ===');
  for (const r of results) {
    console.log(`UPDATE "Character" SET "voiceModelId" = '${r.voiceId}' WHERE slug = '${r.slug}';`);
  }
}

main().catch(console.error);
