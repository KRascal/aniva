'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface LimitedEvent {
  id: string;
  characterId: string;
  character: { id: string; name: string };
  title: string;
  description: string | null;
  content: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  characterId: '',
  title: '',
  description: '',
  content: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toLocalInput(iso: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function isActive(event: LimitedEvent) {
  const now = Date.now();
  return event.isActive && new Date(event.startsAt).getTime() <= now && new Date(event.endsAt).getTime() >= now;
}

function eventStatus(event: LimitedEvent): { label: string; color: string; bg: string } {
  if (!event.isActive) return { label: '無効', color: 'text-gray-400', bg: 'rgba(107,114,128,0.15)' };
  const now = Date.now();
  if (new Date(event.startsAt).getTime() > now) return { label: '開始前', color: 'text-blue-400', bg: 'rgba(59,130,246,0.15)' };
  if (new Date(event.endsAt).getTime() < now) return { label: '終了', color: 'text-gray-500', bg: 'rgba(107,114,128,0.1)' };
  return { label: '開催中', color: 'text-green-400', bg: 'rgba(34,197,94,0.15)' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const [events, setEvents] = useState<LimitedEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('イベント一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/characters?limit=100');
      const data = await res.json();
      setCharacters(data.characters ?? data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchCharacters();
  }, [fetchEvents, fetchCharacters]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (event: LimitedEvent) => {
    setEditingId(event.id);
    setForm({
      characterId: event.characterId,
      title: event.title,
      description: event.description ?? '',
      content: event.content,
      startsAt: toLocalInput(event.startsAt),
      endsAt: toLocalInput(event.endsAt),
      isActive: event.isActive,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      characterId: form.characterId,
      title: form.title,
      description: form.description || null,
      content: form.content,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      isActive: form.isActive,
    };

    try {
      const url = editingId ? `/api/admin/events/${editingId}` : '/api/admin/events';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(editingId ? 'イベントを更新しました' : 'イベントを作成しました');
        setShowForm(false);
        setEditingId(null);
        fetchEvents();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '削除に失敗しました');
      } else {
        setSuccess('イベントを削除しました');
        fetchEvents();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  const handleToggleActive = async (event: LimitedEvent) => {
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !event.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '更新に失敗しました');
      } else {
        fetchEvents();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  // ── AI Event Plan ─────────────────────────────────────────────────────────────

  const handleAiPlan = async () => {
    if (!form.characterId) {
      setError('キャラクターを先に選択してください');
      return;
    }
    setAiPlanning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/characters/ai-event-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: form.characterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'AI企画の生成に失敗しました');
      } else {
        // Fill form with AI suggestions
        setForm((f) => ({
          ...f,
          title: data.title ?? f.title,
          description: data.description ?? f.description,
          content: data.content ?? f.content,
        }));
        setSuccess('AIがイベントを企画しました。内容を確認・編集してください。');
      }
    } catch {
      setError('AI企画の生成中にエラーが発生しました');
    } finally {
      setAiPlanning(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">✨ イベント管理</h1>
          <p className="text-gray-400 text-sm mt-1">限定イベント数: {total}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 text-white rounded-xl font-medium transition hover:opacity-90 text-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
        >
          ＋ イベント作成
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl text-sm text-green-300" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div
          className="mb-6 rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? '✏️ イベントを編集' : '🆕 新しいイベントを作成'}
            </h2>
            {/* AI Plan button */}
            <button
              type="button"
              onClick={handleAiPlan}
              disabled={aiPlanning || !form.characterId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}
            >
              {aiPlanning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  企画中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                  </svg>
                  AIで企画
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Character */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">対象キャラクター *</label>
                <select
                  value={form.characterId}
                  onChange={(e) => setForm({ ...form, characterId: e.target.value })}
                  required
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="">キャラクターを選択</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="イベントタイトル"
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">開始日時 *</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  required
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                />
              </div>

              {/* End date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">終了日時 *</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  required
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="イベントの概要説明"
                className="w-full rounded-xl px-3 py-2 text-white text-sm resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">シナリオ内容 *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={5}
                required
                placeholder="イベントシナリオの本文"
                className="w-full rounded-xl px-3 py-2 text-white text-sm resize-y"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-violet-500"
              />
              有効にする
            </label>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-white rounded-xl font-medium transition disabled:opacity-50 text-sm hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
              >
                {submitting ? '保存中...' : editingId ? '更新する' : '作成する'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 rounded-xl font-medium text-sm text-gray-400 hover:text-white transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {loading ? (
          <div className="p-10 text-center text-gray-500">読み込み中...</div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-gray-500">イベントがありません</p>
            <button onClick={handleNew} className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition">
              最初のイベントを作成する →
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider font-semibold text-gray-600"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="col-span-4">タイトル</div>
              <div className="col-span-2">キャラ</div>
              <div className="col-span-2">開始</div>
              <div className="col-span-2">終了</div>
              <div className="col-span-1 text-center">状態</div>
              <div className="col-span-1 text-center">操作</div>
            </div>

            {events.map((event) => {
              const status = eventStatus(event);
              return (
                <div
                  key={event.id}
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition group"
                >
                  {/* Title */}
                  <div className="col-span-4 min-w-0">
                    <div className="font-medium text-white truncate">{event.title}</div>
                    {event.description && (
                      <div className="text-gray-500 text-xs truncate mt-0.5">{event.description}</div>
                    )}
                  </div>

                  {/* Character */}
                  <div className="col-span-2 text-gray-300 text-sm truncate">{event.character.name}</div>

                  {/* Start */}
                  <div className="col-span-2 text-gray-400 text-xs">{formatDate(event.startsAt)}</div>

                  {/* End */}
                  <div className="col-span-2 text-gray-400 text-xs">{formatDate(event.endsAt)}</div>

                  {/* Status */}
                  <div className="col-span-1 text-center">
                    <button
                      onClick={() => handleToggleActive(event)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition hover:opacity-80"
                      style={{ background: status.bg, color: status.color.replace('text-', '') }}
                    >
                      <span className={status.color}>{status.label}</span>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-1.5 rounded-lg transition text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(event.id, event.title)}
                      className="p-1.5 rounded-lg transition text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
