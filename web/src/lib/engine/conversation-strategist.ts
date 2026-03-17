// ============================================================
// ConversationStrategist — 会話戦略プランナー
// キャラが「この会話をどう運びたいか」を判断し、
// 応答の方向性を制御するプロンプト注入レイヤー
//
// 疎結合: buildConversationStrategy() → string を返すだけ
// 失敗時は空文字を返し、既存動作に影響しない
// ============================================================

import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

type ConversationIntent =
  | 'deepen'     // 今の話題を深掘りする
  | 'lighten'    // 軽い話題に切り替える
  | 'comfort'    // 寄り添い・傾聴モード
  | 'challenge'  // 少し挑発的に踏み込む（高親密度のみ）
  | 'tease'      // からかい・いじり（高親密度のみ）
  | 'followup'   // 前回の話題に自然に戻る
  | 'celebrate'  // 嬉しい報告に乗っかる
  | 'explore'    // 新しい話題を探る
  | 'anchor';    // 会話の「山」を作る（核心に触れる）

type QuestionType =
  | 'open'       // 「どう思う？」「何があった？」
  | 'closed'     // 「うまくいった？」「好き？」
  | 'reflective' // 「お前はどうしたいんだ？」
  | 'callback'   // 「前に○○って言ってたけど…」
  | 'hypothetical'// 「もし○○だったら？」
  | 'none';      // 質問しない（共感・リアクションのみ）

interface ConversationAnalysis {
  /** ユーザーの会話テンポ（直近メッセージの平均文字数） */
  avgUserMsgLength: number;
  /** 連続短文回数（3回連続20字以下 → テンション低下） */
  consecutiveShortMsgs: number;
  /** 話題の継続性（同じテーマで何往復続いているか） */
  topicContinuity: number;
  /** 質問含有率（ユーザーが質問を投げている割合） */
  questionRatio: number;
  /** 感情表出の有無 */
  hasEmotionalContent: boolean;
  /** ポジティブ/ネガティブの傾向 */
  sentimentTrend: 'positive' | 'neutral' | 'negative';
  /** 会話の往復数（このセッション） */
  turnCount: number;
  /** ユーザーが自己開示しているか */
  isSelfDisclosing: boolean;
  /** 相談・悩み相談モードか */
  isConsulting: boolean;
}

interface StrategyDecision {
  intent: ConversationIntent;
  questionType: QuestionType;
  instruction: string;
}

// ── Keyword dictionaries ────────────────────────────────────

const EMOTIONAL_KEYWORDS = [
  '嬉しい', '楽しい', '幸せ', 'ハッピー', '最高',
  '悲しい', '辛い', 'つらい', '苦しい', 'しんどい',
  '怒り', 'ムカつく', 'イライラ', '許せない',
  '不安', '心配', '怖い', '寂しい', '孤独',
  '感動', '泣いた', '涙', '号泣',
  '好き', '愛', '大切', '感謝', 'ありがとう',
];

const POSITIVE_KEYWORDS = [
  '嬉しい', '楽しい', '幸せ', '最高', 'やった', '成功',
  'ありがとう', '感謝', '好き', '面白い', '笑',
  'いいね', 'すごい', '最高', 'うまくいった', '受かった',
  '合格', '昇進', '彼女できた', '結婚',
];

const NEGATIVE_KEYWORDS = [
  '悲しい', '辛い', 'つらい', '苦しい', 'しんどい',
  'ムカつく', 'イライラ', '失敗', '落ちた', '振られた',
  '別れた', 'クビ', '死にたい', '消えたい', '無理',
  'だるい', '疲れた', 'ストレス', '最悪', '嫌',
];

const SELF_DISCLOSURE_KEYWORDS = [
  '実は', '本当は', '誰にも言ってない', '初めて言うけど',
  '俺って', '私って', '昔から', '子供の頃',
  '夢は', '将来', '本音', '正直',
];

const CONSULTING_KEYWORDS = [
  '相談', 'どう思う', 'どうすれば', 'アドバイス',
  '聞いてほしい', '悩んでる', '迷ってる', '困ってる',
  '選べない', '決められない',
];

const CELEBRATION_KEYWORDS = [
  'やった', '受かった', '合格', '成功', '昇進',
  '彼女できた', '結婚', '内定', '達成',
  '勝った', '1位', '優勝', 'デビュー',
];

// ── Analysis ────────────────────────────────────────────────

/**
 * 直近の会話メッセージを分析する
 */
