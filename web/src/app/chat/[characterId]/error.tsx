'use client';

import { useEffect, useRef } from 'react';

export default function ChatCharacterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    console.error('[ChatCharacterError]', error.message, error.stack);
    
    if (!reloadAttempted.current) {
      reloadAttempted.current = true;
      const key = 'aniva_chat_char_reload';
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
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      background: '#030712', color: 'white', textAlign: 'center',
    }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, opacity: 0.8 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>チャットの読み込みに失敗しました</h2>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8, maxWidth: 300, wordBreak: 'break-all' }}>
        {error.message}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 280 }}>
        ネットワーク接続を確認して再試行してください
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
        >
          再試行
        </button>
        <button
          onClick={() => window.location.href = '/chat'}
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
        >
          チャット一覧
        </button>
      </div>
    </div>
  );
}
