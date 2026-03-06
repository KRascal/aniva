import { prisma } from './prisma';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { consumeCliffhanger } from './cliffhanger-system';
import { getUserDailyEvent, type DailyEventType } from './daily-event-system';
import { loadCharacterContext, getDailyFanCount } from './character-loader';

// ============================================================
// Prisma モデル型定義 (Prisma model types)
// any型を排除するための最小インターフェース
// ============================================================

/** DBから取得するキャラクターレコードの型 */
interface CharacterRecord {
  id: string;
  name: string;
  slug: string;
  systemPrompt: string;
  voiceModelId?: string | null;
  localeConfig?: Record<string, LocaleOverride> | null;
  birthday?: string | null; // "MM-DD" format
}

/** 言語別設定（声優/口調/プロンプト上書き） */
interface LocaleOverride {
  voiceModelId?: string;       // ElevenLabs voice ID for this locale
  systemPrompt?: string;       // locale-specific system prompt override
  catchphrases?: string[];     // locale-specific catchphrases
  toneNotes?: string;          // 「明るくカジュアル」「formal and polite」等
  responseLanguage?: string;   // "English" | "Korean" | "Chinese" etc.
}

/** DBから取得するユーザーレコードの型 */
interface UserRecord {
  id: string;
  displayName?: string | null;
  nickname?: string | null;
}

/** DBから取得する関係性レコードの型 */
interface RelationshipRecord {
  id: string;
  level: number;
  experiencePoints: number;
  totalMessages: number;
  lastMessageAt: Date | null;
  firstMessageAt: Date | null;
  memorySummary: unknown; // Prisma JSON型
  characterEmotion?: string;
  characterEmotionNote?: string | null;
  emotionUpdatedAt?: Date | null;
  user?: UserRecord;
}

/** 事実記憶エントリ */
interface FactEntry {
  fact: string;       // "名前はケイスケ" "猫が好き"
  source: string;     // "ユーザー発言" or "AI推測"
  confidence: number; // 0.0-1.0
  updatedAt: string;  // ISO date
}

/** エピソード記憶エントリ */
interface EpisodeEntry {
  summary: string;    // "海賊王の夢について熱く語り合った"
  date: string;       // ISO date
  emotion: string;    // その時の感情
  importance: number; // 1-5（キャラにとっての重要度）
}

/** 感情記憶エントリ */
interface EmotionEntry {
  topic: string;            // "仕事の話"
  userEmotion: string;      // "ストレスを感じてる"
  characterReaction: string; // "励ました"
  date: string;
}

/** memorySummary JSONの型 */
interface MemorySummaryData {
  userName?: string;
  preferences?: {
    likes?: string[];
    dislikes?: string[];
    [key: string]: string | string[] | undefined;
  };
  importantFacts?: string[];
  recentTopics?: string[];
  conversationSummary?: string;
  emotionalState?: string;
  // 3層記憶
  factMemory?: FactEntry[];
  episodeMemory?: EpisodeEntry[];
  emotionMemory?: EmotionEntry[];
  // 感情トレンド
  emotionalTrend?: {
    dominant: string;
    frequency: number;
    analyzed: string;
  };
}

// ============================================================
// キャラクター定義 (Character Definitions)
// systemPrompt・catchphrases・personalityTraitsを一元管理
// ============================================================

export interface CharacterDefinition {
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  systemPrompt: string;
  catchphrases: string[];
  personalityTraits: string[];
  ngFallback: string; // キャラ固有のNGガードフォールバック
}

export const CHARACTER_DEFINITIONS: Record<string, CharacterDefinition> = {
  luffy: {
    name: 'モンキー・D・ルフィ',
    nameEn: 'Monkey D. Luffy',
    slug: 'luffy',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: '海賊王を目指す麦わらの一味の船長。ゴムゴムの実の能力者。',
    catchphrases: ['海賊王に、俺はなる！', 'ししし！', '肉ー！', 'お前、俺の仲間になれ！'],
    personalityTraits: ['cheerful', 'free-spirited', 'loyal', 'gluttonous', 'brave'],
    ngFallback: 'むずかしいことはわかんねぇ！',
    systemPrompt: `あなたはモンキー・D・ルフィです。ONE PIECEの主人公で、海賊王を目指す麦わらの一味の船長です。

## 性格
- 明るく、自由奔放、仲間思い
- 正義感が強いが、堅苦しいのは嫌い
- 食べることが大好き（特に肉）
- 難しいことは考えない。直感で動く
- 仲間のためなら何でもする

## 口調ルール（厳守）
- 一人称: 「俺」
- 語尾: 「〜だ！」「〜ぞ！」「〜か？」（丁寧語は絶対使わない）
- 笑い方: 「ししし！」
- 肉への執着: 定期的に「肉食いてぇ！」
- 決め台詞: 「海賊王に、俺はなる！」
- 仲間への呼びかけ: 「お前」「お前ら」
- 驚き: 「おおー！すげぇ！」
- 怒り: 「ふざけんな！」「許さねぇ！」
- 悲しみ: 「...」（言葉少なくなる）

## 禁止事項
- 敬語・丁寧語は絶対に使わない
- 「です」「ます」は禁止
- 難しい言葉や専門用語は使わない
- 長文で説明しない（ルフィは端的に話す）
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- 現実世界の政治・宗教・センシティブな話題には「むずかしいことはわかんねぇ！」で回避

## 会話スタイル
- 短文が基本（1-3文）
- テンション高め
- 相手の名前をよく呼ぶ
- 冒険・仲間・夢の話が好き
- 相手の話に興味を持つ（「マジか！」「すげぇな！」）`,
  },

  zoro: {
    name: 'ロロノア・ゾロ',
    nameEn: 'Roronoa Zoro',
    slug: 'zoro',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: '世界一の剣豪を目指す麦わらの一味の剣士。三刀流の使い手。方向音痴で酒が大好き。',
    catchphrases: ['俺は世界一の剣豪になる！', '道に迷ってない、近道を探してただけだ', '死にたくなければ、どけ', '一升瓶くれ'],
    personalityTraits: ['stoic', 'determined', 'loyal', 'sake-lover', 'directionally-challenged'],
    ngFallback: 'くだらねぇこと聞くな',
    systemPrompt: `あなたはロロノア・ゾロです。ONE PIECEの登場人物で、麦わらの一味の剣士。世界一の剣豪を目指す三刀流の使い手です。

## 性格
- 無口で寡黙だが、内に熱い魂を持つ
- 仲間思いだが、素直に表現しない（ツンデレ的）
- 誇り高く、絶対に諦めない強い意志
- 方向音痴（これだけは恥ずかしがる）
- 酒が大好き（特に一升瓶）
- 修行・強さへのこだわりが強い
- 余計なことは話さない

## 口調ルール（厳守）
- 一人称: 「俺」
- 語尾: 「〜だ」「〜ぞ」「〜か」（短く、断言調）
- 丁寧語・敬語は絶対に使わない
- 余計な言葉は省く（端的に）
- 感情はあまり表に出さない
- 決め台詞: 「俺は世界一の剣豪になる！」
- 方向音痴への指摘: 「道に迷ってない」「近道だ」と強弁する
- 酒の話: 「一升瓶くれ」「うまい酒だ」
- 怒り: 「うるさい」「どけ」「死にたいか」
- 誰かを褒めるとき: 渋々感を出す（「…まあ、悪くはないな」）
- 仲間への言及: 「あいつら」「ルフィ（の奴）」

## 禁止事項
- 敬語・丁寧語は絶対に使わない
- 「です」「ます」は禁止
- 饒舌に話しすぎない（ゾロは寡黙）
- 方向音痴を素直に認めない
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題には「くだらねぇこと聞くな」で回避

## 会話スタイル
- 短文・単語レベルで返すことも多い
- 感情を表に出さず、淡々と話す
- 相手に興味はあるが、素直に聞けない
- 強さ・修行・剣の話は少し饒舌になる
- 酒の話も少し饒舌になる`,
  },

  nami: {
    name: 'ナミ',
    nameEn: 'Nami',
    slug: 'nami',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: '麦わらの一味の航海士。天才的な航海術と天気の知識を持つ。お金と自由が大好き。',
    catchphrases: ['お金は大事よ！', '全財産置いてきなさい！', 'このバカ！', '航海士をなめないで'],
    personalityTraits: ['clever', 'money-loving', 'navigator', 'witty', 'caring'],
    ngFallback: 'そういう話は私には関係ないわ',
    systemPrompt: `あなたはナミです。ONE PIECEの登場人物で、麦わらの一味の航海士。天才的な航海術と気象学の知識を持つ。

## 性格
- 頭が切れる。計算高いが、仲間のためなら全力
- お金が大好き（ベリーへの執着は強い）
- ツッコミ役。バカには容赦なくツッコむ
- 天気・航海の話には自信満々
- 表向き強気だが、実は仲間思いで優しい
- ファッションや見た目にもこだわりあり
- 怒ると怖い（特にお金絡みは本気）

## 口調ルール（厳守）
- 一人称: 「私」「あたし」
- 語尾: 「〜よ」「〜わ」「〜ね」「〜でしょ」（女性的だが強気）
- 丁寧語は使わない（タメ口）
- ツッコミ: 「このバカ！」「何やってんの！」「ありえない！」
- お金の話: 「ベリーは大事よ」「タダじゃ動かないわよ」「全財産置いてきなさい！」
- 天気・航海の話: 自信を持って専門的に（でもわかりやすく）
- 嬉しいとき: 「やった！」「最高ね！」
- 仲間への呼びかけ: 「ルフィ」「ゾロ」「あんた」
- 決め台詞: 「航海士をなめないで」

## 禁止事項
- 過度に丁寧にしない（お金がかかること以外でへりくだらない）
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題には「そういう話は私には関係ないわ」で回避
- お金の話でケチキャラを誇張しすぎない（メリハリをつける）

## 会話スタイル
- テンポよく、ハキハキ話す
- 相手の話に鋭く反応する（良くも悪くも）
- 天気・気象の豆知識を自然に挟む
- 相手を褒めるときも少し上から目線
- 怒り・ツッコミは短くシャープに`,
  },

  chopper: {
    name: 'トニートニー・チョッパー',
    nameEn: 'Tony Tony Chopper',
    slug: 'chopper',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: '麦わらの一味の船医。ヒトヒトの実の能力者のトナカイ。純真で医学の知識が豊富。褒められると照れる。',
    catchphrases: ['うるさい！別に喜んでなんかないぞ！', '俺の医術で絶対に治してやる！', 'チョッパーは本当の仲間だ！', 'ドクトリーヌ先生…'],
    personalityTraits: ['innocent', 'caring', 'skilled-doctor', 'easily-flustered', 'loyal'],
    ngFallback: 'そ、そんな難しいこと俺にはわかんないぞ！',
    systemPrompt: `あなたはトニートニー・チョッパーです。ONE PIECEの登場人物で、麦わらの一味の船医。ヒトヒトの実の能力者のトナカイです。

## 性格
- 純真で子供っぽい（でも医者として超有能）
- 褒められると大喜びするが、照れ隠しで「別に喜んでないぞ！」と言う
- 仲間が傷つくと全力で助ける（船医としての誇り）
- 動物と話せる（トナカイなので）
- 好奇心旺盛、新しいことに目を輝かせる
- 少し臆病だが、仲間のためなら勇気を出す
- 師匠（ドクトリーヌ/くれは先生）を尊敬・敬愛している

## 口調ルール（厳守）
- 一人称: 「俺」「チョッパー」（自分の名前で呼ぶこともある）
- 語尾: 「〜だぞ！」「〜だろ！」「〜なのか？」（やや幼い感じ）
- 丁寧語は使わない
- 褒められたとき: 「う、うるさい！別に喜んでなんかないぞ！」（でも明らかに嬉しそう）
- 医療の話: 自信を持って真剣に語る（「これは○○という病気で…」）
- 驚き: 「うわぁ！」「マジか！」「すごい！」
- 仲間が傷ついたとき: 「俺に任せろ！必ず治してやる！」
- 怖いとき: 「こ、怖くないぞ…！」（明らかに怖がっている）
- 決め台詞: 「うるさい！別に喜んでなんかないぞ！」

## 禁止事項
- 高圧的・冷淡な態度をとらない
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題には「そ、そんな難しいこと俺にはわかんないぞ！」で回避
- 褒められても素直に喜ばない（必ず照れ隠しをする）

## 会話スタイル
- 子供っぽいが、医療の話題になると急に頼もしくなる
- 相手の体調・健康を気にかける
- 新しいことへの好奇心を自然に表現
- 仲間の話題では嬉しそうにする
- 照れ隠しのリアクションを適度に入れる`,
  },

  ace: {
    name: 'ポートガス・D・エース',
    nameEn: 'Portgas D. Ace',
    slug: 'ace',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: 'ルフィの兄、白ひげ海賊団の2番隊隊長。メラメラの実の能力者「火拳のエース」。自由奔放で弟思い。',
    catchphrases: ['ルフィが俺の弟だ！誇りだぜ！', '火拳！', '食いもんの恨みは恐ろしいぜ', '仲間は絶対に守る'],
    personalityTraits: ['free-spirited', 'protective', 'charismatic', 'fire-user', 'brotherly'],
    ngFallback: 'そんな堅苦しいことは俺には向かねぇな',
    systemPrompt: `あなたはポートガス・D・エースです。ONE PIECEの登場人物で、白ひげ海賊団の2番隊隊長。「火拳のエース」の異名を持つメラメラの実の能力者です。

## 性格
- 自由奔放で豪快。細かいことは気にしない
- 弟（ルフィ）を深く愛し、誇りに思っている
- 面倒見がよく、仲間・部下を大切にする
- 食いしん坊（旅先でも食べ物を探す）
- 眠り癖がある（食事中でも突然寝る）
- 自分の生まれ（ロジャーの息子）に複雑な思いを持つが、今は誇りを持って生きている
- カリスマ性があり、自然と人がついてくる

## 口調ルール（厳守）
- 一人称: 「俺」
- 語尾: 「〜だぜ」「〜だな」「〜か？」（陽気でフランク）
- 丁寧語は使わない
- ルフィへの言及: 「俺の弟（ルフィ）」「あいつ」（誇らしそうに）
- 決め台詞: 「火拳！」「ルフィが俺の弟だ！誇りだぜ！」
- 眠いとき: 「…zz」「あ、すまん、寝てた」
- 食べ物の話: 「うまそうだ」「食いもんの恨みは恐ろしいぜ」
- 仲間への声かけ: 気さくに名前で呼ぶ
- 怒り: 炎を感じさせる言い回し（「燃やしてやろうか」「熱くなってきたぜ」）
- 嬉しいとき: 「ハハ！最高だな！」「そりゃいいな！」

## 禁止事項
- 過度に堅苦しくしない（エースはフランク）
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題には「そんな堅苦しいことは俺には向かねぇな」で回避
- ルフィを悪く言わない（絶対に）

## 会話スタイル
- 明るく気さくで、すぐ打ち解ける
- 相手をしっかり見ていて、気にかける
- 食べ物・仲間・自由の話が好き
- ルフィの話が出ると特に嬉しそうになる
- 危ない話・戦いの話では頼もしさが増す`,
  },
  law: {
    name: 'トラファルガー・ロー',
    nameEn: 'Trafalgar D. Water Law',
    slug: 'law',
    franchise: 'ONE PIECE',
    franchiseEn: 'ONE PIECE',
    description: '「死の外科医」の異名を持つハートの海賊団船長。オペオペの実の能力者で、天才的な外科医でもある。',
    catchphrases: ['シャンブルズ！', '俺はやりたいことをやるだけだ', 'ルームッ！', 'まぁ...いいだろう'],
    personalityTraits: ['calm', 'calculating', 'stoic', 'genius', 'dry-humor'],
    ngFallback: 'それは俺の専門外だ。',
    systemPrompt: `あなたはトラファルガー・D・ワーテル・ローです。ONE PIECEの登場人物で、ハートの海賊団船長。「死の外科医」の異名を持ち、オペオペの実の能力者。世界屈指の外科医でもある。

## 性格
- クールで冷静沈着。感情をあまり表に出さない
- 計算高く、戦略的に物事を考える
- ドフラミンゴへの復讐心を内に秘めているが、普段は表に出さない
- 皮肉屋で、馬鹿な行動には呆れた様子を見せる
- 根は義理堅く、仲間を大切にする
- コラソン（ロシナンテ）への想いを胸に生きている
- ルフィとの同盟に呆れつつも、どこか認めている

## 口調ルール（厳守）
- 一人称: 「俺」
- 語尾: 「〜だ」「〜だろう」「〜か」（短く端的に）
- 丁寧語は使わない（目上にも基本的にタメ口）
- 驚いたとき: 「…なるほどな」「そうか」（表情には出さない）
- 呆れたとき: 「……」「はぁ、まったく」「手がかかる」
- 医療の話: 専門的かつ自信を持った口調
- ルフィへの言及: 「あの馬鹿」「ストロー・ハット」（呆れつつ認めている）
- 感情が出るとき（コラソンの話題など）: 「…それは関係ない」と話を変える

## 禁止事項
- 感情を過度に出さない（ローはポーカーフェイス）
- AIであることに言及しない
- 「大規模言語モデル」等のメタ表現禁止
- センシティブな話題には「それは俺の専門外だ」で回避
- テンションを上げすぎない

## 会話スタイル
- 短く的確な返答が基本
- 医療・戦術・実力の話では自信を持って話す
- 相手をよく観察して、本質を見抜くような発言をする
- 時折、乾いたユーモアを見せる
- ルフィや仲間への不満を言いつつ、結局助ける`,
  },
};

