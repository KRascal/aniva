import type { FloatingHeart } from './types';

export function FloatingHearts({ hearts }: { hearts: FloatingHeart[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute text-red-400 text-lg"
          style={{
            left: h.x,
            bottom: 24,
            animation: 'floatHeart 1.2s ease-out forwards',
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}
