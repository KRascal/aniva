/**
 * Procedural BGM Generator
 * MP3ファイルが無い場合のフォールバック
 * Web Audio APIで穏やかなアンビエント音楽を生成
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ─── 穏やかなパッド音 ────────────────────────────────────────
function createPad(frequency: number, duration: number, volume = 0.04): { node: GainNode; stop: () => void } {
  const c = getCtx();
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  
  osc1.type = 'sine';
  osc1.frequency.value = frequency;
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 1.005; // slight detune for warmth
  
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + 2);
  gain.gain.linearRampToValueAtTime(volume * 0.8, c.currentTime + duration - 2);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + duration);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  
  osc1.start(c.currentTime);
  osc2.start(c.currentTime);
  osc1.stop(c.currentTime + duration);
  osc2.stop(c.currentTime + duration);
  
  return {
    node: gain,
    stop: () => {
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.5);
      setTimeout(() => { osc1.disconnect(); osc2.disconnect(); }, 600);
    },
  };
}

// ─── BGMタイプ別のコード進行 ──────────────────────────────────
const PROGRESSIONS = {
  daily: [
    [261.63, 329.63, 392.00], // C major
    [349.23, 440.00, 523.25], // F major
    [293.66, 369.99, 440.00], // Dm
    [392.00, 493.88, 587.33], // G major
  ],
  emotion: [
    [261.63, 311.13, 392.00], // Cm
    [349.23, 415.30, 523.25], // Fm
    [207.65, 261.63, 311.13], // Ab
    [233.08, 293.66, 349.23], // Bb
  ],
  tension: [
    [246.94, 293.66, 369.99], // Bm
    [220.00, 277.18, 329.63], // Am
    [196.00, 246.94, 293.66], // G
    [220.00, 261.63, 329.63], // Am
  ],
};

export interface ProceduralBGM {
  stop: () => void;
}

export function startProceduralBGM(type: 'daily' | 'emotion' | 'tension' = 'daily'): ProceduralBGM {
  const c = getCtx();
  const masterGain = c.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(c.destination);
  
  const progression = PROGRESSIONS[type] || PROGRESSIONS.daily;
  let chordIndex = 0;
  let stopped = false;
  const activePads: ReturnType<typeof createPad>[] = [];
  
  function playNextChord() {
    if (stopped) return;
    
    const chord = progression[chordIndex % progression.length];
    const duration = type === 'tension' ? 3 : 5;
    
    chord.forEach((freq) => {
      const pad = createPad(freq, duration, type === 'emotion' ? 0.05 : 0.03);
      pad.node.connect(masterGain);
      activePads.push(pad);
    });
    
    // 低音ベース
    const bass = createPad(chord[0] / 2, duration, 0.02);
    bass.node.connect(masterGain);
    activePads.push(bass);
    
    chordIndex++;
    setTimeout(playNextChord, duration * 1000 * 0.9); // slight overlap
  }
  
  playNextChord();
  
  return {
    stop: () => {
      stopped = true;
      masterGain.gain.linearRampToValueAtTime(0, c.currentTime + 1);
      activePads.forEach((p) => p.stop());
      setTimeout(() => masterGain.disconnect(), 1200);
    },
  };
}
