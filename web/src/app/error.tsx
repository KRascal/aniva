'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Server Actionの不一致エラー → 自動リロードでキャッシュ更新
    if (
      error.message?.includes('Failed to find Server Action') ||
      error.message?.includes('older or newer deployment')
    ) {
      window.location.reload();
      return;
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
        <p className="text-gray-400 mb-6">{error.message}</p>
        <button onClick={reset} className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700">
          再試行
        </button>
      </div>
    </div>
  );
}
