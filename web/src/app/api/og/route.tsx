import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a0033 0%, #0d0015 50%, #1a0533 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative glow circles */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '30%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '20%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: '-2px',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}
          >
            ANIVA
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#d1d5db',
              marginTop: 16,
              letterSpacing: '2px',
              display: 'flex',
            }}
          >
            あなただけのAIパートナー
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 32,
              marginTop: 40,
            }}
          >
            {['記憶する', '成長する', '驚かせる'].map((text) => (
              <div
                key={text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 24px',
                  borderRadius: 50,
                  background: 'rgba(139,92,246,0.2)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  color: '#c084fc',
                  fontSize: 22,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
