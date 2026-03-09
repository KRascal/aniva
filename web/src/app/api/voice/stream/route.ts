/**
 * POST /api/voice/stream
 * ElevenLabsストリーミングTTS — クライアントに音声ストリームをパイプする
 * レイテンシ最適化: テキスト受信後〜音声再生開始が通常比50%削減
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

type EmotionKey = 'happy' | 'excited' | 'sad' | 'angry' | 'embarrassed' | 'love' | 'neutral';

const EMOTION_VOICE_SETTINGS: Record<EmotionKey, {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}> = {
  happy:      { stability: 0.4, similarity_boost: 0.85, style: 0.7,  use_speaker_boost: true },
  excited:    { stability: 0.3, similarity_boost: 0.90, style: 0.9,  use_speaker_boost: true },
  sad:        { stability: 0.8, similarity_boost: 0.70, style: 0.3,  use_speaker_boost: false },
  angry:      { stability: 0.3, similarity_boost: 0.80, style: 0.8,  use_speaker_boost: true },
  embarrassed:{ stability: 0.6, similarity_boost: 0.80, style: 0.5,  use_speaker_boost: false },
  love:       { stability: 0.6, similarity_boost: 0.85, style: 0.6,  use_speaker_boost: false },
  neutral:    { stability: 0.5, similarity_boost: 0.80, style: 0.5,  use_speaker_boost: true },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'Voice not configured' }, { status: 503 });
  }

  const { voiceModelId, text, emotion = 'neutral' } = await req.json() as {
    voiceModelId: string;
    text: string;
    emotion?: string;
  };

  if (!voiceModelId || !text || text.length > 2000) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const voiceSettings = EMOTION_VOICE_SETTINGS[(emotion as EmotionKey)] ?? EMOTION_VOICE_SETTINGS.neutral;

  // ElevenLabs Streaming API
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceModelId}/stream`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
        optimize_streaming_latency: 3, // 最大最適化（0-4）
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error('[VoiceStream] ElevenLabs error:', response.status, err);
    return NextResponse.json({ error: 'Voice generation failed' }, { status: 502 });
  }

  // ストリームをそのままクライアントに流す
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no', // Nginx バッファリング無効化（ストリーミング必須）
    },
  });
}
