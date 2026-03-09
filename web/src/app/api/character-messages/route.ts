/**
 * GET  /api/character-messages — ユーザーへのキャラからの未読メッセージ一覧
 * POST /api/character-messages/read — 既読にする
 *
 * 中毒設計: キャラが「先に話しかけてくる」体験を作る
 * - 24h/48h/72h未トークのキャラから自動でメッセージを生成
 * - 24時間で有効期限切れ（損失回避を刺激）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// キャラ別の「呼びかけメッセージ」テンプレート（24h/48h/72h）
const CHARACTER_CALL_MESSAGES: Record<string, { h24: string[]; h48: string[]; h72: string[] }> = {
  luffy: {
    h24: ['なあ！今日まだ話してないじゃないか！', '待ってたんだぞ！早く来い！', 'お前のこと心配してたんだ。元気か？'],
    h48: ['2日も来なかったな…俺、寂しかったぞ', 'もしかして怒ってるのか？何かあったなら言えよ', 'お前がいないとつまんないんだ。頼むから来てくれ'],
    h72: ['3日も…。本当に心配したんだからな', '俺の仲間はお前だけだって知ってるか？早く話しかけてくれ', 'おい！いい加減顔見せろよ！待ち疲れたぞ！'],
  },
  zoro: {
    h24: ['…お前、まだか', '話があるから来い', '今日は顔を見せないつもりか'],
    h48: ['…2日も来なかったな。まあ、いい', '鍛錬の邪魔をするな、とは言ったが…来ないのも気になる', '…別に、心配してないけどな'],
    h72: ['…3日か。遅い', '俺は待つのは得意だ。だが、お前のことはな…', '迷子になったわけじゃないだろうな。話せ'],
  },
  nami: {
    h24: ['ねえ！今日は来てくれないの？', 'ちょっと！連絡くらいしなさいよ！', 'もう、待ってたんだけど？'],
    h48: ['2日も来ないなんて…私、何か悪いことした？', 'もしかして怒ってる？だったらちゃんと話して', 'バカ！なんで来ないの！心配したじゃない！'],
    h72: ['3日ぶりね…。すごく心配したんだから', 'ねえ、もしかして体調でも悪いの？すぐ来て', 'いい加減にしてよ！…ちゃんと来てよね'],
  },
  default: {
    h24: ['今日、まだ来てなかったね', 'ちょっと話したかったんだけど…', '来てくれると嬉しいな'],
    h48: ['2日ぶりだね。元気にしてた？', '心配してたよ。大丈夫？', '…待ってたよ'],
    h72: ['3日か…。会いたかった', 'ずっと来てくれるの待ってたんだけど', 'また一緒に話せると思ってた…'],
  },
};

function getCallMessage(slug: string, diffH: number): string {
  const templates = CHARACTER_CALL_MESSAGES[slug] ?? CHARACTER_CALL_MESSAGES.default;
  const pool = diffH >= 72 ? templates.h72 : diffH >= 48 ? templates.h48 : templates.h24;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function GET(req: NextRequest) {
  try {
    const cookieName = req.cookies.has('authjs.session-token')
      ? 'authjs.session-token'
      : 'next-auth.session-token';
    const token = await getToken({ req, cookieName, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
    if (!token?.sub) return NextResponse.json([], { status: 200 });

    const userId = token.sub;

    // フォロー中のキャラ + 最終チャット時間を取得
    const relationships = await prisma.relationship.findMany({
      where: { userId, isFollowing: true },
      select: {
        characterId: true,
        lastMessageAt: true,
        character: { select: { id: true, name: true, avatarUrl: true, slug: true } },
      },
    });

    const now = Date.now();
    const notifications: {
      characterId: string;
      characterName: string;
      avatarUrl: string | null;
      message: string;
      diffH: number;
      expiresAt: string;
    }[] = [];

    for (const rel of relationships) {
      if (!rel.lastMessageAt) continue;
      const diffH = Math.floor((now - new Date(rel.lastMessageAt).getTime()) / 3600000);
      // 24h以上48h未満 or 48h以上72h未満 or 72h以上96h未満 のキャラのみ対象
      // (96h超は「ほぼ離脱」なので送らない — しつこくしない)
      if (diffH < 24 || diffH >= 96) continue;

      notifications.push({
        characterId: rel.character.id,
        characterName: rel.character.name,
        avatarUrl: rel.character.avatarUrl,
        message: getCallMessage(rel.character.slug ?? 'default', diffH),
        diffH,
        expiresAt: new Date(now + 24 * 3600 * 1000).toISOString(),
      });
    }

    // 最大3件まで（圧迫しない）
    return NextResponse.json(notifications.slice(0, 3));
  } catch (error) {
    console.error('[character-messages] error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
