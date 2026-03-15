'use client';

import { useEffect, useState } from 'react';

const LANGUAGES = [
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

interface TranslationMap {
  [key: string]: string | TranslationMap;
}

function flattenKeys(obj: TranslationMap, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      keys.push(...flattenKeys(v as TranslationMap, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function getByPath(obj: TranslationMap, path: string): string | undefined {
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export default function I18nPage() {
  const [translations, setTranslations] = useState<Partial<Record<LangCode, TranslationMap>>>({});
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<LangCode>('en');
  const [filter, setFilter] = useState<'all' | 'missing'>('all');
  const [search, setSearch] = useState('');
  const [translating, setTranslating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const maps: Partial<Record<LangCode, TranslationMap>> = {};
      await Promise.all(
        LANGUAGES.map(async ({ code }) => {
          try {
            const r = await fetch(`/messages/${code}.json`);
            if (r.ok) maps[code] = await r.json();
          } catch {
            /* ignore */
          }
        })
      );
      setTranslations(maps);
      // base keys from ja
      const base = maps['ja'] ?? maps['en'] ?? {};
      setAllKeys(flattenKeys(base));
      setLoading(false);
    }
    load();
  }, []);

  function getCompletionRate(lang: LangCode): number {
    if (!allKeys.length) return 0;
    const map = translations[lang];
    if (!map) return 0;
    const filled = allKeys.filter((k) => {
      const v = getByPath(map, k);
      return v !== undefined && v !== '';
    });
    return Math.round((filled.length / allKeys.length) * 100);
  }

  const missingKeys = allKeys.filter((k) => {
    const map = translations[selectedLang];
    if (!map) return true;
    const v = getByPath(map, k);
    return v === undefined || v === '';
  });

  const displayKeys = (filter === 'missing' ? missingKeys : allKeys).filter((k) =>
    !search || k.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(displayKeys.length / PAGE_SIZE);
  const paginatedKeys = displayKeys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleAITranslate(keys: string[]) {
    if (!keys.length) return;
    const baseMap = translations['ja'] ?? translations['en'] ?? {};
    const texts = keys.map((k) => ({ key: k, text: getByPath(baseMap, k) ?? k }));
    setTranslating(keys.length === 1 ? keys[0] : 'batch');
    try {
      const r = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: JSON.stringify(Object.fromEntries(texts.map((t) => [t.key, t.text]))),
          sourceLang: 'ja',
          targetLangs: [selectedLang],
          context: 'UI translation keys for ANIVA platform',
        }),
      });
      if (r.ok) {
        showToast(`${keys.length}件のAI翻訳を依頼しました`);
      } else {
        const err = await r.json();
        showToast(err.error ?? 'AI翻訳に失敗しました', 'err');
      }
    } catch {
      showToast('ネットワークエラー', 'err');
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">多言語コンテンツ管理</h1>
          <p className="text-sm text-gray-400 mt-1">6言語の翻訳キー管理・完了率</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
            toast.type === 'ok'
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Completion overview */}
      <section
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <h2 className="text-sm font-semibold text-white mb-4">翻訳完了率</h2>
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {LANGUAGES.map((l) => (
              <div key={l.code} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {LANGUAGES.map((l) => {
              const rate = getCompletionRate(l.code);
              const color =
                rate >= 90 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';
              return (
                <button
                  key={l.code}
                  onClick={() => { setSelectedLang(l.code); setPage(1); }}
                  className={`rounded-xl p-4 text-center transition-all hover:scale-[1.03] ${
                    selectedLang === l.code ? 'ring-2 ring-violet-500/50' : ''
                  }`}
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}
                >
                  <div className="text-2xl mb-1">{l.flag}</div>
                  <div className="text-xs font-medium text-gray-300">{l.label}</div>
                  <div className="text-xl font-bold mt-1" style={{ color }}>{rate}%</div>
                  <div className="w-full rounded-full mt-2 h-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${rate}%`, background: color }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Key browser */}
      <section
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {(['all', 'missing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? `全キー (${allKeys.length})` : `未翻訳 (${missingKeys.length})`}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="キー検索..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-[180px] px-3 py-1.5 text-sm rounded-xl text-white placeholder-gray-500 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <button
            onClick={() => handleAITranslate(missingKeys.slice(0, 20))}
            disabled={!!translating || missingKeys.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}
          >
            {translating === 'batch' ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span>✨</span>
            )}
            AI一括翻訳 (上限20件)
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs w-1/3">キー</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">JA (原文)</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">
                  {LANGUAGES.find((l) => l.code === selectedLang)?.flag}{' '}
                  {LANGUAGES.find((l) => l.code === selectedLang)?.label}
                </th>
                <th className="py-2 px-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="py-2 px-3">
                      <div className="h-6 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </td>
                  </tr>
                ))
              ) : paginatedKeys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                    {filter === 'missing' ? '未翻訳キーなし ✅' : 'キーが見つかりません'}
                  </td>
                </tr>
              ) : (
                paginatedKeys.map((key) => {
                  const jaMap = translations['ja'];
                  const targetMap = translations[selectedLang];
                  const jaVal = jaMap ? (getByPath(jaMap, key) ?? '') : '';
                  const targetVal = targetMap ? (getByPath(targetMap, key) ?? '') : '';
                  const isMissing = !targetVal;
                  return (
                    <tr
                      key={key}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isMissing ? 'rgba(239,68,68,0.04)' : undefined,
                      }}
                    >
                      <td className="py-2 px-3">
                        <code
                          className={`text-xs rounded px-1.5 py-0.5 ${
                            isMissing ? 'text-red-400' : 'text-violet-400'
                          }`}
                          style={{ background: isMissing ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)' }}
                        >
                          {key}
                        </code>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs max-w-[200px] truncate">{jaVal}</td>
                      <td className="py-2 px-3">
                        {isMissing ? (
                          <span className="text-xs text-red-400 italic">未翻訳</span>
                        ) : (
                          <span className="text-xs text-gray-300">{targetVal}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {isMissing && (
                          <button
                            onClick={() => handleAITranslate([key])}
                            disabled={!!translating}
                            className="text-xs px-2 py-1 rounded-lg transition-all hover:scale-[1.05] disabled:opacity-50"
                            style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}
                          >
                            {translating === key ? '...' : 'AI翻訳'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayKeys.length)} / {displayKeys.length}件
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs rounded-lg disabled:opacity-40 transition-all hover:scale-[1.05]"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                ← 前
              </button>
              <span className="px-3 py-1 text-xs text-gray-400">{page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded-lg disabled:opacity-40 transition-all hover:scale-[1.05]"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                次 →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
