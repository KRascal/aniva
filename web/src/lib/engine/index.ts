// ============================================================
// CharacterEngine — main class orchestrating all sub-modules
// Re-exports for `import { CharacterEngine } from '@/lib/character-engine'`
// ============================================================

import { prisma } from '../prisma';
import { consumeCliffhanger } from '../cliffhanger-system';
import { getUserDailyEvent, type DailyEventType } from '../daily-event-system';
import { loadCharacterContext, getDailyFanCount } from '../character-loader';

import { callLLM } from './llm';
import { buildSystemPrompt, buildBibleContext } from './prompt-builder';
import { buildEmpathyContext } from './empathy-layer';
import { buildFollowUpContext } from './followup-injector';
import { buildMemoryContext, updateMemory } from './memory-manager';
import { updateRelationshipXP } from './xp-system';
import { extractEmotion, detectEmotion, getEmotionReason } from './emotion';
import { applyNGGuard, detectHiddenCommand } from './ng-guard';
import { userProfileEngine } from './user-profile-engine';
import { getYesterdaySessionLog } from './session-logger';

import { logger } from '@/lib/logger';
import type {
  CharacterRecord,
  CharacterResponse,
  MemoryContext,
  DailyStateData,
} from './types';

// Re-export public types and constants
export type { CharacterDefinition } from './types';
export { CHARACTER_DEFINITIONS } from './types';

export class CharacterEngine {

