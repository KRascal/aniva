'use client';

import { useEffect, useRef } from 'react';

export default function ChatError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    console.error('[ChatError]', error?.message, error?.digest);
    
    if (!reloadAttempted.current) {
      reloadAttempted.current = true;
      const key = 'aniva_chat_reload';
      const last = sessionStorage.getItem(key);
      const now = Date.now();
      if (!last || now - parseInt(last) > 10000) {
        sessionStorage.setItem(key, String(now));
        // キャッシュを完全クリアして強制リロード
        if ('caches' in window) {
          caches.keys().then(names => {
            Promise.all(names.map(n => caches.delete(n))).then(() => {
              window.location.reload();
            });
          }).catch(() => window.location.reload());
        } else {
          globalThis.location.reload();
        }
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
      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', maxWidth: 280 }}>
        ページの読み込みに失敗しました。
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => reset()}
          style={{
            background: 'rgba(255,255,255,0.1)',
            color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          リトライ
        </button>
        <button
          onClick={() => {
            if ('caches' in window) caches.keys().then(n => Promise.all(n.map(k => caches.delete(k))));
            window.location.href = '/chat';
          }}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
