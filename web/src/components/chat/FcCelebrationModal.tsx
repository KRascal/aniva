'use client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  fcMonthlyCoins?: number | null;
}

export function FcCelebrationModal({ isOpen, onClose, characterName, fcMonthlyCoins }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-b from-[#1a0a2e] to-[#0d0d1a] border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        {/* キラキラエフェクト */}
        <div className="text-5xl mb-2 animate-bounce">🎉</div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {(['✨', '⭐', '💫', '🌟', '✨'] as const).map((s, i) => (
            <span
              key={i}
              className="absolute text-xl animate-ping opacity-70"
              style={{ top: `${15 + i * 16}%`, left: `${10 + i * 18}%`, animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}
            >
              {s}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">FC加入完了！</h2>
        <p className="text-white/80 text-sm mb-1">
          {characterName}のファンクラブへようこそ💖
        </p>
        <p className="text-white/60 text-xs mb-6">
          チャット無制限・月{fcMonthlyCoins ?? 500}コイン・特典コンテンツが解放されました
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base hover:opacity-90 transition"
        >
          {characterName}と話す ▶
        </button>
      </div>
    </div>
  );
}
