/**
 * character-themes.ts
 * キャラごとのUIテーマ定義（背景グラデーション・アクセントカラー）
 */

export interface CharacterTheme {
  /** CSS gradient string for page background */
  bgGradient: string;
  /** Hex accent color */
  accentColor: string;
  /** Glow color for memory badge (rgba) */
  memoryGlow: string;
  /** Short label for the theme */
  label: string;
}

const THEMES: Record<string, CharacterTheme> = {
  luffy: {
    bgGradient: 'linear-gradient(160deg, #1a0a00 0%, #3d1000 40%, #1a0a00 100%)',
    accentColor: '#ef4444',
    memoryGlow: 'rgba(239,68,68,0.5)',
    label: '海賊旗',
  },
  zoro: {
    bgGradient: 'linear-gradient(160deg, #071a0a 0%, #0f3318 40%, #071a0a 100%)',
    accentColor: '#22c55e',
    memoryGlow: 'rgba(34,197,94,0.5)',
    label: '三刀流',
  },
  nami: {
    bgGradient: 'linear-gradient(160deg, #1a0d00 0%, #3d2200 40%, #1a0d00 100%)',
    accentColor: '#f97316',
    memoryGlow: 'rgba(249,115,22,0.5)',
    label: 'みかん畑',
  },
  sanji: {
    bgGradient: 'linear-gradient(160deg, #00091a 0%, #002248 40%, #00091a 100%)',
    accentColor: '#eab308',
    memoryGlow: 'rgba(234,179,8,0.5)',
    label: '紳士の厨房',
  },
  chopper: {
    bgGradient: 'linear-gradient(160deg, #1a001a 0%, #3d0038 40%, #001a1a 100%)',
    accentColor: '#ec4899',
    memoryGlow: 'rgba(236,72,153,0.5)',
    label: 'かわいい医者',
  },
  robin: {
    bgGradient: 'linear-gradient(160deg, #0a0014 0%, #1e0033 40%, #0a0014 100%)',
    accentColor: '#a855f7',
    memoryGlow: 'rgba(168,85,247,0.5)',
    label: 'ミステリアス',
  },
  ace: {
    bgGradient: 'linear-gradient(160deg, #1a0500 0%, #4a1000 40%, #1a0500 100%)',
    accentColor: '#f97316',
    memoryGlow: 'rgba(249,115,22,0.6)',
    label: '火拳',
  },
  usopp: {
    bgGradient: 'linear-gradient(160deg, #0f0d00 0%, #2d2500 40%, #0f0d00 100%)',
    accentColor: '#ca8a04',
    memoryGlow: 'rgba(202,138,4,0.5)',
    label: '勇敢な海の戦士',
  },
  brook: {
    bgGradient: 'linear-gradient(160deg, #050005 0%, #0d000d 40%, #050005 100%)',
    accentColor: '#c4b5fd',
    memoryGlow: 'rgba(196,181,253,0.5)',
    label: 'ソウルキング',
  },
  franky: {
    bgGradient: 'linear-gradient(160deg, #001a1a 0%, #003366 40%, #001a1a 100%)',
    accentColor: '#38bdf8',
    memoryGlow: 'rgba(56,189,248,0.5)',
    label: 'SUPER サイボーグ',
  },
};

/** デフォルトテーマ（未知のキャラ向け） */
const DEFAULT_THEME: CharacterTheme = {
  bgGradient: 'linear-gradient(160deg, #0a0a0f 0%, #111827 100%)',
  accentColor: '#a855f7',
  memoryGlow: 'rgba(168,85,247,0.5)',
  label: 'ワンピース',
};

/**
 * キャラスラッグからテーマを返す。
 * 見つからない場合はデフォルトテーマ。
 */
export function getCharacterTheme(slug: string): CharacterTheme {
  return THEMES[slug] ?? DEFAULT_THEME;
}

export { THEMES as CHARACTER_THEMES };
