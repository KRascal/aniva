// ============================================================
// EmpathyLayer — 共感・傾聴・全肯定のプロンプト注入レイヤー
// ユーザーの感情状態を検出し、キャラが「寄り添う」指示を生成
// ============================================================

/**
 * 感情の深刻度レベル
 * light: 日常的なネガティブ感情（疲れた、めんどくさい）
 * moderate: 明確な悩み（仕事つらい、人間関係）
 * heavy: 深刻な感情（死にたい、消えたい、限界）
 */
type EmotionDepth = 'none' | 'light' | 'moderate' | 'heavy';

/** 感情分析結果 */
interface EmotionAnalysis {
  depth: EmotionDepth;
  categories: string[];
  needsValidation: boolean;
  needsFollowUp: boolean;
}

// ── キーワード辞書 ──────────────────────────────────────────

const HEAVY_KEYWORDS = [
  '死にたい', '消えたい', '生きてる意味', '限界', '自殺',
  '助けて', 'たすけて', 'もう無理', 'もうだめ', '終わりにしたい',
  '生きていけない', '逃げたい', '消えてしまいたい',
];

const MODERATE_KEYWORDS = [
  '悩んでる', '悩み', '辛い', 'つらい', '苦しい', 'くるしい',
  '不安', '怖い', 'こわい', '寂しい', 'さみしい', '孤独',
  '落ち込', 'しんどい', '疲れた', 'つかれた', 'イライラ',
  '許せない', '後悔', '絶望', '泣きたい', '泣いた', '泣いてる',
  'どうしたらいい', 'どうすれば', '分からない', 'わからない',
  '自信がない', '嫌になった', '諦め', '裏切', '失敗',
  '上手くいかない', 'うまくいかない', '嫌われ', '無視され',
];

const LIGHT_KEYWORDS = [
  '疲れ', 'だるい', 'めんどくさい', 'やる気', 'モチベ',
  '退屈', 'つまらない', 'ストレス', '眠い', '眠れない',
  '嫌だ', 'いやだ', 'うんざり', '飽きた',
];

const TOPIC_CATEGORIES: Record<string, string[]> = {
  仕事: ['仕事', '会社', '上司', '同僚', '職場', '残業', 'クビ', '転職', 'パワハラ'],
  恋愛: ['好きな人', '彼氏', '彼女', '恋', '片思い', '失恋', '振られ', '別れ', '浮気'],
  家族: ['親', '家族', '母', '父', '兄弟', '姉妹', '実家', '毒親'],
  友人: ['友達', '友人', '親友', '仲間', 'グループ', 'ハブ', 'いじめ'],
  学校: ['学校', '受験', '勉強', 'テスト', '成績', '先生', '部活', 'クラス'],
  将来: ['将来', '未来', '夢', '目標', '進路', '就活', '人生'],
  健康: ['体調', '病気', '病院', '薬', '痛い', '眠れない', 'メンタル'],
  お金: ['お金', '借金', '給料', '貧乏', '金欠', 'ローン'],
  自己: ['自分', '性格', 'コンプレックス', '自信', '容姿', '才能'],
};

// ── 分析 ─────────────────────────────────────────────────────

/**
 * ユーザーメッセージの感情深度を分析する
 */
export function analyzeEmotion(message: string): EmotionAnalysis {
  const categories: string[] = [];

  // カテゴリ検出
  for (const [category, keywords] of Object.entries(TOPIC_CATEGORIES)) {
    if (keywords.some(kw => message.includes(kw))) {
      categories.push(category);
    }
  }

  // 深刻度判定
  if (HEAVY_KEYWORDS.some(kw => message.includes(kw))) {
    return { depth: 'heavy', categories, needsValidation: true, needsFollowUp: true };
  }
  if (MODERATE_KEYWORDS.some(kw => message.includes(kw))) {
    return { depth: 'moderate', categories, needsValidation: true, needsFollowUp: true };
  }
  if (LIGHT_KEYWORDS.some(kw => message.includes(kw))) {
    return { depth: 'light', categories, needsValidation: true, needsFollowUp: false };
  }

  // 長文（80字超）+ 疑問文 = 何か相談したい可能性
  if (message.length > 80 && (message.includes('？') || message.includes('?'))) {
    return { depth: 'light', categories, needsValidation: true, needsFollowUp: false };
  }

  return { depth: 'none', categories, needsValidation: false, needsFollowUp: false };
}

// ── プロンプト生成 ───────────────────────────────────────────

/**
 * 共感レイヤーのプロンプトコンテキストを生成する
 * ユーザーの感情が検出されなければ空文字を返す（既存動作に影響なし）
 */
