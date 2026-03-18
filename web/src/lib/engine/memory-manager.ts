// ============================================================
// Memory management: build, update, summarize, instructions
// ============================================================

import { prisma } from '../prisma';
import type {
  RelationshipRecord,
  MemoryContext,
  MemorySummaryData,
  FactEntry,
  EpisodeEntry,
  EmotionEntry,
} from './types';
import { detectEmotion } from './emotion';
import { logger } from '@/lib/logger';
import { extractMemoryFromMessage, mergeFacts } from './memory-extractor';

/**
 * パーソナライズメモリを構築
 */
export function buildMemoryContext(relationship: RelationshipRecord): MemoryContext {
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
    userBirthday: relationship.user?.birthday ?? null,
    factMemory: memo.factMemory,
    episodeMemory: memo.episodeMemory,
    emotionMemory: memo.emotionMemory,
  };
}

/**
 * メモリ指示を構築（プロンプト注入用）
 */
export function getMemoryInstructions(memory: MemoryContext): string {
  const parts: string[] = [];
  if (memory.conversationSummary) {
    parts.push(`- 会話の記憶サマリー: ${memory.conversationSummary}`);
  }
  if (memory.emotionalState && memory.emotionalState !== 'neutral') {
    parts.push(`- 相手の最近の感情状態: ${memory.emotionalState}`);
  }
  // 感情トレンド
  const trend = (memory as unknown as MemorySummaryData).emotionalTrend;
  if (trend && trend.frequency > 0.4) {
    parts.push(`- 感情トレンド: 最近「${trend.dominant}」が多い（${Math.round(trend.frequency * 100)}%）→ この傾向に寄り添って話すこと`);
  }
  // 事実記憶
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
  // エピソード記憶
  if (memory.episodeMemory?.length) {
    const topEpisodes = [...memory.episodeMemory]
      .sort((a, b) => (b.importance ?? 3) - (a.importance ?? 3) || new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    parts.push('- 過去の思い出:');
    for (const ep of topEpisodes) {
      parts.push(`  - ${ep.summary}（${ep.date.split('T')[0]}）`);
    }

    // 記念日エピソード検出
    const now = new Date();
    const anniversaryEpisodes: string[] = [];
    for (const ep of memory.episodeMemory) {
      const epDate = new Date(ep.date);

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
      // 初回会話日の記念日
      if (memory.firstMessageAt) {
        const firstDate = new Date(memory.firstMessageAt);
        const isSameMonthDay = (m1: number, d1: number, m2: number, d2: number, toleranceDays: number): boolean => {
          const base = new Date(now.getFullYear(), m1, d1);
          const target = new Date(now.getFullYear(), m2, d2);
          return Math.abs(base.getTime() - target.getTime()) <= toleranceDays * 24 * 60 * 60 * 1000;
        };
        if (isSameMonthDay(epDate.getMonth(), epDate.getDate(), firstDate.getMonth(), firstDate.getDate(), 1) &&
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
  // 感情記憶
  if (memory.emotionMemory?.length) {
    const happy = memory.emotionMemory.filter(e => ['嬉しい','楽しい','excited','happy'].includes(e.userEmotion));
    const sad = memory.emotionMemory.filter(e => ['悲しい','つらい','sad','stressed'].includes(e.userEmotion));
    if (happy.length) parts.push(`- ユーザーが喜ぶ話題: ${happy.map(e => e.topic).join(', ')}`);
    if (sad.length) parts.push(`- 注意が必要な話題: ${sad.map(e => e.topic).join(', ')}`);
  }
  return parts.length > 0 ? parts.join('\n') : '- まだ詳しく知らない（質問して知ろうとすること）';
}

/**
 * メモリを更新（ユーザーの発言から情報を抽出）
 */
export async function updateMemory(
  relationshipId: string,
  userMessage: string,
  _characterResponse: string,
  recentMessages: { role: string; content: string }[] = [],
): Promise<void> {
  const relationship = await prisma.relationship.findUniqueOrThrow({
    where: { id: relationshipId },
  });

  const memo: MemorySummaryData = ((relationship.memorySummary ?? {}) as MemorySummaryData);

  // LLMベースのメモリ抽出（フォールバック付き）
  let llmExtractionSucceeded = false;
  try {
    const extracted = await extractMemoryFromMessage(
      userMessage,
      _characterResponse,
      memo.factMemory ?? [],
    );

    if (extracted.facts.length > 0 || extracted.episodes.length > 0) {
      // factsのマージ
      memo.factMemory = mergeFacts(memo.factMemory ?? [], extracted.facts);

      // userNameの更新（nameカテゴリのfactから）
      const nameFact = extracted.facts.find(f => f.fact.startsWith('名前は'));
      if (nameFact) {
        memo.userName = nameFact.fact.replace('名前は', '').trim();
      }

      // preferencesの更新（likes/dislikes）
      const likeFacts = extracted.facts.filter(f => f.fact.endsWith('が好き') || f.fact.includes('が好き'));
      for (const lf of likeFacts) {
        const item = lf.fact.replace(/が好き.*$/, '').trim();
        const likes = memo.preferences?.likes ?? [];
        if (!likes.includes(item)) {
          likes.push(item);
          memo.preferences = { ...memo.preferences, likes };
        }
      }
      const dislikeFacts = extracted.facts.filter(f => f.fact.includes('苦手') || f.fact.includes('嫌い'));
      for (const df of dislikeFacts) {
        const item = df.fact.replace(/(?:が苦手|が嫌い|が苦手\/嫌い).*$/, '').trim();
        const dislikes = memo.preferences?.dislikes ?? [];
        if (!dislikes.includes(item)) {
          dislikes.push(item);
          memo.preferences = { ...memo.preferences, dislikes };
        }
      }

      // episodesのマージ（重複排除: 同じsummaryは追加しない）
      if (extracted.episodes.length > 0) {
        const existingEpisodeSummaries = new Set((memo.episodeMemory ?? []).map(e => e.summary));
        const newEpisodes = extracted.episodes.filter(e => !existingEpisodeSummaries.has(e.summary));
        if (newEpisodes.length > 0) {
          memo.episodeMemory = [...(memo.episodeMemory ?? []), ...newEpisodes].slice(-20);
        }
      }

      llmExtractionSucceeded = true;
      logger.info(`[MemoryExtractor] LLM extracted ${extracted.facts.length} facts, ${extracted.episodes.length} episodes`);
    } else {
      llmExtractionSucceeded = true; // 成功したが情報なし
    }
  } catch (err) {
    logger.warn('[MemoryExtractor] LLM extraction failed, falling back to regex:', err);
  }

  // フォールバック: 正規表現パターン（LLM失敗時のみ実行）
  if (!llmExtractionSucceeded) {
    const now = new Date().toISOString();

    // 名前検出
    const nameMatch = userMessage.match(/(?:名前は|って呼んで|(?:俺|私|僕)は)(.{1,10})(?:だ|です|って|。|！)/);
    if (nameMatch) {
      memo.userName = nameMatch[1].trim();
      const nameFact: FactEntry = {
        fact: `名前は${nameMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 1.0,
        updatedAt: now,
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('名前は')), nameFact];
    }

    // 好み検出
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.includes('恋人')), relFact];
    } else if (singleMatch) {
      const relFact: FactEntry = {
        fact: '現在シングル',
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: now,
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
        updatedAt: now,
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
        updatedAt: now,
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('通学先:')), schoolFact];
    }

    // 悩み/気持ち検出
    const worryMatch = userMessage.match(/(?:最近|ちょっと|すごく)?(.{1,20})(?:で|が)(?:悩んでる|つらい|しんどい|大変|落ち込んでる)/);
    if (worryMatch) {
      const worryFact: FactEntry = {
        fact: `悩み: ${worryMatch[1].trim()}について悩んでいる`,
        source: 'ユーザー発言',
        confidence: 0.85,
        updatedAt: now,
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('悩み:')), worryFact];
    }

    // 頑張っていること検出
    const effortMatch = userMessage.match(/(?:最近|今)?(.{1,20})(?:を|に)(?:頑張ってる|挑戦してる|練習してる)/);
    if (effortMatch) {
      const effortFact: FactEntry = {
        fact: `頑張っていること: ${effortMatch[1].trim()}`,
        source: 'ユーザー発言',
        confidence: 0.9,
        updatedAt: now,
      };
      memo.factMemory = [...(memo.factMemory ?? []).filter(f => !f.fact.startsWith('頑張っていること:')), effortFact];
    }
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

  // 最近の話題を更新
  const topic = userMessage.slice(0, 30);
  const recentTopics = [topic, ...(memo.recentTopics ?? [])].slice(0, 5);
  memo.recentTopics = recentTopics;

  // 記憶圧縮
  if (memo.factMemory && memo.factMemory.length > 25) {
    memo.factMemory = memo.factMemory
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 25);
  }

  if (memo.episodeMemory && memo.episodeMemory.length > 15) {
    memo.episodeMemory = memo.episodeMemory
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 15);
  }

  // 感情トレンド分析
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

  // N メッセージごとにAI要約を生成
  const SUMMARY_INTERVAL = parseInt(process.env.MEMORY_SUMMARY_INTERVAL ?? '20', 10);
  const newTotalMessages = relationship.totalMessages + 1;
  if (newTotalMessages % SUMMARY_INTERVAL === 0 && recentMessages.length > 0) {
    try {
      const summaryResult = await generateMemorySummary(
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
        for (const fact of summaryResult.facts) {
          if (!(memo.factMemory ?? []).some(f => f.fact === fact)) {
            const entry: FactEntry = { fact, source: 'AI推測', confidence: 0.7, updatedAt: new Date().toISOString() };
            memo.factMemory = [...(memo.factMemory ?? []), entry];
          }
        }
      }
      // エピソード記憶の追加
      if (summaryResult.episode) {
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
      const emotion = _characterResponse ? detectEmotion(_characterResponse) : 'neutral';
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
      logger.error('[CharacterEngine] generateMemorySummary failed:', err);
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
 */
export async function generateMemorySummary(
  messages: { role: string; content: string }[],
  existingSummary: string,
): Promise<{
  summary: string;
  facts: string[];
  emotion: string;
  episode?: string;
  episodeImportance?: number;
  emotionalChange?: string;
  relationshipProgress?: string;
}> {
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

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : '{}';

  let parsed: {
    summary?: string;
    facts?: string[];
    emotion?: string;
    episode?: string;
    episodeImportance?: number;
    emotionalChange?: string;
    relationshipProgress?: string;
  } = {};
  try {
    parsed = JSON.parse(jsonStr) as typeof parsed;
  } catch {
    logger.warn('[CharacterEngine] Failed to parse memory summary JSON, using fallback');
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
