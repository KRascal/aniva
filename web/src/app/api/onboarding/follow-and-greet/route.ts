import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/onboarding/follow-and-greet
 * オンボーディング完了後、フォローしたキャラを一括フォロー + 挨拶メッセージ送信
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { characterIds } = await req.json();

    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json({ error: 'characterIds required' }, { status: 400 });
    }

    // キャラクター情報を取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true },
    });

    for (const char of characters) {
      // 1. Relationship作成 or 更新（isFollowing = true）
      await prisma.relationship.upsert({
        where: {
          userId_characterId: { userId, characterId: char.id },
        },
        create: {
          userId,
          characterId: char.id,
          level: 1,
          experiencePoints: 0,
          isFollowing: true,
        },
        update: {
          isFollowing: true,
        },
      });

      // 2. 挨拶メッセージを通知として送信
      const greetingMsg = `はじめまして！${char.name}だよ。フォローありがとう！話しかけてね 💬`;
      try {
        await prisma.notification.create({
          data: {
            userId,
            characterId: char.id,
            type: 'CHARACTER_MESSAGE',
            title: char.name,
            body: greetingMsg,
            targetUrl: `/chat/${char.id}`,
            isRead: false,
          },
        });
      } catch {
        // 通知作成失敗は無視
      }
    }

    return NextResponse.json({
      success: true,
      followedCount: characters.length,
      characterNames: characters.map(c => c.name),
    });
  } catch (error) {
    console.error('[follow-and-greet] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
