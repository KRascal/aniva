'use client';

import { useEffect, useState, useCallback } from 'react';

interface Character {
  id: string;
  name: string;
  avatarUrl: string | null;
  slug: string;
}

interface ShopItem {
  id: string;
  characterId: string;
  character: { id: string; name: string; avatarUrl: string | null; slug: string };
  name: string;
  description: string | null;
  type: string;
  priceCoins: number;
  priceJpy: number | null;
  imageUrl: string | null;
  fileUrl: string | null;
  stock: number | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
}

const ITEM_TYPES = [
  { value: 'digital_wallpaper', label: '📱 デジタル壁紙' },
  { value: 'digital_voice', label: '🎙 ボイス' },
  { value: 'digital_illustration', label: '🎨 イラスト' },
  { value: 'physical_goods', label: '📦 物理グッズ' },
  { value: 'other', label: '🛍 その他' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.label])
);

const EMPTY_FORM = {
  characterId: '',
  name: '',
  description: '',
  type: 'digital_wallpaper',
  priceCoins: 100,
  priceJpy: '',
  imageUrl: '',
  fileUrl: '',
  stock: '',
  isActive: true,
};

export default function AdminShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shop');
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('商品一覧の取得に失敗しました');
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
    fetchItems();
    fetchCharacters();
  }, [fetchItems, fetchCharacters]);

  const handleEdit = (item: ShopItem) => {
    setEditingId(item.id);
    setForm({
      characterId: item.characterId,
      name: item.name,
      description: item.description ?? '',
      type: item.type,
      priceCoins: item.priceCoins,
      priceJpy: item.priceJpy !== null ? String(item.priceJpy) : '',
      imageUrl: item.imageUrl ?? '',
      fileUrl: item.fileUrl ?? '',
      stock: item.stock !== null ? String(item.stock) : '',
      isActive: item.isActive,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccess(null);
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
      ...(editingId ? { id: editingId } : {}),
      characterId: form.characterId,
      name: form.name,
      description: form.description || null,
      type: form.type,
      priceCoins: Number(form.priceCoins),
      priceJpy: form.priceJpy ? Number(form.priceJpy) : null,
      imageUrl: form.imageUrl || null,
      fileUrl: form.fileUrl || null,
      stock: form.stock ? Number(form.stock) : null,
      isActive: form.isActive,
    };

    try {
      const res = await fetch('/api/admin/shop', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(editingId ? '商品を更新しました' : '商品を追加しました');
        setShowForm(false);
        setEditingId(null);
        fetchItems();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を非公開にしますか？（注文履歴は保持されます）`)) return;
    try {
      const res = await fetch(`/api/admin/shop?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '削除に失敗しました');
      } else {
        setSuccess('商品を非公開にしました');
        fetchItems();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  const handleToggleActive = async (item: ShopItem) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '更新に失敗しました');
      } else {
        fetchItems();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🛍 ショップ管理</h1>
          <p className="text-gray-400 text-sm mt-1">商品数: {total}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          ＋ 商品追加
        </button>
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

      {/* フォーム */}
      {showForm && (
        <div className="mb-6 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? '商品を編集' : '新しい商品を追加'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">キャラクター *</label>
              <select
                value={form.characterId}
                onChange={(e) => setForm({ ...form, characterId: e.target.value })}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">選択してください</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">商品タイプ *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">商品名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例: 限定壁紙パック"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="商品の詳細説明"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">コイン価格 *</label>
              <input
                type="number"
                value={form.priceCoins}
                onChange={(e) => setForm({ ...form, priceCoins: Number(e.target.value) })}
                required
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">円価格（物理グッズ用）</label>
              <input
                type="number"
                value={form.priceJpy}
                onChange={(e) => setForm({ ...form, priceJpy: e.target.value })}
                min={0}
                placeholder="任意"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">在庫数（物理グッズ用・空=無限）</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                min={0}
                placeholder="空欄=無限"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                公開する
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">画像URL</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">ファイルURL（デジタル商品DL）</label>
              <input
                type="url"
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                {submitting ? '保存中...' : editingId ? '更新する' : '追加する'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 商品一覧テーブル */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">商品がありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">商品名</th>
                  <th className="px-4 py-3 text-left">キャラ</th>
                  <th className="px-4 py-3 text-left">タイプ</th>
                  <th className="px-4 py-3 text-right">コイン</th>
                  <th className="px-4 py-3 text-right">円</th>
                  <th className="px-4 py-3 text-right">在庫</th>
                  <th className="px-4 py-3 text-right">注文数</th>
                  <th className="px-4 py-3 text-center">状態</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-750 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{item.name}</div>
                      {item.description && (
                        <div className="text-gray-400 text-xs truncate max-w-xs">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.character.name}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-mono">{item.priceCoins}</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {item.priceJpy !== null ? `¥${item.priceJpy.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {item.stock !== null ? item.stock : '∞'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{item._count.orders}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.isActive
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {item.isActive ? '公開中' : '非公開'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 rounded text-xs transition"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded text-xs transition"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
