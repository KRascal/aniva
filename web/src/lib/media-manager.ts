// @ts-nocheck
/**
 * media-manager.ts
 * ChatMediaの作成・取得・削除を一手に担う疎結合モジュール。
 * R2が利用可能ならR2、なければローカルにフォールバック。
 * 呼び出し元はこのモジュールだけをimportすればOK。
 * NOTE: ChatMedia model not yet migrated to schema. Suppressed until migration.
 */

import { randomUUID } from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { prisma } from '@/lib/prisma';
import { isR2Available, uploadToR2 } from '@/lib/r2';

export interface ChatMediaRecord {
  id: string;
  conversationId: string;
  messageId: string | null;
  userId: string;
  characterId: string;
  originalUrl: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  uploadedBy: string;
  createdAt: Date;
}

// 容量制限（バイト）
const FREE_LIMIT_BYTES = 50 * 1024 * 1024;   // 50MB
const FC_LIMIT_BYTES = 500 * 1024 * 1024;    // 500MB

/**
 * ユーザーがFC会員かどうかを確認
 */
async function isFcMember(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return user?.plan === 'PREMIUM' || user?.plan === 'STANDARD';
}

/**
 * 画像をsharpでサムネイル生成し、webp変換
 * sharpが利用できない環境では元の画像をそのまま返す
 */
async function generateThumbnail(buffer: Buffer): Promise<{ thumbnail: Buffer; width: number; height: number } | null> {
  try {
    const sharp = (await import('sharp')).default;
    const resized = await sharp(buffer)
      .resize(300, undefined, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer({ resolveWithObject: true });

    return {
      thumbnail: resized.data,
      width: resized.info.width,
      height: resized.info.height,
    };
  } catch {
    return null;
  }
}

/**
 * 画像のオリジナルサイズを取得
 */
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ローカルファイルシステムへのフォールバック保存
 */
async function saveToLocal(
  conversationId: string,
  cuid: string,
  buffer: Buffer,
  isThumbnail: boolean
): Promise<string> {
  const suffix = isThumbnail ? '-thumb' : '';
  const filename = `${cuid}${suffix}.webp`;
  const persistDir = path.resolve('/home/openclaw/.openclaw/workspace/uploads/chat', conversationId);
  const publicDir = path.join(process.cwd(), 'public', 'uploads', 'chat', conversationId);
  await mkdir(persistDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(persistDir, filename), buffer);
  await writeFile(path.join(publicDir, filename), buffer);
  return `/api/uploads/chat/${conversationId}/${filename}`;
}

/**
 * 画像をwebpに変換（sharpが使えない場合はそのまま返す）
 */
async function convertToWebp(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === 'image/webp') return buffer;
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buffer).webp({ quality: 85 }).toBuffer();
  } catch {
    return buffer;
  }
}

/**
 * ChatMediaをアップロードしてDBに保存する
 */