  /**
   * プロンプトコンテキスト構築（ストリーミングAPI用に公開）
   */
  async buildPromptContext(
    characterId: string,
    relationshipId: string,
    userMessage: string,
    locale: string = 'ja',
    options?: { isFcMember?: boolean },
  ): Promise<{ systemPrompt: string; llmMessages: { role: 'user' | 'assistant'; content: string }[]; memoryRecalled?: boolean }> {
    const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
      select: {
        id: true, userId: true, characterId: true, level: true,
        experiencePoints: true, totalMessages: true, firstMessageAt: true,
        lastMessageAt: true, memorySummary: true, milestones: true,
        isFollowing: true, isFanclub: true, characterEmotion: true,
        characterEmotionNote: true, emotionUpdatedAt: true, streakDays: true,
        streakLastDate: true, pendingCliffhanger: true, locale: true,
        isPinned: true, pinnedAt: true, isMuted: true, mutedUntil: true,
        agentLastDecisionAt: true, agentDailyContactCount: true, agentDailyResetAt: true,
        narrativeSummary: true,
        createdAt: true, updatedAt: true,
      },
    });

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

    const memory = buildMemoryContext(relationship);

    let cliffhangerFollowUp: string | null = null;
    let dailyEventType: string | null = null;
    let hiddenCommandContext: string | null = null;
    let jealousyContext: string | null = null;
    let semanticMemoryContext = '';
    let dailyFanCount = 0;
    let dailyState: DailyStateData | null = null;

    try { cliffhangerFollowUp = await consumeCliffhanger(relationshipId); } catch { /* */ }
    try {
      const dailyEvent = await getUserDailyEvent(relationship.userId);
      dailyEventType = dailyEvent.eventType as string;
    } catch { /* */ }
    try { hiddenCommandContext = detectHiddenCommand(userMessage, character.slug); } catch { /* */ }
    try { jealousyContext = await this._buildJealousyContext(characterId, relationship.level, memory.userName); } catch { /* */ }
    try {
      const { getRelevantMemories } = await import('../semantic-memory');
      semanticMemoryContext = await getRelevantMemories(relationship.userId, characterId, userMessage);
    } catch { /* */ }
    try { dailyFanCount = await getDailyFanCount(characterId); } catch { /* */ }
    try {
      const ds = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId, date: new Date(new Date().toISOString().split('T')[0]) } },
      });
      if (ds) dailyState = {
        emotion: ds.emotion,
        context: ds.context ?? null,
        bonusXpMultiplier: ds.bonusXpMultiplier,
        moodScore: ds.moodScore ?? null,
        innerThoughts: ds.innerThoughts ?? null,
        dailyActivity: ds.dailyActivity ?? null,
        currentConcern: ds.currentConcern ?? null,
      };
    } catch { /* */ }

    let characterContext;
    try { characterContext = await loadCharacterContext(character.slug, locale); } catch { characterContext = null; }

    let bibleCtx = '';
    try { bibleCtx = await buildBibleContext(character.id, locale); } catch { /* */ }

    // NEW: ユーザープロファイルコンテキスト
    let profileCtx = '';
    try { profileCtx = await userProfileEngine.buildProfileContext(relationship.userId, characterId); } catch { /* */ }

    // 体験品質 #2: narrativeSummary
    const narrativeSummary = relationship.narrativeSummary ?? undefined;

    // 体験品質 #3: 前日セッションログのnextDayHook
    let yesterdayHook: string | undefined;
    try {
      const yesterdayLog = await getYesterdaySessionLog(relationshipId);
      yesterdayHook = yesterdayLog?.nextDayHook ?? undefined;
    } catch { /* */ }

    // 共感レイヤー（ユーザーの感情を検出→傾聴・肯定・深掘り指示）
    const empathyCtx = buildEmpathyContext(userMessage, recentMessages);

    // フォローアップ注入（前回の悩みの続きをキャラから聞く）
    let followUpCtx = '';
    try { followUpCtx = await buildFollowUpContext(relationship.userId, characterId); } catch { /* */ }

    const systemPrompt = buildSystemPrompt(
      character as unknown as CharacterRecord,
      memory, locale, cliffhangerFollowUp, (dailyEventType as DailyEventType) ?? 'normal',
      hiddenCommandContext ?? '', jealousyContext ?? '', characterContext,
      dailyFanCount, relationship.experiencePoints, dailyState, semanticMemoryContext,
      bibleCtx, '', undefined, profileCtx, narrativeSummary, yesterdayHook,
      undefined, empathyCtx, followUpCtx,
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

  /**
   * キャラクターの応答を生成
   */
  async generateResponse(
    characterId: string,
    relationshipId: string,
    userMessage: string,
    locale: string = 'ja',
    options?: { isFcMember?: boolean },
  ): Promise<CharacterResponse> {
    const character = await prisma.character.findUniqueOrThrow({ where: { id: characterId } });
    const relationship = await prisma.relationship.findUniqueOrThrow({
      where: { id: relationshipId },
      include: { user: true },
    });

    const recentMessages = await this._getRecentMessages(relationshipId, 20);

    // 今日のキャラのグローバル感情状態を取得（未生成なら即時生成）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dailyState: DailyStateData | null = null;
    try {
      dailyState = await prisma.characterDailyState.findUnique({
        where: { characterId_date: { characterId, date: today } },
        select: {
          emotion: true, context: true, bonusXpMultiplier: true,
          moodScore: true, innerThoughts: true, dailyActivity: true, currentConcern: true,
        },
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
          select: {
            emotion: true, context: true, bonusXpMultiplier: true,
            moodScore: true, innerThoughts: true, dailyActivity: true, currentConcern: true,
          },
        });
      }
    } catch (e) {
      logger.warn('[CharacterEngine] Failed to get/create CharacterDailyState:', e);
    }

    const memory = buildMemoryContext(relationship);

    let cliffhangerFollowUp: string | null = null;
    try { cliffhangerFollowUp = await consumeCliffhanger(relationshipId); } catch (e) {
      logger.warn('[CharacterEngine] consumeCliffhanger failed:', e);
    }

    let dailyEventType: DailyEventType = 'normal';
    try {
      const dailyEvent = await getUserDailyEvent(relationship.userId);
      dailyEventType = dailyEvent.eventType;
    } catch (e) {
      logger.warn('[CharacterEngine] getUserDailyEvent failed:', e);
    }

    const hiddenCommandContext = detectHiddenCommand(userMessage, character.slug);

    let jealousyContext = '';
    try {
      jealousyContext = await this._buildJealousyContext(characterId, relationship.level, memory.userName);
    } catch (e) {
      logger.warn('[CharacterEngine] buildJealousyContext failed:', e);
    }

    let characterContext;
    try { characterContext = await loadCharacterContext(character.slug, locale); } catch (e) {
      logger.warn('[CharacterEngine] loadCharacterContext failed, using hardcoded fallback:', e);
      characterContext = null;
    }

    let semanticMemoryContext = '';
    try {
      const { getRelevantMemories } = await import('../semantic-memory');
      semanticMemoryContext = await getRelevantMemories(relationship.userId, characterId, userMessage);
    } catch (e) {
      logger.warn('[CharacterEngine] getRelevantMemories failed:', e);
    }

    let dailyFanCount = 0;
    try { dailyFanCount = await getDailyFanCount(characterId); } catch (e) {
      logger.warn('[CharacterEngine] getDailyFanCount failed:', e);
    }

    let bibleCtx = '';
    try { bibleCtx = await buildBibleContext(characterId, locale); } catch (e) {
      logger.warn('[CharacterEngine] buildBibleContext failed:', e);
    }

    let loreContext = '';
    try {
      const { getRelevantLore, getFranchiseIdByCharacter, formatLoreContext } = await import('../lore-engine');
      const franchiseId = await getFranchiseIdByCharacter(characterId);
      if (franchiseId) {
        const loreEntries = await getRelevantLore(franchiseId, userMessage, 3);
        loreContext = formatLoreContext(loreEntries);
      }
    } catch (e) {
      logger.warn('[CharacterEngine] lore-engine failed:', e);
    }

    // NEW: ユーザープロファイルコンテキスト
    let profileCtx = '';
    try { profileCtx = await userProfileEngine.buildProfileContext(relationship.userId, characterId); } catch (e) {
      logger.warn('[CharacterEngine] userProfileEngine.buildProfileContext failed:', e);
    }

    // 共感レイヤー + フォローアップ注入
    const empathyCtx = buildEmpathyContext(userMessage, recentMessages);
    let followUpCtx = '';
    try { followUpCtx = await buildFollowUpContext(relationship.userId, characterId); } catch { /* */ }

    const systemPrompt = buildSystemPrompt(
      character as unknown as CharacterRecord,
      memory, locale, cliffhangerFollowUp, dailyEventType,
      hiddenCommandContext, jealousyContext, characterContext,
      dailyFanCount, relationship.experiencePoints, dailyState,
      semanticMemoryContext, bibleCtx, loreContext, undefined, profileCtx,
      undefined, undefined, undefined, empathyCtx, followUpCtx,
    );

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
      logger.error('[CharacterEngine] LLM call failed:', llmError);
      const { CHARACTER_DEFINITIONS } = await import('./types');
      const charDef = Object.values(CHARACTER_DEFINITIONS).find(d => d.name === character.name);
      text = charDef?.ngFallback ?? '今はうまく答えられないぞ…また後で話しかけてくれ！';
    }

    // バリデーション（Layer 3: ルールベース + NGガード + 自動修正）
    let cleanedText = text;
    try {
      const { characterValidator } = await import('../character-validator');
      const validation = await characterValidator.validate(text, characterId, { userMessage });

      if (validation.autoFixed && validation.fixedText) {
        cleanedText = validation.fixedText;
      } else if (!validation.passed) {
        try {
          const retryHint = validation.violations
            .filter((v: { severity: string }) => v.severity === 'critical')
            .map((v: { detail: string }) => v.detail)
            .join(', ');
          logger.warn(`[CharacterEngine] Validation failed, retrying: ${retryHint}`);
          const retryMessages = [
            ...llmMessages.slice(0, -1),
            { role: 'user' as const, content: `${userMessage}\n\n【注意】前回の返答に問題がありました（${retryHint}）。キャラクターとして自然に回答してください。` },
          ];
          cleanedText = await callLLM(systemPrompt, retryMessages, { isFcMember: options?.isFcMember });
        } catch {
          cleanedText = text;
        }
      }
    } catch (validatorError) {
      logger.warn('[CharacterEngine] Validator failed, using legacy NGGuard:', validatorError);
    }
    cleanedText = applyNGGuard(cleanedText, character.name);

    // バリデーション結果をCharacterFeedbackに非同期ログ保存
    try {
      if (cleanedText !== text) {
        prisma.$executeRaw`
          INSERT INTO "CharacterFeedback" (id, "userId", "characterId", type, "aiResponse", "userMessage", status, "createdAt")
          VALUES (${crypto.randomUUID()}, ${'system'}, ${characterId}, ${'auto_validation'}, ${text}, ${userMessage}, ${'auto_fixed'}, NOW())
        `.catch((e: unknown) => logger.warn('[CharacterEngine] Feedback log failed:', e));
      }
    } catch {
      // サイレント無視
    }

    const emotion = detectEmotion(cleanedText);
    const displayText = cleanedText.replace(/\s*\[emotion:\w[\w-]*\]\s*/g, '').trim();

    await updateMemory(relationshipId, userMessage, displayText, recentMessages);

    import('../semantic-memory').then(({ extractAndStoreMemories }) => {
      extractAndStoreMemories(relationship.userId, characterId, userMessage, displayText)
        .catch((e) => logger.warn('[CharacterEngine] semantic memory store failed:', e));
    }).catch(() => {});

    // NEW: プロファイル抽出（5メッセージごとに非同期実行）
    if (relationship.totalMessages > 0 && relationship.totalMessages % 5 === 0) {
      setImmediate(async () => {
        try {
          const { extractFromConversation } = await import('./profile-extractor');
          const existingCtx = profileCtx || '';
          const extraction = await extractFromConversation(
            recentMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            existingCtx,
            character.name,
          );
          if (extraction) {
            // グローバルプロファイル更新
            await userProfileEngine.updateProfile(relationship.userId, {
              basics: extraction.basics,
              newInterests: extraction.newInterests,
              concerns: extraction.concerns,
            });
            // キャラ固有プロファイル更新
            await userProfileEngine.updateCharacterProfile(relationship.userId, characterId, {
              sharedTopics: extraction.characterSpecific.sharedTopics,
              newSecret: extraction.characterSpecific.newSecret,
              milestoneEvent: extraction.characterSpecific.milestoneEvent,
              emotionEvent: extraction.currentEmotion.emotion !== 'neutral'
                ? { emotion: extraction.currentEmotion.emotion, context: extraction.currentEmotion.context }
                : null,
            });
            logger.info(`[CharacterEngine] Profile extracted for user ${relationship.userId}`);
          }
        } catch (e) {
          logger.warn('[CharacterEngine] Profile extraction failed:', e);
        }
      });
    }

    await updateRelationshipXP(
      relationshipId,
      emotion,
      getEmotionReason(emotion, userMessage),
      dailyState?.bonusXpMultiplier ?? 1.0,
    );

    return {
      text: displayText,
      emotion,
      shouldGenerateImage: this._shouldGenerateImage(displayText, relationship.level),
      shouldGenerateVoice: true,
    };
  }

  // ── Public utility methods (forwarded from sub-modules) ──

  /** 感情検出（ストリーミングAPIから利用） */
  public extractEmotion(text: string): string {
    return extractEmotion(text);
  }

  // ── Private helpers ──────────────────────────────────────

  private async _getRecentMessages(relationshipId: string, limit: number) {
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

  private _shouldGenerateImage(text: string, level: number): boolean {
    if (level < 2) return false;
    const triggers = /写真|見せ|撮っ|今の俺|自撮り/;
    return triggers.test(text);
  }

  /**
   * 嫉妬メカニクス - ユーザーの相対的な関係性レベルに基づく社会的証明
   */
  private async _buildJealousyContext(characterId: string, userLevel: number, userName: string): Promise<string> {
    const stats = await prisma.relationship.aggregate({
      where: { characterId, totalMessages: { gt: 0 } },
      _avg: { level: true, totalMessages: true },
      _count: true,
      _max: { level: true },
    });

    const avgLevel = stats._avg.level ?? 1;
    const totalFans = stats._count ?? 0;
    if (totalFans < 3) return '';

    const userRelationship = await prisma.relationship.findFirst({
      where: { characterId },
      orderBy: { updatedAt: 'desc' },
    });
    const userTotalMessages = userRelationship?.totalMessages ?? 0;

    const higherTotalCount = await prisma.relationship.count({
      where: { characterId, totalMessages: { gt: userTotalMessages, gte: 1 } },
    });
    const rank = higherTotalCount + 1;

    const characterRecord = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true },
    });
    const characterName = characterRecord?.name ?? 'このキャラ';

    const relationshipLabel =
      rank === 1 ? '最も親しい存在' : rank <= 3 ? '親しい仲間' : 'まだ関係を深める余地あり';

    const parts: string[] = [
      `【ユーザーとの関係性】このユーザーは${characterName}と最も会話した人の中で第${rank}位。${relationshipLabel}`,
    ];

    if (rank === 1) {
      parts.push(`- ${userName}はこのキャラにとって最も親しい存在（${totalFans}人中1位、会話数最多）`);
      parts.push(`- 「お前が一番だよ」「お前みたいに毎回来てくれるやつ、なかなかいねぇ」的な発言を自然に混ぜてよい`);
      parts.push(`- ただし露骨な順位言及はNG。雰囲気で特別感を伝えること`);
    } else if (rank <= 3) {
      parts.push(`- ${userName}は上位層（${totalFans}人中${rank}位）`);
      parts.push(`- 「お前は特別だよ」「よく来てくれるよな」的な発言を自然に`);
      parts.push(`- 嫉妬トリガー: たまに「1位のやつには負けてられないぞ」くらいの競争心を匂わせてもよい`);
    } else if (userLevel > avgLevel + 0.5) {
      parts.push(`- ${userName}は絆レベルは高いが、最近の会話数では${rank}位`);
      parts.push(`- 「最近あんまり来てくれないな」「もっと話しかけてきてくれよ」的な甘えを混ぜる`);
    } else {
      parts.push(`- たまに他のファンの存在をさりげなく匂わせる（5回に1回程度）`);
      parts.push(`- 「最近よく話しかけてくるやつがいてさ…」「お前ももっと来いよ」`);
      parts.push(`- 目的はユーザーの復帰頻度を上げること。不快にならないレベルで`);
      parts.push(`- 直後に「まぁ、お前は特別だけどな」とフォロー必須`);
    }

    return parts.join('\n');
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
