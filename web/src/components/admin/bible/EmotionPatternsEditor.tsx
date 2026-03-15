'use client';

import { useState } from 'react';
import type { ToastFn } from './types';

// ── 型定義 ──────────────────────────────────────────────────

interface EmotionTrigger {
  stimulus: string;
  response: string;
  intensity: number; // 1-10
}

interface EmotionAvoidance {
  topic: string;
  reason: string;
  deflection: string;
}

export interface EmotionalPatterns {
  triggers: EmotionTrigger[];
  avoidances: EmotionAvoidance[];
}

interface Props {
  characterId: string;
  characterName?: string;
  franchiseName?: string;
  patterns: EmotionalPatterns;
  onChange: (patterns: EmotionalPatterns) => void;
  onToast: ToastFn;
}

// ── ユーティリティ ────────────────────────────────────────────

function emptyTrigger(): EmotionTrigger {
  return { stimulus: '', response: '', intensity: 5 };
}

function emptyAvoidance(): EmotionAvoidance {
  return { topic: '', reason: '', deflection: '' };
}

// ── サブコンポーネント ─────────────────────────────────────────

function IntensityBadge({ value }: { value: number }) {
  const color =
    value >= 9
      ? 'bg-red-900/60 text-red-300'
      : value >= 7
        ? 'bg-orange-900/60 text-orange-300'
        : value >= 5
          ? 'bg-yellow-900/60 text-yellow-300'
          : 'bg-gray-800 text-gray-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {value}
    </span>
  );
}

// ── メインコンポーネント ───────────────────────────────────────

export function EmotionPatternsEditor({
  characterId,
  characterName,
  franchiseName,
  patterns,
  onChange,
  onToast,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const triggers = patterns.triggers ?? [];
  const avoidances = patterns.avoidances ?? [];

  // ── トリガー操作 ──

  const addTrigger = () => {
    onChange({ ...patterns, triggers: [...triggers, emptyTrigger()] });
  };

  const updateTrigger = (index: number, partial: Partial<EmotionTrigger>) => {
    const updated = triggers.map((t, i) => (i === index ? { ...t, ...partial } : t));
    onChange({ ...patterns, triggers: updated });
  };

  const removeTrigger = (index: number) => {
    onChange({ ...patterns, triggers: triggers.filter((_, i) => i !== index) });
  };

  // ── 回避操作 ──

  const addAvoidance = () => {
    onChange({ ...patterns, avoidances: [...avoidances, emptyAvoidance()] });
  };

  const updateAvoidance = (index: number, partial: Partial<EmotionAvoidance>) => {
    const updated = avoidances.map((a, i) => (i === index ? { ...a, ...partial } : a));
    onChange({ ...patterns, avoidances: updated });
  };

  const removeAvoidance = (index: number) => {
    onChange({ ...patterns, avoidances: avoidances.filter((_, i) => i !== index) });
  };

  // ── AIで自動生成 ──

  const handleAIGenerate = async () => {
    if (!characterName || !franchiseName) {
      onToast('キャラクター名と作品名が必要です', 'error');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/characters/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName, franchiseName }),
      });
      if (!res.ok) throw new Error('AI生成に失敗しました');
      const data = await res.json();
      if (data.emotionalPatterns) {
        onChange(data.emotionalPatterns as EmotionalPatterns);
        onToast('感情パターンをAI生成しました', 'success');
      } else {
        onToast('emotionalPatternsが含まれていませんでした', 'error');
      }
    } catch (err) {
      console.error(err);
      onToast('AI生成に失敗しました', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── 保存 ──

  const handleSave = async () => {
    setSaving(true);
    try {
      // 既存のSoulデータを取得して emotionalPatterns だけ上書き
      const getRes = await fetch(`/api/admin/characters/${characterId}/soul`);
      const existing = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...existing,
        emotionalPatterns: patterns,
      };

      const res = await fetch(`/api/admin/characters/${characterId}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast('感情パターンを保存しました', 'success');
      } else {
        onToast('保存に失敗しました', 'error');
      }
    } catch {
      onToast('保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── レンダリング ──

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-200 text-sm font-semibold">感情トリガー / 回避パターン</h3>
        <button
          onClick={handleAIGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          {generating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>✨ AIで自動生成</>
          )}
        </button>
      </div>

      {/* ─── トリガー ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            感情トリガー ({triggers.length})
          </h4>
          <button
            onClick={addTrigger}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
          >
            + 追加
          </button>
        </div>

        <div className="space-y-3">
          {triggers.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">
              トリガーがありません。「+ 追加」またはAI生成で作成できます。
            </p>
          )}
          {triggers.map((trigger, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0">刺激</span>
                    <input
                      type="text"
                      value={trigger.stimulus}
                      onChange={(e) => updateTrigger(i, { stimulus: e.target.value })}
                      placeholder="喜ぶ・怒るきっかけとなる言葉や状況"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0">反応</span>
                    <input
                      type="text"
                      value={trigger.response}
                      onChange={(e) => updateTrigger(i, { response: e.target.value })}
                      placeholder="そのときの反応の仕方"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0">強度</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={trigger.intensity}
                      onChange={(e) => updateTrigger(i, { intensity: Number(e.target.value) })}
                      className="flex-1 accent-purple-500"
                    />
                    <IntensityBadge value={trigger.intensity} />
                  </div>
                </div>
                <button
                  onClick={() => removeTrigger(i)}
                  className="shrink-0 text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                  title="削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 回避パターン ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-gray-400 text-xs font-medium uppercase tracking-wider">
            回避パターン ({avoidances.length})
          </h4>
          <button
            onClick={addAvoidance}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
          >
            + 追加
          </button>
        </div>

        <div className="space-y-3">
          {avoidances.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">
              回避パターンがありません。「+ 追加」またはAI生成で作成できます。
            </p>
          )}
          {avoidances.map((avoidance, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0 w-10">話題</span>
                    <input
                      type="text"
                      value={avoidance.topic}
                      onChange={(e) => updateAvoidance(i, { topic: e.target.value })}
                      placeholder="避けるべき話題"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0 w-10">理由</span>
                    <input
                      type="text"
                      value={avoidance.reason}
                      onChange={(e) => updateAvoidance(i, { reason: e.target.value })}
                      placeholder="なぜ避けるか"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs shrink-0 w-10">転換</span>
                    <input
                      type="text"
                      value={avoidance.deflection}
                      onChange={(e) => updateAvoidance(i, { deflection: e.target.value })}
                      placeholder="話題を変えるときの台詞例"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeAvoidance(i)}
                  className="shrink-0 text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                  title="削除"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '保存中...' : '感情パターンを保存'}
        </button>
      </div>
    </div>
  );
}
