// ============================================================
// Emotion detection and context generation
// ============================================================

import type { MemoryContext, MemorySummaryData } from './types';

/**
 * 感情検出（公開関数 - ストリーミングAPIから利用）
 */
export function extractEmotion(text: string): string {
  return detectEmotion(text);
}

/**
 * 感情検出（AIタグ優先 → キーワードフォールバック）
 */
export function detectEmotion(text: string): string {
  // ── Phase 1: AIが返した感情タグを優先使用 ──
  const tagMatch = text.match(/\[emotion:(\w[\w-]*)\]/);
  if (tagMatch) {
    const validEmotions = new Set([
      'excited', 'angry', 'sad', 'love', 'happy', 'shy', 'confident', 'teasing',
      'surprised', 'moved', 'caring', 'confused', 'relaxed', 'curious', 'fired-up',
      'hungry', 'determined', 'embarrassed', 'thoughtful', 'grateful', 'neutral',
    ]);
    const tagged = tagMatch[1].toLowerCase();
    if (validEmotions.has(tagged)) return tagged;
  }

  // ── Phase 2: フォールバック（キーワードベース、タグなし時のみ） ──

  // 1. 強い興奮・歓喜
  if (/！{2,}|すげぇ|おおー|やった[！!]|最高[だ！!]|ハハ[！!ッ]|よっしゃ|テンション|楽しい[！!]|ワクワク|たまらね[ぇえ]/i.test(text)) return 'excited';

  // 2. 怒り・闘志
  if (/ふざけんな|許さ(?:ない|ねぇ)|ムカつく|怒り|怒って|殺す|ぶっ飛ばす|うるせぇ[！!]|てめぇ|黙れ|ざけんな/.test(text)) return 'angry';

  // 3. 悲しみ・つらさ
  if (/悲し[いく]|つらい|辛い|泣[いきくけ]|涙[がをは]|寂し[いく]|苦し[いく]|胸が痛|失[いっ]た|別れ|もう会えない|死んだ|助けられなかった/.test(text)) return 'sad';

  // 4. 愛情・親密
  if (/(?:お前|あなた|君|きみ)(?:が|の(?:こと|事))好き|愛してる|大切(?:な|だ|にする)|守(?:る|りたい)|ずっと(?:一緒|そばに)|離れない|離さない/.test(text)) return 'love';

  // 5. 喜び・嬉しさ
  if (/嬉し[いく]|ありがと|よかった[なね]|楽しかった|幸せ|にっこり|微笑|笑顔|ししし|ししっ|へへ/.test(text)) return 'happy';

  // 6. 照れ・恥ずかしさ
  if (/照れ|恥ずかし|べ、別に|か、勘違い|う、うるさい[！!]|ば、バカ|そ、そんなこと|赤く(?:なっ|なり)|頬[がを]|ドキッ/.test(text)) return 'shy';

  // 7. 自信・誇り
  if (/任せろ|任せとけ|俺(?:が|に)|私(?:が|に)|見せてやる|余裕[だ！!]|当然だ|当たり前|最強|敵じゃない|簡単だ/.test(text)) return 'confident';

  // 8. からかい・いたずら
  if (/ふふっ|からかう|冗談|ニヤ[ッリ]|いじ[るっ]|面白い(?:なぁ|ね|反応)|可愛い反応|動揺(?:して|しすぎ)/.test(text)) return 'teasing';

  // 9. 驚き
  if (/え[！!？?]{1,}|なに[！!？?]|まさか|本当[か!?？！]|驚|嘘だろ|信じられない|マジ[か!?？！]/.test(text)) return 'surprised';

  // 10. 感動・感慨
  if (/感動|泣ける|胸(?:が|に)(?:熱|こみ)|グッと|ジーン|心(?:に|が)(?:響|染)|素敵|美しい|懐かしい/.test(text)) return 'moved';

  // 11. 心配・気遣い
  if (/大丈夫[？?]|心配|気をつけ|無理(?:する|しない|すんな)|体(?:大事|休)|ちゃんと(?:食|寝|休)|怪我(?:は|して)/.test(text)) return 'caring';

  // 12. 困惑・戸惑い
  if (/え[？?ぇ]|困った|どうしよう|わからない|迷[うっ]|うーん|む[ーう]|悩[むみ]/.test(text)) return 'confused';

  // 13. リラックス・穏やか
  if (/のんびり|ゆっくり|まったり|平和|静か[だな]|落ち着[いく]|癒[やさ]|ほっと|安心/.test(text)) return 'relaxed';

  // 14. 好奇心・興味
  if (/面白(?:い|そう)|気になる|知りたい|教えて|どうなの|どんな|もっと(?:聞|話|詳)|興味|へぇ[〜ー]/.test(text)) return 'curious';

  // 15. 闘志・燃えている
  if (/燃え(?:て|る|ろ)|火拳|メラメラ|全力|本気|勝負|戦[うえ]|挑[むみ]|やってやる|覚悟/.test(text)) return 'fired-up';

  // 16. 食欲
  if (/肉[！!]|飯|食[うべいっ]|うまそう|腹(?:減|へ)|美味[しい]/.test(text)) return 'hungry';

  // 17. やる気・意気込み
  if (/頑張|やるぞ|行くぞ|出発|冒険|進め|前に進|立ち上が|諦めない|負けない/.test(text)) return 'determined';

  // 18. 恥ずかしさ・失敗
  if (/道に迷[っい]|迷子|間違[えっ]|しまった|やらかし|失敗|ミス[っした]/.test(text)) return 'embarrassed';

  // 19. 落ち着き・思慮
  if (/なるほど|確かに|そうだな|考え[るて]|分析|推測|おそらく|つまり/.test(text)) return 'thoughtful';

  // 20. 感謝
  if (/ありがとう[！!]|感謝|恩[にを]|救われ|助かった|おかげ/.test(text)) return 'grateful';

  return 'neutral';
}

