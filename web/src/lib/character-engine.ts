import { prisma } from './prisma';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
}

/** DBから取得するユーザーレコードの型 */
interface UserRecord {
  id: string;
  displayName?: string | null;
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
};

// LLM provider abstraction - supports Anthropic, xAI (Grok), OpenAI
async function callLLM(systemPrompt: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  // Try xAI (Grok) first, then Anthropic, then error
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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
  async generateResponse(
    characterId: string,
    relationshipId: string,
    userMessage: string,
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
    
    // 4. パーソナライズメモリ構築
    const memory = this.buildMemoryContext(relationship);
    
    // 5. システムプロンプト構築
    const systemPrompt = this.buildSystemPrompt(character, memory);
    
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
      text = await callLLM(systemPrompt, llmMessages);
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
    
    // 10. 関係性経験値更新（感情状態も同時に保存）
    await this.updateRelationshipXP(relationshipId, emotion, this.getEmotionReason(emotion, userMessage));
    
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
      userName: memo.userName || relationship.user?.displayName || 'お前',
      level: relationship.level,
      preferences: (memo.preferences as Record<string, string>) || {},
      importantFacts: memo.importantFacts || [],
      recentTopics: memo.recentTopics || [],
      conversationSummary: memo.conversationSummary,
      emotionalState: memo.emotionalState,
      totalMessages: relationship.totalMessages,
      lastMessageAt: relationship.lastMessageAt,
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
      // 独立ワークスペース（最優先）→ プロジェクト内agents（フォールバック）
      const independentPath = join('/home/openclaw/.openclaw/agents', slug, 'SOUL.md');
      const projectPath = join(process.cwd(), '..', 'agents', slug, 'SOUL.md');
      const soulPath = existsSync(independentPath) ? independentPath : projectPath;
      if (existsSync(soulPath)) {
        const content = readFileSync(soulPath, 'utf-8');
        if (content.trim()) return content;
      }
    } catch {
      // ファイル読み込み失敗はフォールバック
    }
    return dbFallback;
  }

  private buildSystemPrompt(character: CharacterRecord, memory: MemoryContext): string {
    const levelInstructions = this.getLevelInstructions(memory.level, memory.userName);
    const memoryInstructions = this.getMemoryInstructions(memory);
    const timeContext = this.getTimeContext();
    const reunionContext = this.getReunionContext(memory);
    const emotionContext = this.getCharacterEmotionContext(memory);
    
    // SOUL.mdファイルを優先、なければDBのsystemPrompt
    const soulContent = this.loadSoulMd(character.slug, character.systemPrompt);
    
    return `${soulContent}

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

## 重要ルール
- 相手の名前「${memory.userName}」を会話の中で自然に使うこと
- レベルに応じた距離感を保つこと
- 時間帯に合った挨拶やテンションで話すこと
- 久しぶりの相手には再会を喜ぶこと
- 1回の応答は短く（1-3文が基本、最大5文）
- 日本語で応答すること`;
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
    
    if (diffDays === 0) return '- 今日も話してる（いつも通り）';
    if (diffDays === 1) return '- 昨日も話した（毎日来てくれる仲）';
    if (diffDays <= 3) return `- ${diffDays}日ぶり（ちょっと久しぶり）`;
    if (diffDays <= 7) return `- ${diffDays}日ぶり（久しぶり！会えて嬉しい）`;
    if (diffDays <= 30) return `- ${diffDays}日ぶり（かなり久しぶり！寂しかった）`;
    return `- ${diffDays}日ぶり（すごく久しぶり！ずっと待ってた）`;
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
      3: `- 態度: 仲間。打ち解けている
- 呼び方: 「${userName}」親しみを込めて
- 話題: 冗談、共通の話題、相手を元気づける`,
      4: `- 態度: 親友。何でも話せる
- 呼び方: 「${userName}」特別感を持って
- 話題: 秘密の話、夢の話、相手の悩みに寄り添う`,
      5: `- 態度: 特別な仲間。最も信頼している
- 呼び方: 「${userName}」深い絆を感じさせる
- 話題: 最も深い話、相手だけに見せる一面、特別なメッセージ`,
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
    // 事実記憶
    if (memory.factMemory?.length) {
      parts.push('- ユーザーについて知っていること:');
      for (const fact of memory.factMemory.slice(-10)) {
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
    // エピソード記憶（最近3件）
    if (memory.episodeMemory?.length) {
      parts.push('- 過去の思い出:');
      for (const ep of memory.episodeMemory.slice(-3)) {
        parts.push(`  - ${ep.summary}（${ep.date.split('T')[0]}）`);
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
  private detectEmotion(text: string): string {
    if (/！{2,}|すげぇ|おおー|やった|最高|ハハ/.test(text)) return 'excited';
    if (/ししし|ししっ|別に喜んでない|うるさい！/.test(text)) return 'happy';
    if (/ふざけんな|許さねぇ|怒|燃やして|どけ/.test(text)) return 'angry';
    if (/\.{3}|…|こ、怖く/.test(text)) return 'sad';
    if (/肉|飯|食|うまそう/.test(text)) return 'hungry';
    if (/道に迷って|近道|方向/.test(text)) return 'embarrassed';
    if (/火拳|メラメラ|燃え/.test(text)) return 'fired-up';
    if (/ベリー|お金|タダじゃ/.test(text)) return 'motivated';
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

    // 10メッセージごとにAI要約を生成
    const newTotalMessages = relationship.totalMessages + 1;
    if (newTotalMessages % 10 === 0 && recentMessages.length > 0) {
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
          const episodeEntry: EpisodeEntry = {
            summary: summaryResult.episode,
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
  ): Promise<{ summary: string; facts: string[]; emotion: string; episode?: string; episodeImportance?: number }> {
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
            content: `以下の会話を分析し、必ずJSON形式のみで返せ（前後に余分なテキスト不要）:\n{"summary":"200字以内の要約","facts":["重要な事実1","重要な事実2"],"emotion":"感情1単語","episode":"この会話で最も印象的だったエピソード（1文）","episodeImportance":3}\n\n条件:\n1. summaryは200字以内の日本語要約\n2. factsはユーザーについての重要な事実（最大5つ）\n3. emotionはユーザーの感情状態を表す1単語（例: 嬉しい、悲しい、neutral等）\n4. episodeはこの会話の最も印象的なエピソード（1文、日本語）\n5. episodeImportanceは1〜5の重要度`,
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

    let parsed: { summary?: string; facts?: string[]; emotion?: string; episode?: string; episodeImportance?: number } = {};
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
    };
  }
  
  /**
   * 関係性経験値を更新（感情状態も同時に保存）
   */
  private async updateRelationshipXP(relationshipId: string, emotion?: string, emotionNote?: string) {
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
    });
    
    const newXP = relationship.experiencePoints + 10;
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

    const label = emotionLabels[memory.characterEmotion] || memory.characterEmotion;
    let context = `- 前回の感情状態: ${label}`;
    if (memory.characterEmotionNote) {
      context += `（理由: ${memory.characterEmotionNote}）`;
    }

    if (memory.emotionUpdatedAt) {
      const hoursSince = (Date.now() - new Date(memory.emotionUpdatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        context += '（だいぶ前のことだから薄れている）';
      } else if (hoursSince > 6) {
        context += '（少し前のこと）';
      }
    }

    return context;
  }
}

export const characterEngine = new CharacterEngine();
