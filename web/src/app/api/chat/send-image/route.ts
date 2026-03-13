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

  return NextResponse.json({
    message: {
      id: userMsg.id,
      role: userMsg.role,
      content: userMsg.content,
      metadata: userMsg.metadata,
      createdAt: userMsg.createdAt.toISOString(),
    },
    imageUrl,
  });
}
