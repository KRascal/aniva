import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';
import { isR2Available, deleteFromR2, getR2PublicUrl } from '@/lib/r2';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/media
 * キャラクター画像一覧を返す（DBのavatarUrl/coverUrlから収集 + R2パスリスト）
 */
export async function GET(_req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const characters = await prisma.character.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        coverUrl: true,
      },
    });

    const items: {
      key: string;
      url: string;
      characterSlug: string;
      characterName: string;
      type: 'avatar' | 'cover';
    }[] = [];

    for (const char of characters) {
      if (char.avatarUrl) {
        items.push({
          key: `characters/${char.slug}/avatar`,
          url: char.avatarUrl,
          characterSlug: char.slug,
          characterName: char.name,
          type: 'avatar',
        });
      }
      if (char.coverUrl) {
        items.push({
          key: `characters/${char.slug}/cover`,
          url: char.coverUrl,
          characterSlug: char.slug,
          characterName: char.name,
          type: 'cover',
        });
      }
    }

    // If R2 is available, try to list objects
    if (isR2Available()) {
      try {
        const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const client = new S3Client({
          region: 'auto',
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        });
        const bucket = process.env.R2_BUCKET_NAME!;
        const listed = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, Prefix: 'characters/', MaxKeys: 200 })
        );

        const knownUrls = new Set(items.map((i) => i.url));

        for (const obj of listed.Contents ?? []) {
          const key = obj.Key;
          if (!key) continue;
          const url = getR2PublicUrl(key);
          if (knownUrls.has(url)) continue;

          // Extract slug from path: characters/<slug>/<filename>
          const parts = key.split('/');
          const slug = parts[1] ?? '';
          const char = characters.find((c) => c.slug === slug);

          items.push({
            key,
            url,
            characterSlug: slug,
            characterName: char?.name ?? slug,
            type: 'avatar',
          });
        }
      } catch {
        // R2 list failed, use DB-only results
      }
    }

    return NextResponse.json({ items, r2Available: isR2Available() });
  } catch (error) {
    logger.error('[admin/media] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media
 * R2からファイルを削除する
 * body: { key: string }
 */
export async function DELETE(req: NextRequest) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { key } = await req.json() as { key: string };

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'keyが必要です' }, { status: 400 });
    }

    // Security: only allow characters/ prefix
    if (!key.startsWith('characters/') && !key.startsWith('moments/') && !key.startsWith('content/')) {
      return NextResponse.json({ error: 'このパスは削除できません' }, { status: 400 });
    }

    if (!isR2Available()) {
      return NextResponse.json({ error: 'R2が設定されていないため削除できません' }, { status: 503 });
    }

    await deleteFromR2(key);
    logger.info('[admin/media] Deleted', { key, adminEmail: ctx.email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[admin/media] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
