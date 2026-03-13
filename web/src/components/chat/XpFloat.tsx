'use client';

interface XpFloatProps {
  xpFloat: { amount: number; id: number } | null;
}

export function XpFloat({ xpFloat }: XpFloatProps) {
  if (!xpFloat) return null;

  return (
    <div
      key={xpFloat.id}
      className="fixed z-50 pointer-events-none select-none"
      style={{
        bottom: '120px',
        right: '20px',
        animation: 'xpFloatUp 2s ease-out forwards',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(219,39,119,0.9))',
          boxShadow: '0 2px 12px rgba(124,58,237,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span className="text-sm">💫</span>
        <span className="text-white font-black text-sm">+{xpFloat.amount} XP</span>
      </div>
    </div>
  );
}
