// ElevenLabs APIを使ったボイス生成エンジン

interface VoiceGenerateOptions {
  text: string;
  voiceModelId: string; // ElevenLabs voice ID
  emotion?: string; // 'excited' | 'happy' | 'angry' | 'sad' | 'hungry' | 'neutral'
}

interface VoiceGenerateResult {
  audioBuffer: Buffer;
  durationMs: number;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

function getVoiceSettings(emotion?: string): VoiceSettings {
  switch (emotion) {
    case 'excited':
      return { stability: 0.3, similarity_boost: 0.8 };
    case 'angry':
      return { stability: 0.4, similarity_boost: 0.9 };
    case 'sad':
      return { stability: 0.7, similarity_boost: 0.6 };
    case 'happy':
      return { stability: 0.4, similarity_boost: 0.8 };
    default:
      return { stability: 0.5, similarity_boost: 0.75 };
  }
}

export class VoiceEngine {
  isAvailable(): boolean {
    return !!process.env.ELEVENLABS_API_KEY;
  }

  /**
   * 音声を生成する。
   * ElevenLabs APIが利用不可（401/403/429など）の場合は null を返す（graceful fallback）。
   * ネットワーク障害等の一時エラーも null を返してフロントへ伝播させない。
   */
  async generateVoice(options: VoiceGenerateOptions): Promise<VoiceGenerateResult | null> {
    const { text, voiceModelId, emotion } = options;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.warn('[VoiceEngine] ELEVENLABS_API_KEY is not set — skipping voice generation');
      return null;
    }

    const voiceSettings = getVoiceSettings(emotion);
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceModelId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => '(no body)');
        // 401: 認証エラー（APIキー無効）, 403: 権限なし, 429: レート制限
        // これらはリトライしても解決しないので null を返す（graceful fallback）
        if (response.status === 401 || response.status === 403) {
          console.error(
            `[VoiceEngine] ElevenLabs auth error (${response.status}) — voice disabled. Check ELEVENLABS_API_KEY.`,
          );
          return null;
        }
        if (response.status === 429) {
          console.warn('[VoiceEngine] ElevenLabs rate limit exceeded — skipping voice generation');
          return null;
        }
        // その他のエラーもクライアントには伝播させず null を返す
        console.error(`[VoiceEngine] ElevenLabs API error ${response.status}: ${errorText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const durationMs = Date.now() - startTime;

      return { audioBuffer, durationMs };
    } catch (err) {
      // ネットワーク障害・タイムアウト等
      console.error('[VoiceEngine] Failed to call ElevenLabs API:', err);
      return null;
    }
  }
}

export const voiceEngine = new VoiceEngine();
