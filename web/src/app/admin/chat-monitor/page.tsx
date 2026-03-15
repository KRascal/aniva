'use client';

import { useCallback, useEffect, useState } from 'react';

interface ChatMessage {
  id: string;
  role: 'USER' | 'CHARACTER';
  content: string;
  createdAt: string;
  conversationId: string;
  character: { id: string; name: string; avatarUrl: string | null };
  user: { id: string; email: string | null; displayName: string | null };
}

interface FilterOption {
  id: string;
  name?: string;
  email?: string | null;
  displayName?: string | null;
}

export default function ChatMonitorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<FilterOption[]>([]);
  const [users, setUsers] = useState<FilterOption[]>([]);

  const [filterChar, setFilterChar] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterChar) params.set('characterId', filterChar);
      if (filterUser) params.set('userId', filterUser);
      if (filterFrom) params.set('from', new Date(filterFrom).toISOString());
      if (filterTo) params.set('to', new Date(filterTo + 'T23:59:59').toISOString());

      const res = await fetch('/api/admin/chat-monitor?' + params.toString());
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.filters) {
        setCharacters(data.filters.characters ?? []);
        setUsers(data.filters.users ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterChar, filterUser, filterFrom, filterTo]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">チャットモニター</h1>
        <p className="text-gray-500 text-sm mt-1">全キャラクター横断・リアルタイムチャットログ（SUPER_ADMIN限定）</p>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Character filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">キャラクター</label>
            <select
              value={filterChar}
              onChange={(e) => setFilterChar(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="">全キャラ</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* User filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">ユーザー</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="">全ユーザー</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email || u.id}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchMessages}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
          >
            適用
          </button>
          <button
            onClick={() => {
              setFilterChar('');
              setFilterUser('');
              setFilterFrom('');
              setFilterTo('');
            }}
            className="px-5 py-2 rounded-xl text-sm text-gray-400 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            リセット
          </button>
          <span className="ml-auto text-xs text-gray-600 self-center">
            {messages.length} 件表示
          </span>
        </div>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-gray-500">メッセージが見つかりません</div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl p-4"
              style={{
                background: msg.role === 'USER'
                  ? 'rgba(124,58,237,0.08)'
                  : 'rgba(219,39,119,0.08)',
                border: msg.role === 'USER'
                  ? '1px solid rgba(124,58,237,0.2)'
                  : '1px solid rgba(219,39,119,0.2)',
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role badge */}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: msg.role === 'USER' ? 'rgba(124,58,237,0.3)' : 'rgba(219,39,119,0.3)',
                      color: msg.role === 'USER' ? '#c4b5fd' : '#fbcfe8',
                    }}
                  >
                    {msg.role === 'USER' ? 'ユーザー' : 'キャラ'}
                  </span>
                  {/* Character */}
                  <span className="text-sm font-semibold text-pink-300">
                    {msg.character.name}
                  </span>
                  <span className="text-gray-600 text-xs">×</span>
                  {/* User */}
                  <span className="text-sm text-violet-300">
                    {msg.user.displayName || msg.user.email || msg.user.id}
                  </span>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {new Date(msg.createdAt).toLocaleString('ja-JP')}
                </span>
              </div>
              <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">
                {msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
