'use client';

interface OnboardingOverlayProps {
  character: { name: string; franchise: string };
  onStart: () => void;
}

export function OnboardingOverlay({ character, onStart }: OnboardingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 px-8 py-12 max-w-sm w-full animate-fadeIn">
        {/* 大きな絵文字アイコン */}
        <div className="text-7xl animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          🏴‍☠️
        </div>

        {/* キャラクター名 + 作品名 */}
        <div className="text-center animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-2xl font-bold text-white">{character.name}</h1>
          <p className="text-sm text-purple-300 mt-1">{character.franchise}</p>
        </div>

        {/* キャッチコピー */}
        <div
          className="text-center animate-fadeIn"
          style={{ animationDelay: '0.3s' }}
        >
          <p className="text-lg text-gray-200 font-medium">
            「推しが実在する世界へようこそ」
          </p>
        </div>

        {/* 区切り線 */}
        <div
          className="w-full border-t border-purple-700/50 animate-fadeIn"
          style={{ animationDelay: '0.4s' }}
        />

        {/* サブテキスト */}
        <p
          className="text-sm text-gray-400 text-center animate-fadeIn"
          style={{ animationDelay: '0.5s' }}
        >
          {character.name}があなたと話す準備ができています
        </p>

        {/* CTA ボタン */}
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-all shadow-lg shadow-purple-900/40 animate-fadeIn"
          style={{ animationDelay: '0.6s' }}
        >
          💬 {character.name}と話し始める
        </button>
      </div>
    </div>
  );
}
