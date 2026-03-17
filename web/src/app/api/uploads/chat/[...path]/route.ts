/**
 * チャット画像配信 API
 * GET /api/uploads/chat/[conversationId]/[filename]
 *
 * 永続ディレクトリからチャット画像を配信する。
 * public/uploads/ はデプロイ時に消失するため、API経由で永続ディレクトリから配信。
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PERSISTENT_DIR = '/home/openclaw/.openclaw/workspace/uploads/chat';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // パストラバーサル防止 — 2セグメント: [dirId]/[filename]
  if (!segments || segments.length !== 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const [dirId, rawFilename] = segments;
  const sanitizedDirId = path.basename(dirId);
  const sanitizedFilename = path.basename(rawFilename.split('?')[0]);

  if (
    sanitizedDirId !== dirId ||
    sanitizedFilename !== rawFilename.split('?')[0] ||
    sanitizedDirId.includes('..') ||
    sanitizedFilename.includes('..')
  ) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const ext = sanitizedFilename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Unsupported format' }, { status: 415 });
  }

  // 永続ディレクトリ → public/uploads/ フォールバック
  // dirIdはconversationId or userId（どちらも同じディレクトリ構造）
  let fileBuffer: Buffer | null = null;
  const persistentPath = path.join(PERSISTENT_DIR, sanitizedDirId, sanitizedFilename);

  if (existsSync(persistentPath)) {
    fileBuffer = await readFile(persistentPath);
  } else {
    const publicPath = path.join(process.cwd(), 'public', 'uploads', 'chat', sanitizedDirId, sanitizedFilename);
    if (existsSync(publicPath)) {
      fileBuffer = await readFile(publicPath);
    }
  }

  if (!fileBuffer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Length': String(fileBuffer.length),
    },
  });
}
