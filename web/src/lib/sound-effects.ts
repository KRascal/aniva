/**
 * Sound Effects Engine
 * ハイブリッド方式: MP3ファイルがあればプロ品質SE、なければWeb Audio APIフォールバック
 * MP3ファイル配置先: public/sounds/{sound-type}.mp3
 */

// ─── MP3プリロード+再生レイヤー ──────────────────────────────
const MP3_CACHE: Map<string, HTMLAudioElement> = new Map();
const MP3_FAILED: Set<string> = new Set(); // 読み込み失敗したパスは再試行しない

function tryPlayMP3(soundType: string): boolean {
  if (typeof window === 'undefined') return false;
  const path = `/sounds/${soundType.replace(/_/g, '-')}.mp3`;
  if (MP3_FAILED.has(path)) return false;

  let audio = MP3_CACHE.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.volume = 0.4;
    audio.preload = 'auto';
    audio.addEventListener('error', () => {
      MP3_FAILED.add(path); // このパスは今後スキップ
    }, { once: true });
    MP3_CACHE.set(path, audio);
  }

  // 既に再生中なら複製して並行再生
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.volume = audio.volume;
  clone.play().catch(() => {
    MP3_FAILED.add(path);
  });
  return true;
}
// ─────────────────────────────────────────────────────────────

type SoundType =
  | 'message_send'
  | 'message_receive'
  | 'coin_spend'
  | 'coin_earn'
  | 'level_up'
  | 'gacha_pull'
  | 'gacha_reveal_n'
  | 'gacha_reveal_r'
  | 'gacha_reveal_sr'
  | 'gacha_reveal_ssr'
  | 'gacha_reveal_ur'
  | 'login_bonus'
  | 'follow'
  | 'button_tap'
  | 'error'
  | 'success';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, detune = 0) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChord(freqs: number[], duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  freqs.forEach(f => playTone(f, duration, type, volume));
}

const SOUNDS: Record<SoundType, () => void> = {
  // チャット送信: 軽いポップ音
  message_send: () => {
    playTone(880, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(1100, 0.06, 'sine', 0.08), 40);
  },

  // チャット受信: 柔らかいチャイム
  message_receive: () => {
    playTone(660, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.08), 80);
  },

  // コイン消費: 短いコイン音
  coin_spend: () => {
    playTone(1200, 0.06, 'triangle', 0.1);
    setTimeout(() => playTone(900, 0.08, 'triangle', 0.08), 50);
  },

  // コイン獲得: 上昇チャイム
  coin_earn: () => {
    playTone(523, 0.1, 'triangle', 0.12);
    setTimeout(() => playTone(659, 0.1, 'triangle', 0.1), 80);
    setTimeout(() => playTone(784, 0.15, 'triangle', 0.12), 160);
  },

  // レベルアップ: ファンファーレ
  level_up: () => {
    playChord([523, 659, 784], 0.2, 'triangle', 0.06);
    setTimeout(() => playChord([587, 740, 880], 0.2, 'triangle', 0.06), 200);
    setTimeout(() => playChord([659, 830, 988], 0.3, 'triangle', 0.08), 400);
    setTimeout(() => playChord([784, 988, 1175], 0.5, 'triangle', 0.1), 600);
  },

  // ガチャ引く: ドラム音
  gacha_pull: () => {
    playTone(200, 0.15, 'square', 0.08);
    setTimeout(() => playTone(300, 0.1, 'square', 0.06), 100);
    setTimeout(() => playTone(500, 0.2, 'square', 0.1), 200);
  },

  // ガチャ結果: レアリティ別
  gacha_reveal_n: () => {
    playTone(440, 0.2, 'sine', 0.08);
  },
  gacha_reveal_r: () => {
    playTone(523, 0.15, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.1), 100);
  },
  gacha_reveal_sr: () => {
    playTone(523, 0.12, 'triangle', 0.1);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.1), 100);
    setTimeout(() => playTone(784, 0.2, 'triangle', 0.12), 200);
  },
  gacha_reveal_ssr: () => {
    playChord([523, 659, 784], 0.15, 'triangle', 0.06);
    setTimeout(() => playChord([659, 784, 988], 0.15, 'triangle', 0.08), 150);
    setTimeout(() => playChord([784, 988, 1175], 0.3, 'triangle', 0.1), 300);
    setTimeout(() => playTone(1319, 0.4, 'sine', 0.12), 500);
  },
  gacha_reveal_ur: () => {
    // 壮大なファンファーレ
    playChord([261, 329, 392], 0.2, 'triangle', 0.06);
    setTimeout(() => playChord([329, 415, 523], 0.2, 'triangle', 0.06), 200);
    setTimeout(() => playChord([392, 493, 587], 0.2, 'triangle', 0.08), 400);
    setTimeout(() => playChord([523, 659, 784], 0.3, 'triangle', 0.1), 600);
    setTimeout(() => playChord([659, 830, 988], 0.3, 'triangle', 0.1), 850);
    setTimeout(() => playChord([784, 988, 1175, 1568], 0.6, 'sine', 0.12), 1100);
  },

  // ログインボーナス
  login_bonus: () => {
    playTone(523, 0.1, 'triangle', 0.1);
    setTimeout(() => playTone(659, 0.1, 'triangle', 0.1), 120);
    setTimeout(() => playTone(784, 0.1, 'triangle', 0.1), 240);
    setTimeout(() => playTone(1047, 0.3, 'triangle', 0.12), 360);
  },

  // フォロー
  follow: () => {
    playTone(659, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(880, 0.12, 'sine', 0.1), 60);
  },

  // ボタンタップ
  button_tap: () => {
    playTone(600, 0.04, 'sine', 0.06);
  },

  // エラー
  error: () => {
    playTone(200, 0.15, 'square', 0.08);
    setTimeout(() => playTone(150, 0.2, 'square', 0.06), 150);
  },

  // 成功
  success: () => {
    playTone(523, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 100);
  },
};

