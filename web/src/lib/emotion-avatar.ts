/**
 * emotion-avatar.ts — 感情連動アバター
 * チャットの感情に応じてキャラのアバター画像を切り替える
 * 
 * 画像パス: /characters/{slug}/emotions/{emotion}.webp
 * フォールバック: /characters/{slug}/avatar.webp
 */

// サポートする感情タイプ
export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'angry'
  | 'embarrassed'
  | 'surprised'
  | 'thinking'
  | 'love';

// 感情→アバターファイル名のマッピング
const EMOTION_FILE_MAP: Record<string, EmotionType> = {
  // character-engineのemotionから変換
  neutral: 'neutral',
  happy: 'happy',
  excited: 'excited',
  'fired-up': 'excited',
  motivated: 'excited',
  sad: 'sad',
  angry: 'angry',
  embarrassed: 'embarrassed',
  hungry: 'thinking',
  whisper: 'love',
  joy: 'happy',
  love: 'love',
  curiosity: 'thinking',
  pride: 'happy',
  nostalgia: 'sad',
  surprise: 'surprised',
  frustration: 'angry',
  caring: 'love',
  determination: 'excited',
  amusement: 'happy',
};

/**
 * 感情に対応するアバターURLを返す
 * 画像が存在しない場合はデフォルトアバターにフォールバック
 */
export function getEmotionAvatarUrl(
  slug: string,
  emotion: string,
  defaultAvatarUrl: string | null,
): string {
  const mappedEmotion = EMOTION_FILE_MAP[emotion] ?? 'neutral';
  const emotionPath = `/characters/${slug}/emotions/${mappedEmotion}.webp`;
  
  // クライアント側で画像の存在チェックが必要
  // ここではパスだけ返す（フロント側でonerror→フォールバック）
  return emotionPath;
}

/**
 * フロントエンド用: 感情アバターのフォールバック付きsrc
 * <img src={url} onError={(e) => e.target.src = fallback} />
 */
export function getEmotionAvatarProps(
  slug: string,
  emotion: string,
  defaultAvatarUrl: string | null,
): { src: string; fallback: string } {
  const src = getEmotionAvatarUrl(slug, emotion, defaultAvatarUrl);
  const fallback = defaultAvatarUrl || `/characters/${slug}/avatar.webp`;
  return { src, fallback };
}
