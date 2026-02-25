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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const DURATION = 3000; // 3 seconds total
    const PHASE1_END = 1000; // 0-1s: converge
    const PHASE2_END = 2000; // 1-2s: silhouette forming
    // 2-3s: silhouette pulsing + stable

    const isMobile = W < 768;
    const count = isMobile ? 30 : 60;
    const colors = ['#a855f7', '#ec4899', '#7c3aed', characterColor];

    // Spawn particles scattered across the screen
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(W, H) * 0.5 + 80;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    const rgb = hexToRgb(characterColor);

    function drawSilhouette(opacity: number, pulse: number) {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowBlur = 20 + pulse * 15;
      ctx.shadowColor = characterColor;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;

      const scale = 0.9 + pulse * 0.08;
      const headR = 22 * scale;
      const bodyW = 44 * scale;
      const bodyH = 90 * scale;
      const headY = cy - bodyH / 2 - headR;

      // Head
      ctx.beginPath();
      ctx.arc(cx, headY, headR, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.roundRect(cx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH, 8);
      ctx.fill();

      // Left arm
      ctx.beginPath();
      ctx.roundRect(cx - bodyW / 2 - 16 * scale, cy - bodyH / 2, 14 * scale, bodyH * 0.65, 4);
      ctx.fill();

      // Right arm
      ctx.beginPath();
      ctx.roundRect(cx + bodyW / 2 + 2 * scale, cy - bodyH / 2, 14 * scale, bodyH * 0.65, 4);
      ctx.fill();

      ctx.restore();
    }

    startTimeRef.current = performance.now();

    function animate(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, W, H);

      if (elapsed < PHASE1_END) {
        // Phase 1: particles converge toward center
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
      } else if (elapsed < PHASE2_END) {
        // Phase 2: particles still converge, silhouette forming
        const phase = (elapsed - PHASE1_END) / (PHASE2_END - PHASE1_END);
        particles.forEach((p) => {
          const dx = cx - p.x;
          const dy = cy - p.y;
          p.vx += dx * 0.06;
          p.vy += dy * 0.06;
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.x += p.vx;
          p.y += p.vy;

          const prgb = hexToRgb(p.color);
          const dist = Math.hypot(p.x - cx, p.y - cy);
          const fadeOut = Math.max(0, 1 - dist / 40);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${prgb.r}, ${prgb.g}, ${prgb.b}, ${p.opacity * fadeOut})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        drawSilhouette(phase * 0.6, 0);
      } else {
        // Phase 3: silhouette stable with pulse
        const phase = (elapsed - PHASE2_END) / (DURATION - PHASE2_END);
        const pulse = Math.sin(phase * Math.PI * 4) * 0.5 + 0.5;
        drawSilhouette(0.6 + phase * 0.4, pulse);
      }

      if (elapsed < DURATION) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Final frame: full silhouette
        drawSilhouette(1, 0);
        setTimeout(() => onCompleteRef.current(), 100);
      }
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [characterColor]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {/* Ambient glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 40% 60% at 50% 50%, ${characterColor}15 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
