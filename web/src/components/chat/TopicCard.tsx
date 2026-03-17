'use client';

import Image from 'next/image';
import type { Character } from './ChatMessageList';

interface Props {
  visible: boolean;
  topicText: string;
  character: Character | null;
  onClose: () => void;
  onSend: () => void;
}

export function TopicCard({ visible, topicText, character, onClose, onSend }: Props) {
  if (!visible || !topicText || !character) return null;

  return (
    <div className="px-3 pb-2">
      <div className="relative bg-purple-900/30 border border-purple-500/30 rounded-2xl p-3 flex items-start gap-3">
        <button
          className="absolute top-2 right-2 text-white/30 hover:text-white/60 transition-colors"
          onClick={onClose}
          aria-label="話題カードを閉じる"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/40">
          {character.avatarUrl ? (
            <Image src={character.avatarUrl} alt={character.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
              {character.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 mr-5">
          <p className="text-purple-300 text-[10px] font-semibold mb-1">📸 タイムラインの話題</p>
          <p className="text-white/70 text-xs leading-relaxed line-clamp-2">{topicText}</p>
          <button
            className="mt-2 flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95"
            onClick={onSend}
          >
            この話題で話す →
          </button>
        </div>
      </div>
    </div>
  );
}
