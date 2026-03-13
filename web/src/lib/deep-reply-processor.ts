/**
 * Deep Reply Processor
 * Deep Chat Pipeline の処理エンジン。
 * DeepReplyQueue からジョブを取り出し、多段階LLM処理で深い返答を生成する。
 *
 * Phase 1 MVP: Step 1 (ユーザー分析) + Step 2 (記憶検索) + Step 5 (返答生成)
 * Phase 2: Step 3 (関係性グラフ) + Step 4 (Lore/エピソード検索) を追加予定
 */

import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';
import { logger } from '@/lib/logger';

// DeepReplyQueue ステータス定数
export const DEEP_QUEUE_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

export type DeepQueueStatus = typeof DEEP_QUEUE_STATUS[keyof typeof DEEP_QUEUE_STATUS];

// --- 型定義 ---

interface DeepReplyJob {
  id: string;
  userId: string;
  characterId: string;
  conversationId: string;
  thinkingMessageId: string;
  userMessage: string;
  attempts: number;
}

interface ProcessedDeepReply {
  reply: string;
  emotion: string;
  processingNotes?: string;
}

// --- Step 1: ユーザーメッセージの深い分析 ---

async function analyzeUserMessage(
  userMessage: string,
  recentContext: string,
  characterName: string,
): Promise<string> {
  const prompt = `あなたは${characterName}の内面を深く理解するアナリストです。
以下のユーザーメッセージを分析してください。

【最近の会話コンテキスト】
${recentContext}

【ユーザーのメッセージ】
${userMessage}

以下の観点で分析してください（200文字以内で箇条書き）：
- ユーザーが本当に求めているもの（表面的なものと深層の欲求）
- ユーザーの現在の感情状態
- このメッセージで最も響かせるべきポイント
- ${characterName}ならどんな角度から答えると最も心に刺さるか`;

  try {
    const analysis = await callLLM([{ role: 'user', content: prompt }], {
      maxTokens: 300,
      temperature: 0.3,
    });
    return analysis ?? '';
  } catch {
    return '';
  }
}

// --- Step 2: 関連記憶の検索 ---

async function searchRelevantMemories(
  userId: string,
  characterId: string,
  userMessage: string,
): Promise<string> {
  try {
    // SemanticMemory から関連情報を取得
    const memories = await prisma.semanticMemory.findMany({
      where: { userId, characterId },
      orderBy: { importance: 'desc' },
      take: 5,
      select: { summary: true, content: true, category: true },
    });

    if (memories.length === 0) return '';

    return memories
      .map((m) => `[${m.category}] ${m.summary ?? m.content.slice(0, 100)}`)
      .join('\n');
  } catch {
    return '';
  }
}

// --- Step 5: Deep Reply 生成 ---

async function generateDeepReply(
  userMessage: string,
  analysis: string,
  memories: string,
  recentContext: string,
  characterSystemPrompt: string,
  characterName: string,
): Promise<ProcessedDeepReply> {
  const systemPrompt = `${characterSystemPrompt}

【Deep Reply モード】
あなたは今、ユーザーのメッセージをじっくり考えた上で返答している。
表面的な即答ではなく、ユーザーの本質に寄り添った深い返答をする。
- 返答は自然な会話口調で200〜400文字程度
- キャラとしての個性を失わずに、深く共感する
- 「考え抜いた感」を自然に表現する（説明しすぎない）`;

  const userPrompt = `【ユーザーの関連情報】
${memories || '（まだあまり会話していない）'}

【メッセージ分析】
${analysis || '（通常の返答）'}

【最近の会話】
${recentContext}

【ユーザーのメッセージ】
${userMessage}

上記を踏まえて、${characterName}として深く考えた返答をしてください。
最後に感情タグを1つ追加してください（例: [emotion:empathy] [emotion:sincere] [emotion:encouragement]）`;

  try {
    const response = await callLLM(
      [{ role: 'user', content: userPrompt }],
      { maxTokens: 600, temperature: 0.8 },
      systemPrompt,
    );

    if (!response) {
      return { reply: `……ごめん、うまく言葉にできないけど、ちゃんと考えてたよ。`, emotion: 'sincere' };
    }

    // 感情タグを抽出
    const emotionMatch = response.match(/\[emotion:(\w+)\]/);
    const emotion = emotionMatch?.[1] ?? 'sincere';
    const reply = response.replace(/\[emotion:\w+\]/g, '').trim();

    return { reply, emotion };
  } catch (err) {
    logger.error('[deep-reply] generateDeepReply error:', err);
    return { reply: `……ちゃんと考えてたよ。返事が遅くなってごめん。`, emotion: 'sincere' };
  }
}

// --- メインプロセッサ ---

export async function processDeepReply(job: DeepReplyJob): Promise<void> {
  logger.info(`[deep-reply] Processing job ${job.id} for user ${job.userId}`);

  try {
    // キャラクター情報取得
    const character = await prisma.character.findUnique({
      where: { id: job.characterId },
      select: { name: true, slug: true, systemPrompt: true },
    });
    if (!character) throw new Error('Character not found');

    // 最近の会話コンテキスト取得（最大10件）
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: job.conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });
    const recentContext = recentMessages
      .reverse()
      .map((m) => `${m.role === 'USER' ? 'ユーザー' : character.name}: ${m.content.slice(0, 100)}`)
      .join('\n');

    // Step 1: メッセージ分析
    const analysis = await analyzeUserMessage(
      job.userMessage,
      recentContext,
      character.name,
    );

    // Step 2: 記憶検索
    const memories = await searchRelevantMemories(job.userId, job.characterId, job.userMessage);

    // Step 5: Deep Reply 生成
    const { reply, emotion } = await generateDeepReply(
      job.userMessage,
      analysis,
      memories,
      recentContext,
      character.systemPrompt ?? '',
      character.name,
    );

    // 「考え中」メッセージをDeep Replyで上書き
    await prisma.message.update({
      where: { id: job.thinkingMessageId },
      data: {
        content: reply,
        metadata: {
          emotion,
          isDeepReply: true,
          processedAt: new Date().toISOString(),
        },
      },
    });

    // キュー完了
    await prisma.deepReplyQueue.update({
      where: { id: job.id },
      data: { status: DEEP_QUEUE_STATUS.DONE, processedAt: new Date() },
    });

    logger.info(`[deep-reply] Job ${job.id} completed`);

    // プッシュ通知送信（オプション）
    try {
      const pushSubs = await prisma.pushSubscription.findMany({
        where: { userId: job.userId },
        select: { endpoint: true, keys: true },
      });

      if (pushSubs.length > 0) {
        await fetch(
          `${process.env.NEXTAUTH_URL ?? 'http://localhost:3061'}/api/push/character-notify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: job.userId,
              characterId: job.characterId,
              message: reply.slice(0, 80) + (reply.length > 80 ? '…' : ''),
            }),
          },
        );
      }
    } catch {
      // プッシュ通知失敗は無視（本体処理には影響しない）
    }
  } catch (err) {
    logger.error(`[deep-reply] Job ${job.id} failed:`, err);

    const maxAttempts = 3;
    const newAttempts = job.attempts + 1;

    await prisma.deepReplyQueue.update({
      where: { id: job.id },
      data: {
        status: newAttempts >= maxAttempts ? DEEP_QUEUE_STATUS.FAILED : DEEP_QUEUE_STATUS.QUEUED,
        attempts: newAttempts,
        lastError: err instanceof Error ? err.message : String(err),
      },
    });
  }
}
