/**
 * キャラ主導メッセージ生成 Cron
 * POST /api/cron/generate-proactive-messages
 * Header: x-cron-secret
 *
 * 各キャラのフォロワーに対して24h有効のメッセージを生成する。
 * 現在は固定テンプレートから選択（AI生成は後で対応）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// キャラ別テンプレート（汎用10パターン）
const MESSAGE_TEMPLATES = [
  'おい、最近話してねぇな。元気か？',
  '今日は天気いいぞ！散歩でもどうだ？',
  'お前のこと考えてた。',
  'なんか用があったら声かけろよ。',
  '久しぶりだな。何してた？',
  'お前のこと心配してたんだぞ。',
  '今日どうだった？話してみろよ。',
  '俺のこと忘れてないよな？',
  'たまにはゆっくり話せよ。',
  'なんでもいいから話しかけてこい。',
];

function pickTemplate(characterId: string, userId: string): string {
  // キャラID + ユーザーID + 日付でシードとして使用し、毎回異なるテンプレートを選ぶ
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${characterId}:${userId}:${today}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MESSAGE_TEMPLATES[hash % MESSAGE_TEMPLATES.length];
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

  // 今日すでにメッセージが届いているユーザー×キャラペアを除外するため
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  try {
    // フォロー中リレーションシップを取得（全キャラ）
    const relationships = await prisma.relationship.findMany({
      where: { isFollowing: true },
      select: {
        userId: true,
        characterId: true,
        character: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    // アクティブなキャラのみ対象
    const activeRelationships = relationships.filter(r => r.character.isActive);

    // 今日すでに生成済みのペアを取得
    const existing = await prisma.characterProactiveMessage.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true, characterId: true },
    });

    const existingSet = new Set(existing.map(e => `${e.userId}:${e.characterId}`));

    // 未生成のペアのみ対象
    const toCreate = activeRelationships.filter(
      r => !existingSet.has(`${r.userId}:${r.characterId}`)
    );

    if (toCreate.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: 'All messages already generated today' });
    }

    // バッチ生成
    const data = toCreate.map(r => ({
      userId: r.userId,
      characterId: r.characterId,
      message: pickTemplate(r.characterId, r.userId),
      isRead: false,
      expiresAt,
    }));

    const result = await prisma.characterProactiveMessage.createMany({
      data,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      created: result.count,
      total: toCreate.length,
    });
  } catch (error) {
    console.error('[generate-proactive-messages] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