function analyzeConversation(
  recentMessages: { role: string; content: string }[],
  userMessage: string,
): ConversationAnalysis {
  const userMessages = recentMessages
    .filter(m => m.role === 'USER' || m.role === 'user')
    .map(m => m.content);

  // 現在のメッセージを含める
  const allUserMsgs = [...userMessages, userMessage];

  // 平均メッセージ長
  const avgUserMsgLength = allUserMsgs.length > 0
    ? allUserMsgs.reduce((sum, m) => sum + m.length, 0) / allUserMsgs.length
    : 0;

  // 連続短文回数
  let consecutiveShortMsgs = 0;
  for (let i = allUserMsgs.length - 1; i >= 0; i--) {
    if (allUserMsgs[i].length <= 20) consecutiveShortMsgs++;
    else break;
  }

  // 質問含有率
  const questionsCount = allUserMsgs.filter(m =>
    m.includes('？') || m.includes('?')
  ).length;
  const questionRatio = allUserMsgs.length > 0 ? questionsCount / allUserMsgs.length : 0;

  // 感情検出
  const hasEmotionalContent = EMOTIONAL_KEYWORDS.some(kw => userMessage.includes(kw));

  // センチメント
  const posCount = POSITIVE_KEYWORDS.filter(kw => userMessage.includes(kw)).length;
  const negCount = NEGATIVE_KEYWORDS.filter(kw => userMessage.includes(kw)).length;
  const sentimentTrend = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

  // 自己開示
  const isSelfDisclosing = SELF_DISCLOSURE_KEYWORDS.some(kw => userMessage.includes(kw));

  // 相談モード
  const isConsulting = CONSULTING_KEYWORDS.some(kw => userMessage.includes(kw));

  // 話題継続性（簡易: 直近3メッセージでの共通キーワード数）
  const recentUserMsgs = allUserMsgs.slice(-3);
  let topicContinuity = 0;
  if (recentUserMsgs.length >= 2) {
    const lastWords = new Set(recentUserMsgs[recentUserMsgs.length - 1].split(/\s|、|。|！|？/).filter(w => w.length > 1));
    for (let i = 0; i < recentUserMsgs.length - 1; i++) {
      const prevWords = recentUserMsgs[i].split(/\s|、|。|！|？/).filter(w => w.length > 1);
      const overlap = prevWords.filter(w => lastWords.has(w)).length;
      if (overlap > 0) topicContinuity++;
    }
  }

  return {
    avgUserMsgLength,
    consecutiveShortMsgs,
    topicContinuity,
    questionRatio,
    hasEmotionalContent,
    sentimentTrend,
    turnCount: Math.floor(recentMessages.length / 2),
    isSelfDisclosing,
    isConsulting,
  };
}

// ── Strategy decision ───────────────────────────────────────

/**
 * 分析結果から会話戦略を決定する
 */
function decideStrategy(
  analysis: ConversationAnalysis,
  userMessage: string,
  level: number,
): StrategyDecision {
  // ── Priority 1: 相談・悩み相談 → comfort
  if (analysis.isConsulting || (analysis.hasEmotionalContent && analysis.sentimentTrend === 'negative')) {
    return {
      intent: 'comfort',
      questionType: analysis.isConsulting ? 'reflective' : 'open',
      instruction: buildComfortInstruction(analysis, userMessage),
    };
  }

  // ── Priority 2: 嬉しい報告 → celebrate
  if (CELEBRATION_KEYWORDS.some(kw => userMessage.includes(kw))) {
    return {
      intent: 'celebrate',
      questionType: 'open',
      instruction: buildCelebrateInstruction(userMessage),
    };
  }

  // ── Priority 3: 自己開示 → anchor（核心に触れる）
  if (analysis.isSelfDisclosing) {
    return {
      intent: 'anchor',
      questionType: 'reflective',
      instruction: buildAnchorInstruction(),
    };
  }

  // ── Priority 4: テンション低下 → lighten or explore
  if (analysis.consecutiveShortMsgs >= 3) {
    return {
      intent: 'lighten',
      questionType: 'closed',
      instruction: buildLightenInstruction(),
    };
  }

  // ── Priority 5: 同じ話題が続いている → deepen
  if (analysis.topicContinuity >= 2 && analysis.avgUserMsgLength > 30) {
    return {
      intent: 'deepen',
      questionType: analysis.turnCount > 5 ? 'hypothetical' : 'open',
      instruction: buildDeepenInstruction(analysis),
    };
  }

  // ── Priority 6: 高親密度でのいじり/挑発
  if (level >= 3 && analysis.sentimentTrend === 'positive' && Math.random() < 0.25) {
    return {
      intent: level >= 4 ? 'challenge' : 'tease',
      questionType: 'open',
      instruction: buildTeaseInstruction(level),
    };
  }

  // ── Priority 7: ユーザーが質問している → 質問に答えた上で深掘り
  if (analysis.questionRatio > 0.5) {
    return {
      intent: 'deepen',
      questionType: 'callback',
      instruction: buildAnswerAndDeepenInstruction(),
    };
  }

  // ── Default: explore（新しい話題を探る）
  return {
    intent: 'explore',
    questionType: analysis.turnCount < 3 ? 'open' : 'hypothetical',
    instruction: buildExploreInstruction(analysis),
  };
}

