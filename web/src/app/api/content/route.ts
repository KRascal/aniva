/**
 * ダウンロードコンテンツ一覧 API（ユーザー向け）
 * GET /api/content?characterId=xxx
 *
 * - FC会員: 全コンテンツ返却
 * - 非FC会員: fcOnly=false のみ返却（fcOnly=true はロック表示用にメタデータのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const characterId = req.nextUrl.searchParams.get('characterId');
  if (!characterId) {
    return NextResponse.json({ error: 'characterId は必須です' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // FC会員チェック
  let isFanclub = false;
  if (userId) {
    const sub = await prisma.characterSubscription.findFirst({
      where: { userId, characterId, status: 'ACTIVE' },
    });
    isFanclub = !!sub;
  }

  const allContents = await prisma.downloadableContent.findMany({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      thumbnailUrl: true,
      fcOnly: true,
      downloadCount: true,
      createdAt: true,
      // fileUrl は非FC会員には返さない（フロントでDL APIを叩いてもらう）
    },
  });

  // FC会員でない場合、fcOnly=true のコンテンツはロック表示用にメタデータのみ
  const contents = allContents.map((c) => ({
    ...c,
    locked: c.fcOnly && !isFanclub,
  }));

  return NextResponse.json({ contents, isFanclub });
}
