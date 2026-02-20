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

  async generateVoice(options: VoiceGenerateOptions): Promise<VoiceGenerateResult> {
    const { text, voiceModelId, emotion } = options;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not set');
    }

    const voiceSettings = getVoiceSettings(emotion);

    const startTime = Date.now();

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
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const durationMs = Date.now() - startTime;

    return { audioBuffer, durationMs };
  }
}

export const voiceEngine = new VoiceEngine();