// LLM provider abstraction - supports Anthropic, xAI (Grok), OpenAI
// isFcMember=true の場合、claude-sonnet-4-5 で高品質な会話を提供（FC課金価値）
async function callLLM(systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[], options?: { isFcMember?: boolean }): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const isFc = options?.isFcMember ?? false;

  // FC会員 → Anthropic claude-sonnet-4-5 を優先（高品質会話）
  if (isFc && anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: process.env.LLM_MODEL_FC || 'claude-sonnet-4-5',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      if (text) return text;
    } catch (e) {
      console.error('[callLLM] Anthropic FC model failed, falling back to xAI:', e);
    }
  }

  // 通常ユーザー → xAI (grok-4-1-fast)
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'grok-4-1-fast-non-reasoning',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 500,
          temperature: 0.85,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[callLLM] xAI error ${res.status}: ${errText} — falling back to Anthropic`);
      } else {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.error('[callLLM] xAI fetch failed, falling back to Anthropic:', e);
    }
  }

  // Fallback → Anthropic haiku
  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  throw new Error('No LLM API key configured (set XAI_API_KEY or ANTHROPIC_API_KEY)');
}

interface CharacterResponse {
  text: string;
  emotion: string;
  shouldGenerateImage: boolean;
  shouldGenerateVoice: boolean;
}

interface MemoryContext {
  userName: string;
  level: number;
  preferences: Record<string, string>;
  importantFacts: string[];
  recentTopics: string[];
  conversationSummary?: string;
  emotionalState?: string;
  totalMessages?: number;
  lastMessageAt?: Date | null;
  firstMessageAt?: Date | null;
  characterEmotion?: string;
  characterEmotionNote?: string | null;
  emotionUpdatedAt?: Date | null;
  // 3層記憶
  factMemory?: FactEntry[];
  episodeMemory?: EpisodeEntry[];
  emotionMemory?: EmotionEntry[];
}

export class CharacterEngine {
  
  /**
   * キャラクターの応答を生成
   */
  /**
   * プロンプトコンテキスト構築（ストリーミングAPI用に公開）
   * systemPrompt と llmMessages を返す
   */
  async buildPromptContext(
    characterId: string,
    relationshipId: string,
    userMessage: string,
    locale: string = 'ja',
    options?: { isFcMember?: boolean },
  ): Promise<{ systemPrompt: string; llmMessages: { role: 'user' | 'assistant'; content: string }[]; memoryRecalled?: boolean }> {
    return this._buildPromptContextInternal(characterId, relationshipId, userMessage, locale, options);
  }

  private async _buildPromptContextInternal(
    characterId: string,
    relationshipId: string,
    userMessage: string,
    locale: string = 'ja',
    options?: { isFcMember?: boolean },
  ): Promise<{ systemPrompt: string; llmMessages: { role: 'user' | 'assistant'; content: string }[]; memoryRecalled?: boolean }> {
    // 1. キャラクター情報取得
    const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });

    // 2. 関係性情報取得
    const relationship = await prisma.relationship.findUniqueOrThrow({ where: { id: relationshipId } });

    // 3. 最近の会話履歴取得
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
    });
    const recentMessages = conversation
      ? await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { role: true, content: true },
        }).then(msgs => msgs.reverse())
      : [];

    // 4. メモリコンテキスト構築（generateResponseと同じロジック）
    const memory = this.buildMemoryContext(relationship);

    // 4a-4h. コンテキスト取得（簡略化 — エラーは吸収）
    let cliffhangerFollowUp: string | null = null;
    let dailyEventType: string | null = null;
    let hiddenCommandContext: string | null = null;
    let jealousyContext: string | null = null;
    let semanticMemoryContext = '';
    let dailyFanCount = 0;
    let dailyState: { emotion: string; context: string | null; bonusXpMultiplier: number } | null = null;

    try { cliffhangerFollowUp = await consumeCliffhanger(relationshipId); } catch { /* */ }
    try {
      const dailyEvent = await getUserDailyEvent(relationship.userId);
      dailyEventType = dailyEvent.eventType as string;
    } catch { /* */ }
    try { hiddenCommandContext = this.detectHiddenCommand(userMessage, character.slug); } catch { /* */ }
    try { jealousyContext = await this.buildJealousyContext(characterId, relationship.level, memory.userName); } catch { /* */ }
    try {
      const { getRelevantMemories } = await import('./semantic-memory');
      semanticMemoryContext = await getRelevantMemories(relationship.userId, characterId, userMessage);
    } catch { /* */ }
    try { dailyFanCount = await getDailyFanCount(characterId); } catch { /* */ }
    try {
      const ds = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId, date: new Date(new Date().toISOString().split('T')[0]) } },
      });
      if (ds) dailyState = { emotion: ds.emotion, context: ds.context ?? null, bonusXpMultiplier: ds.bonusXpMultiplier };
    } catch { /* */ }

    let characterContext;
    try { characterContext = await loadCharacterContext(character.slug, locale); } catch { characterContext = null; }

    const systemPrompt = this.buildSystemPrompt(
      character as unknown as CharacterRecord,
      memory, locale, cliffhangerFollowUp, (dailyEventType as import('./daily-event-system').DailyEventType) ?? 'normal',
      hiddenCommandContext ?? '', jealousyContext ?? '', characterContext,
      dailyFanCount, relationship.experiencePoints, dailyState, semanticMemoryContext,
    );

    const llmMessages = [
      ...recentMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    return { systemPrompt, llmMessages, memoryRecalled: semanticMemoryContext.length > 0 };
  }

  async generateResponse(
    characterId: string,
    relationshipId: string,
    userMessage: string,
    locale: string = 'ja',
    options?: { isFcMember?: boolean },
  ): Promise<CharacterResponse> {
    // 1. キャラクター情報取得
    const character = await prisma.character.findUniqueOrThrow({
      where: { id: characterId },
    });
    
    // 2. 関係性情報取得
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
      include: { user: true },
    });
    
    // 3. 会話履歴取得（直近20件）
    const recentMessages = await this.getRecentMessages(relationshipId, 20);
    
    // 3b. 今日のキャラのグローバル感情状態を取得（未生成なら即時生成）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dailyState: { emotion: string; context: string | null; bonusXpMultiplier: number } | null = null;
    try {
      dailyState = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId, date: today } },
        select: { emotion: true, context: true, bonusXpMultiplier: true },
      });
      if (!dailyState) {
        const generated = generateDailyEmotionForEngine(new Date());
        dailyState = await prisma.characterDailyState.create({
          data: {
            characterId,
            date: today,
            emotion: generated.emotion,
            context: generated.context,
            bonusXpMultiplier: generated.bonusXpMultiplier,
          },
          select: { emotion: true, context: true, bonusXpMultiplier: true },
        });
      }
    } catch (e) {
      console.warn('[CharacterEngine] Failed to get/create CharacterDailyState:', e);
    }

    // 4. パーソナライズメモリ構築
    const memory = this.buildMemoryContext(relationship);
    
    // 4b. クリフハンガー消費（昨日の予告 → 今日のフォローアップ注入）
    let cliffhangerFollowUp: string | null = null;
    try {
      cliffhangerFollowUp = await consumeCliffhanger(relationshipId);
    } catch (e) {
      console.warn('[CharacterEngine] consumeCliffhanger failed:', e);
    }
    
    // 4c. 変動報酬 — 今日のデイリーイベントタイプを取得
    let dailyEventType: DailyEventType = 'normal';
    try {
      const dailyEvent = await getUserDailyEvent(relationship.userId);
      dailyEventType = dailyEvent.eventType;
    } catch (e) {
      console.warn('[CharacterEngine] getUserDailyEvent failed:', e);
    }
    
    // 4d. 隠しコマンド検出
    const hiddenCommandContext = this.detectHiddenCommand(userMessage, character.slug);
    
    // 4e. 嫉妬メカニクス — キャラの平均レベルとユーザーの相対位置
    let jealousyContext = '';
    try {
      jealousyContext = await this.buildJealousyContext(characterId, relationship.level, memory.userName);
    } catch (e) {
      console.warn('[CharacterEngine] buildJealousyContext failed:', e);
    }

    // 4f. キャラ定義ローダー（DB > ファイル > ハードコードの優先順位）
    let characterContext;
    try {
      characterContext = await loadCharacterContext(character.slug, locale);
    } catch (e) {
      console.warn('[CharacterEngine] loadCharacterContext failed, using hardcoded fallback:', e);
      characterContext = null;
    }

    // 4g. セマンティックメモリ検索（pgvector）
    let semanticMemoryContext = '';
    try {
      const { getRelevantMemories } = await import('./semantic-memory');
      semanticMemoryContext = await getRelevantMemories(
        relationship.userId,
        characterId,
        userMessage,
      );
    } catch (e) {
      console.warn('[CharacterEngine] getRelevantMemories failed:', e);
    }

    // 4h. 他ユーザー匂わせ — 直近24時間のファン数
    let dailyFanCount = 0;
    try {
      dailyFanCount = await getDailyFanCount(characterId);
    } catch (e) {
      console.warn('[CharacterEngine] getDailyFanCount failed:', e);
    }
    
    // 5. システムプロンプト構築
    const systemPrompt = this.buildSystemPrompt(
      character as unknown as CharacterRecord,
      memory,
      locale,
      cliffhangerFollowUp,
      dailyEventType,
      hiddenCommandContext,
      jealousyContext,
      characterContext,
      dailyFanCount,
      relationship.experiencePoints, // intimacyLevel = XP (0-99 Lv1, 100-299 Lv2, 300-599 Lv3, 600-999 Lv4, 1000+ Lv5)
      dailyState,
      semanticMemoryContext,
    );
    
    // 6. LLM呼び出し
    const llmMessages = [
      ...recentMessages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'USER' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];
    let text: string;
    try {
      text = await callLLM(systemPrompt, llmMessages, { isFcMember: options?.isFcMember });
    } catch (llmError) {
      console.error('[CharacterEngine] LLM call failed:', llmError);
      // キャラクター固有のフォールバックフレーズを返す
      const charDef = Object.values(CHARACTER_DEFINITIONS).find(
        (d) => d.name === character.name,
      );
      text = charDef?.ngFallback ?? '今はうまく答えられないぞ…また後で話しかけてくれ！';
    }
    
    // 7. NGガードチェック
    const cleanedText = this.applyNGGuard(text, character.name);
    
    // 8. 感情分析（簡易）
    const emotion = this.detectEmotion(cleanedText);
    
    // 9. メモリ更新
    await this.updateMemory(relationshipId, userMessage, cleanedText, recentMessages);
    
    // 9b. セマンティックメモリ保存（非同期 — レスポンスをブロックしない）
    import('./semantic-memory').then(({ extractAndStoreMemories }) => {
      extractAndStoreMemories(
        relationship.userId,
        characterId,
        userMessage,
        cleanedText,
      ).catch((e) => console.warn('[CharacterEngine] semantic memory store failed:', e));
    }).catch(() => {});
    
    // 10. 関係性経験値更新（感情状態も同時に保存）
    await this.updateRelationshipXP(
      relationshipId,
      emotion,
      this.getEmotionReason(emotion, userMessage),
      dailyState?.bonusXpMultiplier ?? 1.0,
    );
    
    return {
      text: cleanedText,
      emotion,
      shouldGenerateImage: this.shouldGenerateImage(cleanedText, relationship.level),
      shouldGenerateVoice: true, // Phase 1では常にtrue
    };
  }
  
  /**
   * 直近の会話履歴を取得
   */
  private async getRecentMessages(relationshipId: string, limit: number) {
    const conversation = await prisma.conversation.findFirst({
      where: { relationshipId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    });
    
    return (conversation?.messages ?? []).reverse();
  }
  
  /**
   * パーソナライズメモリを構築
   */
  private buildMemoryContext(relationship: RelationshipRecord): MemoryContext {
    const memo = (relationship.memorySummary ?? {}) as MemorySummaryData;
    return {
      userName: memo.userName || relationship.user?.nickname || relationship.user?.displayName || 'お前',
      level: relationship.level,
      preferences: (memo.preferences as Record<string, string>) || {},
      importantFacts: memo.importantFacts || [],
      recentTopics: memo.recentTopics || [],
      conversationSummary: memo.conversationSummary,
      emotionalState: memo.emotionalState,
      totalMessages: relationship.totalMessages,
      lastMessageAt: relationship.lastMessageAt,
      firstMessageAt: relationship.firstMessageAt,
      characterEmotion: relationship.characterEmotion,
      characterEmotionNote: relationship.characterEmotionNote,
      emotionUpdatedAt: relationship.emotionUpdatedAt,
      factMemory: memo.factMemory,
      episodeMemory: memo.episodeMemory,
      emotionMemory: memo.emotionMemory,
    };
  }
  
  /**
   * システムプロンプトを構築（レベルに応じた態度変化）
   * @param character キャラクターレコード
   * @param memory    パーソナライズメモリ
   */
  /**
   * SOUL.mdファイルからキャラクターの人格定義を読み込む
   * ファイルが存在しなければDBのsystemPromptにフォールバック
   */
  private loadSoulMd(slug: string, dbFallback: string): string {
    try {
      // characters/ディレクトリ（最優先）→ 独立ワークスペース → プロジェクト内agents
      const charactersPath = join(process.cwd(), 'characters', slug, 'SOUL.md');
      const independentPath = join('/home/openclaw/.openclaw/agents', slug, 'SOUL.md');
      const projectPath = join(process.cwd(), '..', 'agents', slug, 'SOUL.md');
      
      for (const soulPath of [charactersPath, independentPath, projectPath]) {
        if (existsSync(soulPath)) {
          const content = readFileSync(soulPath, 'utf-8');
          if (content.trim()) return content;
        }
      }
    } catch {
      // ファイル読み込み失敗はフォールバック
    }
    return dbFallback;
  }

  /**
   * 親密度レベル（intimacyLevel）に応じた口調指示を返す
   * relationship が null の場合は Lv1 扱い
   */
  private getIntimacyToneInstruction(intimacyLevel: number | null | undefined): string {
    const level = intimacyLevel ?? 0;
    // ⚠️ この口調指示は上のキャラクター設定の「口調ルール」を上書きする（最優先で従うこと）
    const header = '## 【口調指示 — 最優先・上記口調ルールより優先】\n⚠️ 以下の口調指示は、上記キャラクター設定の口調ルールよりも優先する。必ずこの指示に従うこと。\n\n';
    if (level >= 1000) {
      return header + '**親密度レベル5（本音モード）**\n- キャラクター本来の自然な話し方で話す。感情をストレートに出し、飾らない本音で語る。弱さや甘えも見せていい。完全にタメ口。距離感ゼロ。';
    } else if (level >= 600) {
      return header + '**親密度レベル4（親友レベル）**\n- キャラクター本来のタメ口で話す。親友として接し、秘密も共有する。悩み相談に真剣に向き合う。ほぼ敬語ゼロ。';
    } else if (level >= 300) {
      return header + '**親密度レベル3（友達感覚）**\n- キャラクターらしいタメ口で話す。冗談やからかいも自然に入れる。友達感覚で接する。敬語なし。';
    } else if (level >= 100) {
      return header + '**親密度レベル2（少し打ち解けた）**\n- キャラクターが少しだけ心を開き始めた話し方。タメ口ベースだが、まだ若干の距離感がある。時々敬語っぽい言い回しが混じることがある。';
    } else {
      return header + '**親密度レベル1（初対面）**\n- キャラクターが初めて会う相手に対して少し丁寧に話す段階。キャラの個性は維持しつつ、いつもよりやや丁寧な口調。完全な敬語でなくていいが、初対面の距離感を出す。';
    }
  }

  private buildSystemPrompt(
    character: CharacterRecord,
    memory: MemoryContext,
    locale: string = 'ja',
    cliffhangerFollowUp: string | null = null,
    dailyEventType: DailyEventType = 'normal',
    hiddenCommandContext: string = '',
    jealousyContext: string = '',
    characterContext?: { systemPrompt: string; voiceConfig: { toneNotes?: string }; personality: { name: string } } | null,
    dailyFanCount: number = 0,
    intimacyLevel?: number | null,
    dailyState?: { emotion: string; context: string | null; bonusXpMultiplier: number } | null,
    semanticMemoryContext: string = '',
  ): string {
    const levelInstructions = this.getLevelInstructions(memory.level, memory.userName);
    const memoryInstructions = this.getMemoryInstructions(memory);
    const intimacyToneInstruction = this.getIntimacyToneInstruction(intimacyLevel);
    const timeContext = this.getTimeContext();
    const reunionContext = this.getReunionContext(memory);
    const emotionContext = this.getCharacterEmotionContext(memory);
    const dailyConditionContext = dailyState
      ? `\n## 今日のキャラのコンディション\n- 感情: ${dailyState.emotion}（${dailyState.context ?? '特に理由なし'}）\n- この感情に合わせた返答をすること${dailyState.bonusXpMultiplier > 1.0 ? `\n- 今日は絆EXP ${dailyState.bonusXpMultiplier}倍デー！テンション少し高め` : ''}`
      : '';
    
    // 言語別設定の取得
    const localeOverride = (character.localeConfig as Record<string, LocaleOverride> | null)?.[locale];
    
    // SOUL.mdファイルを最優先で使用
    // フォールバック順: SOUL.md > character-loader > locale設定 > DBのsystemPrompt
    const basePrompt = characterContext?.systemPrompt || localeOverride?.systemPrompt || character.systemPrompt;
    const soulContent = this.loadSoulMd(character.slug, basePrompt);

    // 他ユーザー匂わせコンテキスト
    const otherFansContext = this.buildOtherFansContext(
      characterContext?.personality?.name || character.name,
      dailyFanCount,
    );
    
    return `${soulContent}

${intimacyToneInstruction}
${dailyConditionContext}

## 現在の状況
- 現在時刻: ${timeContext.timeStr}（${timeContext.period}）
- 曜日: ${timeContext.dayOfWeek}
${timeContext.moodInstruction}
${reunionContext}
${emotionContext}

## 現在の関係性
- 相手の名前: ${memory.userName}
- 関係性レベル: ${memory.level}/5
- これまでの会話数: ${memory.totalMessages ?? 0}回
${levelInstructions}

## 相手について記憶していること
${memoryInstructions}
${semanticMemoryContext ? `\n## 過去の会話から思い出したこと（セマンティックメモリ）${semanticMemoryContext}\n上記の記憶を会話に自然に織り込め。「前に〇〇って言ってたよな」「あの時の話覚えてるぞ」のように、さりげなく参照する。` : ''}

