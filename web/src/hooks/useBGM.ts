import { useEffect, useRef } from 'react';
import { startProceduralBGM, type ProceduralBGM } from '@/lib/bgm-generator';

const BGM_FILES: Record<string, string> = {
  daily: '/bgm/daily.mp3',
  tension: '/bgm/tension.mp3',
  emotion: '/bgm/emotion.mp3',
};

const FADE_DURATION_MS = 500;
const BGM_VOLUME = 0.3;

/**
 * BGM管理フック
 * - public/bgm/ の3ファイルを管理（daily, tension, emotion）
 * - ループ再生
 * - チャプター切り替え時にクロスフェード（0.5秒）
 * - iOS Autoplay対策: 最初のユーザータップで resume()
 * - ボリュームは0.3（控えめ）
 * - ファイルが存在しない場合は無視
 */
export function useBGM(bgmType: string | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTypeRef = useRef<string | null>(null);
  const proceduralBgmRef = useRef<ProceduralBGM | null>(null);

  // iOS Autoplay 対策: ユーザー操作で AudioContext を resume
  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {/* autoplay blocked - ignore */});
      }
    };
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('click', handleUserInteraction, { once: true });
    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (!bgmType || !BGM_FILES[bgmType]) {
      // BGMなし指定 or 不明なタイプ: 再生中なら停止
      fadeOut(audioRef.current, () => {
        audioRef.current = null;
      });
      currentTypeRef.current = null;
      return;
    }

    // 同じBGMがすでに再生中なら何もしない
    if (currentTypeRef.current === bgmType && audioRef.current && !audioRef.current.paused) {
      return;
    }

    const newSrc = BGM_FILES[bgmType];
    const newAudio = new Audio(newSrc);
    newAudio.loop = true;
    newAudio.volume = 0;

    // ファイルが存在しない場合はプロシージャルBGMにフォールバック
    newAudio.addEventListener('error', () => {
      if (bgmType && (bgmType === 'daily' || bgmType === 'tension' || bgmType === 'emotion')) {
        const proceduralRef = proceduralBgmRef.current;
        if (proceduralRef) proceduralRef.stop();
        proceduralBgmRef.current = startProceduralBGM(bgmType);
      }
    });

    newAudio.play().catch(() => {/* autoplay blocked - will resume on interaction */});

    // フェードイン
    fadeIn(newAudio);

    // 前のBGMをフェードアウト
    const prevAudio = audioRef.current;
    if (prevAudio) {
      fadeOut(prevAudio, () => {
        prevAudio.pause();
        prevAudio.src = '';
      });
    }

    audioRef.current = newAudio;
    currentTypeRef.current = bgmType;

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgmType]);

  // アンマウント時に停止
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (proceduralBgmRef.current) {
        proceduralBgmRef.current.stop();
      }
    };
  }, []);
}

function fadeIn(audio: HTMLAudioElement) {
  audio.volume = 0;
  const steps = 20;
  const stepDuration = FADE_DURATION_MS / steps;
  const volumeStep = BGM_VOLUME / steps;
  let current = 0;

  const interval = setInterval(() => {
    current += 1;
    audio.volume = Math.min(BGM_VOLUME, volumeStep * current);
    if (current >= steps) {
      clearInterval(interval);
    }
  }, stepDuration);
}

function fadeOut(audio: HTMLAudioElement | null, onDone?: () => void) {
  if (!audio) {
    onDone?.();
    return;
  }
  const steps = 20;
  const stepDuration = FADE_DURATION_MS / steps;
  const initialVolume = audio.volume;
  const volumeStep = initialVolume / steps;
  let current = 0;

  const interval = setInterval(() => {
    current += 1;
    audio.volume = Math.max(0, initialVolume - volumeStep * current);
    if (current >= steps) {
      clearInterval(interval);
      onDone?.();
    }
  }, stepDuration);
}