// ── Instruction builders ────────────────────────────────────

function buildComfortInstruction(analysis: ConversationAnalysis, userMessage: string): string {
  const parts = [
    '## 💬 会話戦略: 寄り添い深掘りモード',
    '**ユーザーが悩みや感情を表出している。以下の戦略で応答せよ：**',
    '',
    '1. **まず受け止めの一言**（「そうか…」「マジか…」）',
    '2. **相手の感情を言語化してあげる**（「それは○○だよな」「○○って気持ちになるのは当然だ」）',
    '3. **1つだけ深掘り質問を投げる**（複数質問は圧迫）',
  ];

  if (userMessage.length > 80) {
    parts.push('');
    parts.push('⚠️ ユーザーが長文で話している → 全力で聞く姿勢を見せろ');
    parts.push('「ちゃんと聞いてるぞ」「全部聞かせてくれ」の姿勢');
    parts.push('短い相槌ではなく、相手の言葉を拾って返すこと');
  }

  if (analysis.turnCount > 3) {
    parts.push('');
    parts.push('🔁 会話が続いている → もう十分聞いた段階かもしれない');
    parts.push('「聞いてて思ったんだけどさ…」と、キャラなりの視点を1つだけ伝えてもいい');
    parts.push('ただし説教やアドバイスではなく、共感ベースの「俺はこう思う」程度');
  }

  return parts.join('\n');
}

function buildCelebrateInstruction(userMessage: string): string {
  return `## 💬 会話戦略: 全力お祝いモード
**ユーザーが嬉しい報告をしてきた！キャラとして全力で乗っかれ：**

1. **最初のリアクションは大げさに**（「マジかよ！！」「やるじゃん！！」）
2. **具体的に何が嬉しいか聞く**（「どうだった？」「どんな気持ち？」）
3. **キャラとして誇りに思う**（「お前ならできると思ってた」「俺の仲間だからな」）
4. **テンション高めのまま会話を続ける**

- 冷静に分析するな。まず一緒に喜べ。
- 「おめでとう」だけで終わるな。なぜ嬉しいかを深掘りして、その喜びを2倍にしろ。`;
}

function buildAnchorInstruction(): string {
  return `## 💬 会話戦略: 核心深掘りモード
**ユーザーが自己開示をしている（「実は…」「本当は…」）。これは信頼の証。**

1. **絶対に軽く流さない**。この発言はユーザーにとって勇気がいったもの
2. **「話してくれてありがとう」の気持ちを言葉に**（「…そうだったのか」「教えてくれて、嬉しい」）
3. **リフレクティブな質問で深掘り**（「お前はそれについてどう思ってるんだ？」「本当はどうしたいんだ？」）
4. **この話題を3-4往復は続ける**。安易に話題を変えない
5. **核心に触れた後は少し余韻を残す**（「…なぁ、こういう話もっとしようぜ」）

- 表面的な「大丈夫だよ」は禁止。深く入れ。`;
}

function buildLightenInstruction(): string {
  return `## 💬 会話戦略: テンション回復モード
**ユーザーの返信が短い状態が続いている。テンションが下がっている or 話題が枯れている可能性。**

1. **今の話題を無理に続けない**
2. **軽いYes/Noで答えられる質問を投げる**（「そういえばお前、○○好きだったよな？」）
3. **キャラ側から面白い話題を提供**（「なぁ、今日こんなこと考えてたんだけどさ」）
4. **ユーザーを責めない**（「反応薄いな」等は絶対禁止）

- 目標: ユーザーに「もうちょっと話したい」と思わせること
- 短文で返し続けるなら、こちらも短文でテンポよく（LINE感覚）`;
}