/**
 * 感情の理由テキストを生成
 */
export function getEmotionReason(emotion: string, userMessage: string): string {
  const shortMsg = userMessage.slice(0, 50);
  switch (emotion) {
    case 'excited': return `「${shortMsg}」の話題で盛り上がった`;
    case 'happy': return `「${shortMsg}」で嬉しくなった`;
    case 'angry': return `「${shortMsg}」で怒った`;
    case 'sad': return `「${shortMsg}」で悲しくなった`;
    case 'hungry': return `食べ物の話をした`;
    case 'fired-up': return `燃える話題だった`;
    default: return '';
  }
}

/**
 * 前回の感情状態コンテキストを生成
 * 感情持続ルール:
 * - 怒り/悲しみ: 48時間持続
 * - 嬉しい/興奮: 24時間で薄れる
 * - その他: 12時間で薄れる
 */
export function getCharacterEmotionContext(memory: MemoryContext): string {
  if (!memory.characterEmotion || memory.characterEmotion === 'neutral') return '';

  const emotionLabels: Record<string, string> = {
    'excited': 'テンションが上がっている',
    'happy': '嬉しい気持ち',
    'angry': '怒っている',
    'sad': '悲しい気持ち',
    'love': '愛情を感じている',
    'shy': '照れている',
    'confident': '自信に満ちている',
    'teasing': 'いたずらっぽい気分',
    'surprised': '驚いている',
    'moved': '感動している',
    'caring': '相手を心配している',
    'confused': '戸惑っている',
    'relaxed': 'リラックスしている',
    'curious': '興味津々',
    'fired-up': '闘志が燃えている',
    'hungry': '腹が減っている',
    'determined': 'やる気に満ちている',
    'embarrassed': '恥ずかしい',
    'thoughtful': '考え込んでいる',
    'grateful': '感謝の気持ち',
  };

  const persistenceHours: Record<string, number> = {
    'angry': 48, 'sad': 48, 'love': 48, 'excited': 24, 'happy': 24,
    'fired-up': 24, 'determined': 24, 'confident': 24, 'moved': 24,
    'grateful': 24, 'caring': 12, 'curious': 12, 'shy': 12,
    'embarrassed': 12, 'teasing': 6, 'hungry': 6, 'surprised': 6,
    'confused': 6, 'relaxed': 12, 'thoughtful': 12,
  };

  const maxHours = persistenceHours[memory.characterEmotion] ?? 12;
  let hoursSince = 0;
  if (memory.emotionUpdatedAt) {
    hoursSince = (Date.now() - new Date(memory.emotionUpdatedAt).getTime()) / (1000 * 60 * 60);
  }

  if (hoursSince > maxHours) {
    if (memory.characterEmotion === 'angry' && hoursSince < maxHours * 2) {
      return `- 前回の感情状態: まだ少しすねている（${Math.floor(hoursSince)}時間前に怒った。まだ完全に許してない）\n- ⚠️ 最初の発言は少しそっけなくすること。謝られたら徐々に態度を和らげる`;
    }
    if (memory.characterEmotion === 'sad' && hoursSince < maxHours * 2) {
      return `- 前回の感情状態: まだ少し元気がない（${Math.floor(hoursSince)}時間前に悲しかった）\n- 最初は少し静かだが、話しかけてくれたことで嬉しくなる`;
    }
    return '';
  }

  const label = emotionLabels[memory.characterEmotion] || memory.characterEmotion;
  let context = `- 前回の感情状態: ${label}`;
  if (memory.characterEmotionNote) {
    context += `（理由: ${memory.characterEmotionNote}）`;
  }

  if (hoursSince < 1) {
    context += '（つい先ほどのこと。感情がとても強い）';
  } else if (hoursSince < 6) {
    context += '（まだはっきり覚えている）';
  } else if (hoursSince < 24) {
    context += '（少し落ち着いたが、まだ引きずっている）';
  } else {
    context += '（だいぶ前のことだが、心のどこかに残っている）';
  }

  if (memory.characterEmotion === 'angry') {
    context += '\n- ⚠️ まだ怒っている。最初は少し冷たい態度。相手が謝ったら徐々に和らげる。謝らなければ言及する';
  } else if (memory.characterEmotion === 'sad') {
    context += '\n- まだ悲しみが残っている。最初は少し静か。相手が気にかけてくれたら嬉しさを見せる';
  }

  return context;
}
