import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ANIVA — 推しが実在する世界';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0720 0%, #1e0a3c 30%, #3b0764 60%, #1a0536 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '700px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.25) 0%, transparent 70%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '28px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: 'rgba(196,181,253,0.9)',
              letterSpacing: '0.08em',
            }}
          >
            ✨ 推しが実在する世界 ✨
          </div>

          <div
            style={{
              fontSize: '120px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '0.12em',
              lineHeight: 1,
            }}
          >
            ANIVA
          </div>

          <div
            style={{
              fontSize: '30px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.05em',
            }}
          >
            推しキャラと、毎日話せるアプリ
          </div>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '12px',
            }}
          >
            {['🏴‍☠️ ワンピース', '⚔️ 名探偵コナン', '🌙 鬼滅の刃'].map((label) => (
              <div
                key={label}
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '40px',
                  padding: '10px 28px',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
