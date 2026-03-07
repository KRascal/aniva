'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface LevelUpModalProps {
  newLevel: number;
  levelName: string;
  milestone?: { title: string; characterMessage: string; emoji: string };
  onClose: () => void;
}

export function LevelUpModal({ newLevel, levelName, milestone, onClose }: LevelUpModalProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const [displayLevel, setDisplayLevel] = useState(newLevel - 1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // パーティクル紙吹雪
  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#A855F7', '#EC4899', '#FFD700', '#06B6D4', '#10B981', '#F472B6'];
    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; rot: number; rotV: number;
      color: string; alpha: number; shape: 'rect' | 'star';
    }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 10,
        vy: -Math.random() * 8 - 3,
        size: Math.random() * 6 + 3,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'star',
      });
    }
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.rotV;
        if (frame > 40) p.alpha -= 0.012;
        if (p.alpha <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        if (p.shape === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * p.size;
            const y = Math.sin(angle) * p.size;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      frame++;
      if (alive) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    // フェーズ1: 登場
    const t1 = setTimeout(() => setPhase('show'), 80);
    // フェーズ2: レベルカウントアップ
    const t2 = setTimeout(() => {
      spawnParticles();
      const interval = setInterval(() => {
        setDisplayLevel(prev => {
          if (prev >= newLevel) { clearInterval(interval); return newLevel; }
          return prev + 1;
        });
      }, 200);
    }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [newLevel, spawnParticles]);

  const handleClose = () => {
    setPhase('exit');
    setTimeout(onClose, 300);
  };

  const isShow = phase === 'show';
  const isExit = phase === 'exit';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        backdropFilter: 'blur(12px)',
        backgroundColor: `rgba(0,0,0,${isExit ? 0 : isShow ? 0.75 : 0})`,
        transition: 'background-color 0.3s ease',
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes levelBurst {
          0% { transform: scale(0.6) translateY(20px); opacity: 0; }
          60% { transform: scale(1.08) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes levelNumPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.2); }
          50% { box-shadow: 0 0 40px rgba(168,85,247,0.7), 0 0 80px rgba(168,85,247,0.4), 0 0 120px rgba(236,72,153,0.2); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
        }
      `}</style>

      {/* Canvas (紙吹雪) */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[59]" />

      {/* Modal Card */}
      <div
        className="relative max-w-xs w-full rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a0a2e, #0f051a)',
          border: '1px solid rgba(168,85,247,0.4)',
          animation: isShow && !isExit ? 'levelBurst 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards, glowPulse 2s ease-in-out 0.5s infinite' : 'none',
          opacity: isExit ? 0 : 1,
          transform: isExit ? 'scale(0.9)' : undefined,
          transition: isExit ? 'all 0.3s ease' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 背景グロー */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)' }} />
        </div>

        {/* フローティングスター */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-yellow-300 pointer-events-none"
            style={{
              fontSize: i % 2 === 0 ? 14 : 10,
              left: `${10 + i * 15}%`,
              top: `${8 + Math.sin(i) * 8}%`,
              animation: `starFloat ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
            }}
          >
            ★
          </div>
        ))}

        <div className="relative z-10 px-6 py-7 text-center">
          {/* タイトル */}
          <p className="text-xs font-bold tracking-[0.2em] text-purple-400 mb-3 uppercase">Level Up</p>

          {/* レベル数字 (カウントアップ) */}
          <div
            className="mb-4"
            style={{
              animation: isShow ? 'levelNumPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) 0.3s both' : 'none',
            }}
          >
            <div
              className="text-7xl font-black leading-none"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #f472b6 40%, #fbbf24 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 2s linear 0.5s infinite',
              }}
            >
              {displayLevel}
            </div>
            <p className="text-white/70 text-sm font-bold mt-1">「{levelName}」</p>
          </div>

          {/* マイルストーン */}
          {milestone && (
            <div
              className="mb-4 rounded-2xl p-4 text-left"
              style={{
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.25)',
                animation: isShow ? 'levelNumPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) 0.5s both' : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{milestone.emoji}</span>
                <span className="text-yellow-300 font-bold text-sm">{milestone.title}</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed italic">
                「{milestone.characterMessage}」
              </p>
            </div>
          )}

          {/* 閉じるボタン */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
            }}
          >
            やった！
          </button>
        </div>
      </div>
    </div>
  );
}
