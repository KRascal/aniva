'use client';

import { useEffect, useState, useCallback } from 'react';

interface Character {
  id: string;
  name: string;
  franchise: string;
}

interface CrosstalkConfig {
  id: string;
  name: string;
  franchise: string;
  mode: 'all' | 'allowlist' | 'blocked';
  allowedCharacterIds: string[];
  bannedFranchises: string[];
}

interface Props {
  characterId: string;
  characterName: string;
}

export function CrosstalkControlTab({ characterId, characterName }: Props) {
  const [config, setConfig] = useState<CrosstalkConfig | null>(null);
  const [allowedCharacters, setAllowedCharacters] = useState<Character[]>([]);
  const [availableFranchises, setAvailableFranchises] = useState<string[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [mode, setMode] = useState<'all' | 'allowlist' | 'blocked'>('all');
  const [allowedIds, setAllowedIds] = useState<string[]>([]);
  const [bannedFranchises, setBannedFranchises] = useState<string[]>([]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/crosstalk`);
      if (!res.ok) throw new Error('設定の取得に失敗しました');
      const data = await res.json() as {
        config: CrosstalkConfig;
        allowedCharacters: Character[];
        availableFranchises: string[];
      };
      setConfig(data.config);
      setAllowedCharacters(data.allowedCharacters);
      setAvailableFranchises(data.availableFranchises);
      setMode(data.config.mode);
      setAllowedIds(data.config.allowedCharacterIds);
      setBannedFranchises(data.config.bannedFranchises);
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得エラー');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  // キャラ一覧取得（allowlist用）
  const loadAllCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/characters?limit=200');
      if (!res.ok) return;
      const data = await res.json() as { characters: Character[] };
      setAllCharacters((data.characters ?? []).filter(c => c.id !== characterId));
    } catch { /* skip */ }
  }, [characterId]);

  useEffect(() => {
    loadConfig();
    loadAllCharacters();
  }, [loadConfig, loadAllCharacters]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/characters/${characterId}/crosstalk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, allowedCharacterIds: allowedIds, bannedFranchises }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadConfig();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存エラー');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllowedId = (id: string) => {
    setAllowedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleBannedFranchise = (franchise: string) => {
    setBannedFranchises(prev =>
      prev.includes(franchise) ? prev.filter(x => x !== franchise) : [...prev, franchise]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">掛け合い制御</h3>
        <p className="text-sm text-gray-400">
          {characterName} がグループチャット・掛け合い機能でどのキャラと共演できるかを制御します
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* モード選択 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">掛け合いモード</label>
        <div className="space-y-2">
          {[
            { value: 'all', label: '全て許可', desc: 'すべてのキャラとの掛け合いを許可（デフォルト）' },
            { value: 'allowlist', label: '許可リスト', desc: '指定したキャラとのみ掛け合いを許可' },
            { value: 'blocked', label: '全て禁止', desc: 'すべての掛け合いを禁止' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                mode === opt.value
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input
                type="radio"
                name="crosstalk-mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value as 'all' | 'allowlist' | 'blocked')}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-white">{opt.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 許可リスト（allowlistモード時） */}
      {mode === 'allowlist' && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">
            許可するキャラクター
            <span className="ml-2 text-xs text-gray-500">({allowedIds.length}件選択中)</span>
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-lg divide-y divide-gray-800">
            {allCharacters.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">キャラクターが見つかりません</div>
            ) : (
              allCharacters.map(char => (
                <label
                  key={char.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={allowedIds.includes(char.id)}
                    onChange={() => toggleAllowedId(char.id)}
                    className="accent-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{char.name}</div>
                    <div className="text-xs text-gray-500 truncate">{char.franchise}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* フランチャイズ禁止（全モードで設定可能） */}
      {mode !== 'blocked' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-300">禁止フランチャイズ</label>
            <p className="text-xs text-gray-500 mt-0.5">
              指定した作品のキャラクターとの掛け合いを禁止します（許可モードと併用可）
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFranchises.filter(f => f !== config?.franchise).map(franchise => (
              <button
                key={franchise}
                onClick={() => toggleBannedFranchise(franchise)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  bannedFranchises.includes(franchise)
                    ? 'bg-red-900/50 text-red-300 border border-red-700'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {bannedFranchises.includes(franchise) ? '✗ ' : ''}{franchise}
              </button>
            ))}
            {availableFranchises.filter(f => f !== config?.franchise).length === 0 && (
              <div className="text-xs text-gray-500">他のフランチャイズがありません</div>
            )}
          </div>
          {bannedFranchises.length > 0 && (
            <div className="text-xs text-red-400">
              禁止中: {bannedFranchises.join('、')}
            </div>
          )}
        </div>
      )}

      {/* 現在の設定サマリー */}
      <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-1">
        <div className="font-medium text-gray-300 mb-2">現在の設定</div>
        <div>
          モード: {mode === 'all' ? '全て許可' : mode === 'allowlist' ? `許可リスト (${allowedIds.length}件)` : '全て禁止'}
        </div>
        {bannedFranchises.length > 0 && (
          <div>禁止フランチャイズ: {bannedFranchises.join('、')}</div>
        )}
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
          saved
            ? 'bg-green-600 text-white'
            : saving
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {saved ? '保存しました ✓' : saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}
