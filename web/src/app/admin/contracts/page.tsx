'use client';

import { useState, useEffect, useCallback } from 'react';

// ---- Types ----
interface Tenant { id: string; name: string; slug: string; }
interface Contract {
  id: string;
  tenantId: string;
  tenant: Tenant | null;
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
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
  createdAt: string;
}

interface FormState {
  tenantId: string;
  contractCode: string;
  rightsHolder: string;
  targetWork: string;
  targetCharacters: string;
  status: string;
  allowedRegions: string;
  allowedLanguages: string;
  startDate: string;
  endDate: string;
  renewalAlertDays: string;
  voiceAllowed: boolean;
  snsAllowed: boolean;
  adAllowed: boolean;
  aiTrainingAllowed: boolean;
  ragAllowed: boolean;
  thirdPartyAllowed: boolean;
  ugcAllowed: boolean;
  revenueSharePercent: string;
  minimumGuarantee: string;
  reportingCycle: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone: string;
  contractDocUrl: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  tenantId: '', contractCode: '', rightsHolder: '', targetWork: '',
  targetCharacters: '', status: 'negotiating', allowedRegions: '',
  allowedLanguages: '', startDate: '', endDate: '', renewalAlertDays: '90',
  voiceAllowed: false, snsAllowed: false, adAllowed: false, aiTrainingAllowed: false,
  ragAllowed: false, thirdPartyAllowed: false, ugcAllowed: false,
  revenueSharePercent: '', minimumGuarantee: '', reportingCycle: 'monthly',
  supervisorName: '', supervisorEmail: '', supervisorPhone: '',
  contractDocUrl: '', notes: '',
};

const STATUS_OPTIONS = [
  { value: 'negotiating', label: '交渉中', color: 'bg-blue-800/50 text-blue-300' },
  { value: 'active', label: '有効', color: 'bg-green-700/50 text-green-300' },
  { value: 'pending_renewal', label: '更新待ち', color: 'bg-yellow-800/50 text-yellow-300' },
  { value: 'expired', label: '期限切れ', color: 'bg-red-900/50 text-red-300' },
  { value: 'terminated', label: '解約', color: 'bg-gray-700 text-gray-400' },
];

function toDateInput(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toISOString().split('T')[0];
}

