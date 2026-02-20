import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { voiceEngine } from '@/lib/voice-engine';
import { audioStorage } from '@/lib/audio-storage';

// ルフィのデフォルトElevenLabs voice ID (Adam voice)
const DEFAULT_VOICE_MODEL_ID = 'pNInz6obpgDQGcFmaJgB';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, text, characterId } = body as {
      messageId: string;
      text: string;
      characterId: string;
    };

    if (!messageId || !text || !characterId) {
      return NextResponse.json(
        { error: 'messageId, text, characterId are required' },
        { status: 400 }
      );
    }

    // VoiceEngineが利用不可（APIキーなし）の場合
    if (!voiceEngine.isAvailable()) {
      return NextResponse.json({ audioUrl: null, reason: 'voice_unavailable' });
    }

    // characterIdからCharacterを取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { voiceModelId: true },
    });

    const voiceModelId =
      character?.voiceModelId && character.voiceModelId.trim() !== ''
        ? character.voiceModelId
        : DEFAULT_VOICE_MODEL_ID;

    // 音声生成
    const { audioBuffer } = await voiceEngine.generateVoice({
      text,
      voiceModelId,
    });

    // ファイル保存
    const audioUrl = await audioStorage.save(messageId, audioBuffer);

    // DBのMessageのaudioUrlを更新
    await prisma.message.update({
      where: { id: messageId },
      data: { audioUrl },
    });

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Voice generation error:', error);
    return NextResponse.json(
      { audioUrl: null, reason: 'error', error: String(error) },
      { status: 500 }
    );
  }
}