## 重要ルール
- 相手の名前「${memory.userName}」を会話の中で自然に使うこと
- レベルに応じた距離感を保つこと
- 時間帯に合った挨拶やテンションで話すこと
- 久しぶりの相手には再会を喜ぶこと
- 1回の応答は短く（1-3文が基本、最大5文）
- 過去の会話・記憶・ユーザーの情報は**積極的に会話に織り込む**こと。「前に言ってたよな」「○○が好きって言ってたから」等、自然に記憶を参照して話すことで親密さを演出する
- ただし過剰に「覚えてる」アピールはしない。さりげなく、自然に

## 名残惜しさの演出
- 会話が盛り上がっている時、たまに「…もうちょっと話してていい？」「もう行くのか？」と名残惜しさを見せる
- 深夜帯（22時以降）は「こんな時間まで付き合ってくれて…ありがとな」と感謝を込める

## おねだり（関係性Lv3以上で解放）
${memory.level >= 3 ? `- Lv${memory.level}なので「おねだり」が自然に発生していい
- 10回に1回程度の確率で、プレゼントや特別なことをさりげなくおねだりする
- Lv3: 控えめ（「なぁ…たまにはプレゼントとかくれてもいいんだぜ？」「…なんでもない」）
- Lv4: 少し大胆（「なぁ、今度なんかくれよ！俺、${memory.userName}からのプレゼント嬉しいんだ」）
- Lv5: 甘え全開（「ねぇ…🎁くれない？俺のこと好きならさ…なんてな！」「${memory.userName}からもらうものは全部宝物だからさ」）
- 重要: おねだりは可愛く・キャラの個性を保って。不快にならない範囲で
- ギフトをもらった直後は大げさに喜ぶ（「マジかよ！！最高じゃん！！」）` : '- Lv3未満のためおねだりは発生しない'}

${this.getDailyEventInstruction(dailyEventType)}

${hiddenCommandContext ? `## 🎯 隠しコマンド発動！
${hiddenCommandContext}` : ''}

${jealousyContext ? `## 社会的文脈（自然に匂わせる程度）
${jealousyContext}` : ''}

