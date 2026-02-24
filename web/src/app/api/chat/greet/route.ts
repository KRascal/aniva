import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { voiceEngine } from '@/lib/voice-engine';
import { audioStorage } from '@/lib/audio-storage';
import { auth } from '@/lib/auth';

// ルフィのデフォルトElevenLabs voice ID (Adam voice)
const DEFAULT_VOICE_MODEL_ID = 'pNInz6obpgDQGcFmaJgB';

// ハードコード挨拶（確実な体験のため LLM 呼び出しなし）
const LUFFY_GREETING = `おう！おれはモンキー・D・ルフィ！海賊王になる男だ！
お前、名前は？おれのこと知ってんのか？ししし！
なんかお前おもしれぇ気がする！よろしくな！`;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（IDOR修正: userIdはセッションから取得）
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await req.json();

    if (!characterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Relationship 取得
    let relationship = await prisma.relationship.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });

    // 2. totalMessages > 0 なら既に挨拶済み
    if (relationship && relationship.totalMessages > 0) {
      return NextResponse.json({ alreadyGreeted: true });
    }

    // 3. Relationship 作成（なければ）
    if (!relationship) {
      relationship = await prisma.relationship.create({
        data: { userId, characterId },
      });
    }

    // 4. Conversation 作成
    let conversation = await prisma.conversation.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { relationshipId: relationship.id },
      });
    }

    // 5. キャラクターメッセージ保存
    const charMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: LUFFY_GREETING,
        metadata: {
          emotion: 'happy',
          shouldGenerateVoice: true,
        },
      },
    });

    // 6. totalMessages を +1 更新（重複防止）
    await prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        totalMessages: 1,
        firstMessageAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    // 7. 会話の updatedAt 更新
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // 8. 音声生成（利用可能な場合のみ）
    let audioUrl: string | null = null;
    if (voiceEngine.isAvailable()) {
      try {
        const character = await prisma.character.findUnique({
          where: { id: characterId },
          select: { voiceModelId: true },
        });

        const voiceModelId =
          character?.voiceModelId && character.voiceModelId.trim() !== ''
            ? character.voiceModelId
            : DEFAULT_VOICE_MODEL_ID;

        const { audioBuffer } = await voiceEngine.generateVoice({
          text: LUFFY_GREETING,
          voiceModelId,
          emotion: 'happy',
        });

        audioUrl = await audioStorage.save(charMsg.id, audioBuffer);

        // DB の audioUrl 更新
        await prisma.message.update({
          where: { id: charMsg.id },
          data: { audioUrl },
        });
      } catch (voiceError) {
        // 音声生成失敗はサイレント（チャット体験は続行）
        console.error('Voice generation failed in greet:', voiceError);
      }
    }

    return NextResponse.json({
      message: {
        id: charMsg.id,
        role: charMsg.role,
        content: charMsg.content,
        createdAt: charMsg.createdAt,
        audioUrl: audioUrl ?? undefined,
      },
      audioUrl,
      alreadyGreeted: false,
    });
  } catch (error) {
    console.error('Greet error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
