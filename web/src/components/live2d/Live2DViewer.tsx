'use client';

import { useEffect, useRef, useState } from 'react';

interface Live2DViewerProps {
  avatarUrl?: string;
  characterName?: string;
  emotion?: string;
  isSpeaking?: boolean;
  width?: number;
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  emoji: string;
  opacity: number;
}

const EMOTION_CONFIG: Record<string, {
  overlay: string;
  particles: string[];
  shake: number;
  pulseColor: string;
  bgTint: string;
  scale: number;
  label: string;
}> = {
  neutral: {
    overlay: 'rgba(0,0,0,0)',
    particles: [],
    shake: 0,
    pulseColor: 'rgba(168,85,247,0.4)',
    bgTint: 'rgba(0,0,0,0)',
    scale: 1,
    label: '😌',
  },
  happy: {
    overlay: 'rgba(255,182,193,0.15)',
    particles: ['✨', '⭐', '💫', '🌸'],
    shake: 0,
    pulseColor: 'rgba(255,105,180,0.5)',
    bgTint: 'rgba(255,182,193,0.08)',
    scale: 1.02,
    label: '😊',
  },
  excited: {
    overlay: 'rgba(255,140,0,0.12)',
    particles: ['🔥', '💥', '⚡', '🌟'],
    shake: 1,
    pulseColor: 'rgba(255,140,0,0.6)',
    bgTint: 'rgba(255,140,0,0.06)',
    scale: 1.04,
    label: '🤩',
  },
  angry: {
    overlay: 'rgba(255,50,50,0.18)',
    particles: ['💢', '😤', '🔴'],
    shake: 3,
    pulseColor: 'rgba(255,50,50,0.6)',
    bgTint: 'rgba(200,0,0,0.1)',
    scale: 1,
    label: '😠',
  },
  sad: {
    overlay: 'rgba(100,149,237,0.18)',
    particles: ['💧', '😢', '🌧️'],
    shake: 0,
    pulseColor: 'rgba(100,149,237,0.4)',
    bgTint: 'rgba(30,60,120,0.12)',
    scale: 0.97,
    label: '😢',
  },
  surprised: {
    overlay: 'rgba(255,255,100,0.12)',
    particles: ['⚡', '❗', '✨'],
    shake: 2,
    pulseColor: 'rgba(255,220,0,0.6)',
    bgTint: 'rgba(255,255,0,0.05)',
    scale: 1.06,
    label: '😲',
  },
  hungry: {
    overlay: 'rgba(205,133,63,0.12)',
    particles: ['🍖', '🍔', '😋', '💦'],
    shake: 0,
    pulseColor: 'rgba(210,105,30,0.5)',
    bgTint: 'rgba(139,69,19,0.08)',
    scale: 1,
    label: '😋',
  },
};

