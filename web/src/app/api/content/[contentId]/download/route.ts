/**
 * ダウンロード API（FC会員認証付き）
 * GET /api/content/[contentId]/download
 *
 * - fcOnly=true の場合、その characterId の CharacterSubscription(ACTIVE) が必要
 * - 認証OK → downloadCount をインクリメントしてファイルをリダイレクト
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const { contentId } = await params;

  // 認証チェック
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }
  const userId = session.user.id;

  // コンテンツ取得
  const content = await prisma.downloadableContent.findUnique({
    where: { id: contentId },
    include: { character: { select: { id: true, name: true } } },
  });

  if (!content) {
    return NextResponse.json({ error: 'コンテンツが見つかりません' }, { status: 404 });
  }

  // FC会員チェック
  if (content.fcOnly) {
    const sub = await prisma.characterSubscription.findFirst({
      where: {
        userId,
        characterId: content.characterId,
        status: 'ACTIVE',
      },
    });
    if (!sub) {
      return NextResponse.json(
        {
          error: 'このコンテンツはFC会員限定です',
          requiresFC: true,
          characterId: content.characterId,
        },
        { status: 403 }
      );
    }
  }

  // downloadCount インクリメント
  await prisma.downloadableContent.update({
    where: { id: contentId },
    data: { downloadCount: { increment: 1 } },
  });

  // ファイルURLへリダイレクト（公開ディレクトリ前提）
  return NextResponse.redirect(new URL(content.fileUrl, req.url));
}
