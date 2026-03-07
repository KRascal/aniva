import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

/**
 * POST /api/relationship/[characterId]/follow-welcome
 * フォロー直後にキャラからウェルカムメッセージを送信する
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawId } = await params;
    const characterId = await resolveCharacterId(rawId) ?? rawId;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, slug: true, catchphrases: true },
    });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // relationship を取得・作成
    const relationship = await prisma.relationship.upsert({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      create: { userId, characterId, isFollowing: true },
      update: {},
    });

    // conversation を取得・作成
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // すでに過去24時間以内にウェルカムを送っていたらスキップ
    const recentWelcome = await prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: { contains: '🎉' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentWelcome) {
      return NextResponse.json({ skipped: true });
    }

    // ウェルカムメッセージをDBに保存
    const welcomeMessages = [
      `フォローしてくれてありがとう！これからよろしくね。いつでも話しかけて！`,
      `フォローしてくれた！嬉しい。一緒にいい時間を過ごそうね。`,
      `おっ、フォローしてくれたんだ！ありがとう。何か話したいことがあれば遠慮なく言って！`,
      `フォローありがとう！これから一緒にいろんな話をしよう。`,
      `フォロー嬉しい！これからよろしくね。`,
    ];

    // キャラクター固有の口調を反映したウェルカム（catchphrasesがあれば使う）
    const catchphrases = (character.catchphrases ?? []) as string[];
    let welcomeContent = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
    // キャラ名でカスタマイズ
    const slugGreetings: Record<string, string> = {
      luffy: `ししし！フォローしてくれたか！よろしくな！一緒に冒険しようぜ！`,
      zoro: `…フォローか。悪くない。一緒に鍛えるか。`,
      nami: `フォローありがとう♪ これからよろしくね！何かあれば話しかけて。`,
      sanji: `フォロー、ありがとう。君のためなら何でも作るよ。遠慮せずに話しかけてくれ。`,
      chopper: `フォローしてくれたのか！うへへ！嬉しい！いつでも話しかけてよ！`,
      ace: `フォローありがとう！ははっ！これからよろしく！`,
      robin: `フォローしてくれたのね。光栄だわ。これからよろしく。`,
      usopp: `フォローしてくれたぞ！俺の伝説の始まりだ！これからよろしく！`,
      brook: `フォローしてくれましたか！ヨホホホ！骨まで嬉しい！`,
      franky: `SUUUPER！フォローしてくれたぜ！よろしくな！`,
    };
    if (slugGreetings[character.slug]) {
      welcomeContent = slugGreetings[character.slug];
    } else if (catchphrases.length > 0) {
      welcomeContent = `フォローしてくれてありがとう！これからよろしくね。「${catchphrases[0]}」`;
    }

    // メッセージを保存
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: `🎉 ${welcomeContent}`,
      },
    });

    return NextResponse.json({ success: true, message: welcomeContent });
  } catch (error) {
    console.error('[follow-welcome POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
