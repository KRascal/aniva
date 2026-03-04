/**
 * ユーザープロフィール更新 API
 * PATCH /api/users/profile  — displayName を更新する
 * POST  /api/users/profile  — プロフィール画像をアップロード (multipart/form-data)
 */

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { displayName } = body;
  if (displayName === undefined) {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
  }

  // 20文字以内・空白トリム
  const trimmed = String(displayName).trim().slice(0, 20);

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: { displayName: trimmed || null },
    select: { id: true, displayName: true },
  });

  return NextResponse.json({ displayName: user.displayName });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('avatar');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No avatar file provided' }, { status: 400 });
  }

  // サイズチェック: 5MB 以下
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
  }

  // MIMEタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
  }

  // 拡張子の決定
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  const ext = extMap[file.type] ?? 'jpg';

  // ユーザー取得
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 保存先ディレクトリの確保
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(uploadDir, { recursive: true });

  // ファイル書き込み
  const filename = `${user.id}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // DBのavatarUrlを更新（キャッシュバスティング用にtimestampを付与）
  const avatarUrl = `/uploads/avatars/${filename}?t=${Date.now()}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl, image: avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
