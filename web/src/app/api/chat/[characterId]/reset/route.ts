/**
 * POST /api/chat/:characterId/reset
 * AIの会話文脈をリセットする（メッセージ履歴は残す）
 * 新しいConversationを作成し、古いものは保持
 */
import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const userId = await getVerifiedUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { characterId: rawCharacterId } = await params;
  const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

  // リレーションシップ取得
  const rel = await prisma.relationship.findFirst({
    where: { userId, characterId },
  });
  if (!rel) return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });

  // 現在アクティブな会話を終了マーク
  await prisma.conversation.updateMany({
    where: { relationshipId: rel.id, isActive: true },
    data: { isActive: false },
  });

  // 新しい会話を作成
  const newConversation = await prisma.conversation.create({
    data: {
      relationshipId: rel.id,
      isActive: true,
    },
  });

  return NextResponse.json({
    success: true,
    newConversationId: newConversation.id,
    message: '会話がリセットされました',
  });
}
