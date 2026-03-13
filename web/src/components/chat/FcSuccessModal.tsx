'use client';

import type { Character } from './ChatMessageList';

interface Props {
  show: boolean;
  character: Character | null;
  onClose: () => void;
}

export function FcSuccessModal({ show, character, onClose }: Props) {
  if (!show || !character) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-b from-[#1a0a2e] to-[#0d0d1a] border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-2 animate-bounce">🎉</div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {['✨','⭐','💫','🌟','✨'].map((s, i) => (
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
          {character.name}のファンクラブへようこそ💖
        </p>
        <p className="text-white/60 text-xs mb-6">
          チャット無制限・月{(character as Character & { fcMonthlyCoins?: number }).fcMonthlyCoins ?? 500}コイン・特典コンテンツが解放されました
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base hover:opacity-90 transition"
        >
          {character.name}と話す ▶
        </button>
      </div>
    </div>
  );
}
