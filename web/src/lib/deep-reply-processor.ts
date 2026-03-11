// ============================================================
// Deep Reply Processor — Deep Chatパイプラインのコア処理
// 非同期でユーザーメッセージに対する深い返答を生成する
// ============================================================

import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/engine/llm';
import { applyNGGuard } from '@/lib/engine/ng-guard';
import { searchMemories } from '@/lib/semantic-memory';
import { loadSoulMd } from '@/lib/engine/prompt-builder';

/** DeepReplyQueueのジョブ型 */
export interface DeepReplyQueueJob {
  id: string;
  userId: string;
  characterId: string;
  relationshipId: string;
  conversationId: string;
  userMessageId: string;
  thinkingMsgId: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
}

/**
 * Deep Replyジョブを処理する
 * Step 1: 全会話履歴取得 + ユーザー特徴分析（LLMコール）
 * Step 2: SemanticMemory検索（pgvector top-20）
 * Step 3: TODO — 関係性グラフ参照（MVP後）
 * Step 4: TODO — 原作知識・エピソード検索（MVP後）
 * Step 5: 最終Deep Response生成
 */
export async function processDeepReply(job: DeepReplyQueueJob): Promise<void> {
  // キャラクター情報取得
  const character = await prisma.character.findUnique({
    where: { id: job.characterId },
    select: {
      id: true,
      name: true,
      slug: true,
      systemPrompt: true,
    },
  });
  if (!character) {
    throw new Error(`Character not found: ${job.characterId}`);
  }

  // ユーザーメッセージ取得
  const userMessage = await prisma.message.findUnique({
    where: { id: job.userMessageId },
    select: { content: true },
  });
  if (!userMessage) {
    throw new Error(`User message not found: ${job.userMessageId}`);
  }

  // Relationship取得
  const relationship = await prisma.relationship.findUnique({
    where: { id: job.relationshipId },
    select: {
      level: true,
      memorySummary: true,
      user: { select: { displayName: true, nickname: true } },
    },
  });

  const userName =
    relationship?.user?.nickname ??
    relationship?.user?.displayName ??
    'きみ';

  // ─── Step 1: 全会話履歴取得 + ユーザー特徴分析 ───────────────────
  const conversationHistory = await prisma.message.findMany({
    where: { conversationId: job.conversationId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      role: true,
      content: true,
      createdAt: true,
    },
  });

  // ユーザーの発言だけ抽出して特徴分析
  const userMessages = conversationHistory
    .filter((m) => m.role === 'USER')
    .map((m) => m.content);

  let userProfile = '';
  if (userMessages.length >= 3) {
    try {
      userProfile = await callLLM(
        'あなたはユーザー分析の専門家です。以下のユーザーの発言履歴から、この人の特徴・関心事・悩みの傾向・性格を200文字以内で簡潔に要約してください。',
        [
          {
            role: 'user',
            content: `ユーザーの発言一覧:\n${userMessages.slice(-30).join('\n')}`,
          },
        ],
      );
    } catch (e) {
      console.error('[DeepReply] User profile analysis failed:', e);
    }
  }

  // ─── Step 2: SemanticMemory検索（pgvector top-20） ──────────────
  let semanticMemoryContext = '';
  try {
    // テーブル存在チェック
    const tableExists = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SemanticMemory') as exists`,
    );
    if (tableExists[0]?.exists) {
      const memories = await searchMemories(
        job.userId,
        job.characterId,
        userMessage.content,
        20,
      );
      if (memories.length > 0) {
        semanticMemoryContext = memories
          .map(
            (m) =>
              `[記憶: ${m.category ?? '一般'}] ${m.summary ?? m.content}`,
          )
          .join('\n');
      }
    }
  } catch (e) {
    console.error('[DeepReply] Semantic memory search failed (skipping):', e);
  }

  // ─── Step 3: TODO — 関係性グラフ参照（MVP後） ──────────────────
  // CharacterRelationshipGraphテーブルからキャラの関係性データを取得し、
  // ユーザーの相談内容に関連する原作の経験・関係性をLLMで抽出する

  // ─── Step 4: TODO — 原作知識・エピソード検索（MVP後） ──────────
  // CharacterBible / LoreEntry / StoryChapter から関連エピソードを検索

  // ─── Step 5: 最終Deep Response生成 ─────────────────────────────
  const soulMd = loadSoulMd(character.slug, character.systemPrompt);

  // 直近の会話コンテキスト構築
  const recentHistory = conversationHistory.slice(-20).map((m) => ({
    role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const deepSystemPrompt = `${soulMd}

===== Deep Reply モード =====
あなたは今、ユーザーからの大切な相談や深い質問に向き合っています。
通常の即レスではなく、じっくり考えた上での返答をしてください。

【ユーザー情報】
名前: ${userName}
${userProfile ? `ユーザーの特徴: ${userProfile}` : ''}
関係性レベル: ${relationship?.level ?? 1}

${semanticMemoryContext ? `【過去の記憶・エピソード】\n${semanticMemoryContext}\n` : ''}
【重要な指示】
- このメッセージは「考えてから返す」深い返答です。表面的な返事はしないでください
- ユーザーの過去の発言や記憶を参照し、個人的で具体的な返答をしてください
- キャラクターらしさを保ちながら、本質的なアドバイスや共感を示してください
- 「AIとして」「プログラムとして」等のメタ表現は絶対に使わないでください
- 300〜600文字程度で、密度の高い返答をしてください
`;

  const deepResponse = await callLLM(deepSystemPrompt, [
    ...recentHistory,
    {
      role: 'user',
      content: userMessage.content,
    },
  ]);

  // NGガード適用
  const guardedResponse = applyNGGuard(deepResponse, character.name);

  // 感情推定（簡易 — MVP段階）
  const emotion = 'thoughtful';

  // 「考え中」メッセージを置換済みにマーク
  await prisma.message.update({
    where: { id: job.thinkingMsgId },
    data: {
      metadata: {
        isThinking: true,
        replaced: true,
      },
    },
  });

  // Deep Replyメッセージを保存
  await prisma.message.create({
    data: {
      conversationId: job.conversationId,
      role: 'CHARACTER',
      content: guardedResponse,
      metadata: {
        deepReply: true,
        emotion,
      },
    },
  });

  // 会話のupdatedAt更新
  await prisma.conversation.update({
    where: { id: job.conversationId },
    data: { updatedAt: new Date() },
  });

  // プッシュ通知送信
  try {
    const { sendPushNotification } = await import('@/lib/web-push-sender');
    await sendPushNotification(
      job.userId,
      `${character.name}からメッセージ`,
      guardedResponse.slice(0, 100),
      `/chat/${character.slug}`,
    );
  } catch (e) {
    console.warn('[DeepReply] Push notification failed:', e);
  }
}
