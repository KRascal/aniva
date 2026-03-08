'use client';

import { useEffect, useRef } from 'react';

export default function ChatError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    // あらゆるエラーで1回だけ自動リロード
    if (!reloadAttempted.current) {
      reloadAttempted.current = true;
      // sessionStorageでリロードループ防止
      const key = 'aniva_chat_reload';
      const last = sessionStorage.getItem(key);
      const now = Date.now();
      if (!last || now - parseInt(last) > 10000) {
        sessionStorage.setItem(key, String(now));
        window.location.reload();
        return;
      }
    }
  }, [error]);

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: '#030712', color: 'white', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.6 }}>💬</div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>読み込みエラー</h2>
      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', maxWidth: 280 }}>
        ページの読み込みに失敗しました。再試行してください。
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          color: 'white', border: 'none', borderRadius: 12,
          padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        再読み込み
      </button>
    </div>
  );
}
