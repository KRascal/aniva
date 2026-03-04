/**
 * Admin API: ダウンロードコンテンツ管理
 * GET    /api/admin/downloadable-content?characterId=xxx  — 一覧取得
 * POST   /api/admin/downloadable-content                  — 新規作成（multipart）
 * PUT    /api/admin/downloadable-content                  — 更新
 * DELETE /api/admin/downloadable-content?id=xxx          — 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CONTENT_DIR = join(process.cwd(), 'public', 'uploads', 'content');
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'application/zip',
  'application/pdf',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// GET: 一覧
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const characterId = req.nextUrl.searchParams.get('characterId');

  const contents = await prisma.downloadableContent.findMany({
    where: characterId ? { characterId } : undefined,
    include: { character: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ contents });
}

// POST: 新規作成
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const characterId = formData.get('characterId') as string | null;
  const title = formData.get('title') as string | null;
  const description = formData.get('description') as string | null;
  const type = formData.get('type') as string | null;
  const thumbnailFile = formData.get('thumbnail') as File | null;
  const fcOnlyRaw = formData.get('fcOnly');
  const fcOnly = fcOnlyRaw === 'false' ? false : true;

  if (!file || !characterId || !title || !type) {
    return NextResponse.json(
      { error: 'file, characterId, title, type は必須です' },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '対応していないファイル形式です' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ファイルサイズが50MBを超えています' }, { status: 400 });
  }

  // キャラクター存在チェック
  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) {
    return NextResponse.json({ error: 'キャラクターが見つかりません' }, { status: 404 });
  }

  // DB レコード作成（IDを取得してからファイル保存）
  const record = await prisma.downloadableContent.create({
    data: {
      characterId,
      title,
      description: description ?? undefined,
      type,
      fileUrl: '', // 後で更新
      fcOnly,
    },
  });

  // ファイル保存
  mkdirSync(CONTENT_DIR, { recursive: true });
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '';
  const filename = `${record.id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(CONTENT_DIR, filename), buffer);
  const fileUrl = `/uploads/content/${filename}`;

  // サムネイル保存
  let thumbnailUrl: string | undefined;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const thumbExt = thumbnailFile.name.includes('.')
      ? '.' + thumbnailFile.name.split('.').pop()!.toLowerCase()
      : '.jpg';
    const thumbFilename = `${record.id}-thumb${thumbExt}`;
    const thumbBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    writeFileSync(join(CONTENT_DIR, thumbFilename), thumbBuffer);
    thumbnailUrl = `/uploads/content/${thumbFilename}`;
  }

  // fileUrl 更新
  const updated = await prisma.downloadableContent.update({
    where: { id: record.id },
    data: { fileUrl, thumbnailUrl },
  });

  return NextResponse.json({ content: updated }, { status: 201 });
}

// PUT: 更新
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as {
    id: string;
    title?: string;
    description?: string;
    type?: string;
    fcOnly?: boolean;
  };
  if (!body.id) {
    return NextResponse.json({ error: 'id は必須です' }, { status: 400 });
  }

  const updated = await prisma.downloadableContent.update({
    where: { id: body.id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.fcOnly !== undefined ? { fcOnly: body.fcOnly } : {}),
    },
  });

  return NextResponse.json({ content: updated });
}

// DELETE: 削除
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  await prisma.downloadableContent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
