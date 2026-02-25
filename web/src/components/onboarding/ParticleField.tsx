'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number; // 0-1
  maxLife: number;
}

interface ParticleFieldProps {
  density?: number;
  colors?: string[];
  gathering?: boolean;
  gatherTarget?: { x: number; y: number };
  className?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default function ParticleField({
  density = 25,
  colors = ['#a855f7', '#ec4899'],
  gathering = false,
  gatherTarget,
  className = '',
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const gatheringRef = useRef(gathering);
  const gatherTargetRef = useRef(gatherTarget);

  useEffect(() => {
    gatheringRef.current = gathering;
  }, [gathering]);

  useEffect(() => {
    gatherTargetRef.current = gatherTarget;
  }, [gatherTarget]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(density * 0.5) : density;

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4 - 0.1,
      size: Math.random() * 2.5 + 0.5,
      opacity: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: Math.random() * 200 + 100,
    });

    particlesRef.current = Array.from({ length: count }, createParticle).map(
      (p) => ({ ...p, life: Math.random() * p.maxLife })
    );

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, i) => {
        p.life += 1;

        if (p.life > p.maxLife) {
          particlesRef.current[i] = createParticle();
          return;
        }

        const lifeRatio = p.life / p.maxLife;

        if (gatheringRef.current && gatherTargetRef.current) {
          const tx = (gatherTargetRef.current.x / 100) * canvas.width;
          const ty = (gatherTargetRef.current.y / 100) * canvas.height;
          const dx = tx - p.x;
          const dy = ty - p.y;
          p.vx += dx * 0.002;
          p.vy += dy * 0.002;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges (only when not gathering)
        if (!gatheringRef.current) {
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        }

        // Fade in/out based on life ratio
        if (lifeRatio < 0.2) {
          p.opacity = lifeRatio / 0.2;
        } else if (lifeRatio > 0.8) {
          p.opacity = (1 - lifeRatio) / 0.2;
        } else {
          p.opacity = 1;
        }

        const rgb = hexToRgb(p.color);
        if (!rgb) return;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity * 0.6})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, [density, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
