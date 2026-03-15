'use client';

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Relationship {
  id?: string;
  characterId: string;
  relatedName: string;
  relationshipType: string;
  description: string;
  keyEpisodes: string[];
  emotionalBond?: string;
}

const RELATIONSHIP_TYPES = [
  { value: '仲間', label: '🤝 仲間', color: '#10b981' },
  { value: 'ライバル', label: '⚔️ ライバル', color: '#ef4444' },
  { value: '兄弟', label: '👨‍👧 兄弟・姉妹', color: '#f59e0b' },
  { value: '恋人', label: '💕 恋人', color: '#ec4899' },
  { value: '師弟', label: '🎓 師弟', color: '#8b5cf6' },
  { value: '親友', label: '💛 親友', color: '#eab308' },
  { value: '敵', label: '👿 敵', color: '#dc2626' },
  { value: '家族', label: '👨‍👩‍👧 家族', color: '#06b6d4' },
  { value: '元恋人', label: '💔 元恋人', color: '#f87171' },
  { value: 'その他', label: '❓ その他', color: '#6b7280' },
] as const;

const EMPTY_FORM: Omit<Relationship, 'id' | 'characterId'> = {
  relatedName: '',
  relationshipType: '仲間',
  description: '',
  keyEpisodes: [],
  emotionalBond: '',
};

interface Props {
  characterId: string;
  characterName?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function RelationshipGraphEditor({ characterId, characterName }: Props) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Relationship, 'id' | 'characterId'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [episodeInput, setEpisodeInput] = useState('');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchRelationships() {
    try {
      const r = await fetch(`/api/admin/characters/${characterId}/relationships`);
      if (r.ok) {
        const data = await r.json();
        setRelationships(data.relationships ?? data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRelationships();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  function startEdit(rel: Relationship) {
    setEditingId(rel.id ?? null);
    setForm({
      relatedName: rel.relatedName,
      relationshipType: rel.relationshipType,
      description: rel.description,
      keyEpisodes: rel.keyEpisodes ?? [],
      emotionalBond: rel.emotionalBond ?? '',
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function addEpisode() {
    const ep = episodeInput.trim();
    if (!ep) return;
    setForm((f) => ({ ...f, keyEpisodes: [...f.keyEpisodes, ep] }));
    setEpisodeInput('');
  }

  function removeEpisode(idx: number) {
    setForm((f) => ({ ...f, keyEpisodes: f.keyEpisodes.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.relatedName.trim()) {
      showToast('相手の名前を入力してください', 'err');
      return;
    }
    setSaving(true);
    try {
      const payload: Relationship = {
        ...form,
        characterId,
        ...(editingId ? { id: editingId } : {}),
      };

      const url = editingId
        ? `/api/admin/characters/${characterId}/relationships/${editingId}`
        : `/api/admin/characters/${characterId}/relationships`;
      const method = editingId ? 'PUT' : 'POST';

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        showToast(editingId ? '関係性を更新しました' : '関係性を追加しました');
        setShowForm(false);
        fetchRelationships();
      } else {
        const err = await r.json();
        showToast(err.error ?? '保存に失敗しました', 'err');
      }
    } catch {
      showToast('ネットワークエラー', 'err');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const r = await fetch(`/api/admin/characters/${characterId}/relationships/${id}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        showToast('削除しました');
        setDeleteConfirm(null);
        fetchRelationships();
      } else {
        const err = await r.json();
        showToast(err.error ?? '削除に失敗しました', 'err');
      }
    } catch {
      showToast('ネットワークエラー', 'err');
    }
  }

  function getTypeInfo(type: string) {
    return RELATIONSHIP_TYPES.find((t) => t.value === type) ?? { value: type, label: type, color: '#6b7280' };
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${
            toast.type === 'ok'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            関係性グラフ{characterName ? ` — ${characterName}` : ''}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{relationships.length}件の関係性</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03]"
          style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          関係性追加
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <h4 className="text-sm font-semibold text-white">
            {editingId ? '関係性を編集' : '関係性を追加'}
          </h4>

          {/* Related name */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">相手の名前 *</label>
            <input
              type="text"
              value={form.relatedName}
              onChange={(e) => setForm((f) => ({ ...f, relatedName: e.target.value }))}
              placeholder="キャラ名または人物名"
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Relationship type */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">関係タイプ *</label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, relationshipType: t.value }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03] ${
                    form.relationshipType === t.value ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
                  }`}
                  style={{
                    background: form.relationshipType === t.value ? `${t.color}25` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.relationshipType === t.value ? `${t.color}60` : 'rgba(255,255,255,0.1)'}`,
                    color: form.relationshipType === t.value ? t.color : '#9ca3af',
                    // ringColor is not a valid CSS property; use outline instead if needed
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">関係の説明</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="この関係性について説明..."
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Emotional bond */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">感情的絆（任意）</label>
            <input
              type="text"
              value={form.emotionalBond ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, emotionalBond: e.target.value }))}
              placeholder="例: 信頼、憧れ、複雑な感情..."
              className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Key episodes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">重要エピソード</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={episodeInput}
                onChange={(e) => setEpisodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEpisode())}
                placeholder="エピソードを追加 (Enterで確定)"
                className="flex-1 px-3 py-1.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={addEpisode}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-violet-300 transition-all hover:scale-[1.03]"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.keyEpisodes.map((ep, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}
                >
                  {ep}
                  <button
                    onClick={() => removeEpisode(idx)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-400 transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }}
            >
              {saving ? '保存中...' : editingId ? '更新' : '追加'}
            </button>
          </div>
        </div>
      )}

      {/* Relationship list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      ) : relationships.length === 0 ? (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
        >
          <div className="text-3xl mb-2">🕸️</div>
          <p className="text-gray-500 text-sm">関係性がまだ登録されていません</p>
          <button
            onClick={startNew}
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            最初の関係性を追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {relationships.map((rel) => {
            const typeInfo = getTypeInfo(rel.relationshipType);
            return (
              <div
                key={rel.id}
                className="rounded-xl p-4 transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${typeInfo.color}25`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-white truncate">{rel.relatedName}</h4>
                    {rel.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{rel.description}</p>
                    )}
                    {rel.emotionalBond && (
                      <p className="text-xs text-gray-500 mt-1">💭 {rel.emotionalBond}</p>
                    )}
                    {rel.keyEpisodes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rel.keyEpisodes.slice(0, 3).map((ep, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}
                          >
                            {ep}
                          </span>
                        ))}
                        {rel.keyEpisodes.length > 3 && (
                          <span className="text-xs text-gray-600">+{rel.keyEpisodes.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(rel)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                      title="編集"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732Z" />
                      </svg>
                    </button>
                    {deleteConfirm === rel.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(rel.id!)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 transition-colors text-xs font-medium"
                          style={{ background: 'rgba(239,68,68,0.1)' }}
                        >
                          確認
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(rel.id!)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                        title="削除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
