'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: '#030712', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated gradient orb */}
          <div style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'pulse-orb 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
            bottom: '15%',
            right: '25%',
            animation: 'pulse-orb 5s ease-in-out infinite 1.5s',
          }} />

          <div style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            padding: '0 24px',
            maxWidth: 420,
            animation: 'fade-up 0.6s ease both',
          }}>
            {/* Icon */}
            <div style={{
              width: 80,
              height: 80,
              margin: '0 auto 32px',
              borderRadius: 20,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(139,92,246,0.15)',
              animation: 'fade-up 0.6s ease 0.15s both',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              letterSpacing: '-0.02em',
              animation: 'fade-up 0.6s ease 0.25s both',
            }}>
              予期せぬエラーが発生しました
            </h1>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 40,
              lineHeight: 1.6,
              animation: 'fade-up 0.6s ease 0.35s both',
            }}>
              ページの再読み込みで復旧する場合があります
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fade-up 0.6s ease 0.45s both' }}>
              <button
                onClick={reset}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.15s, opacity 0.15s',
                  boxShadow: '0 4px 24px rgba(124,58,237,0.3)',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                もう一度試す
              </button>

              <button
                onClick={() => window.location.href = '/'}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                トップに戻る
              </button>
            </div>

            {error.digest && (
              <p style={{
                marginTop: 32,
                fontSize: 10,
                color: 'rgba(255,255,255,0.15)',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                animation: 'fade-up 0.6s ease 0.7s both',
              }}>
                Error • {error.digest}
              </p>
            )}
          </div>
        </div>

        <style>{`
          @keyframes fade-up {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse-orb {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          }
        `}</style>
      </body>
    </html>
  );
}