function statusBadge(status: string) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  return <span className={`px-2 py-0.5 rounded text-xs ${opt?.color ?? 'bg-gray-700 text-gray-400'}`}>{opt?.label ?? status}</span>;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch('/api/admin/contracts'),
        fetch('/api/admin/tenants'),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      setContracts(cData.contracts ?? []);
      setTenants(tData.tenants ?? []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterStatus
    ? contracts.filter(c => c.status === filterStatus)
    : contracts;

  const expiringSoon = contracts.filter(c => c.isExpiringSoon && c.status === 'active');

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c: Contract) {
    setEditId(c.id);
    setForm({
      tenantId: c.tenantId,
      contractCode: c.contractCode,
      rightsHolder: c.rightsHolder,
      targetWork: c.targetWork,
      targetCharacters: c.targetCharacters.join(', '),
      status: c.status,
      allowedRegions: c.allowedRegions.join(', '),
      allowedLanguages: c.allowedLanguages.join(', '),
      startDate: toDateInput(c.startDate),
      endDate: toDateInput(c.endDate),
      renewalAlertDays: String(c.renewalAlertDays),
      voiceAllowed: c.voiceAllowed,
      snsAllowed: c.snsAllowed,
      adAllowed: c.adAllowed,
      aiTrainingAllowed: c.aiTrainingAllowed,
      ragAllowed: c.ragAllowed,
      thirdPartyAllowed: c.thirdPartyAllowed,
      ugcAllowed: c.ugcAllowed,
      revenueSharePercent: c.revenueSharePercent != null ? String(c.revenueSharePercent) : '',
      minimumGuarantee: c.minimumGuarantee != null ? String(c.minimumGuarantee) : '',
      reportingCycle: c.reportingCycle,
      supervisorName: c.supervisorName ?? '',
      supervisorEmail: c.supervisorEmail ?? '',
      supervisorPhone: c.supervisorPhone ?? '',
      contractDocUrl: c.contractDocUrl ?? '',
      notes: c.notes ?? '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetCharacters: form.targetCharacters.split(',').map(s => s.trim()).filter(Boolean),
        allowedRegions: form.allowedRegions.split(',').map(s => s.trim()).filter(Boolean),
        allowedLanguages: form.allowedLanguages.split(',').map(s => s.trim()).filter(Boolean),
        renewalAlertDays: parseInt(form.renewalAlertDays) || 90,
        revenueSharePercent: form.revenueSharePercent ? parseFloat(form.revenueSharePercent) : null,
        minimumGuarantee: form.minimumGuarantee ? parseFloat(form.minimumGuarantee) : null,
      };

      const url = editId ? `/api/admin/contracts/${editId}` : '/api/admin/contracts';
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setModalOpen(false);
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('この契約を削除しますか？')) return;
    await fetch(`/api/admin/contracts/${id}`, { method: 'DELETE' });
    fetchData();
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">📄 権利・契約管理</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
          + 新規契約登録
        </button>
      </div>

      {/* 期限アラート */}
      {expiringSoon.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
          <span className="text-yellow-300 text-sm font-medium">⚠️ {expiringSoon.length}件の契約が更新期限に近づいています</span>
          <div className="mt-1 text-xs text-yellow-400">
            {expiringSoon.map(c => (
              <span key={c.id} className="mr-4">{c.contractCode}: 残り{c.daysUntilExpiry}日</span>
            ))}
          </div>
        </div>
      )}

      {/* ステータスフィルタ */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterStatus ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          全契約 ({contracts.length})
        </button>
        {STATUS_OPTIONS.map(opt => {
          const count = contracts.filter(c => c.status === opt.value).length;
          return (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === opt.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {opt.label} ({count})
            </button>
          );
        })}
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="text-gray-400 text-center py-12">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto bg-gray-900 rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                <th className="text-left px-4 py-3">契約ID</th>
                <th className="text-left px-4 py-3">権利者</th>
                <th className="text-left px-4 py-3">作品</th>
                <th className="text-left px-4 py-3">テナント</th>
                <th className="text-left px-4 py-3">期間</th>
                <th className="text-left px-4 py-3">状態</th>
                <th className="text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-white font-mono text-xs">{c.contractCode}</td>
                  <td className="px-4 py-3 text-white">{c.rightsHolder}</td>
                  <td className="px-4 py-3 text-white">{c.targetWork}</td>
                  <td className="px-4 py-3 text-gray-400">{c.tenant?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {toDateInput(c.startDate)} 〜 {toDateInput(c.endDate)}
                    {c.isExpiringSoon && <span className="ml-1 text-yellow-400">⚠️</span>}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-purple-400 hover:text-purple-300 text-xs mr-3">編集</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">契約がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalOpen(false)}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{editId ? '契約編集' : '新規契約登録'}</h2>

            <div className="grid grid-cols-2 gap-4">
              {/* 基本情報 */}
              <div>
                <label className={labelCls}>テナント</label>
                <select value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))} className={inputCls}>
                  <option value="">選択...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>契約コード</label>
                <input value={form.contractCode} onChange={e => setForm(f => ({ ...f, contractCode: e.target.value }))} className={inputCls} placeholder="CT-001" />
              </div>
              <div>
                <label className={labelCls}>権利者</label>
                <input value={form.rightsHolder} onChange={e => setForm(f => ({ ...f, rightsHolder: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>対象作品</label>
                <input value={form.targetWork} onChange={e => setForm(f => ({ ...f, targetWork: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>対象キャラクター（カンマ区切り）</label>
                <input value={form.targetCharacters} onChange={e => setForm(f => ({ ...f, targetCharacters: e.target.value }))} className={inputCls} placeholder="ルフィ, ナミ, ゾロ" />
              </div>
              <div>
                <label className={labelCls}>ステータス</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>レポート周期</label>
                <select value={form.reportingCycle} onChange={e => setForm(f => ({ ...f, reportingCycle: e.target.value }))} className={inputCls}>
                  <option value="monthly">月次</option>
                  <option value="quarterly">四半期</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>開始日</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>終了日</label>
                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
              </div>

              {/* 権利項目 */}
              <div className="col-span-2 border-t border-gray-700 pt-3 mt-2">
                <p className="text-xs text-gray-400 mb-2 font-medium">権利項目</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ['voiceAllowed', '音声合成'],
                    ['snsAllowed', 'SNS投稿'],
                    ['adAllowed', '広告利用'],
                    ['aiTrainingAllowed', 'AI学習'],
                    ['ragAllowed', 'RAG/検索'],
                    ['thirdPartyAllowed', '第三者委託'],
                    ['ugcAllowed', 'UGC利用'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-gray-300">
                      <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                        className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 収益 */}
              <div>
                <label className={labelCls}>レベニューシェア（%）</label>
                <input value={form.revenueSharePercent} onChange={e => setForm(f => ({ ...f, revenueSharePercent: e.target.value }))} className={inputCls} placeholder="30" />
              </div>
              <div>
                <label className={labelCls}>最低保証（円）</label>
                <input value={form.minimumGuarantee} onChange={e => setForm(f => ({ ...f, minimumGuarantee: e.target.value }))} className={inputCls} placeholder="5000000" />
              </div>

              {/* 監修 */}
              <div>
                <label className={labelCls}>監修責任者名</label>
                <input value={form.supervisorName} onChange={e => setForm(f => ({ ...f, supervisorName: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>監修メール</label>
                <input value={form.supervisorEmail} onChange={e => setForm(f => ({ ...f, supervisorEmail: e.target.value }))} className={inputCls} />
              </div>

              {/* メモ */}
              <div className="col-span-2">
                <label className={labelCls}>備考</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? '保存中...' : editId ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