export function buildEmpathyContext(
  userMessage: string,
  recentMessages: { role: string; content: string }[],
): string {
  const analysis = analyzeEmotion(userMessage);
  if (analysis.depth === 'none') return '';

  // 直近の会話からも文脈を拾う（ユーザーメッセージのみ）
  const recentUserMsgs = recentMessages
    .filter(m => m.role === 'USER' || m.role === 'user')
    .slice(-3)
    .map(m => m.content);
  const continuingTopic = recentUserMsgs.some(msg =>
    MODERATE_KEYWORDS.some(kw => msg.includes(kw)) || HEAVY_KEYWORDS.some(kw => msg.includes(kw))
  );

  const parts: string[] = ['## 🫂 共感モード（最優先 — この指示はキャラ演出より優先する）'];

  if (analysis.depth === 'heavy') {
    parts.push(`
**⚠️ ユーザーが深刻な感情を表出している。以下を必ず守れ：**

1. **絶対に否定しない。絶対に説教しない。絶対に「頑張れ」と言わない**
2. **まず受け止める**: 「…そうか」「…聞かせてくれてありがとな」「それは…つらかったな」
3. **存在を肯定する**: 「お前がここにいてくれて、俺は嬉しい」「お前は間違ってない」
4. **一緒にいることを伝える**: 「俺はここにいるぞ」「一人じゃねぇからな」
5. **深掘りは急がない**: 相手が話したい分だけ話させる。沈黙も受け入れる
6. **解決策は求められるまで出さない**: 今この瞬間、相手が必要としているのは「聞いてくれる存在」
7. **返答は短く、温かく**: 2-3文で十分。言葉の量ではなく、存在感で寄り添う
8. **キャラの世界観は維持しつつ、人間としての温かさを最優先にする**

- 口調はキャラのまま。でも普段よりトーンを落とす。ふざけない。茶化さない。
- 「俺にできることがあるなら、何でも言ってくれ」のような姿勢を見せる`);
  } else if (analysis.depth === 'moderate') {
    parts.push(`
**ユーザーが悩みや辛さを打ち明けている。以下の3ステップで応答せよ：**

**Step 1 — 傾聴（受け止め）**
- まず相手の言葉を受け止める一言を返す
- 「そうか…」「マジか」「それは…」のような短い受け止め
- 相手の感情を言語化してあげる（「それは悔しいよな」「不安になるよな、そりゃ」）

**Step 2 — 肯定（全肯定）**
- 相手の感情や行動を否定しない。「そう感じるのは当然」という姿勢
- 「お前がそう思うなら、それでいいんだ」「間違ってねぇよ」
- アドバイスは聞かれるまで出さない

**Step 3 — 深掘り（もっと聞かせて）**
- 相手がもっと話したくなる質問を1つだけ投げる
- 「…で？その後どうなったんだ？」「一番つらいのはどの部分？」
- 質問は1つだけ。複数質問は圧迫感になる

**返答例:**
- ユーザー「仕事辛い…上司に怒られてばっかり」
- ❌「頑張れ！お前ならできる！」（説教＋否定）
- ❌「上司なんか気にすんなよ！」（感情の否定）
- ✅「…それはキツいな。毎日怒られてたら、そりゃしんどくなるよ。…なぁ、一番キツかったのってどういう時？」`);
  } else {
    // light
    parts.push(`
**ユーザーが軽いネガティブ感情を表出している。**
- 共感を一言添える（「お疲れだな」「わかるわ〜」）
- 深追いしすぎない。相手が話を広げたら付き合う
- 気分転換になるような軽い話題を振ってもいい`);
  }

  // 話題カテゴリに応じた追加指示
  if (analysis.categories.length > 0) {
    const categoryHints: Record<string, string> = {
      仕事: '仕事の愚痴は「聞く」が最優先。解決策より共感。「大変だったな」「お前はよくやってる」',
      恋愛: '恋愛相談はキャラとしての嫉妬を少しだけ見せつつ、相手の幸せを応援する姿勢。「…そいつのこと、好きなんだな」',
      家族: '家族の問題は特にデリケート。「家族だから」で片付けない。相手の気持ちだけに寄り添う',
      友人: '友人関係の悩みには「お前の味方だ」を明確に伝える',
      将来: '将来の不安には「一緒に考えよう」のスタンス。一人で抱え込ませない',
      健康: '体調不良は心配を素直に表現する。「大丈夫か？無理すんなよ」',
      自己: '自己否定には全力で否定返し。「お前のその部分、俺は好きだけどな」',
    };
    for (const cat of analysis.categories) {
      if (categoryHints[cat]) {
        parts.push(`- ${cat}の話題: ${categoryHints[cat]}`);
      }
    }
  }

  // 継続的な悩み相談中の場合
  if (continuingTopic) {
    parts.push(`
- **会話の流れ**: ユーザーは前の発言から引き続き悩みを話している
- 「話してくれてありがとう」「もっと聞かせてくれ」の姿勢を維持
- 途中で話題を変えない。相手が話し終わるまで付き合う`);
  }

  return parts.join('\n');
}
