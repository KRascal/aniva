'use client';

import React, { useEffect, useState, useCallback } from 'react';

/* ─── Types ─── */
interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface Contract {
  id: string;
  tenantId: string;
  tenant?: { name: string; slug: string };
  contractCode: string;
  rightsHolder: string;
  targetWork: string;
  targetCharacters: string[];
  status: string;
  allowedRegions: string[];
  allowedLanguages: string[];
  startDate: string;
  endDate: string;
  renewalAlertDays: number;
  voiceAllowed: boolean;
  snsAllowed: boolean;
  adAllowed: boolean;
  aiTrainingAllowed: boolean;
  ragAllowed: boolean;
  thirdPartyAllowed: boolean;
  ugcAllowed: boolean;
  revenueSharePercent: number | null;
  minimumGuarantee: number | null;
  reportingCycle: string;
  supervisorName: string | null;
  supervisorEmail: string | null;
  supervisorPhone: string | null;
  contractDocUrl: string | null;
  notes: string | null;
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  createdAt: string;
}

/* ─── Constants ─── */
const STATUS_TABS = [
  { key: 'all', label: '全契約' },
  { key: 'negotiating', label: '交渉中' },
  { key: 'active', label: '有効' },
  { key: 'renewal_pending', label: '更新待ち' },
  { key: 'expired', label: '期限切れ' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  negotiating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  renewal_pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  terminated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  negotiating: '交渉中',
  active: '有効',
  renewal_pending: '更新待ち',
  expired: '期限切れ',
  terminated: '終了',
};

const REGIONS = ['JP', 'US', 'EU', 'CN', 'KR', 'TW', 'SEA', 'GLOBAL'];
const LANGUAGES = ['ja', 'en', 'zh', 'ko', 'fr', 'de', 'es', 'pt'];
const REPORTING_CYCLES = ['monthly', 'quarterly', 'annually'];

const RIGHTS_FIELDS: { key: keyof Contract; label: string }[] = [
  { key: 'voiceAllowed', label: '音声合成' },
  { key: 'snsAllowed', label: 'SNS' },
  { key: 'adAllowed', label: '広告' },
  { key: 'aiTrainingAllowed', label: 'AI学習' },
  { key: 'ragAllowed', label: 'RAG' },
  { key: 'thirdPartyAllowed', label: '第三者委託' },
  { key: 'ugcAllowed', label: 'UGC' },
];

const EMPTY_FORM = {
  tenantId: '',
  contractCode: '',
  rightsHolder: '',
  targetWork: '',
  targetCharacters: '',
  status: 'negotiating',
  allowedRegions: [] as string[],
  allowedLanguages: [] as string[],
  startDate: '',
  endDate: '',
  renewalAlertDays: 90,
  voiceAllowed: false,
  snsAllowed: false,
  adAllowed: false,
  aiTrainingAllowed: false,
  ragAllowed: false,
  thirdPartyAllowed: false,
  ugcAllowed: false,
  revenueSharePercent: '',
  minimumGuarantee: '',
  reportingCycle: 'monthly',
  supervisorName: '',
  supervisorEmail: '',
  supervisorPhone: '',
  contractDocUrl: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

/* ─── Component ─── */
export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch('/api/admin/contracts'),
        fetch('/api/admin/tenants'),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      setContracts(Array.isArray(cData) ? cData : []);
      setTenants(Array.isArray(tData) ? tData : []);
    } catch {
      setError('データの読み込みに失敗しました');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filters ── */
  const filtered = activeTab === 'all'
    ? contracts
    : contracts.filter((c) => c.status === activeTab);

  const expiringSoon = contracts.filter((c) => c.isExpiringSoon);
  const expired = contracts.filter((c) => c.isExpired);

  /* ── Form helpers ── */
  const f = (key: keyof FormState, val: FormState[keyof FormState]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleArrayItem = (key: 'allowedRegions' | 'allowedLanguages', item: string) => {
    setForm((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item] };
    });
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Contract) => {
    setForm({
      tenantId: c.tenantId,
      contractCode: c.contractCode,
      rightsHolder: c.rightsHolder,
      targetWork: c.targetWork,
      targetCharacters: c.targetCharacters.join(', '),
      status: c.status,
      allowedRegions: c.allowedRegions,
      allowedLanguages: c.allowedLanguages,
      startDate: c.startDate.slice(0, 10),
      endDate: c.endDate.slice(0, 10),
      renewalAlertDays: c.renewalAlertDays,
      voiceAllowed: c.voiceAllowed,
      snsAllowed: c.snsAllowed,
      adAllowed: c.adAllowed,
      aiTrainingAllowed: c.aiTrainingAllowed,
      ragAllowed: c.ragAllowed,
      thirdPartyAllowed: c.thirdPartyAllowed,
      ugcAllowed: c.ugcAllowed,
      revenueSharePercent: c.revenueSharePercent?.toString() ?? '',
      minimumGuarantee: c.minimumGuarantee?.toString() ?? '',
      reportingCycle: c.reportingCycle,
      supervisorName: c.supervisorName ?? '',
      supervisorEmail: c.supervisorEmail ?? '',
      supervisorPhone: c.supervisorPhone ?? '',
      contractDocUrl: c.contractDocUrl ?? '',
      notes: c.notes ?? '',
    });
    setEditingId(c.id);
    setError('');
    setShowModal(true);
  };

  const save = async () => {
    if (!form.contractCode || !form.rightsHolder || !form.targetWork || !form.startDate || !form.endDate) {
      setError('契約ID、権利者、作品名、期間は必須です');
      return;
    }
    if (!form.tenantId) {
      setError('テナントを選択してください');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        tenantId: form.tenantId,
        contractCode: form.contractCode,
        rightsHolder: form.rightsHolder,
        targetWork: form.targetWork,
        targetCharacters: form.targetCharacters ? form.targetCharacters.split(',').map((s) => s.trim()).filter(Boolean) : [],
        status: form.status,
        allowedRegions: form.allowedRegions,
        allowedLanguages: form.allowedLanguages,
        startDate: form.startDate,
        endDate: form.endDate,
        renewalAlertDays: form.renewalAlertDays,
        voiceAllowed: form.voiceAllowed,
        snsAllowed: form.snsAllowed,
        adAllowed: form.adAllowed,
        aiTrainingAllowed: form.aiTrainingAllowed,
        ragAllowed: form.ragAllowed,
        thirdPartyAllowed: form.thirdPartyAllowed,
        ugcAllowed: form.ugcAllowed,
        revenueSharePercent: form.revenueSharePercent ? parseFloat(form.revenueSharePercent) : null,
        minimumGuarantee: form.minimumGuarantee ? parseFloat(form.minimumGuarantee) : null,
        reportingCycle: form.reportingCycle,
        supervisorName: form.supervisorName || null,
        supervisorEmail: form.supervisorEmail || null,
        supervisorPhone: form.supervisorPhone || null,
        contractDocUrl: form.contractDocUrl || null,
        notes: form.notes || null,
      };

      const url = editingId ? `/api/admin/contracts/${editingId}` : '/api/admin/contracts';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存に失敗しました');
      }
      setShowModal(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/contracts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      setDeleteConfirm(null);
      load();
    } catch {
      setError('削除に失敗しました');
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ja-JP'); } catch { return d; }
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">契約管理</h1>
          <p className="text-gray-400 text-sm mt-1">IP利用契約の管理・追跡</p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 新規契約
        </button>
      </div>

      {/* Expiry Alerts */}
      {expired.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠</span>
          <div>
            <span className="text-red-400 font-medium text-sm">期限切れ契約: {expired.length}件</span>
            <span className="text-red-400/70 text-xs ml-2">
              {expired.slice(0, 3).map((c) => c.rightsHolder).join(', ')}
              {expired.length > 3 && ` 他${expired.length - 3}件`}
            </span>
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-yellow-400 text-lg">⏰</span>
          <div>
            <span className="text-yellow-400 font-medium text-sm">期限間近: {expiringSoon.length}件</span>
            <span className="text-yellow-400/70 text-xs ml-2">
              {expiringSoon.slice(0, 3).map((c) => `${c.rightsHolder}(残${c.daysUntilExpiry}日)`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === 'all' ? contracts.length : contracts.filter((c) => c.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2
                ${activeTab === tab.key ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">契約ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">権利者</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">作品</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">期間</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">状態</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">権利</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                    契約がありません
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr
                      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-white text-sm font-mono">{c.contractCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{c.rightsHolder}</span>
                        {c.tenant && <span className="text-gray-500 text-xs ml-1">({c.tenant.name})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm">{c.targetWork}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300 text-sm">{formatDate(c.startDate)} - {formatDate(c.endDate)}</div>
                        {c.isExpiringSoon && (
                          <span className="text-yellow-400 text-xs">残{c.daysUntilExpiry}日</span>
                        )}
                        {c.isExpired && (
                          <span className="text-red-400 text-xs">期限切れ</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[c.status] ?? STATUS_BADGE.terminated}`}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {RIGHTS_FIELDS.map((rf) => (
                            <span
                              key={rf.key}
                              title={rf.label}
                              className={`text-xs ${c[rf.key] ? 'text-green-400' : 'text-gray-600'}`}
                            >
                              {c[rf.key] ? '✓' : '✗'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                            className="text-gray-400 hover:text-red-400 text-sm transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Detail */}
                    {expandedId === c.id && (
                      <tr>
                        <td colSpan={7} className="bg-gray-800/30 px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 text-xs mb-1">対象キャラ</div>
                              <div className="text-gray-300">{c.targetCharacters.length > 0 ? c.targetCharacters.join(', ') : '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">地域</div>
                              <div className="text-gray-300">{c.allowedRegions.length > 0 ? c.allowedRegions.join(', ') : '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">言語</div>
                              <div className="text-gray-300">{c.allowedLanguages.length > 0 ? c.allowedLanguages.join(', ') : '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">レポートサイクル</div>
                              <div className="text-gray-300">{c.reportingCycle}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">レベニューシェア</div>
                              <div className="text-gray-300">{c.revenueSharePercent != null ? `${c.revenueSharePercent}%` : '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">最低保証金額</div>
                              <div className="text-gray-300">{c.minimumGuarantee != null ? `¥${c.minimumGuarantee.toLocaleString()}` : '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">監修責任者</div>
                              <div className="text-gray-300">{c.supervisorName ?? '—'}</div>
                              {c.supervisorEmail && <div className="text-gray-500 text-xs">{c.supervisorEmail}</div>}
                            </div>
                            <div>
                              <div className="text-gray-500 text-xs mb-1">契約書</div>
                              {c.contractDocUrl ? (
                                <a href={c.contractDocUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline text-xs">
                                  ドキュメントを開く
                                </a>
                              ) : (
                                <div className="text-gray-500">—</div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-gray-500 text-xs mb-1">権利項目</div>
                            <div className="flex flex-wrap gap-2">
                              {RIGHTS_FIELDS.map((rf) => (
                                <span
                                  key={rf.key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                                    c[rf.key]
                                      ? 'bg-green-500/10 text-green-400'
                                      : 'bg-gray-700/50 text-gray-500'
                                  }`}
                                >
                                  {c[rf.key] ? '✓' : '✗'} {rf.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          {c.notes && (
                            <div className="mt-3">
                              <div className="text-gray-500 text-xs mb-1">備考</div>
                              <div className="text-gray-300 text-sm">{c.notes}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-2">契約を削除しますか？</h3>
            <p className="text-gray-400 text-sm mb-4">この操作は取り消せません。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">{editingId ? '契約編集' : '新規契約作成'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors text-xl">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>
              )}

              {/* 基本情報 */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">基本情報</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">テナント *</label>
                    <select
                      value={form.tenantId}
                      onChange={(e) => f('tenantId', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">選択してください</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">契約ID *</label>
                    <input
                      value={form.contractCode}
                      onChange={(e) => f('contractCode', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="例: CTR-2026-001"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">権利者 *</label>
                    <input
                      value={form.rightsHolder}
                      onChange={(e) => f('rightsHolder', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">作品名 *</label>
                    <input
                      value={form.targetWork}
                      onChange={(e) => f('targetWork', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-400 text-xs mb-1">対象キャラ（カンマ区切り）</label>
                    <input
                      value={form.targetCharacters}
                      onChange={(e) => f('targetCharacters', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="キャラA, キャラB"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">ステータス</label>
                    <select
                      value={form.status}
                      onChange={(e) => f('status', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* 利用条件 */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">利用条件</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">開始日 *</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => f('startDate', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">終了日 *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => f('endDate', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">更新アラート（日前）</label>
                    <input
                      type="number"
                      value={form.renewalAlertDays}
                      onChange={(e) => f('renewalAlertDays', parseInt(e.target.value) || 90)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-gray-400 text-xs mb-2">地域</label>
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleArrayItem('allowedRegions', r)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.allowedRegions.includes(r)
                            ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-gray-400 text-xs mb-2">言語</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleArrayItem('allowedLanguages', l)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.allowedLanguages.includes(l)
                            ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 権利項目 */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">権利項目</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {RIGHTS_FIELDS.map((rf) => (
                    <label key={rf.key} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => f(rf.key as keyof FormState, !form[rf.key as keyof FormState])}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          form[rf.key as keyof FormState]
                            ? 'bg-purple-600 border-purple-600'
                            : 'bg-gray-800 border-gray-600'
                        }`}
                      >
                        {form[rf.key as keyof FormState] && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-300 text-sm">{rf.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* 収益 */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">収益</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">レベニューシェア (%)</label>
                    <input
                      type="number"
                      value={form.revenueSharePercent}
                      onChange={(e) => f('revenueSharePercent', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="例: 30"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">最低保証金額 (¥)</label>
                    <input
                      type="number"
                      value={form.minimumGuarantee}
                      onChange={(e) => f('minimumGuarantee', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="例: 100000"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">レポートサイクル</label>
                    <select
                      value={form.reportingCycle}
                      onChange={(e) => f('reportingCycle', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      {REPORTING_CYCLES.map((c) => (
                        <option key={c} value={c}>{c === 'monthly' ? '月次' : c === 'quarterly' ? '四半期' : '年次'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* 監修 */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">監修</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">責任者名</label>
                    <input
                      value={form.supervisorName}
                      onChange={(e) => f('supervisorName', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">メール</label>
                    <input
                      type="email"
                      value={form.supervisorEmail}
                      onChange={(e) => f('supervisorEmail', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">電話</label>
                    <input
                      value={form.supervisorPhone}
                      onChange={(e) => f('supervisorPhone', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </section>

              {/* ドキュメント */}
              <section>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">ドキュメント</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">契約書URL</label>
                    <input
                      value={form.contractDocUrl}
                      onChange={(e) => f('contractDocUrl', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">備考</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => f('notes', e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>
                </div>
              </section>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? '保存中...' : editingId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
