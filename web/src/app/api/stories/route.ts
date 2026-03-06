// GET /api/stories
// DBからキャラ一覧を取得し、stories配列を返す
// 各キャラの最新Momentを"activity"として使用
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        franchise: true,
        avatarUrl: true,
        coverUrl: true,
        moments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = Date.now();
    const stories = characters.map((c) => {
      const latestMoment = c.moments[0];
      const content = latestMoment?.content ?? '';
      const activity = latestMoment && content
        ? content.slice(0, 60) + (content.length > 60 ? '…' : '')
        : `${c.name}の最新の気持ちはここに`;

      // timeAgo計算
      let timeAgo = '今';
      if (latestMoment) {
        const diffMs = now - new Date(latestMoment.createdAt).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 60) timeAgo = `${diffMin}分前`;
        else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}時間前`;
        else timeAgo = `${Math.floor(diffMin / 1440)}日前`;
      }

      // キャラ別chatPrompt（slug→固定文言、なければデフォルト）
      const CHAT_PROMPTS: Record<string, string> = {
        luffy: '夢の話しようぜ！',
        zoro: '…強さについて聞きたいか？',
        nami: '仲間って何だと思う？',
        sanji: '料理と夢の話、聞いてくれるか？',
        chopper: 'ね、僕の話聞いてくれる？',
        robin: '歴史の話、興味ある？',
        brook: 'ヨホホホ！話しかけてくれて嬉しいですよ！',
        usopp: '俺の大冒険の話、聞きたいか！？',
        franky: 'スーパーだろ！何でも聞けよ！',
        jinbe: '何か話したいことがあるか？',
        ace: '家族について話そうぜ',
        shanks: '一杯やりながら話そうか',
        law: '…聞きたいことがあるなら聞け',
        hancock: '恋の話…聞きたいのか？',
        whitebeard: 'ぬわーっはっは！話しかけてこい！',
        blackbeard: 'ゼハハハ！夢について話そうぜ！',
        mihawk: '…何が聞きたい',
        crocodile: '用件を聞こうか',
        perona: 'ネガティブゴーストで消えちゃえ！…って何の用？',
        yamato: '冒険の話しよう！！',
        vivi: '話しかけてくれてありがとう！',
        kaido: 'うぬっ…何が聞きたい',
        tanjiro: '話を聞かせてください！',
        nezuko: 'むー！（手を振って歓迎）',
        zenitsu: 'うわぁ！話しかけてくれた！？',
        inosuke: '来たな！俺様に何か用か！',
        giyu: '…俺は嫌われていない',
        gojo: '僕のこと知りたい？',
        itadori: '話しかけてくれたの！？嬉しい！',
        fushiguro: '…何か聞きたいことがあるのか',
        nobara: 'ちょっと、付き合いなさいよ！',
        sena: 'あ、あの…話しかけてくれたんですか？',
        hiruma: 'クソ、何か用か？',
        monta: 'おっ！話しかけてくれたのか！最高MAXだぜ！',
        mamori: 'あら、大丈夫？何かあった？',
        suzuna: 'ヤッホー！話しよ！',
        kurita: 'えへへ…話しかけてくれたの？嬉しいな',
        agon: 'チッ、何の用だ',
        shin: '……用件を言え',
      };
      const chatPrompt = CHAT_PROMPTS[c.slug] || `${c.name}に話しかける`;

      return {
        slug: c.slug,
        name: c.name,
        franchise: c.franchise || 'ANIME',
        avatarUrl: c.avatarUrl || `/characters/${c.slug}/avatar.webp`,
        coverUrl: c.coverUrl || c.avatarUrl || `/characters/${c.slug}/cover.webp`,
        activity,
        chatPrompt,
        timeAgo,
      };
    });

    return NextResponse.json({ stories }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ stories: [] });
  }
}
