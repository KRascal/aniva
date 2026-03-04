/**
 * Sound Effects Engine
 * ブラウザ内で Web Audio API を使って効果音を生成
 * 外部音声ファイル不要 — 全てプログラム生成
 */

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
    SOUNDS[sound]();
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
