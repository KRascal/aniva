#!/usr/bin/env node
/**
 * ANIVA Sound Asset Generator
 * Raw PCM → WAV → MP3 (via ffmpeg)
 * 使用方法: node scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sounds');
const TMP_DIR = path.join(__dirname, '..', '.sound-tmp');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

// ─── WAV書き込みユーティリティ ────────────────────────────────────
function writeWav(filename, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * 2;
  const headerSize = 44;
  const buf = Buffer.alloc(headerSize + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(clamped * 32767), headerSize + i * 2);
  }

  fs.writeFileSync(filename, buf);
}

// ─── MP3変換 ─────────────────────────────────────────────────────
function wavToMp3(wavPath, mp3Path) {
  execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 -ar 44100 "${mp3Path}" 2>/dev/null`);
}

// ─── オーディオ合成ヘルパー ─────────────────────────────────────────
function makeSamples(durationSec) {
  return new Float32Array(Math.ceil(SAMPLE_RATE * durationSec));
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function envelope(t, total, attack, decay, sustain, release) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * (t - attack) / decay;
  if (t < total - release) return sustain;
  return sustain * (1 - (t - (total - release)) / release);
}

function addTone(samples, freq, startSec, durationSec, amplitude, attackSec = 0.01, decaySec = 0.05, sustainLevel = 0.6, releaseSec = 0.1) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durationSec * SAMPLE_RATE);
  for (let i = 0; i < len && start + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, durationSec, attackSec, decaySec, sustainLevel, releaseSec);
    samples[start + i] += amplitude * env * sine(freq, t);
  }
}

function addSweep(samples, freqStart, freqEnd, startSec, durationSec, amplitude) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durationSec * SAMPLE_RATE);
  for (let i = 0; i < len && start + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / durationSec;
    const freq = freqStart + (freqEnd - freqStart) * progress;
    const env = Math.sin(Math.PI * progress); // bell curve envelope
    samples[start + i] += amplitude * env * sine(freq, t);
  }
}

function addNoise(samples, startSec, durationSec, amplitude, filterFreq = 2000) {
  const start = Math.floor(startSec * SAMPLE_RATE);
  const len = Math.floor(durationSec * SAMPLE_RATE);
  let prev = 0;
  const rc = 1 / (2 * Math.PI * filterFreq);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  for (let i = 0; i < len && start + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const noise = (Math.random() * 2 - 1);
    prev = prev + alpha * (noise - prev); // low-pass filter
    const env = 1 - t / durationSec;
    samples[start + i] += amplitude * env * prev;
  }
}

function addChord(samples, freqs, startSec, durationSec, amplitude, attack = 0.02, decay = 0.1, sustain = 0.5, release = 0.2) {
  for (const freq of freqs) {
    addTone(samples, freq, startSec, durationSec, amplitude / freqs.length, attack, decay, sustain, release);
  }
}

function addSparkle(samples, startSec, count = 8, baseFreq = 3000, amplitude = 0.3) {
  for (let i = 0; i < count; i++) {
    const t = startSec + i * 0.04 + Math.random() * 0.02;
    const freq = baseFreq + Math.random() * 2000;
    addTone(samples, freq, t, 0.08, amplitude, 0.005, 0.02, 0.2, 0.05);
  }
}

function normalize(samples, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > max) max = Math.abs(samples[i]);
  }
  if (max > 0) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] = samples[i] / max * peak;
    }
  }
  return samples;
}

// ─── 各サウンド定義 ──────────────────────────────────────────────

function generateMessageSend() {
  // LINEの送信音風: 軽い上昇ポップ
  const dur = 0.25;
  const s = makeSamples(dur);
  addSweep(s, 600, 1200, 0, 0.1, 0.6);
  addTone(s, 1200, 0.08, 0.12, 0.4, 0.005, 0.03, 0.1, 0.08);
  return normalize(s);
}

function generateMessageReceive() {
  // 柔らかいチャイム: 暖かい2音
  const dur = 0.6;
  const s = makeSamples(dur);
  addTone(s, 880, 0, 0.5, 0.5, 0.01, 0.05, 0.3, 0.3);
  addTone(s, 1100, 0.12, 0.4, 0.4, 0.01, 0.05, 0.3, 0.25);
  // overtones for warmth
  addTone(s, 1760, 0, 0.5, 0.15, 0.01, 0.03, 0.1, 0.2);
  addTone(s, 2200, 0.12, 0.4, 0.1, 0.01, 0.03, 0.1, 0.15);
  return normalize(s);
}

function generateGachaPull() {
  // ドラム音的な期待感: 低音ロール + 上昇テンション
  const dur = 1.2;
  const s = makeSamples(dur);
  // low drum hits
  for (let i = 0; i < 8; i++) {
    const t = i * 0.08;
    const freq = 60 + i * 5;
    addTone(s, freq, t, 0.15, 0.7, 0.005, 0.05, 0.2, 0.08);
    addNoise(s, t, 0.12, 0.3, 500);
  }
  // rising tension
  addSweep(s, 200, 800, 0.5, 0.6, 0.4);
  // anticipation shimmer
  addSparkle(s, 0.9, 5, 2000, 0.2);
  return normalize(s);
}

function generateGachaRevealN() {
  // 小さなキラキラ: 普通
  const dur = 0.6;
  const s = makeSamples(dur);
  addTone(s, 1047, 0, 0.4, 0.4, 0.01, 0.05, 0.4, 0.2);
  addSparkle(s, 0, 6, 2500, 0.25);
  return normalize(s);
}

function generateGachaRevealR() {
  // やや大きなキラキラ: レア
  const dur = 0.9;
  const s = makeSamples(dur);
  addTone(s, 1320, 0, 0.5, 0.5, 0.01, 0.06, 0.4, 0.3);
  addTone(s, 1047, 0, 0.5, 0.3, 0.01, 0.06, 0.3, 0.3);
  addSparkle(s, 0, 10, 2800, 0.3);
  addSweep(s, 800, 2000, 0, 0.3, 0.3);
  return normalize(s);
}

function generateGachaRevealSR() {
  // キラキラ + ファンファーレ短: スーパーレア
  const dur = 1.2;
  const s = makeSamples(dur);
  // fanfare notes
  const fanfareNotes = [523, 659, 784, 1047];
  for (let i = 0; i < fanfareNotes.length; i++) {
    addTone(s, fanfareNotes[i], i * 0.1, 0.3, 0.5, 0.01, 0.05, 0.5, 0.1);
    // harmonic
    addTone(s, fanfareNotes[i] * 2, i * 0.1, 0.2, 0.15, 0.01, 0.03, 0.3, 0.08);
  }
  addSparkle(s, 0.4, 12, 3000, 0.35);
  return normalize(s);
}

function generateGachaRevealSSR() {
  // 派手なファンファーレ + キラキラ: SSR
  const dur = 1.8;
  const s = makeSamples(dur);
  // big fanfare chord progression
  const prog = [
    [523, 659, 784],
    [587, 740, 880],
    [659, 831, 988],
    [784, 988, 1175],
  ];
  for (let i = 0; i < prog.length; i++) {
    addChord(s, prog[i], i * 0.2, 0.4, 0.7, 0.01, 0.05, 0.6, 0.15);
  }
  // rising sweep
  addSweep(s, 300, 2000, 0, 0.8, 0.3);
  // big sparkle burst
  addSparkle(s, 0.8, 20, 3200, 0.4);
  // final chord
  addChord(s, [784, 988, 1175, 1568], 1.2, 0.5, 0.6, 0.02, 0.08, 0.5, 0.25);
  return normalize(s);
}

function generateGachaRevealUR() {
  // 壮大なファンファーレ + 合唱 + キラキラ: UR最高レア
  const dur = 2.5;
  const s = makeSamples(dur);
  // intro sweep
  addSweep(s, 200, 3000, 0, 0.5, 0.4);
  // full fanfare progression
  const fanfare = [
    { freqs: [523, 659, 784, 1047], t: 0.3 },
    { freqs: [587, 740, 880, 1174], t: 0.6 },
    { freqs: [659, 831, 988, 1318], t: 0.9 },
    { freqs: [784, 988, 1175, 1568], t: 1.2 },
    { freqs: [1047, 1319, 1568, 2093], t: 1.5 },
  ];
  for (const { freqs, t } of fanfare) {
    addChord(s, freqs, t, 0.5, 0.7, 0.01, 0.06, 0.6, 0.15);
  }
  // choir effect (vocal-like formants)
  const choirFreqs = [330, 440, 550, 660, 770];
  for (const f of choirFreqs) {
    addTone(s, f, 0.8, 1.5, 0.2, 0.1, 0.2, 0.7, 0.4);
    addTone(s, f * 1.5, 0.8, 1.5, 0.1, 0.1, 0.2, 0.5, 0.4);
  }
  // massive sparkle
  addSparkle(s, 1.5, 30, 3500, 0.45);
  // final grand chord
  addChord(s, [784, 988, 1175, 1568, 2093], 2.0, 0.45, 0.65, 0.02, 0.1, 0.6, 0.3);
  return normalize(s);
}

function generateLevelUp() {
  // RPG風レベルアップ: 上昇音階 + キラキラ
  const dur = 1.0;
  const s = makeSamples(dur);
  // ascending scale (C major pentatonic)
  const scale = [523, 659, 784, 1047, 1319];
  for (let i = 0; i < scale.length; i++) {
    const t = i * 0.1;
    addTone(s, scale[i], t, 0.25, 0.5, 0.005, 0.04, 0.4, 0.1);
    addTone(s, scale[i] * 2, t, 0.15, 0.15, 0.005, 0.02, 0.2, 0.06);
  }
  // sparkle at peak
  addSparkle(s, 0.5, 15, 3000, 0.35);
  // final chord
  addChord(s, [1047, 1319, 1568], 0.65, 0.3, 0.5, 0.01, 0.05, 0.5, 0.2);
  return normalize(s);
}

function generateCoinEarn() {
  // コインゲット: チャリーン、明るい金属音
  const dur = 0.5;
  const s = makeSamples(dur);
  // metallic impact
  addTone(s, 2093, 0, 0.4, 0.6, 0.002, 0.02, 0.1, 0.3);
  addTone(s, 3136, 0, 0.3, 0.4, 0.002, 0.02, 0.1, 0.2);
  addTone(s, 4186, 0, 0.2, 0.25, 0.002, 0.01, 0.1, 0.15);
  // second bounce
  addTone(s, 1760, 0.1, 0.35, 0.5, 0.002, 0.02, 0.1, 0.25);
  addTone(s, 2637, 0.1, 0.25, 0.3, 0.002, 0.02, 0.1, 0.18);
  // slight noise for metallic texture
  addNoise(s, 0, 0.05, 0.2, 8000);
  return normalize(s);
}

function generateSuccess() {
  // 成功音: 短い達成感
  const dur = 0.7;
  const s = makeSamples(dur);
  // two-tone success
  addTone(s, 784, 0, 0.3, 0.5, 0.01, 0.05, 0.5, 0.15);
  addTone(s, 1047, 0.18, 0.45, 0.6, 0.01, 0.05, 0.5, 0.2);
  addTone(s, 1568, 0.35, 0.3, 0.4, 0.01, 0.04, 0.4, 0.15);
  // sparkle
  addSparkle(s, 0.35, 8, 2800, 0.25);
  return normalize(s);
}

function generateLoginBonus() {
  // ログインボーナス: 嬉しい短い音楽フレーズ
  const dur = 1.5;
  const s = makeSamples(dur);
  // happy melody (C-E-G-C')
  const melody = [
    { freq: 523, t: 0, dur: 0.2 },
    { freq: 659, t: 0.18, dur: 0.2 },
    { freq: 784, t: 0.35, dur: 0.2 },
    { freq: 1047, t: 0.52, dur: 0.4 },
    { freq: 784, t: 0.7, dur: 0.15 },
    { freq: 1047, t: 0.85, dur: 0.5 },
  ];
  for (const note of melody) {
    addTone(s, note.freq, note.t, note.dur, 0.55, 0.01, 0.04, 0.55, 0.1);
    addTone(s, note.freq * 2, note.t, note.dur * 0.7, 0.15, 0.01, 0.03, 0.3, 0.08);
  }
  // harmony
  const harmony = [
    { freq: 659, t: 0, dur: 0.55 },
    { freq: 784, t: 0.52, dur: 0.85 },
  ];
  for (const note of harmony) {
    addTone(s, note.freq, note.t, note.dur, 0.25, 0.02, 0.06, 0.4, 0.15);
  }
  addSparkle(s, 0.85, 12, 3000, 0.3);
  return normalize(s);
}

function generateNotification() {
  // プッシュ通知: 優しいベル音
  const dur = 0.6;
  const s = makeSamples(dur);
  // gentle bell: fundamental + harmonics
  addTone(s, 1047, 0, 0.55, 0.5, 0.005, 0.08, 0.2, 0.35);
  addTone(s, 2093, 0, 0.4, 0.2, 0.005, 0.06, 0.1, 0.28);
  addTone(s, 3140, 0, 0.25, 0.1, 0.005, 0.04, 0.05, 0.2);
  // second bell slightly higher
  addTone(s, 1319, 0.2, 0.35, 0.4, 0.005, 0.07, 0.15, 0.25);
  addTone(s, 2638, 0.2, 0.25, 0.15, 0.005, 0.05, 0.08, 0.18);
  return normalize(s);
}

// ─── 生成実行 ─────────────────────────────────────────────────────

const sounds = [
  { name: 'message-send',     gen: generateMessageSend },
  { name: 'message-receive',  gen: generateMessageReceive },
  { name: 'gacha-pull',       gen: generateGachaPull },
  { name: 'gacha-reveal-n',   gen: generateGachaRevealN },
  { name: 'gacha-reveal-r',   gen: generateGachaRevealR },
  { name: 'gacha-reveal-sr',  gen: generateGachaRevealSR },
  { name: 'gacha-reveal-ssr', gen: generateGachaRevealSSR },
  { name: 'gacha-reveal-ur',  gen: generateGachaRevealUR },
  { name: 'level-up',         gen: generateLevelUp },
  { name: 'coin-earn',        gen: generateCoinEarn },
  { name: 'success',          gen: generateSuccess },
  { name: 'login-bonus',      gen: generateLoginBonus },
  { name: 'notification',     gen: generateNotification },
];

let createdCount = 0;
const created = [];

for (const { name, gen } of sounds) {
  const wavPath = path.join(TMP_DIR, `${name}.wav`);
  const mp3Path = path.join(OUTPUT_DIR, `${name}.mp3`);
  try {
    process.stdout.write(`Generating ${name}... `);
    const samples = gen();
    writeWav(wavPath, samples);
    wavToMp3(wavPath, mp3Path);
    const stat = fs.statSync(mp3Path);
    console.log(`✓ (${(stat.size / 1024).toFixed(1)} KB)`);
    createdCount++;
    created.push(`public/sounds/${name}.mp3`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

// Cleanup tmp
try {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
} catch {}

console.log(`\n✅ ${createdCount}/${sounds.length} ファイル生成完了`);
console.log(`   → ${OUTPUT_DIR}`);
