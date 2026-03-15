'use client';

import { useEffect, useState } from 'react';

type PostType = 'autonomous-post' | 'community-posts' | 'stories-post' | 'character-comments';

const POST_TYPE_LABELS: Record<PostType, string> = {
  'autonomous-post': '自律投稿',
  'community-posts': 'コミュニティ投稿',
  'stories-post': 'ストーリーズ',
  'character-comments': 'キャラコメント',
};

interface CharacterPostConfig {
  enabled: boolean;
  normalRatio: number;
}

interface AutoPostsConfig {
  characters: Record<string, CharacterPostConfig>;
  globalEnabled: boolean;
  defaultNormalRatio: number;
  enabledTypes: PostType[];
}

interface Character {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export default function AutoPostsPage() {
  const [config, setConfig] = useState<AutoPostsConfig | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [cfgRes, charRes] = await Promise.all([
        fetch('/api/admin/auto-posts'),
        fetch('/api/admin/characters'),
      ]);
      if (cfgRes.ok) {
        const { config } = await cfgRes.json();
        setConfig(config);
      }
      if (charRes.ok) {
        const data = await charRes.json();
        setCharacters(Array.isArray(data) ? data : data.characters ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(patch: Partial<AutoPostsConfig>) {
    setSaving(true);
    try {
      const r = await fetch('/api/admin/auto-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (r.ok) {
        const { config: updated } = await r.json();
        setConfig(updated);
        showToast('設定を保存しました');
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

  function toggleType(type: PostType) {
    if (!config) return;
    const current = config.enabledTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    save({ enabledTypes: updated });
  }

  function setCharacterEnabled(charId: string, enabled: boolean) {
    if (!config) return;
    const existing = config.characters[charId] ?? { enabled: true, normalRatio: config.defaultNormalRatio };
    save({ characters: { ...config.characters, [charId]: { ...existing, enabled } } });
  }

  function setCharacterRatio(charId: string, ratio: number) {
    if (!config) return;
    const existing = config.characters[charId] ?? { enabled: true, normalRatio: config.defaultNormalRatio };
    save({ characters: { ...config.characters, [charId]: { ...existing, normalRatio: ratio } } });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">自律投稿設定</h1>
          <p className="text-sm text-gray-400 mt-1">キャラ別自動投稿・投稿比率の管理</p>
        </div>
      </div>

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

      {config && (
        <>
          {/* Global toggle */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">グローバル設定</h2>
                <p className="text-xs text-gray-500 mt-1">全キャラの自律投稿を一括ON/OFF</p>
              </div>
              <button
                onClick={() => save({ globalEnabled: !config.globalEnabled })}
                disabled={saving}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  config.globalEnabled ? 'bg-violet-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${
                    config.globalEnabled ? 'left-7.5' : 'left-0.5'
                  }`}
                  style={{ left: config.globalEnabled ? '30px' : '2px' }}
                />
              </button>
            </div>
          </section>

          {/* Default ratio */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-semibold text-white mb-4">デフォルト投稿比率</h2>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 w-24">通常投稿</span>
              <input
                type="range"
                min={0}
                max={100}
                value={config.defaultNormalRatio}
                onChange={(e) => setConfig({ ...config, defaultNormalRatio: Number(e.target.value) })}
                onMouseUp={() => save({ defaultNormalRatio: config.defaultNormalRatio })}
                onTouchEnd={() => save({ defaultNormalRatio: config.defaultNormalRatio })}
                className="flex-1 accent-violet-500"
              />
              <div className="text-right min-w-[100px]">
                <span className="text-white font-bold">{config.defaultNormalRatio}%</span>
                <span className="text-gray-500"> / </span>
                <span className="text-amber-400 font-bold">{100 - config.defaultNormalRatio}%</span>
              </div>
              <span className="text-xs text-amber-400 w-20 text-right">PREMIUM</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              通常: <strong className="text-white">{config.defaultNormalRatio}%</strong>　PREMIUM:{' '}
              <strong className="text-amber-400">{100 - config.defaultNormalRatio}%</strong>
            </p>
          </section>

          {/* Post type toggles */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-semibold text-white mb-4">投稿タイプ</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(POST_TYPE_LABELS) as PostType[]).map((type) => {
                const enabled = config.enabledTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    disabled={saving}
                    className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${
                      enabled
                        ? 'border-violet-500/40 bg-violet-500/10'
                        : 'border-gray-700/50 bg-gray-800/30'
                    }`}
                    style={{ border: `1px solid ${enabled ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-violet-400' : 'bg-gray-600'}`}
                      />
                      <span className={`text-xs font-medium ${enabled ? 'text-violet-300' : 'text-gray-500'}`}>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className={`text-sm font-semibold mt-1.5 ${enabled ? 'text-white' : 'text-gray-500'}`}>
                      {POST_TYPE_LABELS[type]}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">{type}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Per-character settings */}
          <section
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-sm font-semibold text-white mb-4">キャラ別設定</h2>
            {characters.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">キャラクターが見つかりません</p>
            ) : (
              <div className="space-y-3">
                {characters.map((char) => {
                  const charCfg = config.characters[char.id] ?? {
                    enabled: true,
                    normalRatio: config.defaultNormalRatio,
                  };
                  return (
                    <div
                      key={char.id}
                      className="flex flex-wrap items-center gap-4 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 w-48">
                        {char.avatarUrl ? (
                          <img src={char.avatarUrl} alt={char.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-300">
                            {char.name[0]}
                          </div>
                        )}
                        <span className="text-sm text-white font-medium truncate">{char.name}</span>
                      </div>

                      {/* ON/OFF */}
                      <button
                        onClick={() => setCharacterEnabled(char.id, !charCfg.enabled)}
                        disabled={saving}
                        className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                          charCfg.enabled ? 'bg-violet-600' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                          style={{ left: charCfg.enabled ? '26px' : '2px' }}
                        />
                      </button>

                      {/* Ratio slider */}
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <span className="text-xs text-gray-500 w-16">通常</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={charCfg.normalRatio}
                          disabled={!charCfg.enabled || saving}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              characters: {
                                ...config.characters,
                                [char.id]: { ...charCfg, normalRatio: Number(e.target.value) },
                              },
                            })
                          }
                          onMouseUp={() => setCharacterRatio(char.id, charCfg.normalRatio)}
                          onTouchEnd={() => setCharacterRatio(char.id, charCfg.normalRatio)}
                          className="flex-1 accent-violet-500 disabled:opacity-40"
                        />
                        <span className="text-xs text-gray-400 min-w-[80px] text-right">
                          <span className="text-white">{charCfg.normalRatio}%</span>
                          {' / '}
                          <span className="text-amber-400">{100 - charCfg.normalRatio}%</span>
                        </span>
                        <span className="text-xs text-amber-400 w-16">PREMIUM</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
