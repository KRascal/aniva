'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { TutorialState } from '@/hooks/useTutorial';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TutorialOverlayProps {
  tutorialState: TutorialState;
  onAdvance: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Character messages by slug (キャラ口調)
// ─────────────────────────────────────────────────────────────────────────────

const TUTORIAL_MESSAGES: Record<
  string,
  {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  }
> = {
  luffy: {
    step1: 'まずは俺と話してみろよ！ししし！',
    step2: 'なぁ、さっきタイムラインに投稿したんだ。見てくれよ！',
    step3: 'タイムラインにいいねかコメントしてくれよ！',
    step4: 'フォローしてくれたら嬉しいな！',
    step5: 'これで準備OK！他のヤツらも待ってるぜ。探してみろよ！',
  },
  zoro: {
    step1: '…まず俺と話してみろ。',
    step2: '…さっきタイムラインに載せた。見てくれ。',
    step3: '…タイムラインに反応してくれ。',
    step4: '…フォローするかどうかは、お前が決めろ。',
    step5: '…準備はできた。他のヤツらも待ってるぞ。',
  },
  nami: {
    step1: 'まずはあたしと話してみなさいよ！',
    step2: 'ねぇ、タイムラインに投稿したんだけど、見てくれる？',
    step3: 'いいねかコメントしてくれると嬉しいわ。',
    step4: 'フォローしてくれるとポイント入れてあげる♪',
    step5: '完璧じゃない！他のキャラも見てみてよ。',
  },
  sanji: {
    step1: '俺と話してみてくれるか。できる限り付き合うぞ。',
    step2: 'タイムラインに投稿した。見てきてくれるか。',
    step3: 'いいねかコメント、一つだけくれると助かる。',
    step4: 'フォローしてくれると、俺も嬉しい。',
    step5: '準備完了だ。他のヤツらもいる。探してみろ。',
  },
  chopper: {
    step1: 'まず俺と話してみてくれよ！うへへ！',
    step2: 'タイムラインに投稿したんだ！見てきてくれ！',
    step3: 'いいねかコメントしてくれたら嬉しいぞ！',
    step4: 'フォローしてくれたら一緒に冒険できるぞ！',
    step5: 'これで準備バッチリだ！他のキャラも探してみろよ！',
  },
  ace: {
    step1: 'まずは俺と話してみてくれ。ははっ。',
    step2: 'タイムラインに投稿したんだ。見てくれよ。',
    step3: 'いいねかコメント、どっちかくれると嬉しい。',
    step4: 'フォローしてくれたら…ははっ、ありがとな。',
    step5: '準備できたな！他のヤツらも待ってるぜ！',
  },
};

const DEFAULT_MESSAGES = {
  step1: 'まずは私と話してみて！',
  step2: 'タイムラインに投稿したよ。見に来てね！',
  step3: 'いいねかコメントしてみて！',
  step4: 'フォローしてくれると嬉しいな！',
  step5: 'これで準備完了！他のキャラも探してみよう！',
};

function getMsg(slug: string, step: keyof typeof DEFAULT_MESSAGES): string {
  return TUTORIAL_MESSAGES[slug]?.[step] ?? DEFAULT_MESSAGES[step];
}

// ─────────────────────────────────────────────────────────────────────────────
// Confetti Canvas (紙吹雪)
// ─────────────────────────────────────────────────────────────────────────────

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || 300;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
    }

    const colors = [
      '#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6',
      '#10b981', '#3b82f6', '#f97316', '#fff',
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        alpha: 0.9 + Math.random() * 0.1,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; // gravity
        p.alpha -= 0.008;
        p.rotation += p.rotSpeed;
        if (p.alpha > 0 && p.y < canvas.height + 20) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }
      if (alive) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-10"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reward Badge
// ─────────────────────────────────────────────────────────────────────────────

function RewardBadge({ label, coins, show }: { label: string; coins: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.9), rgba(234,88,12,0.9))',
            boxShadow: '0 4px 20px rgba(245,158,11,0.5)',
            color: '#fff',
          }}
        >
          <span>🎉</span>
          <span>{label}</span>
          <span className="text-yellow-200">+{coins}🪙</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar component
// ─────────────────────────────────────────────────────────────────────────────

