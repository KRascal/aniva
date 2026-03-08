'use client';

import { useEffect, useRef } from 'react';

/**
 * Global error boundary — NO external dependencies (framer-motion etc.)
 * If this component itself fails to load chunks, the whole app is broken.
 * Keep it inline-styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloadAttempted = useRef(false);

  useEffect(() => {
    console.error('[GlobalError]', error.message, error.stack);

    // Auto-reload once on ChunkLoadError
    if (!reloadAttempted.current && error.message?.includes('ChunkLoadError')) {
      reloadAttempted.current = true;
      const key = 'aniva_global_reload';
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.2))',
        border: '2px solid rgba(124,58,237,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
        予期しないエラーが発生しました
      </h2>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8, maxWidth: 300, wordBreak: 'break-all' }}>
        {error.message}
      </p>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
        問題が続く場合は、キャッシュをクリアして再度お試しください
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => reset()}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: 'white',
            border: 'none', borderRadius: 12, padding: '12px 28px',
            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          再試行
        </button>
        <button
          onClick={() => { window.location.href = '/explore'; }}
          style={{
            background: 'rgba(255,255,255,0.08)', color: 'white',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
            padding: '12px 28px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ホームへ
        </button>
      </div>
    </div>
  );
}
