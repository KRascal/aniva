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
import { characterEngine } from '@/lib/character-engine';
import { analyzeImage, imageAnalysisToPromptHint } from '@/lib/image-analysis';
import { getCharacterImagePrompt } from '@/lib/image-character-reaction';
import { logger } from '@/lib/logger';

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

  // Conversation 取得 or 作成
  let conversation = await prisma.conversation.findFirst({
    where: { relationshipId: relationship.id },
    orderBy: { updatedAt: 'desc' },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { relationshipId: relationship.id },
    });
  }

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

  // ── キャラクター応答生成（画像に対するリアクション） ──
  let charMessage: { id: string; role: string; content: string; metadata: unknown; createdAt: string } | null = null;
  try {
    // キャラ情報取得（slug取得でプロンプト最適化）
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { slug: true },
    });

    // 画像解析してキャラ向けプロンプト生成
    // 外部Vision APIがアクセスできるよう絶対URLに変換
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://demo.aniva-project.com';
    const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
    let enrichedMessage = '[画像が送られました。この画像に対してキャラクターらしく自然に反応してください。]';
    try {
      const analysis = await analyzeImage(absoluteImageUrl);
      if (analysis) {
        const analysisText = analysis.description || JSON.stringify(analysis);
        const charImagePrompt = getCharacterImagePrompt(character?.slug ?? '', analysisText);
        enrichedMessage = `[ユーザーが画像を送りました]\n${imageAnalysisToPromptHint(analysis)}\n${charImagePrompt}`;
      }
    } catch { /* 画像解析失敗時はフォールバックメッセージを使用 */ }

    const response = await characterEngine.generateResponse(
      characterId,
      relationship.id,
      enrichedMessage,
      'ja',
      { isFcMember: false },
    );

    const savedCharMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: response.text,
        metadata: { emotion: response.emotion },
      },
    });

    charMessage = {
      id: savedCharMsg.id,
      role: savedCharMsg.role,
      content: savedCharMsg.content,
      metadata: savedCharMsg.metadata,
      createdAt: savedCharMsg.createdAt.toISOString(),
    };
  } catch (err) {
    logger.error('[send-image] character response generation failed:', err);
    // キャラ応答失敗は画像送信成功を妨げない
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
    characterMessage: charMessage,
  });
}
