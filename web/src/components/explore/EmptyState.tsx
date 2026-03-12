'use client';

import { useRouter } from 'next/navigation';

export interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        <svg className="w-7 h-7 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <p className="text-white/60 text-sm font-medium mb-1">{message ?? '新しいキャラクターがまもなく登場'}</p>
      <p className="text-white/30 text-xs leading-relaxed text-center mb-5">
        あなたを待っているキャラクターがいます
      </p>
      <button
        onClick={() => router.push('/discover')}
        className="px-5 py-2.5 rounded-full text-xs font-bold text-white transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(236,72,153,0.85))',
          boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
        }}
      >
        スワイプで探す
      </button>
    </div>
  );
}
