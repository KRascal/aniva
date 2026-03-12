'use client';

import type { Character, RelationshipInfo } from './types';

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

export function ChatRow({
  character,
  relationship,
  hasUnread,
  unreadCount = 0,
  isPinned = false,
  isMuted = false,
  isFanclub = false,
  onClick,
}: {
  character: Character;
  relationship: RelationshipInfo;
  hasUnread: boolean;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isFanclub?: boolean;
  onClick: () => void;
}) {
  const lastMsg = relationship.lastMessage;
  const lastAt = relationship.lastMessageAt;

  const previewText = lastMsg
    ? (lastMsg.role === 'USER' ? `あなた: ${lastMsg.content}` : lastMsg.content)
    : 'メッセージを送ってみよう！';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 active:bg-gray-800/70 transition-colors text-left"
    >
      {/* アバター — LINE風 丸型 + FCキャラは金枠 + ピン留めバッジ */}
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-full overflow-hidden ${
          isFanclub
            ? 'ring-2 ring-yellow-400/60 shadow-sm shadow-yellow-400/20'
            : ''
        }`}>
          {character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg font-bold text-white">
              {character.name.charAt(0)}
            </div>
          )}
        </div>
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-950" />
        )}
        {isPinned && (
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-yellow-500 border-2 border-gray-950 flex items-center justify-center" title="ピン留め">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M16 2l-4 4-6-2-2 2 4.5 4.5L2 17l1 1 6.5-6.5L14 16l2-2-2-6 4-4-2-2z"/>
            </svg>
          </span>
        )}
      </div>

      {/* テキスト情報 — LINE風コンパクト */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-white text-sm truncate">{character.name}</span>
          {isFanclub && (
            <span className="flex-shrink-0 text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full border border-yellow-500/30 font-bold">FC</span>
          )}
          {isMuted && (
            <span className="flex-shrink-0" title="通知オフ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
              </svg>
            </span>
          )}
          <span className="text-[10px] text-gray-500 flex-shrink-0 ml-auto">{formatTime(lastAt)}</span>
        </div>
        <p className="text-sm text-gray-400 truncate mt-0.5">
          {previewText}
        </p>
      </div>

      {/* 未読カウント */}
      {hasUnread && unreadCount > 0 && (
        <div className="flex-shrink-0">
          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
