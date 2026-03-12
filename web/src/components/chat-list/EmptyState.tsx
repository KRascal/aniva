'use client';

import { getDailyState } from '@/lib/character-daily-state';
import type { Character, RelationshipInfo } from './types';

interface EmptyStateProps {
  characters: Character[];
  relationships: Map<string, RelationshipInfo>;
  onNavigate: (path: string) => void;
}

export function EmptyState({ characters, relationships, onNavigate }: EmptyStateProps) {
  const suggestedChars = characters
    .filter(c => relationships.get(c.id)?.isFollowing)
    .slice(0, 3);
  const displayChars = suggestedChars.length > 0 ? suggestedChars : characters.slice(0, 3);

  return (
    <div className="flex flex-col items-center py-16 px-6">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))',
          border: '1px solid rgba(139,92,246,0.2)',
        }}
      >
        <svg className="w-9 h-9 text-purple-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>

      <h3 className="text-white font-bold text-lg mb-2">キャラと話してみよう</h3>
      <p className="text-gray-400 text-sm leading-relaxed text-center mb-8 max-w-[260px]">
        好きなキャラクターを選んで、<br />最初の会話を始めてみよう
      </p>

      {displayChars.length > 0 && (
        <div className="w-full space-y-2.5 mb-8">
          {displayChars.map((c) => {
            const state = getDailyState(c.slug ?? c.id);
            return (
              <button
                key={c.id}
                onClick={() => onNavigate(`/chat/${c.slug || c.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{c.name}</p>
                  <p className="text-gray-500 text-xs truncate">{state.moodEmoji} {state.mood} — {c.franchise}</p>
                </div>
                <span className="text-purple-400 text-xs font-semibold flex-shrink-0">話す →</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => onNavigate('/discover')}
        className="px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(236,72,153,0.9))',
          boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
        }}
      >
        もっとキャラを探す
      </button>
    </div>
  );
}
