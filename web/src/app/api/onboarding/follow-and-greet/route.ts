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

  try {
    // JWT IDでユーザーを検索、見つからなければemailで検索（ID不一致対策）
    let user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = user.id;

    const { characterIds } = await req.json();

    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json({ error: 'characterIds required' }, { status: 400 });
    }

    // キャラクター情報を取得
    const characters = await prisma.character.findMany({
      where: { id: { in: characterIds } },
      select: { id: true, name: true, slug: true, avatarUrl: true },
    });

    for (const char of characters) {
      // 1. Relationship作成 or 更新（isFollowing = true）
      await prisma.relationship.upsert({
        where: {
          userId_characterId_locale: { userId, characterId: char.id, locale: 'ja' },
        },
        create: {
          userId,
          characterId: char.id,
          locale: 'ja',
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
            actorName: char.name,
            actorAvatar: char.avatarUrl,
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
