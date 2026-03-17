/**
 * チャット画像送信 API
 * POST /api/chat/send-image — 画像をmultipart/form-dataで受信しMessageレコードを作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveCharacterId } from '@/lib/resolve-character';
import { createRateLimiter } from '@/lib/rate-limit';
import { uploadChatMedia } from '@/lib/media-manager';
import { getOrCreateConversation } from '@/lib/conversation';

const imageSendLimiter = createRateLimiter({ prefix: 'chat-image', limit: 10, windowSec: 60 });

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10画像/分
  const { success } = await imageSendLimiter.check(userId);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('image');
  const rawCharacterId = formData.get('characterId');

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
  }
  if (!rawCharacterId || typeof rawCharacterId !== 'string') {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  // サイズチェック: 5MB 以下
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
  }

  // MIMEタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use jpg, png, webp, or gif.' }, { status: 415 });
  }

  // 拡張子の決定
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const ext = extMap[file.type] ?? 'jpg';

  // キャラクター解決
  const characterId = (await resolveCharacterId(rawCharacterId)) ?? rawCharacterId;

  // Relationship 取得 or 作成
  let relationship = await prisma.relationship.findUnique({
    where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
  });
  if (!relationship) {
    relationship = await prisma.relationship.create({
      data: { userId, characterId },
    });
  }

  // Conversation 取得 or 作成（getOrCreateで一元管理）
  const conversation = await getOrCreateConversation(relationship.id);

  // 保存先: デプロイで消えない永続ディレクトリ + public（静的配信互換）
  const persistentUploadDir = path.resolve('/home/openclaw/.openclaw/workspace/uploads/chat', conversation.id);
  const publicUploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat', conversation.id);
  await mkdir(persistentUploadDir, { recursive: true });
  await mkdir(publicUploadDir, { recursive: true });

  // ファイル書き込み（両方に保存）
  const timestamp = Date.now();
  const filename = `${timestamp}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(persistentUploadDir, filename), buffer);
  await writeFile(path.join(publicUploadDir, filename), buffer);

  // API経由で配信（デプロイ後も消えない）
  const imageUrl = `/api/uploads/chat/${conversation.id}/${filename}`;

  // Messageレコード作成（imageUrlカラム + metadata両方にセット → アルバムAPIでも取得可能）
  const userMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: '[画像]',
      imageUrl,
      metadata: { imageUrl },
    },
  });

  // ChatMediaレコードを非同期で作成（エラーでも送信は止めない）
  uploadChatMedia({
    file: buffer,
    mimeType: file.type,
    conversationId: conversation.id,
    userId,
    characterId,
    messageId: userMsg.id,
    uploadedBy: 'user',
  }).catch((err) => {
    console.error('[send-image] ChatMedia upload failed (non-fatal):', err);
  });

  // conversation + relationship の時刻を更新（チャット順序ソートに必須）
  const nowTs = new Date();
  await Promise.all([
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: nowTs },
    }),
    prisma.relationship.update({
      where: { id: relationship.id },
      data: { lastMessageAt: nowTs },
    }),
  ]);

  // キャラクター応答生成（画像リアクション）— 失敗しても画像送信は成功として返す
  let characterReply: { id: string; role: string; content: string; createdAt: string } | null = null;
  try {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, slug: true },
    });
    if (character) {
      // Vision APIで画像を分析してキャラ反応の質を向上
      let imageHint = 'ユーザーが何かの画像を共有してくれた。キャラとして興味を示し、短く自然に反応して。';
      try {
        const { analyzeImage, imageAnalysisToPromptHint } = await import('@/lib/image-analysis');
        // bufferを直接渡す（URLフェッチの404リスクを回避）
        const analysis = await analyzeImage({ buffer, mimeType: file.type });
        if (analysis) {
          imageHint = imageAnalysisToPromptHint(analysis);
        }
      } catch (visionErr) {
        console.error('[send-image] vision analysis failed (non-fatal):', visionErr);
      }

      const { getCharacterImagePrompt } = await import('@/lib/image-character-reaction');
      const reactionPrompt = getCharacterImagePrompt(character.slug, imageHint);

      // 直近の会話文脈を取得（画像への返答精度向上）
      const { getAllConversationIds } = await import('@/lib/conversation');
      const convIds = await getAllConversationIds(relationship.id);
      const recentMessages = await prisma.message.findMany({
        where: {
          conversationId: { in: convIds },
          role: { in: ['USER', 'CHARACTER'] },
          content: { not: '[画像]' }, // 画像メッセージ自体は除外
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { role: true, content: true },
      });
      const contextLines = recentMessages
        .reverse()
        .map((m) => `${m.role === 'USER' ? 'ユーザー' : 'キャラ'}: ${m.content.slice(0, 100)}`)
        .join('\n');
      const contextBlock = contextLines
        ? `\n\n【直近の会話文脈】\n${contextLines}`
        : '';

      // characterEngineで応答生成（会話文脈付き）
      const { characterEngine } = await import('@/lib/character-engine');
      const response = await characterEngine.generateResponse(
        character.id,
        relationship.id,
        `[画像を受け取りました] ${reactionPrompt}${contextBlock}`,
        'ja',
        { isFcMember: false }
      );

      if (response?.text) {
        const assistantMsg = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'CHARACTER',
            content: response.text,
            metadata: { type: 'image_reaction', imageUrl, emotion: response.emotion ?? null },
          },
        });
        characterReply = {
          id: assistantMsg.id,
          role: assistantMsg.role,
          content: assistantMsg.content,
          createdAt: assistantMsg.createdAt.toISOString(),
        };
      }
    }
  } catch (err) {
    // 応答生成失敗は非致命的 — 画像送信成功として返す
    console.error('[send-image] character reaction error (non-fatal):', err);
  }

  return NextResponse.json({
    message: {
      id: userMsg.id,
      role: userMsg.role,
      content: userMsg.content,
      metadata: userMsg.metadata,
      createdAt: userMsg.createdAt.toISOString(),
    },
    imageUrl,
    characterReply,
  });
}