export default function Live2DViewer({
  avatarUrl,
  characterName,
  emotion = 'neutral',
  isSpeaking = false,
  width = 300,
  height = 400,
}: Live2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [prevEmotion, setPrevEmotion] = useState(emotion);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const emotionRef = useRef(emotion);
  const isSpeakingRef = useRef(isSpeaking);

  // Track changes
  useEffect(() => {
    emotionRef.current = emotion;
    isSpeakingRef.current = isSpeaking;
  });

  // Emotion transition
  useEffect(() => {
    if (emotion !== prevEmotion) {
      setFadeOpacity(0);
      const t = setTimeout(() => {
        setPrevEmotion(emotion);
        setFadeOpacity(1);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [emotion, prevEmotion]);

  // Load avatar image
  useEffect(() => {
    if (!avatarUrl) { setImgLoaded(false); return; }
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      imgRef.current = null;
      setImgLoaded(false);
    };
    img.src = avatarUrl;
  }, [avatarUrl]);

  // Canvas particle / effect loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const spawnParticle = (cfg: typeof EMOTION_CONFIG[string]) => {
      if (!cfg.particles.length) return;
      const emoji = cfg.particles[Math.floor(Math.random() * cfg.particles.length)];
      particlesRef.current.push({
        x: Math.random() * width,
        y: height + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 2 + 1),
        life: 0,
        maxLife: 60 + Math.random() * 60,
        size: 14 + Math.random() * 12,
        emoji,
        opacity: 1,
      });
    };

    let frameCount = 0;
    const loop = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;
      const curEmotion = emotionRef.current;
      const speaking = isSpeakingRef.current;
      const cfg = EMOTION_CONFIG[curEmotion] || EMOTION_CONFIG.neutral;

      ctx.clearRect(0, 0, width, height);

      // Spawn particles based on emotion
      frameCount++;
      const spawnRate = cfg.particles.length > 0
        ? (curEmotion === 'angry' || curEmotion === 'excited' ? 8 : 18)
        : 999;
      if (frameCount % spawnRate === 0) spawnParticle(cfg);

      // Draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      for (const p of particlesRef.current) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = p.opacity;
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.emoji, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      // Angry red flash
      if (curEmotion === 'angry') {
        const flashAlpha = Math.abs(Math.sin(t * 4)) * 0.15;
        ctx.fillStyle = `rgba(255,50,50,${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Surprised bounce/flash
      if (curEmotion === 'surprised') {
        const flashAlpha = Math.max(0, Math.sin(t * 6)) * 0.1;
        ctx.fillStyle = `rgba(255,255,0,${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Speaking sound waves on canvas (outer rings)
      if (speaking) {
        const cx = width / 2;
        const cy = height / 2;
        for (let i = 0; i < 3; i++) {
          const phase = (t * 2 + i * 0.6) % 1;
          const r = 70 + phase * 60;
          const alpha = (1 - phase) * 0.25;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168,85,247,${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Sad rain drops
      if (curEmotion === 'sad') {
        for (let i = 0; i < 3; i++) {
          const rx = 30 + i * (width / 3) + Math.sin(t + i) * 10;
          const ry = ((t * 60 + i * 50) % height);
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100,149,237,0.5)';
          ctx.fill();
        }
      }

      // Hungry drool (wavy line at bottom center)
      if (curEmotion === 'hungry') {
        const droolX = width / 2 + 20;
        const droolLength = 18 + Math.sin(t * 3) * 6;
        ctx.beginPath();
        ctx.moveTo(droolX, height * 0.55);
        ctx.quadraticCurveTo(droolX + 5, height * 0.55 + droolLength / 2, droolX, height * 0.55 + droolLength);
        ctx.strokeStyle = 'rgba(100,200,255,0.65)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [width, height]);

  const cfg = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.neutral;

  // Breathing animation values (CSS vars)
  const breathingScale = `scale(${cfg.scale})`;
  const shakeAnim = cfg.shake > 0
    ? `shake${Math.ceil(cfg.shake)}s 0.3s ease-in-out infinite`
    : undefined;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width, height }}
    >
      {/* Emotion bg tint */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-colors duration-500"
        style={{ background: cfg.bgTint }}
      />

      {/* Avatar image layer */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
        style={{
          opacity: fadeOpacity,
          transition: 'opacity 0.25s ease',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={characterName ?? 'character'}
            className="w-full h-full object-cover rounded-xl"
            style={{
              transform: breathingScale,
              animation: [
                'breathe 4s ease-in-out infinite',
                shakeAnim,
              ].filter(Boolean).join(', '),
              filter: cfg.overlay !== 'rgba(0,0,0,0)'
                ? `brightness(${emotion === 'sad' ? '0.85' : emotion === 'angry' ? '1.05' : '1'}) saturate(${emotion === 'sad' ? '0.7' : '1.2'})`
                : undefined,
              transition: 'filter 0.4s ease, transform 0.4s ease',
            }}
          />
        ) : (
          // Fallback: gradient placeholder with initial
          <div
            className="w-full h-full flex items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #6d28d9 0%, #ec4899 100%)',
            }}
          >
            <span className="text-white text-6xl font-black opacity-60">
              {characterName?.charAt(0) ?? '?'}
            </span>
          </div>
        )}
      </div>

      {/* Overlay tint */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-500"
        style={{ background: cfg.overlay, mixBlendMode: 'overlay' }}
      />

      {/* Pulse ring */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: `0 0 0 0 ${cfg.pulseColor}`,
          animation: 'pulseRing 2.5s ease-out infinite',
        }}
      />

      {/* Speaking rings - additional visible border */}
      {isSpeaking && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 0 3px rgba(168,85,247,0.5), 0 0 20px rgba(168,85,247,0.3)',
            animation: 'speakingPulse 0.5s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Particle / effect canvas (on top, pointer-events: none) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ width, height }}
      />

      {/* Emotion label badge */}
      <div
        className="absolute top-2 right-2 text-lg leading-none pointer-events-none"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          transition: 'opacity 0.3s ease',
          opacity: fadeOpacity,
        }}
      >
        {cfg.label}
      </div>

      {/* Character name (bottom) */}
      {characterName && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center text-white text-xs font-semibold py-1.5 rounded-b-xl pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
            letterSpacing: '0.05em',
          }}
        >
          {characterName}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1) translateY(0px); }
          50% { transform: scale(1.03) translateY(-3px); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 ${cfg.pulseColor}; }
          70% { box-shadow: 0 0 0 14px rgba(0,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes speakingPulse {
          from { box-shadow: 0 0 0 2px rgba(168,85,247,0.4), 0 0 12px rgba(168,85,247,0.2); }
          to   { box-shadow: 0 0 0 5px rgba(168,85,247,0.6), 0 0 28px rgba(168,85,247,0.4); }
        }
        @keyframes shake1s {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-0.5deg); }
          75% { transform: translateX(2px) rotate(0.5deg); }
        }
        @keyframes shake2s {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-1deg); }
          40% { transform: translateX(4px) rotate(1deg); }
          60% { transform: translateX(-3px) rotate(-0.5deg); }
          80% { transform: translateX(3px) rotate(0.5deg); }
        }
        @keyframes shake3s {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-5px) rotate(-1.5deg); }
          30% { transform: translateX(5px) rotate(1.5deg); }
          45% { transform: translateX(-4px) rotate(-1deg); }
          60% { transform: translateX(4px) rotate(1deg); }
          75% { transform: translateX(-3px) rotate(-0.5deg); }
          90% { transform: translateX(3px) rotate(0.5deg); }
        }
      `}</style>
    </div>
  );
}
