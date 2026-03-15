'use client';

import { useEffect, useState, useCallback } from 'react';

type EconomyConfig = {
  chatCoinCost: number;
  imageCoinCost: number;
  deepChatCoinCost: number;
  crosstalkCostPerChar: number;
  gachaSingleCost: number;
  gacha10Cost: number;
  fcFreeMessagesPerDay: number;
  fcFreeCoinsPerMonth: number;
};

const FIELD_META: {
  key: keyof EconomyConfig;
  label: string;
  desc: string;
  icon: string;
  section: string;
}[] = [
  { key: 'chatCoinCost',         label: 'チャット',         desc: '通常チャット1回あたり',  icon: '💬', section: 'chat' },
  { key: 'imageCoinCost',        label: '画像Vision',       desc: '画像付きチャット1回',     icon: '🖼️', section: 'chat' },
  { key: 'deepChatCoinCost',     label: '深い会話',         desc: '深い会話モード1回',       icon: '🌊', section: 'chat' },
  { key: 'crosstalkCostPerChar', label: '掛け合い/キャラ',  desc: 'キャラ1体あたりの費用',   icon: '🎭', section: 'chat' },
  { key: 'gachaSingleCost',      label: 'ガチャ単発',       desc: '1回引き',                 icon: '🎰', section: 'gacha' },
  { key: 'gacha10Cost',          label: 'ガチャ10連',       desc: '10連一括',                icon: '🎲', section: 'gacha' },
  { key: 'fcFreeMessagesPerDay', label: 'FC無料チャット/日', desc: 'FC会員1日あたり無料数',  icon: '⭐', section: 'fc' },
  { key: 'fcFreeCoinsPerMonth',  label: 'FC無料コイン/月',  desc: 'FC会員月間付与コイン',    icon: '🪙', section: 'fc' },
];

const SECTION_META = {
  chat:  { label: 'チャットコスト', color: 'from-violet-600/20 to-indigo-600/20', border: 'border-violet-700/30' },
  gacha: { label: 'ガチャコスト',   color: 'from-yellow-600/20 to-orange-600/20', border: 'border-yellow-700/30' },
  fc:    { label: 'FC会員特典',     color: 'from-pink-600/20 to-rose-600/20',     border: 'border-pink-700/30' },
};

export default function EconomyPage() {
  const [config, setConfig] = useState<EconomyConfig | null>(null);
  const [defaults, setDefaults] = useState<EconomyConfig | null>(null);
  const [draft, setDraft] = useState<EconomyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/economy');
      if (!r.ok) throw new Error('load failed');
      const data = await r.json() as { config: EconomyConfig; defaults: EconomyConfig };
      setConfig(data.config);
      setDefaults(data.defaults);
      setDraft({ ...data.config });
    } catch {
      setError('設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleChange = (key: keyof EconomyConfig, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) && value !== '') return;
    setDraft(prev => prev ? { ...prev, [key]: isNaN(num) ? 0 : num } : prev);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/economy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        throw new Error(d.error || '保存失敗');
      }
      const data = await r.json() as { config: EconomyConfig };
      setConfig(data.config);
      setDraft({ ...data.config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('デフォルト値にリセットしますか？')) return;
    setResetting(true);
    setError('');
    try {
      const r = await fetch('/api/admin/economy', { method: 'DELETE' });
      if (!r.ok) throw new Error('reset failed');
      const data = await r.json() as { config: EconomyConfig };
      setConfig(data.config);
      setDraft({ ...data.config });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('リセットに失敗しました');
    } finally {
      setResetting(false);
    }
  };

  const isDirty = draft && config && JSON.stringify(draft) !== JSON.stringify(config);
  const isDefault = draft && defaults && JSON.stringify(draft) === JSON.stringify(defaults);

  const sections = ['chat', 'gacha', 'fc'] as const;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">🪙 コイン経済バランス</h1>
        <p className="text-gray-400 text-sm">
          各アクションのコイン消費量を管理します。変更は即時反映されます。
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          ✅ 保存しました
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          読み込み中...
        </div>
      ) : draft && (
        <div className="space-y-6">
          {sections.map((section) => {
            const meta = SECTION_META[section];
            const fields = FIELD_META.filter(f => f.section === section);
            return (
              <div
                key={section}
                className={`rounded-2xl bg-gradient-to-br ${meta.color} border ${meta.border} p-5`}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                  {meta.label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map((field) => {
                    const currentVal = draft[field.key];
                    const defaultVal = defaults?.[field.key];
                    const isChanged = config && currentVal !== config[field.key];
                    return (
                      <div key={field.key} className="group">
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                          <span>{field.icon}</span>
                          <span>{field.label}</span>
                          {isChanged && (
                            <span className="ml-auto text-yellow-400 text-[10px]">変更済み</span>
                          )}
                          {currentVal !== defaultVal && !isChanged && (
                            <span className="ml-auto text-blue-400 text-[10px]">カスタム</span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            value={currentVal}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl text-white text-sm font-mono pr-16 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                            style={{
                              background: isChanged
                                ? 'rgba(234,179,8,0.08)'
                                : 'rgba(255,255,255,0.05)',
                              border: isChanged
                                ? '1px solid rgba(234,179,8,0.3)'
                                : '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            コイン
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {field.desc}
                          {defaultVal !== undefined && (
                            <span className="ml-1 text-gray-700">
                              (デフォルト: {defaultVal})
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Preview */}
          {isDirty && (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">
                変更プレビュー
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIELD_META.filter(f => config && draft[f.key] !== config[f.key]).map((field) => (
                  <div key={field.key} className="text-xs">
                    <span className="text-gray-500">{field.icon} {field.label}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-gray-400 line-through">{config?.[field.key]}</span>
                      <span className="text-white">→</span>
                      <span className="text-yellow-400 font-bold">{draft[field.key]}</span>
                      <span className="text-gray-600">コイン</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            <button
              onClick={() => draft && config && setDraft({ ...config })}
              disabled={!isDirty}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              リセット
            </button>
            <button
              onClick={handleReset}
              disabled={resetting || isDefault === true}
              className="ml-auto px-4 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resetting ? 'リセット中...' : 'デフォルトに戻す'}
            </button>
          </div>

          {/* Info */}
          <p className="text-[11px] text-gray-600 pt-1">
            ※ 変更はRedisに保存され、即座にサービスへ反映されます。
            デフォルト値は環境変数または組み込みのフォールバック値を使用します。
          </p>
        </div>
      )}
    </div>
  );
}
