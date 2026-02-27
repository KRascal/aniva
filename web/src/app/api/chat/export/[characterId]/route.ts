import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
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

    const { characterId } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get('format') ?? 'csv';

    // Relationship → Character 取得
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
      include: { character: { select: { name: true } } },
    });

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    const characterName = relationship.character.name;

    // 全Conversations → 全Messages 取得（limit なし）
    const conversations = await prisma.conversation.findMany({
      where: { relationshipId: relationship.id },
      include: {
        messages: {
          where: { role: { in: ['USER', 'CHARACTER'] } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 全メッセージをフラット化
    const allMessages = conversations.flatMap((conv) => conv.messages);

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const jsonData = allMessages.map((msg) => ({
        timestamp: msg.createdAt.toISOString(),
        role: msg.role === 'USER' ? 'あなた' : characterName,
        content: msg.content,
      }));

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename*=UTF-8''chat-${encodeURIComponent(characterName)}-${dateStr}.json`,
        },
      });
    }

    // CSV形式（デフォルト）
    const escapeCsvField = (field: string): string => {
      // ダブルクォートを含む場合はエスケープ、カンマ・改行・クォートを含む場合は引用符で囲む
      if (field.includes('"') || field.includes(',') || field.includes('\n') || field.includes('\r')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvLines: string[] = ['timestamp,role,content'];
    for (const msg of allMessages) {
      const timestamp = msg.createdAt.toISOString();
      const role = msg.role === 'USER' ? 'あなた' : characterName;
      const content = msg.content;
      csvLines.push(`${escapeCsvField(timestamp)},${escapeCsvField(role)},${escapeCsvField(content)}`);
    }

    // BOM付きUTF-8（Excelで日本語文字化け防止）
    const bom = '\uFEFF';
    const csvContent = bom + csvLines.join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''chat-${encodeURIComponent(characterName)}-${dateStr}.csv`,
      },
    });
  } catch (error) {
    console.error('Chat export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