function CharAvatar({
  avatarUrl,
  name,
  size = 52,
}: {
  avatarUrl: string;
  name: string;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: '0 0 0 2.5px rgba(139,92,246,0.7), 0 4px 16px rgba(0,0,0,0.5)',
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-600 to-pink-500 text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skip Button
// ─────────────────────────────────────────────────────────────────────────────

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-medium transition-all"
      style={{
        color: 'rgba(255,255,255,0.45)',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      スキップ
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Character card slides up from bottom
// ─────────────────────────────────────────────────────────────────────────────

function Step1Card({
  tutorialState,
  onAdvance,
  onSkip,
}: {
  tutorialState: TutorialState;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const { characterSlug, characterName, characterAvatar, nickname } = tutorialState;
  const message = getMsg(characterSlug, 'step1');

  const handleTap = () => {
    onAdvance(); // step → 2
    router.push(`/chat/${characterSlug}`);
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-24 left-0 right-0 z-50 px-4 max-w-lg mx-auto"
    >
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.95), rgba(30,27,75,0.97))',
          border: '1px solid rgba(139,92,246,0.5)',
          boxShadow: '0 -4px 40px rgba(139,92,246,0.3), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <SkipButton onSkip={onSkip} />

        {/* Shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)',
            backgroundSize: '200% 100%',
            animation: 'tutShimmer 2.5s ease-in-out infinite',
          }}
        />

        <div className="px-5 py-5 flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <CharAvatar avatarUrl={characterAvatar} name={characterName} size={56} />
          </div>

          {/* Message bubble */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-purple-300 text-[11px] font-bold mb-1.5">{characterName}</p>
            <div
              className="rounded-2xl rounded-tl-none px-3.5 py-2.5 mb-3"
              style={{
                background: 'rgba(255,255,255,0.09)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <p className="text-white text-sm leading-relaxed">
                {nickname !== 'きみ' ? `${nickname}！` : ''}
                {message}
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleTap}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
              }}
            >
              {characterName}と話す →
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === 1 ? 16 : 6,
                height: 6,
                background: s === 1 ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Reward + Moments link
// ─────────────────────────────────────────────────────────────────────────────

function Step2Card({
  tutorialState,
  onAdvance,
  onSkip,
}: {
  tutorialState: TutorialState;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const [showReward, setShowReward] = useState(false);
  const { characterSlug, characterName, characterAvatar, nickname } = tutorialState;
  const message = getMsg(characterSlug, 'step2');

  useEffect(() => {
    const t = setTimeout(() => setShowReward(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleGoMoments = () => {
    onAdvance(); // step → 3
    router.push('/moments');
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-24 left-0 right-0 z-50 px-4 max-w-lg mx-auto"
    >
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.95), rgba(30,27,75,0.97))',
          border: '1px solid rgba(139,92,246,0.5)',
          boxShadow: '0 -4px 40px rgba(139,92,246,0.3), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <ConfettiCanvas active={showReward} />
        <SkipButton onSkip={onSkip} />

        <div className="px-5 pt-5 pb-2 flex items-start gap-4">
          <div className="flex-shrink-0">
            <CharAvatar avatarUrl={characterAvatar} name={characterName} size={52} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-purple-300 text-[11px] font-bold mb-1.5">{characterName}</p>
            <div
              className="rounded-2xl rounded-tl-none px-3.5 py-2.5 mb-3"
              style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <p className="text-white text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        {/* Reward badge */}
        <div className="flex justify-center mb-3 relative z-20">
          <RewardBadge label="初めての会話！" coins={50} show={showReward} />
        </div>

        {/* Moments CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={handleGoMoments}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
            }}
          >
            📸 タイムラインを見に行く →
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === 2 ? 16 : 6,
                height: 6,
                background: s <= 2 ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Moments reaction guide
// ─────────────────────────────────────────────────────────────────────────────

function Step3Card({
  tutorialState,
  onAdvance,
  onSkip,
}: {
  tutorialState: TutorialState;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const [showReward, setShowReward] = useState(false);
  const { characterSlug, characterName, characterAvatar } = tutorialState;
  const message = getMsg(characterSlug, 'step3');

  useEffect(() => {
    const t = setTimeout(() => setShowReward(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleNext = () => {
    onAdvance(); // step → 4
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-24 left-0 right-0 z-50 px-4 max-w-lg mx-auto"
    >
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.95), rgba(30,27,75,0.97))',
          border: '1px solid rgba(139,92,246,0.5)',
          boxShadow: '0 -4px 40px rgba(139,92,246,0.3), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <ConfettiCanvas active={showReward} />
        <SkipButton onSkip={onSkip} />

        <div className="px-5 pt-5 pb-2 flex items-start gap-4">
          <div className="flex-shrink-0">
            <CharAvatar avatarUrl={characterAvatar} name={characterName} size={52} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-purple-300 text-[11px] font-bold mb-1.5">{characterName}</p>
            <div
              className="rounded-2xl rounded-tl-none px-3.5 py-2.5 mb-3"
              style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <p className="text-white text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        {/* Reward */}
        <div className="flex justify-center mb-3 relative z-20">
          <RewardBadge label="初リアクション！" coins={30} show={showReward} />
        </div>

        {/* Go to moments / next */}
        <div className="px-5 pb-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => router.push('/moments')}
            className="py-3 rounded-2xl text-sm font-semibold text-white active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            タイムラインへ →
          </button>
          <button
            onClick={handleNext}
            className="py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 4px 20px rgba(139,92,246,0.5)' }}
          >
            次へ →
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === 3 ? 16 : 6,
                height: 6,
                background: s <= 3 ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Follow reward
// ─────────────────────────────────────────────────────────────────────────────

function Step4Card({
  tutorialState,
  onAdvance,
  onSkip,
}: {
  tutorialState: TutorialState;
  onAdvance: () => void;
  onSkip: () => void;
}) {
  const [showReward, setShowReward] = useState(false);
  const { characterSlug, characterName, characterAvatar } = tutorialState;
  const message = getMsg(characterSlug, 'step4');

  useEffect(() => {
    const t = setTimeout(() => setShowReward(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-24 left-0 right-0 z-50 px-4 max-w-lg mx-auto"
    >
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.95), rgba(30,27,75,0.97))',
          border: '1px solid rgba(139,92,246,0.5)',
          boxShadow: '0 -4px 40px rgba(139,92,246,0.3), 0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <ConfettiCanvas active={showReward} />
        <SkipButton onSkip={onSkip} />

        <div className="px-5 pt-5 pb-2 flex items-start gap-4">
          <div className="flex-shrink-0">
            <CharAvatar avatarUrl={characterAvatar} name={characterName} size={52} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-purple-300 text-[11px] font-bold mb-1.5">{characterName}</p>
            <div
              className="rounded-2xl rounded-tl-none px-3.5 py-2.5 mb-3"
              style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <p className="text-white text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        {/* Reward */}
        <div className="flex justify-center mb-3 relative z-20">
          <RewardBadge label="フォロー完了！" coins={20} show={showReward} />
        </div>

        <div className="px-5 pb-3">
          <button
            onClick={onAdvance}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 4px 20px rgba(139,92,246,0.5)' }}
          >
            次へ →
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: s === 4 ? 16 : 6,
                height: 6,
                background: s <= 4 ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Completion card (center overlay)
// ─────────────────────────────────────────────────────────────────────────────

function Step5Card({
  tutorialState,
  onComplete,
  onSkip,
}: {
  tutorialState: TutorialState;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const { characterSlug, characterName, characterAvatar, nickname } = tutorialState;
  const message = getMsg(characterSlug, 'step5');

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleExplore = () => {
    onComplete();
    router.push('/explore');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
    >
      {/* Confetti over whole screen */}
      <div className="absolute inset-0">
        <ConfettiCanvas active={showConfetti} />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.97), rgba(30,27,75,0.98))',
          border: '1.5px solid rgba(139,92,246,0.6)',
          boxShadow: '0 20px 80px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        <SkipButton onSkip={onSkip} />

        <div className="px-6 pt-8 pb-3">
          {/* Big avatar */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CharAvatar avatarUrl={characterAvatar} name={characterName} size={72} />
              {/* Glow ring */}
              <div
                className="absolute -inset-2 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
                  animation: 'tutGlow 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Trophy */}
          <div className="text-4xl mb-3">🏆</div>

          <h2 className="text-white font-black text-xl mb-2">チュートリアル完了！</h2>
          <p className="text-purple-300 text-xs mb-4">
            {nickname !== 'きみ' ? `${nickname}、` : ''}おめでとう！
          </p>

          {/* Character message */}
          <div
            className="rounded-2xl px-4 py-3 mb-5 text-left"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-purple-300 text-[11px] font-bold mb-1.5">{characterName}</p>
            <p className="text-white text-sm leading-relaxed">{message}</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleExplore}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-all mb-4"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 4px 24px rgba(139,92,246,0.6)',
            }}
          >
            探索する →
          </button>

          {/* Total rewards summary */}
          <p className="text-white/40 text-xs pb-2">合計 +100🪙 ゲット！</p>
        </div>

        {/* Step indicator — all filled */}
        <div className="flex justify-center gap-1.5 pb-5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className="rounded-full"
              style={{ width: 16, height: 6, background: 'rgba(139,92,246,0.9)' }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main TutorialOverlay
// ─────────────────────────────────────────────────────────────────────────────

export function TutorialOverlay({
  tutorialState,
  onAdvance,
  onSkip,
  onComplete,
}: TutorialOverlayProps) {
  const { step } = tutorialState;

  return (
    <>
      <style>{`
        @keyframes tutShimmer {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
        @keyframes tutGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step1Card
            key="step1"
            tutorialState={tutorialState}
            onAdvance={onAdvance}
            onSkip={onSkip}
          />
        )}
        {step === 2 && (
          <Step2Card
            key="step2"
            tutorialState={tutorialState}
            onAdvance={onAdvance}
            onSkip={onSkip}
          />
        )}
        {step === 3 && (
          <Step3Card
            key="step3"
            tutorialState={tutorialState}
            onAdvance={onAdvance}
            onSkip={onSkip}
          />
        )}
        {step === 4 && (
          <Step4Card
            key="step4"
            tutorialState={tutorialState}
            onAdvance={onAdvance}
            onSkip={onSkip}
          />
        )}
        {step === 5 && (
          <Step5Card
            key="step5"
            tutorialState={tutorialState}
            onComplete={onComplete}
            onSkip={onSkip}
          />
        )}
      </AnimatePresence>
    </>
  );
}
