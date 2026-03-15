import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { isR2Available, uploadToR2 } from '@/lib/r2';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;
    const folder = (formData.get('folder') as string | null) ?? 'characters';

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    // folder validation
    const ALLOWED_FOLDERS = ['characters', 'moments', 'content'];
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'folderが不正です' }, { status: 400 });
    }

    // slug is required for characters, optional for others
    if (folder === 'characters' && !slug) {
      return NextResponse.json({ error: 'slugが必要です' }, { status: 400 });
    }

    // Validate slug if provided (alphanumeric + hyphens only)
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'slugが不正です' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '対応していないファイル形式です（jpg, png, webp, gif のみ）' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズが5MBを超えています' }, { status: 400 });
    }

    // Get file extension
    const originalName = file.name;
    const ext = originalName.includes('.')
      ? '.' + originalName.split('.').pop()!.toLowerCase()
      : '';

    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ error: '拡張子が不正です' }, { status: 400 });
    }

    // Build safe filename: timestamp + original name sanitized
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}_${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2が利用可能ならR2にアップロード
    // キー: {folder}/{slug}/{filename} または {folder}/{filename}
    if (isR2Available()) {
      const keyPath = slug ? `${folder}/${slug}/${filename}` : `${folder}/${filename}`;
      const r2Url = await uploadToR2(keyPath, buffer, file.type);
      if (r2Url) {
        return NextResponse.json({ url: r2Url }, { status: 200 });
      }
      // R2アップロード失敗時はローカルにフォールバック
    }

    // ローカルファイルシステムに保存（フォールバック）
    const subPath = slug ? join(folder, slug) : folder;
    const publicDir = join(process.cwd(), 'public', 'uploads', subPath);
    mkdirSync(publicDir, { recursive: true });

    const filePath = join(publicDir, filename);
    writeFileSync(filePath, buffer);

    const url = `/uploads/${subPath}/${filename}`;
    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    logger.error('Upload error:', err);
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
