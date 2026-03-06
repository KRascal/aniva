'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ProactiveMessage {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatarUrl: string | null;
  characterSlug: string;
  content: string;
  expiresAt: string;
  remainingMs: number;
  isRead: boolean;
  createdAt: string;
}

interface UseProactiveMessagesReturn {
  messages: ProactiveMessage[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<string | null>; // returns chatUrl
  refresh: () => void;
}

export function useProactiveMessages(): UseProactiveMessagesReturn {
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/proactive-messages');
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    // 5分ごとにポーリング
    const interval = setInterval(fetchMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const markAsRead = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/proactive-messages/${id}/read`, { method: 'POST' });
      if (!res.ok) return null;
      const data = await res.json();
      // ローカル状態更新
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return data.chatUrl ?? null;
    } catch {
      return null;
    }
  }, []);

  return { messages, unreadCount, isLoading, markAsRead, refresh: fetchMessages };
}
