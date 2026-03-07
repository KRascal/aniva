'use client';

import { useEffect, useState, useCallback } from 'react';

interface CoinPackage {
  id: string;
  name: string;
  coinAmount: number;
  priceWebJpy: number;
  priceStoreJpy: number;
  stripePriceId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const EMPTY_FORM = {
  name: '',
  coinAmount: 100,
  priceWebJpy: 120,
  priceStoreJpy: 160,
  stripePriceId: '',
  isActive: true,
  sortOrder: 0,
};

export default function AdminCoinsPage() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coins');
      const data = await res.json();
      setPackages(data.packages ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('コインパッケージ一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (pkg: CoinPackage) => {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      coinAmount: pkg.coinAmount,
      priceWebJpy: pkg.priceWebJpy,
      priceStoreJpy: pkg.priceStoreJpy,
      stripePriceId: pkg.stripePriceId ?? '',
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
    });
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
      name: form.name,
      coinAmount: Number(form.coinAmount),
      priceWebJpy: Number(form.priceWebJpy),
      priceStoreJpy: Number(form.priceStoreJpy),
      stripePriceId: form.stripePriceId || null,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder),
    };

    try {
      const res = await fetch('/api/admin/coins', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'エラーが発生しました');
      } else {
        setSuccess(editingId ? 'パッケージを更新しました' : 'パッケージを追加しました');
        setShowForm(false);
        setEditingId(null);
        fetchPackages();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
    try {
      const res = await fetch(`/api/admin/coins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '削除に失敗しました');
      } else {
        setSuccess('パッケージを削除しました');
        fetchPackages();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  const handleToggleActive = async (pkg: CoinPackage) => {
    try {
      const res = await fetch('/api/admin/coins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? '更新に失敗しました');
      } else {
        fetchPackages();
      }
    } catch {
      setError('通信エラーが発生しました');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🪙 コインパッケージ管理</h1>
          <p className="text-gray-400 text-sm mt-1">パッケージ数: {total}</p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          ＋ パッケージ追加
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
            {editingId ? 'パッケージを編集' : '新しいパッケージを追加'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">パッケージ名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例: スターターパック 100コイン"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">コイン数 *</label>
              <input
                type="number"
                value={form.coinAmount}
                onChange={(e) => setForm({ ...form, coinAmount: Number(e.target.value) })}
                required
                min={1}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Web価格 (JPY) *</label>
              <input
                type="number"
                value={form.priceWebJpy}
                onChange={(e) => setForm({ ...form, priceWebJpy: Number(e.target.value) })}
                required
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">ストア価格 (JPY) *</label>
              <input
                type="number"
                value={form.priceStoreJpy}
                onChange={(e) => setForm({ ...form, priceStoreJpy: Number(e.target.value) })}
                required
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Stripe Price ID</label>
              <input
                type="text"
                value={form.stripePriceId}
                onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
                placeholder="price_..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">表示順</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                min={0}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="flex items-center mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                有効にする
              </label>
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

      {/* 一覧テーブル */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">パッケージがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">名前</th>
                  <th className="px-4 py-3 text-right">コイン数</th>
                  <th className="px-4 py-3 text-right">Web価格</th>
                  <th className="px-4 py-3 text-right">ストア価格</th>
                  <th className="px-4 py-3 text-left">Stripe ID</th>
                  <th className="px-4 py-3 text-center">表示順</th>
                  <th className="px-4 py-3 text-center">状態</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-750 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{pkg.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-mono">{pkg.coinAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-300">¥{pkg.priceWebJpy.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-300">¥{pkg.priceStoreJpy.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      {pkg.stripePriceId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">{pkg.sortOrder}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(pkg)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pkg.isActive
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {pkg.isActive ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="px-3 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 rounded text-xs transition"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id, pkg.name)}
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
