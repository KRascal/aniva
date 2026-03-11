/**
 * アバター画像配信 API
 * GET /api/uploads/avatars/[filename]
 *
 * 永続ディレクトリからアバター画像を配信する。
 * public/uploads/ はデプロイ時に消失するため、API経由で永続ディレクトリから配信。
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PERSISTENT_DIR = '/home/openclaw/.openclaw/workspace/uploads/avatars';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // セキュリティ: パストラバーサル防止
  const sanitized = path.basename(filename.split('?')[0]);
  if (sanitized !== filename.split('?')[0] || sanitized.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const ext = sanitized.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Unsupported format' }, { status: 415 });
  }

  const filepath = path.join(PERSISTENT_DIR, sanitized);

  // フォールバック: 永続ディレクトリ → public/uploads/avatars/
  let fileBuffer: Buffer | null = null;

  if (existsSync(filepath)) {
    fileBuffer = await readFile(filepath);
  } else {
    // フォールバック: public/uploads/avatars/ を確認
    const publicPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', sanitized);
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
