'use client';

import { ProactiveMessageCard } from './ProactiveMessageCard';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';

export function ProactiveMessagePanel() {
  const { messages, unreadCount, isLoading, markAsRead } = useProactiveMessages();

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 text-sm">読み込み中…</div>;
  }

  if (messages.length === 0) {
    return null; // メッセージなし時は非表示
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          キャラからのメッセージ
        </h3>
        {unreadCount > 0 && (
          <span className="bg-pink-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {unreadCount}件
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {messages.map((msg) => (
          <ProactiveMessageCard
            key={msg.id}
            message={msg}
            onRead={markAsRead}
          />
        ))}
      </div>
    </div>
  );
}
