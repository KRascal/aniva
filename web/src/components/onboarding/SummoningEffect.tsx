'use client';

import { useEffect, useRef } from 'react';

interface SummoningEffectProps {
  characterColor?: string;
  onComplete: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 168, g: 85, b: 247 };
}

export default function SummoningEffect({
  characterColor = '#a855f7',
  onComplete,
}: SummoningEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Safari bfcache対策
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onCompleteRef.current();
    };
    const handleVisChange = () => {
      if (document.visibilityState === 'visible' && startTimeRef.current > 0) {
        if (performance.now() - startTimeRef.current > 4000) onCompleteRef.current();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.45; // 卵を少し上に配置

    const DURATION = 4000; // 4秒
    const PHASE1_END = 1200; // パーティクル収束
    const PHASE2_END = 2500; // 卵形成 + ゆっくり揺れ
    const PHASE3_END = 3500; // 激しく揺れ + ヒビ
    // 3500-4000: 光って完了

    const isMobile = W < 768;
    const count = isMobile ? 35 : 60;
    const colors = ['#a855f7', '#ec4899', '#7c3aed', characterColor];

    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(W, H) * 0.5 + 80;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    const rgb = hexToRgb(characterColor);

    // 卵を描画する関数
    function drawEgg(
      opacity: number,
      shakeAngle: number,
      glowIntensity: number,
      showCracks: boolean,
      crackProgress: number,
    ) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(shakeAngle);

      const eggW = 70;
      const eggH = 95;

      // グロー
      ctx.shadowBlur = 20 + glowIntensity * 40;
      ctx.shadowColor = characterColor;

      // 卵本体 — ベジェ曲線で卵型
      ctx.beginPath();
      ctx.moveTo(0, -eggH);
      // 上部（細い方）
      ctx.bezierCurveTo(eggW * 0.6, -eggH, eggW, -eggH * 0.3, eggW, eggH * 0.1);
      // 下部（太い方）
      ctx.bezierCurveTo(eggW, eggH * 0.65, eggW * 0.55, eggH, 0, eggH);
      ctx.bezierCurveTo(-eggW * 0.55, eggH, -eggW, eggH * 0.65, -eggW, eggH * 0.1);
      ctx.bezierCurveTo(-eggW, -eggH * 0.3, -eggW * 0.6, -eggH, 0, -eggH);
      ctx.closePath();

      // グラデーション
      const grad = ctx.createRadialGradient(-15, -30, 5, 0, 0, eggH);
      grad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.95})`);
      grad.addColorStop(0.3, `rgba(230, 220, 240, ${opacity * 0.9})`);
      grad.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5})`);
      grad.addColorStop(1, `rgba(${rgb.r * 0.6}, ${rgb.g * 0.6}, ${rgb.b * 0.6}, ${opacity * 0.7})`);
      ctx.fillStyle = grad;
      ctx.globalAlpha = opacity;
      ctx.fill();

      // 光沢ハイライト
      ctx.beginPath();
      ctx.ellipse(-15, -40, 18, 12, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
      ctx.fill();

      // ヒビ
      if (showCracks && crackProgress > 0) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = opacity * Math.min(crackProgress * 2, 1);

        // ヒビ1（メイン）
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.lineTo(8, -30 * crackProgress);
        ctx.lineTo(-3, -50 * crackProgress);
        ctx.lineTo(12, -70 * crackProgress);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // ヒビ2（右）
        if (crackProgress > 0.3) {
          ctx.beginPath();
          ctx.moveTo(10, 5);
          ctx.lineTo(25, -15 * crackProgress);
          ctx.lineTo(18, -30 * crackProgress);
          ctx.strokeStyle = `rgba(236, 72, 153, 0.7)`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // ヒビ3（左）
        if (crackProgress > 0.6) {
          ctx.beginPath();
          ctx.moveTo(-8, 10);
          ctx.lineTo(-22, -5 * crackProgress);
          ctx.lineTo(-15, -25 * crackProgress);
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // ヒビから漏れる光
        if (crackProgress > 0.5) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = characterColor;
          ctx.beginPath();
          ctx.moveTo(-5, -10);
          ctx.lineTo(8, -30 * crackProgress);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(crackProgress - 0.5) * 0.6})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    startTimeRef.current = performance.now();

    const fallbackTimer = setTimeout(() => {
      cancelAnimationFrame(animRef.current);
      onCompleteRef.current();
    }, 5000);

    function animate(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - startTimeRef.current;

      ctx.clearRect(0, 0, W, H);

      if (elapsed < PHASE1_END) {
        // Phase 1: パーティクル収束
        const phase = elapsed / PHASE1_END;
        particles.forEach((p) => {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const accel = 0.04 * phase * phase;
          p.vx += dx * accel;
          p.vy += dy * accel;
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.x += p.vx;
          p.y += p.vy;

          const prgb = hexToRgb(p.color);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, ${p.opacity * (0.4 + phase * 0.6)})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        // 卵が薄く出現し始める
        if (phase > 0.5) {
          drawEgg((phase - 0.5) * 1.2, 0, 0, false, 0);
        }
      } else if (elapsed < PHASE2_END) {
        // Phase 2: 卵形成 + ゆっくり揺れ
        const phase = (elapsed - PHASE1_END) / (PHASE2_END - PHASE1_END);

        // パーティクル消滅
        particles.forEach((p) => {
          const dx = cx - p.x;
          const dy = cy - p.y;
          p.vx += dx * 0.08;
          p.vy += dy * 0.08;
          p.vx *= 0.85;
          p.vy *= 0.85;
          p.x += p.vx;
          p.y += p.vy;

          const dist = Math.hypot(p.x - cx, p.y - cy);
          const fadeOut = Math.max(0, 1 - phase * 1.5) * Math.max(0, 1 - dist / 60);
          if (fadeOut > 0.01) {
            const prgb = hexToRgb(p.color);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, ${fadeOut})`;
            ctx.fill();
          }
        });

        // 卵: ゆっくり揺れ
        const shake = Math.sin(elapsed * 0.005) * 0.04 * (0.5 + phase * 0.5);
        drawEgg(0.7 + phase * 0.3, shake, phase * 0.3, false, 0);
      } else if (elapsed < PHASE3_END) {
        // Phase 3: 激しく揺れ + ヒビ
        const phase = (elapsed - PHASE2_END) / (PHASE3_END - PHASE2_END);

        // 激しい揺れ（周波数と振幅が増加）
        const freq = 0.015 + phase * 0.025;
        const amp = 0.06 + phase * 0.12;
        const shake = Math.sin(elapsed * freq) * amp;

        drawEgg(1, shake, 0.3 + phase * 0.7, true, phase);
      } else {
        // Phase 4: 光って完了
        const phase = (elapsed - PHASE3_END) / (DURATION - PHASE3_END);

        // 白くフラッシュ
        drawEgg(1 - phase * 0.5, 0, 1, true, 1);

        // 爆発光
        ctx.save();
        ctx.globalAlpha = phase * 0.8;
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 * phase);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${phase})`);
        flashGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${phase * 0.5})`);
        flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (elapsed < DURATION) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => onCompleteRef.current(), 100);
      }
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [characterColor]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 40% 60% at 50% 45%, ${characterColor}15 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
