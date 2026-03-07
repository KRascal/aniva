'use client';

import { useEffect, useState, useCallback } from 'react';

interface NotificationRecord {
  id: string;
  userId: string;
  user: { id: string; email: string; displayName: string | null };
  title: string;
  body: string;
  targetUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  title: '',
  body: '',
  targetUrl: '',
  targetUserId: '',
  targetMode: 'all' as 'all' | 'user',
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('通知履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('タイトルと本文は必須です');
      return;
    }
    if (form.targetMode === 'user' && !form.targetUserId.trim()) {
      setError('ユーザーIDを入力してください');
      return;
    }

    const confirmed = form.targetMode === 'all'
      ? confirm('全ユーザーに通知を送信しますか？この操作は取り消せません。')
      : confirm(`ユーザー ${form.targetUserId} に通知を送信しますか？`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title: form.title,
      body: form.body,
      targetUrl: form.targetUrl || undefined,
      ...(form.targetMode === 'user' ? { targetUserId: form.targetUserId } : {}),
    };

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(`通知を送信しました（${data.sentCount}件）`);
        setForm(EMPTY_FORM);
        fetchNotifications();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🔔 通知配信</h1>
        <p className="text-gray-400 text-sm mt-1">送信済み通知数: {total}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* 送信フォーム */}
      <div className="mb-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">📨 新規通知を送信</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">タイトル *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="通知タイトル"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">本文 *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
              rows={3}
              placeholder="通知の本文"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">リンクURL（任意）</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
              placeholder="https://..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">送信対象</label>
            <select
              value={form.targetMode}
              onChange={(e) => setForm({ ...form, targetMode: e.target.value as 'all' | 'user' })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="all">全ユーザー</option>
              <option value="user">特定ユーザー</option>
            </select>
          </div>

          {form.targetMode === 'user' && (
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">ユーザーID *</label>
              <input
                type="text"
                value={form.targetUserId}
                onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                placeholder="ユーザーUUID"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono"
              />
            </div>
          )}

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  送信中...
                </>
              ) : (
                <>🔔 通知を送信</>
              )}
            </button>
            {form.targetMode === 'all' && (
              <p className="text-gray-500 text-xs mt-2">⚠️ 全ユーザーに一斉送信されます。確認ダイアログが表示されます。</p>
            )}
          </div>
        </form>
      </div>

      {/* 送信履歴 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">📋 送信履歴（管理者送信分）</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">送信済み通知がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">タイトル</th>
                    <th className="px-4 py-3 text-left">本文</th>
                    <th className="px-4 py-3 text-left">送信先</th>
                    <th className="px-4 py-3 text-center">既読</th>
                    <th className="px-4 py-3 text-left">送信日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {notifications.map((notif) => (
                    <tr key={notif.id} className="hover:bg-gray-750 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{notif.title}</div>
                        {notif.targetUrl && (
                          <a
                            href={notif.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 text-xs hover:underline truncate block max-w-xs"
                          >
                            {notif.targetUrl}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs">
                        <div className="truncate">{notif.body}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        <div>{notif.user.displayName ?? notif.user.email}</div>
                        <div className="text-gray-600 font-mono">{notif.userId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notif.isRead
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {notif.isRead ? '既読' : '未読'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(notif.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
