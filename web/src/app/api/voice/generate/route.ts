import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { voiceEngine } from '@/lib/voice-engine';
import { audioStorage } from '@/lib/audio-storage';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limit: 5req/min per user
    const rl = checkRateLimit(`voice:${userId}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json();
    const { messageId, text, characterId, emotion } = body as {
      messageId: string;
      text: string;
      characterId: string;
      emotion?: string;
    };

    if (!messageId || !text || !characterId) {
      return NextResponse.json(
        { error: 'messageId, text, characterId are required' },
        { status: 400 }
      );
    }

    // パストラバーサル対策: messageId をサニタイズ
    const safeMessageId = path.basename(messageId).replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!safeMessageId) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
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

    // voiceModelId未設定の場合は404を返す（デフォルトVoiceへのフォールバックなし）
    if (!character?.voiceModelId || character.voiceModelId.trim() === '') {
      return NextResponse.json({ error: 'Voice not available for this character' }, { status: 404 });
    }

    const voiceModelId = character.voiceModelId;

    // 音声生成（失敗時は null が返る — graceful fallback）
    const voiceResult = await voiceEngine.generateVoice({
      text,
      voiceModelId,
      emotion,
    });

    if (!voiceResult) {
      return NextResponse.json({ audioUrl: null, reason: 'voice_unavailable' });
    }

    const { audioBuffer } = voiceResult;

    // ファイル保存
    const audioUrl = await audioStorage.save(safeMessageId, audioBuffer);

    // DBのMessageのaudioUrlを更新
    await prisma.message.update({
      where: { id: messageId },
      data: { audioUrl },
    });

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Voice generation error:', error);
    // 内部エラー詳細はクライアントに返さない
    return NextResponse.json(
      { audioUrl: null, reason: 'voice_error' },
      { status: 500 }
    );
  }
}
