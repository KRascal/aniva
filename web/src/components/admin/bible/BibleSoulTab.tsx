'use client';

import { useEffect, useState } from 'react';
import type { SoulData, ToastFn } from './types';
import { Skeleton, jsonStringify, jsonParse } from './shared';
import { EmotionPatternsEditor, type EmotionalPatterns } from './EmotionPatternsEditor';

export function BibleSoulTab({ characterId, onToast }: { characterId: string; onToast: ToastFn }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soul, setSoul] = useState<SoulData>({
    coreIdentity: '',
    motivation: '',
    worldview: '',
    timelinePosition: null,
    backstory: null,
    relationshipMap: {},
    personalityAxes: {},
    emotionalPatterns: {},
  });
  const [relationshipMapStr, setRelationshipMapStr] = useState('{}');
  const [personalityAxesStr, setPersonalityAxesStr] = useState('{}');
  const [emotionalPatternsStr, setEmotionalPatternsStr] = useState('{}');
  const [emotionalPatterns, setEmotionalPatterns] = useState<EmotionalPatterns>({
    triggers: [],
    avoidances: [],
  });

  useEffect(() => {
    fetch(`/api/admin/characters/${characterId}/soul`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSoul({
            coreIdentity: data.coreIdentity || '',
            motivation: data.motivation || '',
            worldview: data.worldview || '',
            timelinePosition: data.timelinePosition || '',
            backstory: data.backstory || '',
            relationshipMap: data.relationshipMap || {},
            personalityAxes: data.personalityAxes || {},
            emotionalPatterns: data.emotionalPatterns || {},
          });
          setRelationshipMapStr(jsonStringify(data.relationshipMap || {}));
          setPersonalityAxesStr(jsonStringify(data.personalityAxes || {}));
          setEmotionalPatternsStr(jsonStringify(data.emotionalPatterns || {}));
          // 構造化感情パターン初期化
          const ep = data.emotionalPatterns || {};
          if (ep.triggers || ep.avoidances) {
            setEmotionalPatterns({
              triggers: ep.triggers || [],
              avoidances: ep.avoidances || [],
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...soul,
        relationshipMap: jsonParse(relationshipMapStr),
        personalityAxes: jsonParse(personalityAxesStr),
        emotionalPatterns: jsonParse(emotionalPatternsStr),
      };
      const res = await fetch(`/api/admin/characters/${characterId}/soul`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast('Soul を保存しました', 'success');
      } else {
        onToast('保存に失敗しました', 'error');
      }
    } catch {
      onToast('保存に失敗しました', 'error');
    }
    setSaving(false);
  };

  if (loading) return <Skeleton rows={6} />;

  const textFields: { key: keyof SoulData; label: string; rows: number }[] = [
    { key: 'coreIdentity', label: 'Core Identity', rows: 3 },
    { key: 'motivation', label: 'Motivation', rows: 2 },
    { key: 'worldview', label: 'Worldview', rows: 2 },
    { key: 'timelinePosition', label: 'Timeline Position', rows: 1 },
    { key: 'backstory', label: 'Backstory', rows: 4 },
  ];

  const jsonFields: { value: string; setter: (v: string) => void; label: string }[] = [
    { value: relationshipMapStr, setter: setRelationshipMapStr, label: 'Relationship Map' },
    { value: personalityAxesStr, setter: setPersonalityAxesStr, label: 'Personality Axes' },
    { value: emotionalPatternsStr, setter: setEmotionalPatternsStr, label: 'Emotional Patterns' },
  ];

  return (
    <div className="space-y-6">
      {textFields.map((f) => (
        <div key={f.key}>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">
            {f.label}
          </label>
          {f.rows > 1 ? (
            <textarea
              value={(soul[f.key] as string) || ''}
              onChange={(e) => setSoul((prev) => ({ ...prev, [f.key]: e.target.value }))}
              rows={f.rows}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
            />
          ) : (
            <input
              type="text"
              value={(soul[f.key] as string) || ''}
              onChange={(e) => setSoul((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          )}
        </div>
      ))}

      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-gray-300 text-sm font-semibold mb-4">JSON Data</h3>
        <div className="space-y-4">
          {jsonFields.map((f) => {
            let isValid = true;
            try { JSON.parse(f.value); } catch { isValid = false; }
            return (
              <div key={f.label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">{f.label}</label>
                  {!isValid && <span className="text-red-400 text-xs">Invalid JSON</span>}
                </div>
                <textarea
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  rows={5}
                  className={`w-full bg-gray-900 border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none transition-colors resize-none ${
                    isValid ? 'border-gray-800 focus:border-purple-500/60' : 'border-red-700/60 focus:border-red-500/60'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 感情トリガー / 回避パターン エディタ */}
      <div className="border-t border-gray-800 pt-6">
        <EmotionPatternsEditor
          characterId={characterId}
          patterns={emotionalPatterns}
          onChange={setEmotionalPatterns}
          onToast={onToast}
        />
      </div>
    </div>
  );
}
