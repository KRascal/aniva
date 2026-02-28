import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ANIVAキャラクタープロフィール';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { characterId: string } }) {
  let characterName = 'キャラクター';
  let avatarUrl: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/characters/id/${params.characterId}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.character) {
        characterName = data.character.name;
        avatarUrl = data.character.avatarUrl;
      }
    }
  } catch {
    // fallback to defaults
  }

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
          background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 35%, #be185d 70%, #f43f5e 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '50px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.1em',
            }}
          >
            ANIVA
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={characterName}
              width={200}
              height={200}
              style={{
                borderRadius: '50%',
                border: '6px solid rgba(255,255,255,0.3)',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '6px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px',
              }}
            >
              🌟
            </div>
          )}

          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            {characterName}
          </div>

          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '50px',
              padding: '14px 48px',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            ANIVAで{characterName}と話そう ✨
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
