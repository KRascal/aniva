'use client';

export default function GachaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎴</span>
        </div>
        <h2 className="text-white font-bold text-lg mb-2">ガチャが読み込めませんでした</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          しばらく時間をおいて再度お試しください
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-gradient-to-r from-yellow-600 to-amber-600 text-white text-sm font-bold rounded-full hover:from-yellow-500 hover:to-amber-500 transition-all"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
