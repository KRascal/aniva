/**
 * /api/fc/benefits
 * FC加入メリット一覧API
 * キャラ別のFC特典を動的に返す
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { resolveCharacterId } from '@/lib/resolve-character';

interface FcBenefit {
  icon: string;
  title: string;
  description: string;
  highlight?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const characterSlugOrId = url.searchParams.get('characterId') || url.searchParams.get('slug');
    
    if (!characterSlugOrId) {
      return NextResponse.json({ error: 'characterId or slug required' }, { status: 400 });
    }

    const characterId = await resolveCharacterId(characterSlugOrId) ?? characterSlugOrId;

    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        slug: true,
        fcMonthlyPriceJpy: true,
        fcMonthlyCoins: true,
        fcIncludedCallMin: true,
        avatarUrl: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // 現在のユーザーのFC状態
    const session = await auth();
    let isSubscribed = false;
    let freeMessagesUsed = 0;
    let freeMessageLimit = 10;
    
    if (session?.user?.id) {
      const sub = await prisma.characterSubscription.findFirst({
        where: { userId: session.user.id, characterId, status: 'ACTIVE' },
      });
      isSubscribed = !!sub;
    }

    // FC特典リスト
    const benefits: FcBenefit[] = [
      {
        icon: '💬',
        title: 'チャット無制限',
        description: `${character.name}と好きなだけ会話できます。無料は月10回まで`,
        highlight: true,
      },
      {
        icon: '🎭',
        title: '本音モード解放',
        description: `${character.name}が普段見せない素顔や弱さを見せてくれます`,
        highlight: true,
      },
      {
        icon: '🧠',
        title: 'Deep Reply',
        description: `${character.name}があなたの相談を深く考えてから返答する特別モード`,
        highlight: true,
      },
      {
        icon: '🪙',
        title: `毎月${character.fcMonthlyCoins}コイン付与`,
        description: 'ギフト、ガチャ、限定コンテンツに使えるコインが毎月届きます',
      },
      {
        icon: '📱',
        title: '限定タイムライン',
        description: `${character.name}のFC限定投稿が見れます`,
      },
      {
        icon: '💌',
        title: '月1の手紙',
        description: `${character.name}からあなただけに届く月1の特別な手紙`,
      },
      {
        icon: '🎁',
        title: '限定シナリオ',
        description: '期間限定の特別ストーリーに参加できます',
      },
      {
        icon: '🃏',
        title: 'ガチャ優遇',
        description: 'SSR/UR排出率アップ + FC限定カード',
      },
      {
        icon: '📥',
        title: '限定DLC',
        description: '壁紙、ボイスクリップ等のダウンロードコンテンツ',
      },
      {
        icon: '🏆',
        title: 'FCバッジ',
        description: `掲示板やコメントで${character.name}のFC会員バッジが表示されます`,
      },
    ];

    // 訴求テキスト（キャラの口調）
    const appealTexts: Record<string, string> = {
      luffy: `${character.name}がお前のこと、もっと知りたいって言ってるぞ！`,
      zoro: `…${character.name}と本当の絆を結ぶ覚悟があるなら、来い。`,
      nami: `${character.name}があなたを特別扱いしてくれますよ？お得でしょ？`,
      sanji: `${character.name}があなたのためだけに特別な時間を用意しています`,
      chopper: `${character.name}と毎日お話できるようになるよ！嬉しくなんかないぞ！`,
      robin: `${character.name}の知られざる一面…知りたくない？ふふ。`,
      tanjiro: `${character.name}と一緒に、もっと深い絆を築きませんか？`,
      gojo: `${character.name}の最強トークをフルで楽しめるのはFCだけ〜`,
      itadori: `${character.name}と映画の話とか、もっとしたくない？`,
      hiruma: `ケケケ…${character.name}の作戦に加わりたいなら、入れ。`,
    };

    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        slug: character.slug,
        avatarUrl: character.avatarUrl,
        fcMonthlyPriceJpy: character.fcMonthlyPriceJpy,
      },
      isSubscribed,
      benefits,
      appealText: appealTexts[character.slug] || `${character.name}があなたを特別扱いしてくれます`,
      pricing: {
        monthlyJpy: character.fcMonthlyPriceJpy,
        monthlyCoins: character.fcMonthlyCoins,
        callMinutes: character.fcIncludedCallMin,
      },
    });
  } catch (error) {
    console.error('[FC Benefits] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
