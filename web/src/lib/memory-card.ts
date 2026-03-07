/**
 * 思い出カード自動生成システム
 * 会話マイルストーン達成時に「二人だけの思い出カード」を自動生成
 * 
 * 200点の世界: 1:1の記憶が資産になる。コレクション欲を刺激。
 */

import { prisma } from './prisma';

// マイルストーン定義
const MILESTONES = [
  { threshold: 10,   title: '出会いの記録',       emoji: '🌱', color: 'from-green-500 to-emerald-600' },
  { threshold: 50,   title: '仲良しの証',         emoji: '💫', color: 'from-blue-500 to-purple-600' },
  { threshold: 100,  title: '100通の絆',           emoji: '💎', color: 'from-purple-500 to-pink-600' },
  { threshold: 250,  title: '特別な存在',          emoji: '🌟', color: 'from-amber-500 to-orange-600' },
  { threshold: 500,  title: '500通の物語',         emoji: '👑', color: 'from-yellow-400 to-amber-600' },
  { threshold: 1000, title: '千の言葉を超えて',    emoji: '🏆', color: 'from-rose-500 to-red-600' },
  { threshold: 2500, title: 'かけがえのない二人',  emoji: '💖', color: 'from-pink-400 to-rose-600' },
  { threshold: 5000, title: '永遠の絆',            emoji: '✨', color: 'from-indigo-400 to-violet-600' },
];

/**
 * メッセージ数が特定のマイルストーンに達したかチェックし、
 * 達していればMemoryCardを生成する
 */
export async function checkAndCreateMemoryCard(
  userId: string,
  characterId: string,
  totalMessages: number,
): Promise<{ created: boolean; milestone?: typeof MILESTONES[0] }> {
  // 該当するマイルストーンを逆順でチェック（最大のものを取得）
  const milestone = MILESTONES.find(m => totalMessages === m.threshold);
  if (!milestone) return { created: false };

  // 既に同じマイルストーンのカードがあるか確認（titleで重複チェック）
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: 'MILESTONE',
      title: `${milestone.emoji} ${milestone.title}`,
    },
  });

  if (existing) return { created: false };

  // キャラ情報取得
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, slug: true },
  });

  // 通知として保存（思い出カードの通知）
  await prisma.notification.create({
    data: {
      userId,
      type: 'MILESTONE',
      characterId,
      title: `${milestone.emoji} ${milestone.title}`,
      body: `${character?.name ?? 'キャラクター'}との会話が${milestone.threshold}通に到達しました`,
    },
  });

  return { created: true, milestone };
}

/**
 * ユーザーの全思い出カードを取得
 */
export async function getMemoryCards(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      type: 'MILESTONE',
    },
    orderBy: { createdAt: 'desc' },
  });

  return notifications.map(n => ({
    id: n.id,
    title: n.title,
    body: n.body,
    characterId: n.characterId,
    createdAt: n.createdAt,
  }));
}

export { MILESTONES };
