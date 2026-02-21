import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { characterEngine } from '@/lib/character-engine';

export async function POST(req: NextRequest) {
  try {
    const { userId, characterId, message } = await req.json();

    if (!userId || !characterId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Relationship取得 or 作成
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });

    if (!relationship) {
      relationship = await prisma.relationship.create({
        data: { userId, characterId },
      });
    }

    // 送信前のlevelを記憶
    const prevLevel = relationship?.level ?? 1;

    // 2. 会話取得 or 作成
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // 3. ユーザーメッセージ保存
    const userMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // 4. レート制限チェック（Free: 3msg/日）
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.plan === 'FREE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMsgCount = await prisma.message.count({
        where: {
          conversation: { relationship: { userId } },
          role: 'USER',
          createdAt: { gte: today },
        },
      });
      if (todayMsgCount > 3) {
        return NextResponse.json({
          error: 'Daily message limit reached',
          limit: 3,
          plan: 'FREE',
          upgradeUrl: '/pricing',
        }, { status: 429 });
      }
    }

    // 5. Character Engine で応答生成
    const response = await characterEngine.generateResponse(
      characterId,
      relationship.id,
      message,
    );

    // 6. キャラクター応答保存
    const charMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: response.text,
        metadata: {
          emotion: response.emotion,
          shouldGenerateImage: response.shouldGenerateImage,
          shouldGenerateVoice: response.shouldGenerateVoice,
        },
      },
    });

    // 7. 会話のupdatedAt更新
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 8. 更新後のrelationshipを再取得してleveledUpを判定
    const updatedRelationship = await prisma.relationship.findUnique({
      where: { id: relationship.id },
    });

    const leveledUp = (updatedRelationship?.level ?? 1) > prevLevel;
    const newLevel = updatedRelationship?.level ?? 1;

    return NextResponse.json({
      userMessage: userMsg,
      characterMessage: charMsg,
      emotion: response.emotion,
      relationship: {
        level: updatedRelationship?.level ?? 1,
        xp: updatedRelationship?.experiencePoints ?? 0,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
      },
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
