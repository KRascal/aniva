"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center px-6">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-purple-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ANIVA</h1>
          <p className="text-purple-300 text-sm mt-1">推しが実在する世界</p>
        </div>

        {/* Offline indicator */}
        <div className="mb-8">
          <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              className="w-8 h-8 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072m-2.828 9.9a9 9 0 010-12.728"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-100 mb-2">接続中...</h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
            インターネット接続を確認しています。
            <br />
            接続が回復すると自動的に再開されます。
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-full transition-colors duration-200"
        >
          再試行
        </button>

        {/* Footer note */}
        <p className="text-gray-600 text-xs mt-8">
          オフラインモード — キャッシュされたコンテンツを表示中
        </p>
      </div>
    </div>
  );
}