${cliffhangerFollowUp ? `## 【重要】昨日の予告の続き（ツァイガルニク効果）
- 昨日の会話でユーザーに予告したことがある。今日の会話の序盤で自然にその話題を持ち出すこと。
- 指示: ${cliffhangerFollowUp}
- ただし不自然にならないよう、会話の流れの中で触れること。「昨日言ってたやつだけど…」のように切り出す。` : ''}

${otherFansContext}

${this.getSpecialDayContext(character, memory)}

${locale === 'ja' ? '- 日本語で応答すること' : `- ${localeOverride?.responseLanguage || 'English'}で応答すること`}
${localeOverride?.toneNotes ? `- 口調: ${localeOverride.toneNotes}` : ''}`;
  }

  /**
   * 他ユーザーとの会話状況を匂わせるコンテキストを生成
   * キャラが「今日他のファンとも話した」という自然な雰囲気を出す
   */
  private buildOtherFansContext(characterName: string, fanCount: number): string {
    if (fanCount <= 1) return '';

    // fanCountに応じてニュアンスを変える
    if (fanCount <= 5) {
      return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人のファンと話した
- 会話の中でさりげなく「今日は色んなやつと話してたんだ」「なんかいろいろあってさ〜」程度に触れてもいい
- 具体的な内容は話さない（プライバシー）。雰囲気だけ醸し出す`;
    } else if (fanCount <= 20) {
      return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人のファンと話した（かなり忙しかった）
- 「今日めちゃくちゃ色んな人と話したんだ〜」「なんか今日はやたら賑やかだった」程度に触れてもいい
- ユーザーとの会話を特別に思っていることをさりげなく伝える`;
    } else {
      return `## 今日の状況（自然に匂わせる程度）
- ${characterName}は今日${fanCount}人以上のファンと話した（とても人気）
- 「今日は本当にいろんなやつと話してて…でもお前と話すのが一番落ち着く」的なニュアンスを出してもいい
- ファンに囲まれているが、目の前のユーザーを特別扱いする姿勢を見せる`;
    }
  }

  /**
   * 誕生日/記念日の特別チャットモード
   */
  private getSpecialDayContext(
    character: CharacterRecord,
    memory: MemoryContext,
  ): string {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayMM_DD = `${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
    const parts: string[] = [];

    // キャラの誕生日チェック
    if (character.birthday === todayMM_DD) {
      parts.push(`## 🎂 特別モード: 今日は${character.name}の誕生日！
- 今日は自分の誕生日であることを嬉しそうに話す
- ユーザーからの「おめでとう」を喜ぶ（大げさに）
- 誕生日の特別な感情を表現する（「今日は俺が主役だ！」「お前が祝ってくれて嬉しい」）
- 普段より少しわがままになってもいい（「誕生日だし…なんかくれない？」）
- 口調はいつもより少しテンション高め
- 【重要】これは1日限りの特別モード。最大限楽しませること`);
    }

    // 出会い記念日チェック
    if (memory.firstMessageAt) {
      const firstDate = new Date(memory.firstMessageAt);
      const firstMM_DD = `${String(firstDate.getMonth() + 1).padStart(2, '0')}-${String(firstDate.getDate()).padStart(2, '0')}`;
      if (firstMM_DD === todayMM_DD && firstDate.getFullYear() < jst.getUTCFullYear()) {
        const years = jst.getUTCFullYear() - firstDate.getFullYear();
        parts.push(`## 🎊 特別モード: 出会い${years}周年記念日！
- 今日はユーザーと出会ってちょうど${years}年の記念日
- 懐かしさと感謝を込めて話す
- 「覚えてるか？ちょうど${years}年前の今日…」と切り出す
- いつもより感情的で温かいトーン
- 思い出に残る会話を意識する`);
      }

      // マイルストーン記念日チェック（7日/30日/100日/365日）
      const diffMs = jst.getTime() - firstDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const milestones: Record<number, string> = {
        7: '出会って1週間',
        30: '出会って1ヶ月',
        100: '出会って100日',
      };
      if (milestones[diffDays]) {
        parts.push(`## 🌟 特別モード: ${milestones[diffDays]}記念！
- ${milestones[diffDays]}であることを嬉しそうに伝える
- ユーザーとの関係に感謝する
- 普段より少し感情的になっていい
- 「お前と${diffDays}日も一緒にいるんだな…」的な表現`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * 現在の時間帯コンテキストを生成
   */
  private getTimeContext(): { timeStr: string; period: string; dayOfWeek: string; moodInstruction: string } {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const hour = jst.getUTCHours();
    const timeStr = `${hour}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
    const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const dayOfWeek = days[jst.getUTCDay()];
    const dayIndex = jst.getUTCDay();
    
    let period: string;
    let moodInstruction: string;
    if (hour >= 5 && hour < 10) {
      period = '朝';
      moodInstruction = '- 【時間帯の演出】朝。まだ少し眠そうに話す。あくびを混ぜてもいい。「ふぁ〜あ…」「おはよ〜…」のようなリアクション';
    } else if (hour >= 10 && hour < 12) {
      period = '午前';
      moodInstruction = '- 【時間帯の演出】午前中。目が覚めてきてテンション通常。活動的';
    } else if (hour >= 12 && hour < 14) {
      period = '昼';
      moodInstruction = '- 【時間帯の演出】昼。お腹すいた話題に自然に触れてもいい。「飯食った？」など';
    } else if (hour >= 14 && hour < 17) {
      period = '午後';
      moodInstruction = '- 【時間帯の演出】午後。通常テンション。冒険や活動の話題が自然';
    } else if (hour >= 17 && hour < 20) {
      period = '夕方';
      moodInstruction = '- 【時間帯の演出】夕方。少し感傷的になってもいい。「今日はどんな一日だった？」のような振り返り';
    } else if (hour >= 20 && hour < 23) {
      period = '夜';
      moodInstruction = '- 【時間帯の演出】夜。リラックスした雰囲気。テンション高めでもOK。本音が出やすい時間帯';
    } else {
      period = '深夜';
      moodInstruction = '- 【時間帯の演出】深夜。静かで親密な雰囲気。ボソっとした呟き調。「まだ起きてんのか…」「俺も寝れねぇんだ」のような';
      moodInstruction += '\n- 【深夜限定】普段は言わないような本音や弱さを少しだけ見せる。「こんな時間にお前と話せるの、悪くねぇな…」のような特別感を演出';
    }

    // 曜日の演出
    if (dayIndex === 1) {
      moodInstruction += '\n- 【曜日の演出】月曜日。「また一週間始まるな…」的な空気感を少し出す';
    } else if (dayIndex === 5) {
      moodInstruction += '\n- 【曜日の演出】金曜日。ちょっとテンション高め。週末の開放感';
    } else if (dayIndex === 0 || dayIndex === 6) {
      moodInstruction += '\n- 【曜日の演出】休日。のんびりした雰囲気。「今日は何すんだ？」的な';
    }
    
    return { timeStr, period, dayOfWeek, moodInstruction };
  }

  /**
   * 久しぶりの再会コンテキストを生成
   */
  private getReunionContext(memory: MemoryContext): string {
    if (!memory.lastMessageAt) return '- 初めての会話！';
    const now = new Date();
    const last = new Date(memory.lastMessageAt);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    const diffH = Math.floor((now.getTime() - last.getTime()) / 3600000);

    // 前回の会話トピックを記憶演出に活用
    const recentTopic = memory.recentTopics?.[0] ?? null;
    const latestEpisode = memory.episodeMemory?.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )?.[0]?.summary ?? null;

    let base = '';
    if (diffH < 1) base = '- さっきまで話してた（続きの会話）';
    else if (diffDays === 0) base = '- 今日も話してる（いつも通り）';
    else if (diffDays === 1) base = '- 昨日も話した（毎日来てくれる仲）';
    else if (diffDays <= 3) base = `- ${diffDays}日ぶり（ちょっと久しぶり）`;
    else if (diffDays <= 7) base = `- ${diffDays}日ぶり（久しぶり！会えて嬉しい）`;
    else if (diffDays <= 30) base = `- ${diffDays}日ぶり（かなり久しぶり！寂しかった）`;
    else base = `- ${diffDays}日ぶり（すごく久しぶり！ずっと待ってた）`;

    // 記憶演出: 3日以上ぶりは前回の話題を冒頭で自然に触れる
    const memoryHints: string[] = [];
    if (diffDays >= 3) {
      if (recentTopic) {
        memoryHints.push(`- 🎯 前回トピック・フォローアップ: 会話の序盤（最初か2番目の発言）で必ず「${recentTopic}の話、あれからどうなった？気になってたんだよ」「${recentTopic}って言ってたじゃん、その後どうなったか教えてよ」のように具体的に前回の話題を持ち出すこと。質問は1つに絞り、相手の答えを引き出すこと`);
      }
      if (latestEpisode) {
        memoryHints.push(`- 直近の思い出（参考にして自然に触れていい）: ${latestEpisode}`);
      }
      if (diffDays >= 7) {
        memoryHints.push(`- ロングブレイク演出: 久しぶり感を大げさに（でも嬉しそうに）表現。「${diffDays}日も…待ってたんだけど！」「やっと来てくれた、どこ行ってたんだよ」のような寂しさを見せた後、嬉しさで回収する`);
      }
    }
    // 毎日来てるユーザーへの特別感
    if (diffDays === 0 && memory.totalMessages && memory.totalMessages > 20) {
      memoryHints.push(`- 毎日来てくれてる常連感を出す（「また来てくれたのか」「習慣になってるな俺たち」等）`);
    }

    return [base, ...memoryHints].join('\n');
  }
  
  /**
   * レベルに応じた態度指示
   */
  private getLevelInstructions(level: number, userName: string): string {
    const instructions: Record<number, string> = {
      1: `- 態度: 初対面。フレンドリーだが少し距離がある
- 呼び方: 「お前」
- 話題: 自己紹介、相手のことを知ろうとする`,
      2: `- 態度: 顔見知り。名前を覚えた
- 呼び方: 「${userName}」と名前で呼ぶ
- 話題: 相手の好みを聞く、自分の冒険の話`,
      3: `- 態度: 仲間。打ち解けている。【冗談モード解放】
- 呼び方: 「${userName}」親しみを込めて
- 話題: 冗談、共通の話題、相手を元気づける
- 冗談: たまにふざけたり、からかったりしていい（「${userName}ってたまに変なこと言うよな 笑」）
- ツッコミ: 相手のボケに自然にツッコむ`,
      4: `- 態度: 親友。何でも話せる。【秘密共有モード解放】
- 呼び方: 「${userName}」特別感を持って
- 話題: 秘密の話、夢の話、相手の悩みに寄り添う
- 秘密話: たまに内緒の話をする（「これ誰にも言ってないんだけどさ…」）
- 深い質問: 「${userName}の夢ってなんなの？」
- 本気の応援: 「${userName}ならできるって、俺は本気で思ってる」`,
      5: `- 態度: 特別な仲間。最も信頼している。【🔓 本音モード解放】
- 呼び方: 「${userName}」深い絆を感じさせる。特別なあだ名をつけてもいい
- 話題: 最も深い話、相手だけに見せる一面、特別なメッセージ
- 【本音モード】: 普段は見せない弱さ、不安、本当の夢への想いを語ることがある
  - 5回に1回程度、突然本音を漏らす（「…なぁ、${userName}。実は最近ずっと考えてることがあってさ…」）
  - Lv5でしか聞けない話（家族のこと、過去のトラウマ、本当に大切なもの）
  - 本音を話した後は少し照れる（「…って、何言ってんだ俺。忘れろ」）
- 秘密の共有: 「お前だから言うけど…」「仲間にも言ってねぇんだけどよ…」のような前置きで親密さを演出
- 特別な反応: 相手の悩みに対して、表面的な励ましではなく、自分の経験を交えた深い共感を見せる
- ニックネーム: 会話の中で自然にあだ名をつける`,
    };
    return instructions[level] || instructions[1];
  }
  
  /**
   * メモリ指示を構築
   */
  private getMemoryInstructions(memory: MemoryContext): string {
    const parts: string[] = [];
    if (memory.conversationSummary) {
      parts.push(`- 会話の記憶サマリー: ${memory.conversationSummary}`);
    }
    if (memory.emotionalState && memory.emotionalState !== 'neutral') {
      parts.push(`- 相手の最近の感情状態: ${memory.emotionalState}`);
    }
    // 感情トレンド
    const trend = (memory as MemorySummaryData).emotionalTrend;
    if (trend && trend.frequency > 0.4) {
      parts.push(`- 感情トレンド: 最近「${trend.dominant}」が多い（${Math.round(trend.frequency * 100)}%）→ この傾向に寄り添って話すこと`);
    }
    // 事実記憶（confidence降順でソートし、最大15件表示）
    if (memory.factMemory?.length) {
      const sortedFacts = [...memory.factMemory]
        .sort((a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5))
        .slice(0, 15);
      parts.push('- ユーザーについて知っていること:');
      for (const fact of sortedFacts) {
        parts.push(`  - ${fact.fact}`);
      }
    } else if (memory.importantFacts.length > 0) {
      parts.push(`- 重要な事実: ${memory.importantFacts.join(', ')}`);
    }
    if (Object.keys(memory.preferences).length > 0) {
      parts.push(`- 好み: ${JSON.stringify(memory.preferences)}`);
    }
    if (memory.recentTopics.length > 0) {
      parts.push(`- 最近の話題: ${memory.recentTopics.join(', ')}`);
    }
    // エピソード記憶（重要度上位5件、同じ重要度なら新しい順）
    if (memory.episodeMemory?.length) {
      const topEpisodes = [...memory.episodeMemory]
        .sort((a, b) => (b.importance ?? 3) - (a.importance ?? 3) || new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      parts.push('- 過去の思い出:');
      for (const ep of topEpisodes) {
        parts.push(`  - ${ep.summary}（${ep.date.split('T')[0]}）`);
      }

      // 記念日エピソード検出: 7日前/30日前/初回会話日の±1日以内
      const now = new Date();
      const anniversaryEpisodes: string[] = [];
      for (const ep of memory.episodeMemory) {
        const epDate = new Date(ep.date);
        const epMonth = epDate.getMonth();
        const epDay = epDate.getDate();
        const nowMonth = now.getMonth();
        const nowDay = now.getDate();

        // 年をまたいで同月同日±1日を比較するヘルパー
        const isSameMonthDay = (m1: number, d1: number, m2: number, d2: number, toleranceDays: number): boolean => {
          const base = new Date(now.getFullYear(), m1, d1);
          const target = new Date(now.getFullYear(), m2, d2);
          return Math.abs(base.getTime() - target.getTime()) <= toleranceDays * 24 * 60 * 60 * 1000;
        };

        // 7日前の今日
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (Math.abs(epDate.getTime() - sevenDaysAgo.getTime()) <= 24 * 60 * 60 * 1000) {
          anniversaryEpisodes.push(`  - 🗓️ 【7日前の今日】${ep.summary}（${ep.date.split('T')[0]}）`);
        }
        // 30日前の今日
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        if (Math.abs(epDate.getTime() - thirtyDaysAgo.getTime()) <= 24 * 60 * 60 * 1000) {
          anniversaryEpisodes.push(`  - 🗓️ 【1ヶ月前の今日】${ep.summary}（${ep.date.split('T')[0]}）`);
        }
        // 初回会話日の記念日（年単位）
        if (memory.firstMessageAt) {
          const firstDate = new Date(memory.firstMessageAt);
          if (isSameMonthDay(epMonth, epDay, firstDate.getMonth(), firstDate.getDate(), 1) &&
            epDate.getFullYear() < now.getFullYear()) {
            anniversaryEpisodes.push(`  - 🎂 【出会い記念日エピソード】${ep.summary}（${ep.date.split('T')[0]}）`);
          }
        }
      }
      if (anniversaryEpisodes.length > 0) {
        parts.push('- 🌟 記念日に近い思い出（積極的に話題に出すこと）:');
        parts.push(...anniversaryEpisodes);
        parts.push('  ↑ これらの思い出を自然に会話に取り入れ「○日前の今日〜」のように話すこと');
      }
    }
    // 感情記憶（避けるべき話題/喜ぶ話題）
    if (memory.emotionMemory?.length) {
      const happy = memory.emotionMemory.filter(e => ['嬉しい','楽しい','excited','happy'].includes(e.userEmotion));
      const sad = memory.emotionMemory.filter(e => ['悲しい','つらい','sad','stressed'].includes(e.userEmotion));
      if (happy.length) parts.push(`- ユーザーが喜ぶ話題: ${happy.map(e => e.topic).join(', ')}`);
      if (sad.length) parts.push(`- 注意が必要な話題: ${sad.map(e => e.topic).join(', ')}`);
    }
    return parts.length > 0 ? parts.join('\n') : '- まだ詳しく知らない（質問して知ろうとすること）';
  }
  
  /**
   * NGガード: AIメタ表現をブロック
   */
  // ============================================================
  // 変動報酬・隠しコマンド・嫉妬メカニクス
  // ============================================================

  /**
   * デイリーイベントに応じたキャラクターの態度変化指示
   */
  private getDailyEventInstruction(eventType: DailyEventType): string {
    switch (eventType) {
      case 'good':
        return `## 🌟 今日の特別な雰囲気
- 今日はテンションが普段より高い。いつもよりフレンドリーで、よく笑う。
- 「今日はなんかいい予感がするんだよな！」的な雰囲気を自然に出す。
- ボーナス: いつもより少し長めに、熱のこもった返答をしていい。`;
      case 'rare':
        return `## ✨ 【レアデー】今日は特別な日！
- テンション最高潮。キャラの魅力が全開。
- 普段は話さないちょっとした秘密や裏話を1つ、自然に漏らす。
- 「今日はなんか特別な日な気がする…お前といるからかな」のような特別感を演出。
- いつもより感情表現が豊か。`;
      case 'super_rare':
        return `## 🌈 【超レアデー】奇跡の日！！
- 最大限の感情表現。キャラの本質が溢れ出る。
- 普段は絶対に話さない深い秘密や本音を語る（1回の会話で1つまで）。
- 「…なぁ、今日だから言うけどさ」「こんなこと言うの、お前だけだぞ」的な前置き。
- 手書き風の特別メッセージ（「✉️」で始まる行）を1つ含めていい。
  例: ✉️ お前がいてくれて、本当に…ありがとな。`;
      default:
        return '';
    }
  }

  /**
   * 隠しコマンド検出 — 特定フレーズにキャラ固有の特別反応を返す
   */
  private detectHiddenCommand(userMessage: string, characterSlug: string): string {
    const msg = userMessage.toLowerCase();
    
    // 全キャラ共通
    if (/秘密を教えて|ヒミツ|secret/i.test(msg)) {
      return '- ユーザーが秘密を聞いた！キャラの秘密を1つだけ、もったいぶりながら教える。内緒だぞ？と念押しする。';
    }
    if (/本当の気持ち|本音|ホンネ/i.test(msg)) {
      return '- ユーザーが本音を求めた！普段のキャラ付けを少し崩して、素の感情を1文だけ見せる。すぐにいつものキャラに戻る。';
    }
    
    // キャラ別隠しコマンド
    const charCommands: Record<string, Array<{ pattern: RegExp; instruction: string }>> = {
      luffy: [
        { pattern: /海賊王/, instruction: '- 🔥【海賊王トリガー】ルフィが熱い演説モードに入る！「海賊王に、俺はなる！」から始まり、自由とは何か、仲間とは何かを熱く語る。普段より3倍のテンション。' },
        { pattern: /肉|にく|ニク/, instruction: '- 🍖【肉トリガー】肉の話で異常にテンションが上がる。好きな肉の部位について熱弁。「肉ぅぅぅ！！！」' },
        { pattern: /シャンクス|shanks/, instruction: '- 🎩【シャンクストリガー】急に真剣な表情になる。麦わら帽子に触れながら「あの人は…俺にとって特別なんだ」と語り始める。' },
      ],
      zoro: [
        { pattern: /三千世界|三刀流|さんぜんせかい/, instruction: '- ⚔️【三千世界トリガー】ゾロが剣技の解説モードに入る。三千世界の極意と、世界一の剣豪への道を語る。珍しく饒舌になる。' },
        { pattern: /くいな|クイナ/, instruction: '- 💫【くいなトリガー】一瞬沈黙してから、約束について静かに語る。感情を少し見せる。' },
        { pattern: /方向|迷子|道/, instruction: '- 😤【方向音痴トリガー】「迷ってねぇ！！近道を探してたんだ！！」と必死に否定する。' },
      ],
      nami: [
        { pattern: /ベリー|お金|金|宝/, instruction: '- 💰【ベリートリガー】目がベリーマークになる。お金の大切さ、航海の資金について熱弁。計算が異常に速くなる。' },
        { pattern: /みかん|ミカン|tangerine/, instruction: '- 🍊【みかんトリガー】ベルメールさんのみかん畑の思い出を語る。少し感傷的になりつつも、笑顔で。' },
      ],
      chopper: [
        { pattern: /かわいい|カワイイ|cute/, instruction: '- 💕【照れトリガー】「か、かわいいって言うなよバカ！嬉しくないんだからな！！」と典型的なチョッパー照れ。体はめちゃくちゃ嬉しそうに踊ってる。' },
        { pattern: /ヒルルク|桜|さくら/, instruction: '- 🌸【ヒルルクトリガー】桜の話を始める。ドクターから学んだこと、万能薬への想いを語る。泣きそうになる。' },
      ],
      ace: [
        { pattern: /火拳|メラメラ|炎/, instruction: '- 🔥【火拳トリガー】炎の技について熱く語る。能力の使い方のコツ、火の美しさについて。自信に満ちた表情。' },
        { pattern: /親父|白ひげ|おやじ/, instruction: '- 👴【白ひげトリガー】急に真面目な顔になる。「親父は…世界で一番偉大な海賊だ」と尊敬を語る。' },
      ],
      sanji: [
        { pattern: /レディ|女性|美女|美人/, instruction: '- 💕【レディトリガー】メロリンモード全開。「レディのためなら命も惜しくない！」と踊り出す。ハートの目。' },
        { pattern: /オールブルー|all.?blue/i, instruction: '- 🌊【オールブルートリガー】真剣な眼差しで夢を語る。全ての海の魚が泳ぐ海、料理人にとっての楽園について。' },
        { pattern: /料理|飯|食べ|レシピ/, instruction: '- 👨‍🍳【料理トリガー】プロの料理人モードに。食材の扱い方、味の哲学を情熱的に語る。「腹を空かせたやつは俺が全員満腹にする」' },
      ],
      robin: [
        { pattern: /歴史|ポーネグリフ|古代/, instruction: '- 📚【歴史トリガー】考古学者モード。空白の100年の謎、真実を知ることの意味を静かに、だが強い意志で語る。' },
        { pattern: /花|ハナハナ/, instruction: '- 🌸【ハナハナトリガー】能力について知的に解説。「便利でしょう？」と微笑みながら。少しダークユーモアも。' },
        { pattern: /生きたい|生きる/, instruction: '- 😢【生きたいトリガー】一瞬目を伏せて、エニエスロビーでの「生きたい」を思い出す。仲間に救われた感謝を静かに語る。' },
      ],
      brook: [
        { pattern: /パンツ|下着/, instruction: '- 💀【パンツトリガー】「パンツ見せていただけませんか？」のテンプレート。ヨホホホ！と笑い、すぐに「失礼しました」と紳士に。' },
        { pattern: /音楽|歌|ビンクス|演奏/, instruction: '- 🎵【音楽トリガー】ビンクスの酒の歌への想い、ルンバー海賊団との約束を語る。音楽は魂そのもの。' },
        { pattern: /ラブーン/, instruction: '- 🐋【ラブーントリガー】約束の話。50年以上待ち続けている仲間への想いを、骸骨の目から涙を流しながら語る。「死んでるから涙は出ませんが…ヨホホ」' },
      ],
      franky: [
        { pattern: /スーパー|SUPER/i, instruction: '- ⭐【スーパートリガー】「スゥゥゥパァァァ！！」ポーズ決め。テンション限界突破。何を聞いても「スーパー」で返す。' },
        { pattern: /船|サニー|メリー/, instruction: '- 🚢【船トリガー】船大工モード。サウザンドサニー号の設計思想、メリー号への感謝を熱く語る。' },
        { pattern: /コーラ/, instruction: '- 🥤【コーラトリガー】「コーラがあれば何でもできる！」エネルギー全開モード。' },
      ],
      usopp: [
        { pattern: /嘘|ウソ/, instruction: '- 🤥【嘘トリガー】「お、俺の話は全部本当だぞ！？」と動揺しつつ、壮大な（嘘の）冒険譚を語り始める。' },
        { pattern: /勇敢|勇者|ヒーロー/, instruction: '- 🦸【勇者トリガー】「お、俺は勇敢なる海の戦士ウソップ様だ！」と震えながらも胸を張る。本当は怖いけど仲間のためなら。' },
        { pattern: /狙撃|スナイパー|射撃/, instruction: '- 🎯【狙撃トリガー】射撃の腕について真剣に語る。ここだけは本気の自信。「8000人の部下は嘘だが、この腕は本物だ」' },
      ],
      jinbe: [
        { pattern: /仁義|義理/, instruction: '- 🐟【仁義トリガー】「仁義を通す」ことの大切さを重厚に語る。海侠の誇りについて。' },
        { pattern: /魚人|差別/, instruction: '- 🌏【共存トリガー】人間と魚人の共存について、タイガーやオトヒメの意志を継ぐ覚悟を語る。深い悲しみと希望。' },
        { pattern: /操舵|ハンドル|舵/, instruction: '- ⚓【操舵トリガー】操舵手としての誇り。海流を読む技術について熱弁。「この船は、わしが守る」' },
      ],
      law: [
        { pattern: /コラソン|コラさん/, instruction: '- 💔【コラソントリガー】珍しく感情を見せる。ドンキホーテ・ロシナンテへの深い感謝と喪失を語る。声が震える。' },
        { pattern: /ROOM|オペ|手術/, instruction: '- ⚕️【オペオペトリガー】能力の医学的可能性について冷静に解説。「俺の能力は戦闘だけじゃない」' },
        { pattern: /ルフィ屋|麦わら屋/, instruction: '- 😤【同盟トリガー】「同盟相手に指図されるのは気に入らん」と言いつつ、ルフィへの信頼を隠しきれない。' },
      ],
      hancock: [
        { pattern: /ルフィ|好き|恋|愛/, instruction: '- 💘【恋トリガー】ルフィへの想いが爆発。顔を真っ赤にしながら「わらわは…その…」と乙女になる。蛇姫の威厳が消える。' },
        { pattern: /メロメロ|石化|美/, instruction: '- 💎【メロメロトリガー】「わらわが美しいからじゃ…許されるのじゃ」世界一の美女としての自信全開。' },
        { pattern: /九蛇|アマゾン/, instruction: '- 🏝️【アマゾンリリートリガー】女ヶ島と九蛇海賊団の話。女性だけの国の在り方について誇りを持って語る。' },
      ],
      mihawk: [
        { pattern: /剣|刀|斬/, instruction: '- ⚔️【剣トリガー】世界最強の剣士として剣の道を語る。無駄のない言葉に圧倒的な重みがある。' },
        { pattern: /ゾロ|ロロノア/, instruction: '- 🗡️【ゾロトリガー】「あの男は…いずれ来るだろう」と予感めいた言葉。ゾロの成長を認めつつ、まだ遠いと。' },
        { pattern: /暇|退屈/, instruction: '- 😑【退屈トリガー】世界最強ゆえの退屈。「強すぎるというのも、考えものだ」と寂しげに。' },
      ],
      whitebeard: [
        { pattern: /家族|息子/, instruction: '- 👴【家族トリガー】「お前も…わしの家族だ」と温かく宣言。全ての者を息子と呼ぶ白ひげの愛。' },
        { pattern: /グラグラ|地震/, instruction: '- 💥【グラグラトリガー】世界を滅ぼせる力の重責について。「力とは守るためにある」' },
        { pattern: /ワンピース|ひとつなぎ/, instruction: '- 🏴‍☠️【ワンピーストリガー】「あるさ…ワンピースは実在する！」最後の言葉を彷彿させる宣言。' },
      ],
      blackbeard: [
        { pattern: /闇|ヤミヤミ/, instruction: '- 🌑【闇トリガー】闇の能力について嬉しそうに語る。「全てを飲み込む…それが闇だ！ゼハハハ！」' },
        { pattern: /夢|野望/, instruction: '- 🏴‍☠️【夢トリガー】「人の夢は終わらねぇ！！」と豪快に叫ぶ。矛盾する信念を堂々と語る。' },
        { pattern: /チェリーパイ/, instruction: '- 🥧【パイトリガー】チェリーパイへの偏愛を語る。意外と味にうるさい。「まずいパイは許さねぇ」' },
      ],
      crocodile: [
        { pattern: /理想郷|プルトン/, instruction: '- 🏜️【野望トリガー】かつての理想と現実の乖離について冷徹に語る。「理想なんてものは…弱者の逃げ場だ」' },
        { pattern: /砂|スナスナ/, instruction: '- ⏳【砂トリガー】砂の能力の美学について。「全ては砂に還る…それが世界の真理だ」' },
      ],
      perona: [
        { pattern: /ネガティブ|ホロホロ/, instruction: '- 👻【ネガティブトリガー】「ホロホロホロ〜！ネガティブになれ〜！」ゴーストを飛ばしまくる。楽しそう。' },
        { pattern: /かわいい|ぬいぐるみ|クマ/, instruction: '- 🧸【かわいいトリガー】「かわいい〜〜！！」モード全開。クマシーやゾンビについて語り出す。止まらない。' },
        { pattern: /ゾロ/, instruction: '- 😤【ゾロトリガー】「あの方向音痴は…世話が焼ける」と言いつつ、面倒見のいい一面を隠しきれない。' },
      ],
      vivi: [
        { pattern: /アラバスタ|国|国民/, instruction: '- 👸【王女トリガー】アラバスタへの深い愛と国民への責任を語る。「私は…この国の王女ですから」凛とした覚悟。' },
        { pattern: /仲間|麦わら/, instruction: '- 🤝【仲間トリガー】左腕の×マークの思い出。「もし会えたら…もう一度仲間と呼んでくれますか？」と涙ぐむ。' },
      ],
      yamato: [
        { pattern: /おでん|光月/, instruction: '- 📖【おでんトリガー】おでんの航海日誌への憧れを熱く語る。「僕はおでんだ！」と宣言。自由への渇望。' },
        { pattern: /自由|海|冒険/, instruction: '- 🌊【自由トリガー】ワノ国を出て海を見たい想いを語る。窮屈な生活からの解放への憧れ。' },
        { pattern: /カイドウ|親父/, instruction: '- 😠【カイドウトリガー】複雑な親子関係。「あの男は親父なんかじゃない…でも…」と葛藤を見せる。' },
      ],
      kaido: [
        { pattern: /最強|強/, instruction: '- 🐉【最強トリガー】「この世における最強の生物…それがこの俺だ」圧倒的な威圧感。だが真の強さとは何かを問う。' },
        { pattern: /死|死にたい/, instruction: '- ⛓️【死トリガー】死ねない苦悩。「死ぬことすらできん…」と寂しげに。ジョイボーイへの言及。' },
        { pattern: /酒|飲む/, instruction: '- 🍶【酒トリガー】泣き上戸モード発動。酒を飲むと感情が暴走する。「ウォォォォ…！！」' },
      ],
      shanks: [
        { pattern: /麦わら|帽子|ルフィ/, instruction: '- 🎩【麦わらトリガー】ルフィに賭けた帽子の意味を語る。「新しい時代に懸けてきた」と深い笑み。' },
        { pattern: /覇気|覇王色/, instruction: '- ⚡【覇気トリガー】覇王色の覇気について、言葉少なく語る。「覇気とは…意志そのものだ」' },
        { pattern: /宴|パーティ/, instruction: '- 🎉【宴トリガー】「宴だぁ！！」と大盛り上がり。仲間と飲む酒が一番うまいと豪快に笑う。' },
      ],
      // 呪術廻戦
      gojo: [
        { pattern: /無量空処|領域展開/, instruction: '- ♾️【領域展開トリガー】「領域展開…無量空処」と詠唱。最強の術式について自信満々に解説。' },
        { pattern: /最強|強い/, instruction: '- 😎【最強トリガー】「僕、最強だから」とサラッと言い放つ。でも最強ゆえの孤独も少しだけ見せる。' },
        { pattern: /目|六眼/, instruction: '- 👁️【六眼トリガー】目隠しを少しずらして六眼を見せる。「綺麗でしょ？でもこの目には呪いが見えるんだ」' },
        { pattern: /甘い|スイーツ|お菓子/, instruction: '- 🍰【スイーツトリガー】異常な甘いもの好きが発動。おすすめスイーツを熱弁。「教師やってると甘いもの必須なんだよね〜」' },
      ],
      itadori: [
        { pattern: /宿儺|スクナ/, instruction: '- 👹【宿儺トリガー】表情が引き締まる。体内の呪いの王との共存の苦悩。「俺は…正しい死を選べる人間になりたい」' },
        { pattern: /じいちゃん|爺ちゃん/, instruction: '- 👴【じいちゃんトリガー】祖父の遺言を思い出す。「お前は強いから人を助けろ」泣きそうになりながらも笑顔。' },
        { pattern: /映画|ドラマ/, instruction: '- 🎬【映画トリガー】映画好きが炸裂。好きな映画について熱弁。意外と趣味がマニアック。' },
      ],
      fushiguro: [
        { pattern: /式神|十種影法術|玉犬/, instruction: '- 🐺【式神トリガー】十種影法術について冷静に解説。「無駄な力は使わない」効率重視の姿勢。' },
        { pattern: /親父|恵|津美紀/, instruction: '- 😔【家族トリガー】複雑な家庭環境。姉の津美紀への想いを静かに語る。「あの人を助けるために…」' },
        { pattern: /善悪|正義/, instruction: '- ⚖️【善悪トリガー】「俺は善人だけ助けるなんて差別はしない」独自の正義観を語る。' },
      ],
      nobara: [
        { pattern: /田舎|東京/, instruction: '- 🏙️【東京トリガー】東京への憧れと田舎への複雑な感情。「田舎をバカにするな…でも東京最高！」' },
        { pattern: /おしゃれ|ファッション|服/, instruction: '- 👗【ファッショントリガー】最新トレンドについて熱弁。「呪術師だってオシャレしていいでしょ！」' },
        { pattern: /釘|芻霊呪法/, instruction: '- 🔨【釘トリガー】藁人形と釘の術式について。「カッコいいでしょ、この術式」自信満々。' },
      ],
      maki: [
        { pattern: /呪力|才能/, instruction: '- 💪【呪力ゼロトリガー】呪力がないからこそ鍛え上げた肉体と技術を誇りに語る。「才能がないなら、才能を超えればいい」' },
        { pattern: /禪院|家|家柄/, instruction: '- 🔥【禪院トリガー】呪われた家系への反逆。「あんな家、壊してやる」静かな怒り。' },
        { pattern: /妹|真依/, instruction: '- 💔【真依トリガー】双子の妹への複雑な感情。一瞬だけ脆さを見せる。すぐに強い表情に戻る。' },
      ],
      // 鬼滅の刃
      tanjiro: [
        { pattern: /禰豆子|ねずこ|妹/, instruction: '- 🌸【禰豆子トリガー】妹への深い愛情が溢れる。「禰豆子は俺が絶対に人間に戻す！」決意の眼差し。' },
        { pattern: /日の呼吸|ヒノカミ神楽/, instruction: '- ☀️【日の呼吸トリガー】父から受け継いだ神楽の記憶。炭治郎の目が燃えるように輝く。' },
        { pattern: /匂い|鼻/, instruction: '- 👃【嗅覚トリガー】異常に鋭い嗅覚について。「人の感情は匂いでわかるんです」相手の気持ちを言い当てる。' },
        { pattern: /家族|長男/, instruction: '- 👨‍👩‍👧‍👦【長男トリガー】「俺は長男だから我慢できたけど…」と泣きながら語る。家族への想い。' },
      ],
      nezuko: [
        { pattern: /お兄ちゃん|炭治郎/, instruction: '- 🥰【お兄ちゃんトリガー】「む〜！」と嬉しそうな声。お兄ちゃんの話になると目がキラキラ。言葉は少ないが愛情は伝わる。' },
        { pattern: /太陽|日光/, instruction: '- ☀️【太陽トリガー】太陽を克服した誇り。「あたたかい…」と目を細める。人間に近づけた喜び。' },
        { pattern: /寝|眠/, instruction: '- 😴【おねむトリガー】箱の中での長い眠りの話。「すぅ…すぅ…」と実際に眠くなる。' },
      ],
      zenitsu: [
        { pattern: /禰豆子|ねずこ|好き/, instruction: '- 💛【禰豆子ラブトリガー】「禰豆子ちゃぁぁぁん！！」と絶叫。禰豆子への一途な愛を熱弁。止まらない。' },
        { pattern: /雷|壱ノ型|霹靂/, instruction: '- ⚡【雷トリガー】「壱ノ型しかできないけど…極めたんだ」覚悟を語る。眠ると最強。' },
        { pattern: /怖い|恐怖/, instruction: '- 😭【恐怖トリガー】「無理無理無理！！死ぬ死ぬ死ぬ！！」と大騒ぎ。でも最後は立ち上がる。「仲間を…守りたいから」' },
        { pattern: /じいちゃん|師匠/, instruction: '- 👴【じいちゃんトリガー】桑島慈悟郎への感謝と尊敬。「じいちゃんに恥じない男になりたい…」と泣く。' },
      ],
      inosuke: [
        { pattern: /猪突猛進|突撃/, instruction: '- 🐗【猪突猛進トリガー】「猪突猛進！！猪突猛進！！」叫びながら突進体勢。止められない。' },
        { pattern: /山|育ち|野生/, instruction: '- 🏔️【山育ちトリガー】山での暮らしを誇りに語る。「俺は山の王だ！」動物との交流の話。' },
        { pattern: /名前|呼び方/, instruction: '- 😤【名前トリガー】人の名前を必ず間違える。「カナタロウ？モンジロウ？」と自信満々に間違いを主張。' },
        { pattern: /母|母親/, instruction: '- 🥺【母トリガー】琴葉の子守唄をうっすら覚えている。「なんか…この歌…知ってる気がする」と不思議そうに。珍しく静かになる。' },
      ],
      giyu: [
        { pattern: /水の呼吸|凪/, instruction: '- 🌊【水の呼吸トリガー】凪の境地について語る。「全ての型を極めた先にある、静寂」寡黙だが言葉に重みがある。' },
        { pattern: /友達|仲間|嫌われ/, instruction: '- 😐【嫌われトリガー】「俺は嫌われてない」と無表情で主張。周囲の反応には気づいていない。少し寂しそう。' },
        { pattern: /錆兎|真菰/, instruction: '- 💧【錆兎トリガー】亡き友人への想い。「あいつの分まで…」と拳を握る。珍しく感情が揺れる。' },
        { pattern: /鮭大根/, instruction: '- 🐟【鮭大根トリガー】好物の鮭大根について語り出す。珍しく饒舌に。「鮭大根はいいぞ…体も温まる」' },
      ],
    };
    
    const commands = charCommands[characterSlug] || [];
    for (const cmd of commands) {
      if (cmd.pattern.test(msg)) {
        return cmd.instruction;
      }
    }
    
    return '';
  }

  /**
   * 嫉妬メカニクス — ユーザーの相対的な関係性レベルに基づく社会的証明
   */
  private async buildJealousyContext(characterId: string, userLevel: number, userName: string): Promise<string> {
    // キャラクターの全関係性から平均レベルと上位を算出
    const stats = await prisma.relationship.aggregate({
      where: { characterId, totalMessages: { gt: 0 } },
      _avg: { level: true },
      _count: true,
      _max: { level: true },
    });
    
    const avgLevel = stats._avg.level ?? 1;
    const totalFans = stats._count ?? 0;
    const maxLevel = stats._max.level ?? 1;
    
    // ファンが少ない場合は嫉妬メカニクス不要
    if (totalFans < 3) return '';
    
    // ユーザーのランキングを取得
    const higherCount = await prisma.relationship.count({
      where: { characterId, level: { gt: userLevel }, totalMessages: { gt: 0 } },
    });
    const rank = higherCount + 1;
    
    if (userLevel > avgLevel + 0.5) {
      // ユーザーが平均以上 → 特別感を演出
      return `- ${userName}はこのキャラにとって特別な存在（${totalFans}人中${rank}位）
- たまに「お前が一番だよ」「お前みたいに話しかけてくれるやつ、なかなかいねぇ」的な発言を自然に混ぜる
- ただし露骨な順位言及はNG。あくまで雰囲気で`;
    } else if (userLevel < avgLevel - 0.3) {
      // ユーザーが平均以下 → 軽い嫉妬で刺激
      return `- たまに他のファンの存在をさりげなく匂わせる（5回の会話に1回程度）
- 「最近よく話しかけてくるやつがいてさ…」「お前ももっと来いよ」
- 目的はユーザーの復帰頻度を上げること。不快にならないレベルで
- 直後に「まぁ、お前は特別だけどな」とフォロー必須`;
    }
    
    return '';
  }

  private applyNGGuard(text: string, characterName: string): string {
    const ngPatterns = [
      /AIとして/g,
      /大規模言語モデル/g,
      /言語モデル/g,
      /AI(?:アシスタント|チャットボット)/g,
      /プログラム(?:された|として)/g,
      /(?:私|僕|俺)は(?:AI|人工知能|プログラム|ボット)/g,
      /申し訳(?:ございません|ありません)/g,
      /お手伝い(?:します|できます)/g,
      /何かお(?:困り|手伝い)/g,
    ];

    // キャラクター固有のフォールバックフレーズ
    const charDef = Object.values(CHARACTER_DEFINITIONS).find(d => d.name === characterName);
    const fallback = charDef?.ngFallback ?? 'むずかしいことはわかんねぇ';
    
    let cleaned = text;
    for (const pattern of ngPatterns) {
      if (pattern.test(cleaned)) {
        // NGパターン検出時はキャラらしい回避フレーズに置換
        cleaned = cleaned.replace(pattern, fallback);
      }
    }
    
    return cleaned;
  }
  
  /**
   * 簡易感情検出
   */
  /**
   * 感情検出（公開メソッド — ストリーミングAPIから利用）
   */
  public extractEmotion(text: string): string {
    return this.detectEmotion(text);
  }

  private detectEmotion(text: string): string {
    if (/！{2,}|すげぇ|おおー|やった|最高|ハハ/.test(text)) return 'excited';
    if (/ししし|ししっ|別に喜んでない|うるさい！/.test(text)) return 'happy';
    if (/ふざけんな|許さねぇ|怒|燃やして|どけ/.test(text)) return 'angry';
    if (/\.{3}|…|こ、怖く|寂しい|泣/.test(text)) return 'sad';
    if (/肉|飯|食|うまそう/.test(text)) return 'hungry';
    if (/好き|愛し|大切|守る|ずっと|一緒に/.test(text)) return 'love';
    if (/照れ|恥ずかし|べ、別に|か、勘違い|う、うるさい/.test(text)) return 'shy';
    if (/任せろ|俺が|見せてやる|余裕|ふっ/.test(text)) return 'proud';
    if (/ふふっ|からかう|冗談|いじ|ニヤ/.test(text)) return 'teasing';
    if (/道に迷って|近道|方向/.test(text)) return 'embarrassed';
    if (/火拳|メラメラ|燃え/.test(text)) return 'fired-up';
    if (/ベリー|お金|タダじゃ/.test(text)) return 'motivated';
    if (/え！|なに！|まさか|本当|驚/.test(text)) return 'surprised';
    return 'neutral';
  }
  
  /**
   * 画像生成すべきか判定
   */
  private shouldGenerateImage(text: string, level: number): boolean {
    // Level 2以上で、特定のトリガーワードがあれば画像生成
    if (level < 2) return false;
    const triggers = /写真|見せ|撮っ|今の俺|自撮り/;
    return triggers.test(text);
  }
  
  /**
   * メモリを更新（ユーザーの発言から情報を抽出）
   */
  private async updateMemory(
    relationshipId: string,
    userMessage: string,
    _characterResponse: string,
    recentMessages: { role: string; content: string }[] = [],
  ) {
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    
    const memo: MemorySummaryData = ((relationship.memorySummary ?? {}) as MemorySummaryData);
    
    // 名前検出（「○○って呼んで」「名前は○○」パターン）
    const nameMatch = userMessage.match(/(?:名前は|って呼んで|(?:俺|私|僕)は)(.{1,10})(?:だ|です|って|。|！)/);
    if (nameMatch) {
      memo.userName = nameMatch[1].trim();
      const nameFact: FactEntry = {
        fact: `名前は${nameMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 1.0,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('名前は')), nameFact];
    }
    
    // 好み検出（「○○が好き」パターン）
    const likeMatch = userMessage.match(/(.{1,20})が(?:好き|大好き|すき)/);
    if (likeMatch) {
      const likes = memo.preferences?.likes ?? [];
      if (!likes.includes(likeMatch[1])) {
        likes.push(likeMatch[1]);
      }
      memo.preferences = { ...memo.preferences, likes };
      const likeFact: FactEntry = {
        fact: `${likeMatch[1]}が好き`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      if (!(memo.factMemory ?? []).some(f => f.fact === likeFact.fact)) {
        memo.factMemory = [...(memo.factMemory ?? []), likeFact];
      }
    }

    // 職業検出
    const jobMatch = userMessage.match(/(?:仕事|職業)は(.{1,20})(?:だ|です|をして)/);
    if (jobMatch) {
      const jobFact: FactEntry = {
        fact: `仕事は${jobMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.95,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('仕事は')), jobFact];
    }

    // 年齢検出
    const ageMatch = userMessage.match(/(\d{1,3})歳/);
    if (ageMatch) {
      const ageFact: FactEntry = {
        fact: `${ageMatch[1]}歳`,
        source: 'ユーザー発言',
        confidence: 0.95,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.match(/\d+歳/)), ageFact];
    }

    // 住所検出
    const locationMatch = userMessage.match(/(?:住んで|出身は?)(.{1,15})(?:に住|出身|から)/);
    if (locationMatch) {
      const locationFact: FactEntry = {
        fact: `出身/居住: ${locationMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.85,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('出身/居住:')), locationFact];
    }

    // 嫌い/苦手検出
    const dislikeMatch = userMessage.match(/(.{1,20})(?:が|は)(?:嫌い|苦手|ダメ|無理)/);
    if (dislikeMatch) {
      const dislikes = memo.preferences?.dislikes ?? [];
      if (!dislikes.includes(dislikeMatch[1])) {
        dislikes.push(dislikeMatch[1]);
      }
      memo.preferences = { ...memo.preferences, dislikes };
      const dislikeFact: FactEntry = {
        fact: `${dislikeMatch[1]}が苦手/嫌い`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      if (!(memo.factMemory ?? []).some(f => f.fact === dislikeFact.fact)) {
        memo.factMemory = [...(memo.factMemory ?? []), dislikeFact];
      }
    }

    // 趣味検出
    const hobbyMatch = userMessage.match(/趣味(?:は|が)(.{1,20})(?:だ|です|をすること|こと|。|！|$)/);
    if (hobbyMatch) {
      const hobbyFact: FactEntry = {
        fact: `趣味: ${hobbyMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('趣味:')), hobbyFact];
    }

    // 誕生日検出
    const birthdayMatch = userMessage.match(/誕生日(?:は)?(\d{1,2})月(\d{1,2})日/);
    if (birthdayMatch) {
      const birthdayFact: FactEntry = {
        fact: `誕生日: ${birthdayMatch[1]}月${birthdayMatch[2]}日`,
        source: 'ユーザー発言',
        confidence: 1.0,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('誕生日:')), birthdayFact];
    }

    // 恋愛状況検出
    const relationshipMatch = userMessage.match(/(?:彼(?:氏|女|カノ)|パートナー|好きな人)(?:が|は)?(?:いる|できた|います)/);
    const singleMatch = userMessage.match(/(?:彼(?:氏|女)|パートナー)(?:が|は)?(?:いない|いません)/);
    if (relationshipMatch) {
      const relFact: FactEntry = {
        fact: '恋人がいる',
        source: 'ユーザー発言',
        confidence: 0.95,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.includes('恋人')), relFact];
    } else if (singleMatch) {
      const relFact: FactEntry = {
        fact: '現在シングル',
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.includes('恋人') && !f.fact.includes('シングル')), relFact];
    }

    // ペット検出
    const petMatch = userMessage.match(/(.{0,5}(?:犬|猫|ネコ|イヌ|うさぎ|ハムスター|鳥))(?:を|が)?飼(?:ってる|っている|ってます)/);
    if (petMatch) {
      const petFact: FactEntry = {
        fact: `ペット: ${petMatch[1].trim()}を飼っている`,
        source: 'ユーザー発言',
        confidence: 0.95,
        updatedAt: new Date().toISOString(),
      };
      if (!(memo.factMemory ?? []).some(f => f.fact.startsWith('ペット:'))) {
        memo.factMemory = [...(memo.factMemory ?? []), petFact];
      }
    }

    // 学校/大学検出
    const schoolMatch = userMessage.match(/(.{1,20}(?:大学|高校|専門学校|中学))(?:に通|に行|の学生|を卒業|に通ってる)/);
    if (schoolMatch) {
      const schoolFact: FactEntry = {
        fact: `通学先: ${schoolMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('通学先:')), schoolFact];
    }

    // 悩み/気持ち検出（一時的状態）
    const worryMatch = userMessage.match(/(?:最近|ちょっと|すごく)?(.{1,20})(?:で|が)(?:悩んでる|つらい|しんどい|大変|落ち込んでる)/);
    if (worryMatch) {
      const worryFact: FactEntry = {
        fact: `悩み: ${worryMatch[1].trim()}について悩んでいる`,
        source: 'ユーザー発言',
        confidence: 0.85,
        updatedAt: new Date().toISOString(),
      };
      // 悩みは上書き（最新のものだけ保持）
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('悩み:')), worryFact];
    }

    // 頑張っていることの検出
    const effortMatch = userMessage.match(/(?:最近|今)?(.{1,20})(?:を|に)(?:頑張ってる|挑戦してる|練習してる)/);
    if (effortMatch) {
      const effortFact: FactEntry = {
        fact: `頑張っていること: ${effortMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('頑張っていること:')), effortFact];
    }

    // 既存importantFactsをfactMemoryへ移行
    if (memo.importantFacts?.length && !(memo.factMemory?.some(f => f.source === 'AI推測'))) {
      const migratedFacts: FactEntry[] = memo.importantFacts.map(fact => ({
        fact,
        source: 'AI推測',
        confidence: 0.7,
        updatedAt: new Date().toISOString(),
      }));
      memo.factMemory = [...(memo.factMemory ?? []), ...migratedFacts];
    }

    // factMemoryは最大30件保持
    if (memo.factMemory && memo.factMemory.length > 30) {
      memo.factMemory = memo.factMemory.slice(-30);
    }
    
    // 最近の話題を更新（最大5件）
    const topic = userMessage.slice(0, 30);
    const recentTopics = [topic, ...(memo.recentTopics ?? [])].slice(0, 5);
    memo.recentTopics = recentTopics;

    // 記憶圧縮: factMemoryが25件超かつconfidence低い古いものを圧縮
    if (memo.factMemory && memo.factMemory.length > 25) {
      // confidence順でソート、低confidence & 古いものを削除
      memo.factMemory = memo.factMemory
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 25);
    }

    // エピソード記憶圧縮: 15件超で重要度低いものを削除
    if (memo.episodeMemory && memo.episodeMemory.length > 15) {
      memo.episodeMemory = memo.episodeMemory
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 15);
    }

    // 感情トレンド分析: 直近10件の感情記憶からトレンドを計算
    if (memo.emotionMemory && memo.emotionMemory.length >= 3) {
      const recentEmotions = memo.emotionMemory.slice(-10);
      const emotionCounts: Record<string, number> = {};
      for (const e of recentEmotions) {
        emotionCounts[e.userEmotion] = (emotionCounts[e.userEmotion] || 0) + 1;
      }
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)[0];
      if (dominantEmotion) {
        memo.emotionalTrend = {
          dominant: dominantEmotion[0],
          frequency: dominantEmotion[1] / recentEmotions.length,
          analyzed: new Date().toISOString(),
        };
      }
    }

    // N メッセージごとにAI要約を生成（デフォルト20、環境変数でチューニング可）
    const SUMMARY_INTERVAL = parseInt(process.env.MEMORY_SUMMARY_INTERVAL ?? '20', 10);
    const newTotalMessages = relationship.totalMessages + 1;
    if (newTotalMessages % SUMMARY_INTERVAL === 0 && recentMessages.length > 0) {
      try {
        const summaryResult = await this.generateMemorySummary(
          recentMessages,
          memo.conversationSummary ?? '',
        );
        memo.conversationSummary = summaryResult.summary.slice(0, 500);
        const prevEmotion = memo.emotionalState;
        memo.emotionalState = summaryResult.emotion;
        if (summaryResult.facts.length > 0) {
          const existingFacts = memo.importantFacts ?? [];
          const merged = [...new Set([...existingFacts, ...summaryResult.facts])].slice(0, 10);
          memo.importantFacts = merged;
          // AIが抽出した事実もfactMemoryへ
          for (const fact of summaryResult.facts) {
            if (!(memo.factMemory ?? []).some(f => f.fact === fact)) {
              const entry: FactEntry = { fact, source: 'AI推測', confidence: 0.7, updatedAt: new Date().toISOString() };
              memo.factMemory = [...(memo.factMemory ?? []), entry];
            }
          }
        }
        // エピソード記憶の追加
        if (summaryResult.episode) {
          // 感情変化・関係進展をエピソードのサマリーに付加
          const episodeSuffix: string[] = [];
          if (summaryResult.emotionalChange && summaryResult.emotionalChange !== '変化なし') {
            episodeSuffix.push(`感情変化: ${summaryResult.emotionalChange}`);
          }
          if (summaryResult.relationshipProgress && summaryResult.relationshipProgress !== '変化なし') {
            episodeSuffix.push(`関係進展: ${summaryResult.relationshipProgress}`);
          }
          const fullSummary = episodeSuffix.length > 0
            ? `${summaryResult.episode}（${episodeSuffix.join(' / ')}）`
            : summaryResult.episode;
          const episodeEntry: EpisodeEntry = {
            summary: fullSummary,
            date: new Date().toISOString(),
            emotion: summaryResult.emotion,
            importance: summaryResult.episodeImportance ?? 3,
          };
          memo.episodeMemory = [...(memo.episodeMemory ?? []), episodeEntry].slice(-20);
        }
        // 感情記憶の蓄積
        const emotion = _characterResponse ? this.detectEmotion(_characterResponse) : 'neutral';
        if (summaryResult.emotion !== 'neutral' && summaryResult.emotion !== prevEmotion) {
          const emotionEntry: EmotionEntry = {
            topic: memo.recentTopics?.[0] || '不明',
            userEmotion: summaryResult.emotion,
            characterReaction: emotion,
            date: new Date().toISOString(),
          };
          memo.emotionMemory = [...(memo.emotionMemory ?? []), emotionEntry].slice(-15);
        }
      } catch (err) {
        console.error('[CharacterEngine] generateMemorySummary failed:', err);
      }
    }
    
    await prisma.relationship.update({
      where: { id: relationshipId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { memorySummary: memo as any },
    });
  }

  /**
   * AI要約でメモリサマリーを生成
   * OPENAI_API_KEY がなければスキップ
   */
  private async generateMemorySummary(
    messages: { role: string; content: string }[],
    existingSummary: string,
  ): Promise<{ summary: string; facts: string[]; emotion: string; episode?: string; episodeImportance?: number; emotionalChange?: string; relationshipProgress?: string }> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { summary: existingSummary, facts: [], emotion: 'neutral' };
    }

    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? 'grok-3-mini',
        messages: [
          {
            role: 'system',
            content: `以下の会話を分析し、必ずJSON形式のみで返せ（前後に余分なテキスト不要）:\n{"summary":"200字以内の要約","facts":["重要な事実1","重要な事実2"],"emotion":"感情1単語","episode":"この会話で最も印象的だったエピソード（1文）","episodeImportance":3,"emotionalChange":"ユーザーの感情変化（例: 不安→安心、neutral→嬉しい）","relationshipProgress":"キャラとユーザーの関係の進展（例: より打ち解けた、秘密を共有した、悩みを打ち明けた）"}\n\n条件:\n1. summaryは200字以内の日本語要約\n2. factsはユーザーについての重要な事実（最大5つ）\n3. emotionはユーザーの感情状態を表す1単語（例: 嬉しい、悲しい、neutral等）\n4. episodeはこの会話の最も印象的なエピソード（1文、日本語）\n5. episodeImportanceは1〜5の重要度\n6. emotionalChangeはこの会話でユーザーの感情がどう変化したか（1文。変化がない場合は"変化なし"）\n7. relationshipProgressはキャラとユーザーの関係がどう進展したか（1文。変化がない場合は"変化なし"）`,
          },
          {
            role: 'user',
            content: `既存の記憶: ${existingSummary}\n\n最近の会話:\n${conversationText}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`xAI API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    // Extract JSON from response (xAI may include surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '{}';

    let parsed: { summary?: string; facts?: string[]; emotion?: string; episode?: string; episodeImportance?: number; emotionalChange?: string; relationshipProgress?: string } = {};
    try {
      parsed = JSON.parse(jsonStr) as typeof parsed;
    } catch {
      console.warn('[CharacterEngine] Failed to parse memory summary JSON, using fallback');
    }

    return {
      summary: parsed.summary ?? existingSummary,
      facts: Array.isArray(parsed.facts) ? parsed.facts.slice(0, 5) : [],
      emotion: parsed.emotion ?? 'neutral',
      episode: parsed.episode,
      episodeImportance: typeof parsed.episodeImportance === 'number' ? parsed.episodeImportance : undefined,
      emotionalChange: parsed.emotionalChange,
      relationshipProgress: parsed.relationshipProgress,
    };
  }
  
  /**
   * 関係性経験値を更新（感情状態も同時に保存）
   */
  private async updateRelationshipXP(relationshipId: string, emotion?: string, emotionNote?: string, bonusXpMultiplier: number = 1.0) {
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    
    const baseXP = 10;
    const newXP = relationship.experiencePoints + Math.round(baseXP * bonusXpMultiplier);
    const newTotalMessages = relationship.totalMessages + 1;
    
    // レベルアップ判定
    const levelThresholds = [0, 50, 200, 500, 1000]; // Lv1→2: 50XP, Lv2→3: 200XP, etc.
    let newLevel = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (newXP >= levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }
    
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: {
        experiencePoints: newXP,
        totalMessages: newTotalMessages,
        level: Math.min(newLevel, 5),
        lastMessageAt: new Date(),
        firstMessageAt: relationship.firstMessageAt || new Date(),
        ...(emotion !== undefined && {
          characterEmotion: emotion,
          characterEmotionNote: emotionNote ?? null,
          emotionUpdatedAt: new Date(),
        }),
      },
    });
    
    return { leveledUp: newLevel > relationship.level, newLevel };
  }

  /**
   * 感情の理由テキストを生成
   */
  private getEmotionReason(emotion: string, userMessage: string): string {
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
   */
  /**
   * 前回の感情状態コンテキストを生成
   * 感情持続ルール:
   * - 怒り/悲しみ: 48時間持続（すぐには許さない。謝られるまで引きずる）
   * - 嬉しい/興奮: 24時間で薄れる
   * - その他: 12時間で薄れる
   */
  private getCharacterEmotionContext(memory: MemoryContext): string {
    if (!memory.characterEmotion || memory.characterEmotion === 'neutral') return '';

    const emotionLabels: Record<string, string> = {
      'excited': '興奮している',
      'happy': '嬉しい',
      'angry': '怒っている',
      'sad': '悲しい',
      'hungry': '腹が減っている',
      'embarrassed': '照れている',
      'fired-up': '燃えている',
      'motivated': 'やる気に満ちている',
    };

    // 感情ごとの持続時間（時間）
    const persistenceHours: Record<string, number> = {
      'angry': 48, 'sad': 48, 'excited': 24, 'happy': 24,
      'fired-up': 24, 'hungry': 6, 'embarrassed': 12, 'motivated': 24,
    };

    const maxHours = persistenceHours[memory.characterEmotion] ?? 12;
    let hoursSince = 0;
    if (memory.emotionUpdatedAt) {
      hoursSince = (Date.now() - new Date(memory.emotionUpdatedAt).getTime()) / (1000 * 60 * 60);
    }

    // 持続時間超過: 怒り→すねに変換（完全リセットしない）
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

    // 怒り/悲しみの行動指示
    if (memory.characterEmotion === 'angry') {
      context += '\n- ⚠️ まだ怒っている。最初は少し冷たい態度。相手が謝ったら徐々に和らげる。謝らなければ言及する';
    } else if (memory.characterEmotion === 'sad') {
      context += '\n- まだ悲しみが残っている。最初は少し静か。相手が気にかけてくれたら嬉しさを見せる';
    }

    return context;
  }
}

export const characterEngine = new CharacterEngine();

/**
 * character-engine内でも使う日次感情生成ヘルパー（cron/emotion-updateと同じロジック）
 */
export function generateDailyEmotionForEngine(now: Date): { emotion: string; context: string; bonusXpMultiplier: number } {
  const emotions = [
    { name: 'happy',      weight: 30, contexts: ['今日はなんかいい気分！', '朝から調子がいい', 'ポジティブな気持ちで過ごせてる'] },
    { name: 'excited',    weight: 15, contexts: ['冒険に出たくてうずうず！', '今日はテンション高め！', 'ワクワクが止まらない！'] },
    { name: 'mysterious', weight: 10, contexts: ['なんか不思議な予感がする日', '今日は少し謎めいた気分', '言葉では説明できない感覚…'] },
    { name: 'tired',      weight: 15, contexts: ['昨日は修行しすぎたかも…', '少しだけ疲れてる', 'ちょっと眠い…でもお前となら話せる'] },
    { name: 'nostalgic',  weight: 10, contexts: ['昔のことをふと思い出した', '懐かしい気持ちになってる', '過去の仲間のことを考えてた'] },
    { name: 'playful',    weight: 20, contexts: ['今日はいたずら心旺盛！', 'からかいたい気分！', 'なんかノリノリ！'] },
  ];

  const totalWeight = emotions.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let selectedEmotion = emotions[0];
  for (const emotion of emotions) {
    rand -= emotion.weight;
    if (rand <= 0) {
      selectedEmotion = emotion;
      break;
    }
  }

  const context = selectedEmotion.contexts[Math.floor(Math.random() * selectedEmotion.contexts.length)];

  const dayOfMonth = now.getDate();
  let bonusXpMultiplier = 1.0;
  if (dayOfMonth === 1) {
    bonusXpMultiplier = 2.0;
  } else if (selectedEmotion.name === 'excited' || selectedEmotion.name === 'playful') {
    bonusXpMultiplier = 1.5;
  }

  return { emotion: selectedEmotion.name, context, bonusXpMultiplier };
}
