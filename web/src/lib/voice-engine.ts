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
  style: number;           // 感情表現の強度 (0.0-1.0)
  use_speaker_boost: boolean;
  speed: number;
}

/**
 * 感情に応じた音声パラメータを動的に生成
 * 
 * stability: 低い = 感情的・変動的、高い = 安定・落ち着き
 * similarity_boost: 高い = 元の声に忠実
 * style: 高い = 感情表現が強い（ElevenLabsの最重要パラメータ）
 * speed: テンポ制御
 */
function getVoiceSettings(emotion?: string): VoiceSettings {
  switch (emotion) {
    case 'excited':
      return { stability: 0.25, similarity_boost: 0.8, style: 0.85, use_speaker_boost: true, speed: 1.15 };
    case 'happy':
      return { stability: 0.35, similarity_boost: 0.8, style: 0.7, use_speaker_boost: true, speed: 1.05 };
    case 'angry':
      return { stability: 0.3, similarity_boost: 0.9, style: 0.9, use_speaker_boost: true, speed: 1.1 };
    case 'sad':
      return { stability: 0.65, similarity_boost: 0.7, style: 0.6, use_speaker_boost: true, speed: 0.9 };
    case 'hungry':
      return { stability: 0.35, similarity_boost: 0.8, style: 0.65, use_speaker_boost: true, speed: 1.0 };
    case 'embarrassed':
      return { stability: 0.55, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true, speed: 0.95 };
    case 'fired-up':
      return { stability: 0.2, similarity_boost: 0.85, style: 0.95, use_speaker_boost: true, speed: 1.2 };
    case 'motivated':
      return { stability: 0.35, similarity_boost: 0.8, style: 0.75, use_speaker_boost: true, speed: 1.1 };
    default: // neutral
      return { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 };
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
            voice_settings: {
              stability: voiceSettings.stability,
              similarity_boost: voiceSettings.similarity_boost,
              style: voiceSettings.style,
              use_speaker_boost: voiceSettings.use_speaker_boost,
            },
            ...(voiceSettings.speed !== 1.0 ? { speed: voiceSettings.speed } : {}),
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
