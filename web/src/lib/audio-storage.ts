import fs from 'fs';
import path from 'path';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Ensure the audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

export class AudioStorage {
  /**
   * 音声ファイルを保存し、URLパスを返す
   */
  async save(messageId: string, buffer: Buffer): Promise<string> {
    const filename = `${messageId}.mp3`;
    const filePath = path.join(AUDIO_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/audio/${filename}`;
  }

  /**
   * 音声ファイルを削除
   */
  async delete(messageId: string): Promise<void> {
    const filePath = path.join(AUDIO_DIR, `${messageId}.mp3`);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}

export const audioStorage = new AudioStorage();
