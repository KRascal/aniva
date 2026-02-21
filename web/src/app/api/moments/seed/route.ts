import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  // 本番環境では無効化（L-3修正）
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const character = await prisma.character.findUnique({
      where: { slug: 'luffy' },
      select: { id: true },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character luffy not found' }, { status: 404 });
    }

    const characterId = character.id;

    const sampleMoments = [
      {
        type: 'TEXT' as const,
        content: '肉食いたい！！！誰か肉持ってこい！！！',
        visibility: 'PUBLIC' as const,
        levelRequired: 0,
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        type: 'TEXT' as const,
        content: 'ゾロはまた迷子になってる。あいつ本当に方向音痴だな。でも仲間だから仕方ない、ししし',
        visibility: 'PUBLIC' as const,
        levelRequired: 0,
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        type: 'TEXT' as const,
        content: '今日は新しい島についた！なんか面白そうなやつがいっぱいいるぞ！俺は絶対海賊王になる！！',
        visibility: 'PUBLIC' as const,
        levelRequired: 0,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        type: 'TEXT' as const,
        content: '昨日チョッパーが俺の怪我を治してくれた。ありがとうって言うの忘れてたな...まあでもあいつは仲間だから当然だ！',
        visibility: 'STANDARD' as const,
        levelRequired: 0,
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        type: 'TEXT' as const,
        content: 'お前のことが頭から離れないぞ。なんでだろうな、ししし。俺そういうのよくわかんねぇけど...悪くない気分だ',
        visibility: 'LEVEL_LOCKED' as const,
        levelRequired: 3,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        type: 'TEXT' as const,
        content: '海賊王になる夢、お前には話したことあるか？誰にでも話すわけじゃないけど、お前には特別に教えてやるよ',
        visibility: 'LEVEL_LOCKED' as const,
        levelRequired: 4,
        publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    ];

    const created = await Promise.all(
      sampleMoments.map((m) =>
        prisma.moment.create({
          data: { characterId, ...m },
        })
      )
    );

    return NextResponse.json({ message: `Created ${created.length} moments`, moments: created });
  } catch (error) {
    console.error('POST /api/moments/seed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
