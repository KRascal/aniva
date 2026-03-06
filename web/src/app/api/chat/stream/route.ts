/**
 * POST /api/chat/stream
 * SSEストリーミングでキャラクター応答を逐次送信
 * 
 * Events:
 *   data: { type: "meta", userMessageId, emotion } — 初期メタ情報
 *   data: { type: "token", token } — LLMトークン（逐次）
 *   data: { type: "done", text, characterMessageId, emotion, voiceUrl?, streak? } — 完了
 *   data: { type: "error", error } — エラー
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkChatAccess, incrementMonthlyChat } from '@/lib/freemium';
import { updateStreak } from '@/lib/streak-system';
import { setCliffhanger } from '@/lib/cliffhanger-system';
import { Prisma } from '@prisma/client';
import { resolveCharacterId } from '@/lib/resolve-character';
import { extractAndStoreMemories } from '@/lib/semantic-memory';
import { callLLMStream } from '@/lib/llm-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  function sseEvent(data: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // ── 認証 ──
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Rate Limit
    const rl = checkRateLimit(`chat:${userId}`, 30, 60_000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429 },
      );
    }

    const body = await req.json();
    const { characterId: rawCharacterId, message, locale = 'ja' } = body;

    if (!rawCharacterId || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Message too long' }), { status: 400 });
    }

    // ── キャラ取得 ──
    const cachedCharacter = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, slug: true, freeMessageLimit: true, fcMonthlyPriceJpy: true, chatCoinPerMessage: true },
    });
    if (!cachedCharacter) {
      return new Response(JSON.stringify({ error: 'Character not found' }), { status: 404 });
    }

    // ── Relationship ──
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
    });
    if (!relationship) {
      relationship = await prisma.relationship.create({ data: { userId, characterId } });
    }

    // ── フリーミアム判定 ──
    const access = await checkChatAccess(userId, characterId);
    let consumed: 'FREE' | 'FC_UNLIMITED' | 'COIN_REQUIRED' = 'FREE';

    if (access.type === 'BLOCKED') {
      return new Response(
        JSON.stringify({ error: 'FREE_LIMIT_REACHED', type: 'CHAT_LIMIT' }),
        { status: 402 },
      );
    } else if (access.type === 'COIN_REQUIRED') {
      const coinCost = cachedCharacter.chatCoinPerMessage ?? 10;
      try {
        await prisma.$transaction(async (tx) => {
          const coinBalance = await tx.coinBalance.upsert({
            where: { userId },
            create: { userId, balance: 0, freeBalance: 0, paidBalance: 0 },
            update: {},
          });
          const totalBalance = coinBalance.freeBalance + coinBalance.paidBalance;
          if (totalBalance < coinCost) throw new Error('INSUFFICIENT_COINS');

          const freeSpent = Math.min(coinBalance.freeBalance, coinCost);
          const paidSpent = coinCost - freeSpent;
          await tx.coinBalance.update({
            where: { userId },
            data: {
              balance: coinBalance.freeBalance + coinBalance.paidBalance - coinCost,
              freeBalance: coinBalance.freeBalance - freeSpent,
              paidBalance: coinBalance.paidBalance - paidSpent,
            },
          });
          await tx.coinTransaction.create({
            data: {
              userId, type: 'CHAT_EXTRA', amount: -coinCost,
              balanceAfter: coinBalance.freeBalance + coinBalance.paidBalance - coinCost,
              characterId, description: 'チャット送信',
              metadata: { freeSpent, paidSpent } as Prisma.InputJsonValue,
            },
          });
        });
        consumed = 'COIN_REQUIRED';
      } catch (err: unknown) {
        if (err instanceof Error && err.message === 'INSUFFICIENT_COINS') {
          return new Response(JSON.stringify({ error: 'FREE_LIMIT_REACHED', type: 'CHAT_LIMIT' }), { status: 402 });
        }
        throw err;
      }
    } else if (access.type === 'FC_UNLIMITED') {
      consumed = 'FC_UNLIMITED';
    }

    const prevLevel = relationship?.level ?? 1;

    // ── Conversation ──
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({ data: { relationshipId: relationship.id } });
    }

    // ── ユーザーメッセージ保存 ──
    const userMsg = await prisma.message.create({
      data: { conversationId: conversation.id, role: 'USER', content: message },
    });

    // ── SystemPrompt構築 （character-engineの内部メソッドを公開して利用） ──
    const isFcMember = consumed === 'FC_UNLIMITED';
    const { systemPrompt, llmMessages, memoryRecalled } = await characterEngine.buildPromptContext(
      characterId, relationship.id, message, typeof locale === 'string' ? locale : 'ja',
      { isFcMember },
    );

    // ── SSEレスポンス開始 ──
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // メタ情報送信
          controller.enqueue(sseEvent({
            type: 'meta',
            userMessageId: userMsg.id,
            characterSlug: cachedCharacter.slug,
            memoryRecalled: memoryRecalled ?? false,
          }));

          // LLMストリーミング
          const llmStream = await callLLMStream(systemPrompt, llmMessages, { isFcMember });
          const reader = llmStream.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // llm-stream.tsが既にSSEフォーマットで出力するので、そのまま転送
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // fullTextを集約（doneイベントからパース）
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === 'token') fullText += parsed.token;
                if (parsed.type === 'done') fullText = parsed.text;
              } catch { /* skip */ }
            }
          }

          // ── 感情抽出（fullTextから） ──
          const emotion = characterEngine.extractEmotion(fullText);

          // ── キャラメッセージ保存 ──
          const charMsg = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'CHARACTER',
              content: fullText,
              metadata: { emotion, shouldGenerateImage: false, shouldGenerateVoice: true },
            },
          });

          // ── 会話updatedAt更新 ──
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          // ── ストリーク更新 ──
          let streakResult: { streakDays: number; isNew: boolean; milestone: number | null } | null = null;
          try { streakResult = await updateStreak(relationship.id); } catch { /* */ }

          // ── クリフハンガー（20%確率）──
          let cliffhangerTease: string | null = null;
          try {
            const msgCount = await prisma.message.count({
              where: { conversation: { relationshipId: relationship.id }, role: 'USER' },
            });
            if (msgCount >= 5 && Math.random() < 0.2) {
              const tease = await setCliffhanger(relationship.id, characterId);
              if (tease) cliffhangerTease = (tease as { teaseMessage?: string })?.teaseMessage ?? null;
            }
          } catch { /* */ }

          // ── レベルアップ判定 ──
          const updatedRel = await prisma.relationship.findUnique({ where: { id: relationship.id } });
          const newLevel = updatedRel?.level ?? prevLevel;
          const levelUp = newLevel > prevLevel ? { prevLevel, newLevel } : undefined;

          // ── 完了イベント ──
          controller.enqueue(sseEvent({
            type: 'complete',
            characterMessageId: charMsg.id,
            emotion,
            consumed,
            streak: streakResult ? { days: streakResult.streakDays, isNew: streakResult.isNew } : undefined,
            cliffhangerTease,
            levelUp,
          }));

          // ── 月次チャット集計 ──
          await incrementMonthlyChat(userId, characterId);

          // ── セマンティックメモリ保存（非同期） ──
          extractAndStoreMemories(userId, characterId, message, fullText, charMsg?.id)
            .catch((e: unknown) => console.warn('[SemanticMemory] store failed:', e));

          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown streaming error';
          console.error('[chat/stream] Error:', errMsg);
          controller.enqueue(sseEvent({ type: 'error', error: errMsg }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // nginx buffering off
      },
    });
  } catch (error) {
    console.error('[chat/stream] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
