/**
 * voice-stream.ts — ElevenLabs ストリーミング音声生成
 * 
 * テキストが生成され次第、音声をストリーミングで再生開始する。
 * 通常のTTSより体感レイテンシが50-70%削減される。
 * 
 * API: POST /v1/text-to-speech/{voice_id}/stream
 */

export interface VoiceStreamOptions {
  voiceModelId: string;
  text: string;
  emotion?: string;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onError?: (err: Error) => void;
}

type AudioParamMap = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

// 感情→音声パラメータマッピング
const EMOTION_VOICE_PARAMS: Record<string, Partial<AudioParamMap>> = {
  happy: { stability: 0.4, similarity_boost: 0.85, style: 0.7 },
  excited: { stability: 0.3, similarity_boost: 0.9, style: 0.9 },
  sad: { stability: 0.8, similarity_boost: 0.7, style: 0.3 },
  angry: { stability: 0.3, similarity_boost: 0.8, style: 0.8 },
  embarrassed: { stability: 0.6, similarity_boost: 0.8, style: 0.5 },
  whisper: { stability: 0.9, similarity_boost: 0.7, style: 0.2 },
  love: { stability: 0.6, similarity_boost: 0.85, style: 0.6 },
  neutral: { stability: 0.5, similarity_boost: 0.8, style: 0.5 },
};

/**
 * クライアント側: ストリーミングで音声を再生
 * APIキーはサーバー経由で渡す（直接ElevenLabsを叩かない）
 */
export async function playVoiceStream(
  apiUrl: string, // /api/voice/stream
  options: VoiceStreamOptions,
): Promise<void> {
  const { voiceModelId, text, emotion = 'neutral', onAudioStart, onAudioEnd, onError } = options;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceModelId, text, emotion }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Voice stream error: ${response.status}`);
    }

    // MediaSource APIでストリーミング再生
    const audioContext = new AudioContext();
    const mediaSource = new MediaSource();
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(mediaSource);

    onAudioStart?.();

    mediaSource.addEventListener('sourceopen', async () => {
      const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
      const reader = response.body!.getReader();

      const appendNext = async () => {
        const { done, value } = await reader.read();
        if (done) {
          if (!sourceBuffer.updating) {
            mediaSource.endOfStream();
          }
          return;
        }
        if (!sourceBuffer.updating) {
          sourceBuffer.appendBuffer(value);
        }
        sourceBuffer.addEventListener('updateend', appendNext, { once: true });
      };

      await appendNext();
    });

    await audioElement.play();
    audioContext.close();
    
    await new Promise<void>((resolve) => {
      audioElement.addEventListener('ended', () => {
        URL.revokeObjectURL(audioElement.src);
        onAudioEnd?.();
        resolve();
      });
    });
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
