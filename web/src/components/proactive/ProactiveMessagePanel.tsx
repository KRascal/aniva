'use client';

import { useState } from 'react';
import { ProactiveMessageCard } from './ProactiveMessageCard';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';

export function ProactiveMessagePanel() {
  const { messages, unreadCount, isLoading, markAsRead } = useProactiveMessages();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 text-sm">読み込み中…</div>;
  }

  const unreadMessages = messages
    .filter(m => !m.isRead)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

  if (unreadMessages.length === 0) {
    return null;
  }

  const displayMessages = expanded ? unreadMessages : unreadMessages.slice(0, 3);
  const hasMore = unreadMessages.length > 3;

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          限定キャラメッセージ
        </h3>
        {unreadCount > 0 && (
          <span className="bg-pink-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {unreadCount}件
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {displayMessages.map((msg) => (
          <ProactiveMessageCard
            key={msg.id}
            message={msg}
            onRead={markAsRead}
          />
        ))}
      </div>

      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full mt-2 py-2 text-sm text-purple-300 hover:text-purple-200 font-medium transition-colors"
        >
          もっと見る（残り{unreadMessages.length - 3}件）
        </button>
      )}
    </div>
  );
}