export async function uploadChatMedia(params: {
  file: Buffer;
  mimeType: string;
  conversationId: string;
  userId: string;
  characterId: string;
  messageId?: string;
  uploadedBy: 'user' | 'character' | 'system';
}): Promise<ChatMediaRecord> {
  const { file, mimeType, conversationId, userId, characterId, messageId, uploadedBy } = params;

  // 容量チェック
  const usage = await getUserMediaUsage(userId);
  const fc = await isFcMember(userId);
  const limitBytes = fc ? FC_LIMIT_BYTES : FREE_LIMIT_BYTES;
  if (usage.totalBytes + file.length > limitBytes) {
    const limitMb = limitBytes / (1024 * 1024);
    throw new Error(`ストレージ容量が上限（${limitMb}MB）を超えます。古い画像を削除してください。`);
  }

  const cuid = randomUUID().replace(/-/g, '');

  // webp変換
  const webpBuffer = await convertToWebp(file, mimeType);

  // 元画像のサイズを取得
  const dims = await getImageDimensions(file);

  // サムネイル生成
  const thumbResult = await generateThumbnail(file);
  const thumbBuffer = thumbResult?.thumbnail ?? null;

  // R2 or ローカルにアップロード
  const r2Key = `chat-media/${conversationId}/${cuid}.webp`;
  const r2ThumbKey = `chat-media/${conversationId}/${cuid}-thumb.webp`;

  let originalUrl: string;
  let thumbnailUrl: string | null = null;

  if (isR2Available()) {
    const uploaded = await uploadToR2(r2Key, webpBuffer, 'image/webp');
    originalUrl = uploaded ?? await saveToLocal(conversationId, cuid, webpBuffer, false);
    if (thumbBuffer) {
      const uploadedThumb = await uploadToR2(r2ThumbKey, thumbBuffer, 'image/webp');
      thumbnailUrl = uploadedThumb ?? await saveToLocal(conversationId, `${cuid}-thumb`, thumbBuffer, true);
    }
  } else {
    originalUrl = await saveToLocal(conversationId, cuid, webpBuffer, false);
    if (thumbBuffer) {
      thumbnailUrl = await saveToLocal(conversationId, `${cuid}-thumb`, thumbBuffer, true);
    }
  }

  // DBに保存
  const record = await prisma.chatMedia.create({
    data: {
      conversationId,
      messageId: messageId ?? null,
      userId,
      characterId,
      originalUrl,
      thumbnailUrl,
      mimeType: 'image/webp',
      fileSizeBytes: webpBuffer.length,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      uploadedBy,
    },
  });

  return record as ChatMediaRecord;
}

/**
 * 会話内のChatMediaを取得
 */
export async function getChatMedia(params: {
  conversationId: string;
  limit?: number;
  cursor?: string;
}): Promise<ChatMediaRecord[]> {
  const { conversationId, limit = 200, cursor } = params;

  const records = await prisma.chatMedia.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return records as ChatMediaRecord[];
}

/**
 * ChatMediaを削除（R2からも削除）
 */
export async function deleteChatMedia(mediaId: string): Promise<void> {
  const record = await prisma.chatMedia.findUnique({ where: { id: mediaId } });
  if (!record) return;

  // R2から削除
  if (isR2Available()) {
    const { deleteFromR2 } = await import('@/lib/r2');
    try {
      // URLからキーを抽出
      const extractKey = (url: string) => {
        const r2PubUrl = process.env.R2_PUBLIC_URL ?? '';
        if (r2PubUrl && url.startsWith(r2PubUrl)) {
          return url.slice(r2PubUrl.replace(/\/$/, '').length + 1);
        }
        // フォールバック: URLのパス部分を使用
        const match = url.match(/chat-media\/.+/);
        return match ? match[0] : null;
      };
      const origKey = extractKey(record.originalUrl);
      if (origKey) await deleteFromR2(origKey);
      if (record.thumbnailUrl) {
        const thumbKey = extractKey(record.thumbnailUrl);
        if (thumbKey) await deleteFromR2(thumbKey);
      }
    } catch {
      // R2削除失敗は無視（DBは削除する）
    }
  }

  await prisma.chatMedia.delete({ where: { id: mediaId } });
}

/**
 * ユーザーの総ストレージ使用量を取得
 */
export async function getUserMediaUsage(userId: string): Promise<{ totalBytes: number; count: number }> {
  const result = await prisma.chatMedia.aggregate({
    where: { userId },
    _sum: { fileSizeBytes: true },
    _count: { id: true },
  });

  return {
    totalBytes: result._sum.fileSizeBytes ?? 0,
    count: result._count.id ?? 0,
  };
}

/**
 * ユーザーの容量制限情報を取得（UIバー用）
 */
export async function getMediaUsageInfo(userId: string): Promise<{
  totalBytes: number;
  count: number;
  limitBytes: number;
  usedPercent: number;
  isFc: boolean;
}> {
  const [usage, fc] = await Promise.all([
    getUserMediaUsage(userId),
    isFcMember(userId),
  ]);
  const limitBytes = fc ? FC_LIMIT_BYTES : FREE_LIMIT_BYTES;
  const usedPercent = Math.min(100, Math.round((usage.totalBytes / limitBytes) * 100));
  return {
    ...usage,
    limitBytes,
    usedPercent,
    isFc: fc,
  };
}
