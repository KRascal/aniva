'use client';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">😤</div>
        <h2 className="text-xl font-bold text-white mb-2">エラーが発生しました</h2>
        <p className="text-gray-400 mb-6 text-sm">ルフィも驚いている...</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            もう一度試す
          </button>
          <a href="/chat" className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium">
            キャラ選択に戻る
          </a>
        </div>
      </div>
    </div>
  );
}
