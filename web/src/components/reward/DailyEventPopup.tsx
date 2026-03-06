'use client';

/**
 * DailyEventPopup — 変動報酬デイリーイベント演出コンポーネント
 *
 * - 通常日   : 表示なし
 * - 良い日   : ゴールドのトースト通知 + キラキラエフェクト
 * - レア日   : フルスクリーンモーダル + パーティクル演出 + ファンファーレ感
 * - 超レア日 : 特別な全画面演出 + キャラからの手書き風メッセージ表示
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================================
// 型定義
// ============================================================

export type EventType = 'good' | 'rare' | 'ultra_rare';

export interface DailyEventPopupProps {
  eventType: EventType | null;
  message: string;
  characterGreeting?: string;
  bonusCoins?: number;
  bonusXpMultiplier?: number;
  onClose?: () => void;
}

// ============================================================
// パーティクル (Canvas ベース)
// ============================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

function ParticleCanvas({
  colors,
  density = 60,
}: {
  colors: string[];
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const particles: Particle[] = Array.from({ length: density }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.5, // 上半分から降る
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1,
      radius: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      life: Math.random() * 120 + 60,
    }));

    let animId: number;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - frame / p.life);

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // 画面外に出たらリセット
        if (p.y > H) {
          p.y = 0;
          p.x = Math.random() * W;
          p.alpha = 1;
        }
      }
      ctx.globalAlpha = 1;
      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(animId);
  }, [colors, density]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden
    />
  );
}

// ============================================================
// Sparkle SVG (良い日用の小さなキラキラ)
// ============================================================

function Sparkles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-yellow-300 select-none"
          style={{
            fontSize: `${Math.random() * 14 + 10}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.4, 0.5],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 1.5,
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}

// ============================================================
// 良い日トースト
// ============================================================

function GoodDayToast({
  message,
  bonusCoins,
  onClose,
}: {
  message: string;
  bonusCoins?: number;
  onClose?: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 4500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="pointer-events-auto relative mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 p-4 shadow-xl shadow-yellow-500/30"
      role="alert"
    >
      <Sparkles />
      <div className="relative z-10 flex items-start gap-3">
        <span className="text-3xl">🌟</span>
        <div className="flex-1">
          <p className="font-bold text-yellow-950">今日はいい予感！</p>
          <p className="mt-0.5 text-sm text-yellow-900">{message}</p>
          {bonusCoins && (
            <p className="mt-1 text-xs font-semibold text-yellow-800">
              +{bonusCoins} コイン獲得！
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-1 rounded-full p-1 text-yellow-800 hover:bg-yellow-300/40 transition"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
// レア日フルスクリーンモーダル
// ============================================================

function RareDayModal({
  message,
  bonusCoins,
  bonusXpMultiplier,
  onClose,
}: {
  message: string;
  bonusCoins?: number;
  bonusXpMultiplier?: number;
  onClose?: () => void;
}) {
  return (
    <>
      <ParticleCanvas
        colors={['#a78bfa', '#818cf8', '#c4b5fd', '#e879f9', '#f0abfc']}
        density={80}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-auto fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-8 text-center shadow-2xl shadow-purple-900/60"
        >
          {/* 輝くリング */}
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                'conic-gradient(from 0deg, #a855f7, #6366f1, #ec4899, #a855f7)',
              filter: 'blur(2px)',
              opacity: 0.4,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <div className="relative z-10">
            <motion.p
              className="text-6xl"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ✨
            </motion.p>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
              ✦ レアデー ✦
            </h2>
            <p className="mt-2 text-purple-200">{message}</p>
            <div className="mt-4 flex justify-center gap-4 text-sm">
              {bonusCoins && (
                <span className="rounded-full bg-purple-700/60 px-3 py-1 text-purple-100">
                  🪙 +{bonusCoins} コイン
                </span>
              )}
              {bonusXpMultiplier && bonusXpMultiplier > 1 && (
                <span className="rounded-full bg-indigo-700/60 px-3 py-1 text-indigo-100">
                  ⚡ XP ×{bonusXpMultiplier}
                </span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 py-3 font-bold text-white shadow-lg hover:from-violet-400 hover:to-purple-400 transition"
            >
              チャットを始める！
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ============================================================
// 超レア日 — 全画面演出 + 手書き風メッセージ
// ============================================================

function UltraRareDayScreen({
  message,
  characterGreeting,
  bonusCoins,
  bonusXpMultiplier,
  onClose,
}: {
  message: string;
  characterGreeting?: string;
  bonusCoins?: number;
  bonusXpMultiplier?: number;
  onClose?: () => void;
}) {
  const [phase, setPhase] = useState<'intro' | 'letter'>('intro');

  return (
    <>
      <ParticleCanvas
        colors={['#fcd34d', '#fb923c', '#f472b6', '#34d399', '#60a5fa', '#ffffff']}
        density={120}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-auto fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, #1e1b4b 0%, #0f0a2e 50%, #000000 100%)',
        }}
      >
        <AnimatePresence mode="wait">
          {phase === 'intro' ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              className="text-center"
            >
              <motion.p
                className="text-8xl"
                animate={{
                  scale: [1, 1.2, 1],
                  filter: [
                    'drop-shadow(0 0 10px #fbbf24)',
                    'drop-shadow(0 0 30px #fbbf24)',
                    'drop-shadow(0 0 10px #fbbf24)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🌈
              </motion.p>
              <motion.h1
                className="mt-6 text-4xl font-black tracking-widest text-transparent"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #fde68a, #f9a8d4, #a5f3fc, #fde68a)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  backgroundSize: '200%',
                }}
                animate={{ backgroundPosition: ['0%', '200%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                超レアデー！！
              </motion.h1>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setPhase('letter')}
                className="mt-10 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-pink-500/40"
              >
                開封する 💌
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="letter"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="relative mx-4 max-w-md"
            >
              {/* 手紙風カード */}
              <div
                className="rounded-3xl p-8 shadow-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
                  boxShadow:
                    '0 25px 60px rgba(251, 191, 36, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.2)',
                }}
              >
                {/* 装飾ライン */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-amber-300" />
                  <span className="text-amber-600">✦</span>
                  <div className="h-px flex-1 bg-amber-300" />
                </div>

                {/* 手書き風フォントのメッセージ */}
                <p
                  className="text-center text-lg leading-relaxed text-amber-900"
                  style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", Georgia, serif' }}
                >
                  {characterGreeting ?? message}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-amber-300" />
                  <span className="text-amber-600">✦</span>
                  <div className="h-px flex-1 bg-amber-300" />
                </div>

                <div className="mt-4 flex justify-center gap-3 text-sm">
                  {bonusCoins && (
                    <span className="rounded-full bg-amber-200 px-3 py-1 text-amber-800 font-semibold">
                      🪙 +{bonusCoins} コイン
                    </span>
                  )}
                  {bonusXpMultiplier && bonusXpMultiplier > 1 && (
                    <span className="rounded-full bg-yellow-200 px-3 py-1 text-yellow-800 font-semibold">
                      ⚡ XP ×{bonusXpMultiplier}
                    </span>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-white shadow-lg"
              >
                特別な今日を始める！ 🌟
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ============================================================
// メインコンポーネント
// ============================================================

/**
 * DailyEventPopup
 *
 * 使い方:
 * ```tsx
 * <DailyEventPopup
 *   eventType="rare"
 *   message="限定エピソード解放"
 *   characterGreeting="ルフィ: ししし！今日は特別な日な気がする！"
 *   bonusCoins={30}
 *   bonusXpMultiplier={2.0}
 *   onClose={() => setEvent(null)}
 * />
 * ```
 */
export function DailyEventPopup({
  eventType,
  message,
  characterGreeting,
  bonusCoins,
  bonusXpMultiplier,
  onClose,
}: DailyEventPopupProps) {
  // 通常日 (null) は何もレンダリングしない
  if (!eventType) return null;

  return (
    <AnimatePresence>
      {eventType === 'good' && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[9998] flex justify-center">
          <GoodDayToast
            message={message}
            bonusCoins={bonusCoins}
            onClose={onClose}
          />
        </div>
      )}
      {eventType === 'rare' && (
        <RareDayModal
          message={message}
          bonusCoins={bonusCoins}
          bonusXpMultiplier={bonusXpMultiplier}
          onClose={onClose}
        />
      )}
      {eventType === 'ultra_rare' && (
        <UltraRareDayScreen
          message={message}
          characterGreeting={characterGreeting}
          bonusCoins={bonusCoins}
          bonusXpMultiplier={bonusXpMultiplier}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

export default DailyEventPopup;