// ミュート状態管理
const MUTE_KEY = 'aniva_sound_muted';

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
}

export function toggleSoundMute(): boolean {
  const newState = !isSoundMuted();
  setSoundMuted(newState);
  return newState;
}

/**
 * 効果音を再生
 * ミュート中やSSR環境では無音
 */
export function playSound(sound: SoundType): void {
  if (typeof window === 'undefined') return;
  if (isSoundMuted()) return;
  try {
    // MP3ファイルがあればプロ品質SEを優先再生
    if (!tryPlayMP3(sound)) {
      // フォールバック: Web Audio API合成音
      SOUNDS[sound]();
    }
  } catch {
    // AudioContext not available
  }
}

/**
 * ガチャ結果のレアリティに応じた効果音を再生
 */
export function playGachaRevealSound(rarity: string): void {
  const map: Record<string, SoundType> = {
    N: 'gacha_reveal_n',
    R: 'gacha_reveal_r',
    SR: 'gacha_reveal_sr',
    SSR: 'gacha_reveal_ssr',
    UR: 'gacha_reveal_ur',
  };
  playSound(map[rarity] ?? 'gacha_reveal_n');
}

// ─── ハプティクス（振動フィードバック） ──────────────────────────────
function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** ガチャ演出: レアリティ別振動パターン */
export function vibrateGacha(rarity: string): void {
  switch (rarity) {
    case 'R':   vibrate([50]); break;
    case 'SR':  vibrate([80, 50, 80]); break;
    case 'SSR': vibrate([100, 50, 100, 50, 200]); break;
    case 'UR':  vibrate([200, 100, 200, 100, 300, 100, 500]); break;
    default:    break; // N = 振動なし
  }
}

/** レベルアップ時の振動 */
export function vibrateLevelUp(): void {
  vibrate([100, 50, 100, 50, 150]);
}

/** リアクション時の軽い振動 */
export function vibrateReaction(): void {
  vibrate([30]);
}

/** ストーリー報酬時の振動 */
export function vibrateReward(): void {
  vibrate([80, 40, 80]);
}

/** チャット感情ハプティクス — キャラの感情に応じた振動パターン */
export function vibrateEmotion(emotion: string): void {
  switch (emotion) {
    // 強い感情 → 目立つ振動
    case 'excited':   vibrate([40, 30, 40, 30, 60]); break; // ワクワクの連打
    case 'love':      vibrate([80, 60, 120]); break;        // ドキッ…ドキドキ
    case 'angry':     vibrate([150]); break;                 // ドンッ
    case 'surprised': vibrate([100, 80, 50]); break;         // ビクッ→余韻
    case 'sad':       vibrate([200]); break;                  // じわっと長い

    // 中程度の感情 → 軽い振動
    case 'happy':     vibrate([30, 20, 30]); break;
    case 'shy':       vibrate([20, 40, 20]); break;          // もじもじ
    case 'jealous':   vibrate([60, 30, 60]); break;
    case 'teasing':   vibrate([25, 15, 25, 15, 25]); break;  // にひひ
    case 'worried':   vibrate([40, 60]); break;

    // ささやか or なし
    case 'calm':
    case 'neutral':
    case 'thinking':
    default:
      break; // 平常時は振動なし
  }
}

/** メッセージ送信時の軽い触覚フィードバック */
export function vibrateSend(): void {
  vibrate([15]);
}

/** ストリーク達成時の振動 */
export function vibrateStreakMilestone(days: number): void {
  if (days >= 30) vibrate([100, 50, 100, 50, 200, 100, 300]); // 30日: 大きなお祝い
  else if (days >= 7) vibrate([80, 40, 80, 40, 120]);           // 7日: 中程度
  else vibrate([40, 30, 40]);                                    // それ以外: 軽い
}