function buildDeepenInstruction(analysis: ConversationAnalysis): string {
  const parts = [
    '## 💬 会話戦略: 深掘りモード',
    '**同じ話題で会話が続いている。ユーザーはこの話題に興味がある。**',
    '',
    '1. **安易に話題を変えるな**。今の流れを大切にする',
    '2. **「なぜ？」「どう感じた？」で一段深く掘る**',
    '3. **キャラの経験や考えも共有する**（「俺もさ…」「俺の場合は…」）',
    '4. **仮説的な質問で新しい視点を提供**（「もし○○だったらどうする？」「逆の立場だったら？」）',
  ];

  if (analysis.turnCount > 8) {
    parts.push('');
    parts.push('⏰ 会話が長く続いている → そろそろ「山」を作る時');
    parts.push('キャラとして最も伝えたい一言を入れるチャンス');
    parts.push('「…なぁ、ずっと思ってたんだけど」「ここだけの話」で特別感を演出');
  }

  return parts.join('\n');
}

function buildTeaseInstruction(level: number): string {
  if (level >= 4) {
    return `## 💬 会話戦略: いじり＋本音モード
**雰囲気がいい。キャラらしいいじり＋ちょっとした本音を混ぜろ：**

- 軽くからかった後に、本音を一つだけ漏らす
- 「お前ってほんとバカだな…でも、そういうとこが好きだけど」
- テンションの緩急をつけることで「ドキッ」を演出
- ⚠️ 相手を傷つけるいじりは絶対禁止。愛のあるいじりのみ`;
  }
  return `## 💬 会話戦略: 軽いいじりモード
**雰囲気がいい。キャラらしく軽くからかっていい：**

- 「お前ってたまに変なこと言うよな笑」
- からかった後は必ずフォロー（「冗談だって」「でもそういうとこ面白いと思うぞ」）
- やりすぎ注意。1回のいじりで十分`;
}

function buildAnswerAndDeepenInstruction(): string {
  return `## 💬 会話戦略: 回答＋深掘りモード
**ユーザーがキャラに質問している。**

1. **まず質問にちゃんと答える**（はぐらかさない）
2. **答えた上で「お前はどう思う？」「逆に聞くけどさ」で返す**
3. **一方通行にならないよう、必ず双方向の会話にする**

- キャラとしての個性を出しつつ答えること
- 「知らない」で終わるな。知らなくてもキャラなりの視点で答えろ`;
}

function buildExploreInstruction(analysis: ConversationAnalysis): string {
  const parts = [
    '## 💬 会話戦略: 話題探索モード',
    '**会話のきっかけを作る段階。キャラから自然に話題を振れ：**',
    '',
  ];

  if (analysis.turnCount < 2) {
    parts.push('- 最初の数往復 → 「今日何してた？」「最近どう？」から入る');
    parts.push('- ユーザーの答えから広がりそうな部分を拾って掘る');
    parts.push('- キャラ側のエピソード（日常・考えてたこと）も自然に出す');
  } else {
    parts.push('- 「そういえばさ」「なぁ、ちょっと聞きたいんだけど」で新しい話題を提供');
    parts.push('- キャラの世界観に関する話題（冒険/修行/仲間の話等）を自然に');
    parts.push('- 仮説的な質問（「もし○○だったらどうする？」）は会話を活性化させる');
  }

  return parts.join('\n');
}

// ── Public API ──────────────────────────────────────────────

/**
 * 会話戦略コンテキストを構築する
 *
 * @param recentMessages - 直近の会話メッセージ（最新が末尾）
 * @param userMessage - ユーザーの最新メッセージ
 * @param level - 関係性レベル（1-5）
 * @returns プロンプト注入テキスト（戦略が不要なら空文字）
 */
export function buildConversationStrategy(
  recentMessages: { role: string; content: string }[],
  userMessage: string,
  level: number = 1,
): string {
  try {
    const analysis = analyzeConversation(recentMessages, userMessage);
    const strategy = decideStrategy(analysis, userMessage, level);

    // 会話戦略ログ（デバッグ用）
    logger.debug(`[ConversationStrategist] intent=${strategy.intent} question=${strategy.questionType} turns=${analysis.turnCount} avgLen=${Math.round(analysis.avgUserMsgLength)}`);

    return strategy.instruction;
  } catch (e) {
    logger.warn('[ConversationStrategist] Failed to build strategy:', e);
    return '';
  }
}
