'use client';
import { useRef, useEffect } from 'react';

// --- 型定義 ---
export type ParticlePreset = 'r-burst' | 'sr-snowfall' | 'ssr-rise' | 'ur-explosion';

export interface ParticleCanvasProps {
  preset: ParticlePreset;
  /** Canvas の幅 (デフォルト: window.innerWidth) */
  width?: number;
  /** Canvas の高さ (デフォルト: window.innerHeight) */
  height?: number;
  /** アニメーション開始遅延 ms */
  delayMs?: number;
  /** アニメーション終了コールバック */
  onComplete?: () => void;
  /** マウント時に自動開始 */
  autoStart?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star' | 'diamond';
  life: number;       // 0.0〜1.0 (1.0 = 生存, 0.0 = 消滅)
  lifeDecay: number;  // フレームごとの減少量
  trail: { x: number; y: number }[];
}

// --- パーティクル生成 ---
function createParticles(preset: ParticlePreset, w: number, h: number): Particle[] {
  const cx = w / 2;
  const cy = h / 2;
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;
  const randColor = (colors: string[]) => colors[Math.floor(Math.random() * colors.length)];

  if (preset === 'r-burst') {
    return Array.from({ length: 15 }, () => {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(80, 150);
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed / 60,
        vy: Math.sin(angle) * speed / 60,
        radius: rand(4, 8),
        color: randColor(['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb']),
        alpha: 1,
        rotation: 0,
        rotationSpeed: rand(-0.1, 0.1),
        shape: 'circle',
        life: 1,
        lifeDecay: 0.025,
        trail: [],
      } satisfies Particle;
    });
  }

  if (preset === 'sr-snowfall') {
    return Array.from({ length: 20 }, (_, i) => ({
      x: rand(0, w),
      y: rand(-20, -80),
      vx: rand(-0.8, 0.8),
      vy: rand(1.5, 3.5),
      radius: rand(6, 14),
      color: randColor(['#a855f7', '#c084fc', '#e879f9', '#d946ef', '#f0abfc']),
      alpha: rand(0.7, 1.0),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.05, 0.05),
      shape: (i % 3 === 0 ? 'star' : 'circle') as 'star' | 'circle',
      life: 1,
      lifeDecay: 0.008,
      trail: [],
    } satisfies Particle));
  }

  if (preset === 'ssr-rise') {
    return Array.from({ length: 28 }, (_, i) => ({
      x: rand(0, w),
      y: h + rand(10, 40),
      vx: rand(-1.0, 1.0),
      vy: -rand(2.5, 5.0),
      radius: rand(8, 20),
      color: randColor(['#fde68a', '#fbbf24', '#f59e0b', '#ffffff', '#fcd34d']),
      alpha: rand(0.8, 1.0),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.08, 0.08),
      shape: (['circle', 'star', 'diamond'] as const)[i % 3],
      life: 1,
      lifeDecay: 0.006,
      trail: [],
    } satisfies Particle));
  }

  // ur-explosion
  return Array.from({ length: 60 }, () => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(120, 300);
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed / 60,
      vy: Math.sin(angle) * speed / 60 - rand(0.5, 1.5),
      radius: rand(4, 16),
      color: randColor(['#f59e0b', '#fde68a', '#ff6b6b', '#ec4899', '#a78bfa', '#ffffff']),
      alpha: 1,
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.15, 0.15),
      shape: (['circle', 'star', 'diamond'] as const)[Math.floor(rand(0, 3))],
      life: 1,
      lifeDecay: 0.005,
      trail: [],
    } satisfies Particle;
  });
}

// --- 星形描画ヘルパー ---
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    if (i === 0) {
      ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    } else {
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
  }
  ctx.closePath();
}

// --- パーティクル描画 ---
function drawShape(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.alpha * Math.max(0, p.life);
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = p.radius * 2;

  if (p.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'star') {
    drawStar(ctx, 0, 0, p.radius / 2, p.radius, 5);
    ctx.fill();
  } else {
    // diamond
    ctx.beginPath();
    ctx.moveTo(0, -p.radius);
    ctx.lineTo(p.radius * 0.6, 0);
    ctx.lineTo(0, p.radius);
    ctx.lineTo(-p.radius * 0.6, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- メインコンポーネント ---
export function GachaParticleCanvas({
  preset,
  width,
  height,
  delayMs = 0,
  onComplete,
  autoStart = true,
  className,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!autoStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width ?? window.innerWidth;
    canvas.height = height ?? window.innerHeight;

    let rafId = 0;
    let particles: Particle[] = [];

    const startTimeout = setTimeout(() => {
      particles = createParticles(preset, canvas.width, canvas.height);
      animate();
    }, delayMs);

    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive++;

        // trail (ur-explosion のみ)
        if (preset === 'ur-explosion') {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 5) p.trail.shift();
          p.trail.forEach((pt, i) => {
            ctx.globalAlpha = (i / p.trail.length) * 0.3 * Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, p.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }

        drawShape(ctx, p);

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life -= p.lifeDecay;

        // 重力 (ur-explosion のみ)
        if (preset === 'ur-explosion') {
          p.vy += 0.03;
        }
      }

      if (alive > 0) {
        rafId = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    }

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(rafId);
    };
  }, [preset, width, height, delayMs, onComplete, autoStart]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-[55] ${className ?? ''}`}
      style={{
        mixBlendMode: preset === 'ur-explosion' ? 'screen' : 'normal',
      }}
    />
  );
}
