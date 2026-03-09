/**
 * POST /api/upload/image
 * チャット画像アップロード（マルチモーダル入力用）
 * 
 * - 最大 5MB
 * - JPEG/PNG/WebP/GIF のみ
 * - /public/uploads/chat/{userId}/{filename} に保存
 * - URLを返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${randomUUID()}.${ext}`;
  const userId = session.user.id.slice(0, 8); // セキュリティ: UUIDの最初の8文字
  const dirPath = path.join(process.cwd(), 'public', 'uploads', 'chat', userId);

  await mkdir(dirPath, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(dirPath, filename), buffer);

  const url = `/uploads/chat/${userId}/${filename}`;
  return NextResponse.json({ url, size: file.size });
}
