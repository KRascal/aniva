import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId: rawCharacterId } = await params;
    const characterId = await resolveCharacterId(rawCharacterId) ?? rawCharacterId;

    // Get character name
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true },
    });

    // Find conversation
    const conversation = await prisma.conversation.findFirst({
      where: { relationship: { userId, characterId } },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json({ images: [], characterName: character?.name ?? '' });
    }

    // 既存: Message.imageUrl ベースの取得
    const messagesWithImages = await prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        imageUrl: { not: null },
      },
      select: {
        id: true,
        imageUrl: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // 新規: ChatMedia テーブルからも取得
    const chatMediaRecords = await prisma.chatMedia.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // ChatMedia に対応するメッセージIDを収集（重複排除用）
    const chatMediaMessageIds = new Set(
      chatMediaRecords.filter((m) => m.messageId).map((m) => m.messageId as string)
    );

    // messageUrl ベース（ChatMediaに未登録のものだけ）
    const legacyImages = messagesWithImages
      .filter((m) => m.imageUrl && !chatMediaMessageIds.has(m.id))
      .map((m) => ({
        id: m.id,
        imageUrl: m.imageUrl!,
        thumbnailUrl: null as string | null,
        fileSizeBytes: 0,
        width: null as number | null,
        height: null as number | null,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
        source: 'legacy' as const,
      }));

    // ChatMedia ベース
    const mediaImages = chatMediaRecords.map((m) => ({
      id: m.id,
      imageUrl: m.originalUrl,
      thumbnailUrl: m.thumbnailUrl,
      fileSizeBytes: m.fileSizeBytes,
      width: m.width,
      height: m.height,
      role: m.uploadedBy === 'character' ? 'CHARACTER' : 'USER',
      createdAt: m.createdAt.toISOString(),
      source: 'chatmedia' as const,
    }));

    // マージして日付順にソート（新しい順）
    const allImages = [...legacyImages, ...mediaImages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      images: allImages,
      characterName: character?.name ?? '',
    });
  } catch (error) {
    logger.error('[album API] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
