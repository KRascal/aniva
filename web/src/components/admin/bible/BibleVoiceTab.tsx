'use client';

import { useEffect, useState } from 'react';
import type { VoiceData, ToastFn } from './types';
import { Skeleton } from './shared';

export function BibleVoiceTab({ characterId, onToast }: { characterId: string; onToast: ToastFn }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voice, setVoice] = useState<VoiceData>({
    firstPerson: '',
    secondPerson: '',
    sentenceEndings: [],
    exclamations: [],
    laughStyle: null,
    angryStyle: null,
    sadStyle: null,
    toneNotes: null,
    speechExamples: [],
  });
  const [endingsStr, setEndingsStr] = useState('');
  const [exclStr, setExclStr] = useState('');
  const [newExample, setNewExample] = useState({ user: '', char: '' });

  useEffect(() => {
    fetch(`/api/admin/characters/${characterId}/voice`)
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setVoice({
            firstPerson: data.firstPerson || '',
            secondPerson: data.secondPerson || '',
            sentenceEndings: data.sentenceEndings || [],
            exclamations: data.exclamations || [],
            laughStyle: data.laughStyle || '',
            angryStyle: data.angryStyle || '',
            sadStyle: data.sadStyle || '',
            toneNotes: data.toneNotes || '',
            speechExamples: data.speechExamples || [],
          });
          setEndingsStr((data.sentenceEndings || []).join(', '));
          setExclStr((data.exclamations || []).join(', '));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [characterId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...voice,
        sentenceEndings: endingsStr.split(',').map((s) => s.trim()).filter(Boolean),
        exclamations: exclStr.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/admin/characters/${characterId}/voice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onToast('Voice を保存しました', 'success');
      } else {
        onToast('保存に失敗しました', 'error');
      }
    } catch {
      onToast('保存に失敗しました', 'error');
    }
    setSaving(false);
  };

  const addExample = () => {
    if (!newExample.user.trim() || !newExample.char.trim()) return;
    setVoice((prev) => ({
      ...prev,
      speechExamples: [...prev.speechExamples, { user: newExample.user, char: newExample.char }],
    }));
    setNewExample({ user: '', char: '' });
  };

  const removeExample = (idx: number) => {
    setVoice((prev) => ({
      ...prev,
      speechExamples: prev.speechExamples.filter((_, i) => i !== idx),
    }));
  };

  if (loading) return <Skeleton rows={5} />;

  return (
    <div className="space-y-6">
      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">一人称</label>
          <input
            type="text"
            value={voice.firstPerson}
            onChange={(e) => setVoice((p) => ({ ...p, firstPerson: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="俺 / 僕 / 私 ..."
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">二人称</label>
          <input
            type="text"
            value={voice.secondPerson}
            onChange={(e) => setVoice((p) => ({ ...p, secondPerson: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="お前 / あなた / 君 ..."
          />
        </div>
      </div>

      {/* Tag inputs */}
      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">語尾パターン（カンマ区切り）</label>
        <input
          type="text"
          value={endingsStr}
          onChange={(e) => setEndingsStr(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          placeholder="だぜ, だろ, じゃん ..."
        />
        {endingsStr && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {endingsStr.split(',').map((s) => s.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-900/40 text-purple-300 text-xs rounded-full border border-purple-800/40">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">感嘆表現（カンマ区切り）</label>
        <input
          type="text"
          value={exclStr}
          onChange={(e) => setExclStr(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          placeholder="おお！, やべぇ！, すげぇ！ ..."
        />
        {exclStr && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {exclStr.split(',').map((s) => s.trim()).filter(Boolean).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-900/40 text-blue-300 text-xs rounded-full border border-blue-800/40">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Style fields */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">笑い方</label>
          <input
            type="text"
            value={voice.laughStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, laughStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="ししし"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">怒り方</label>
          <input
            type="text"
            value={voice.angryStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, angryStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="てめぇ！"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">悲しみ方</label>
          <input
            type="text"
            value={voice.sadStyle || ''}
            onChange={(e) => setVoice((p) => ({ ...p, sadStyle: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            placeholder="..."
          />
        </div>
      </div>

      {/* Tone notes */}
      <div>
        <label className="block text-gray-400 text-xs font-medium uppercase tracking-wider mb-1.5">口調メモ</label>
        <textarea
          value={voice.toneNotes || ''}
          onChange={(e) => setVoice((p) => ({ ...p, toneNotes: e.target.value }))}
          rows={3}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors resize-none"
          placeholder="口調に関する追加メモ..."
        />
      </div>

      {/* Speech examples */}
      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-gray-300 text-sm font-semibold mb-4">会話サンプル</h3>
        {voice.speechExamples.length > 0 && (
          <div className="space-y-2 mb-4">
            {voice.speechExamples.map((ex, i) => (
              <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 group">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-xs shrink-0 mt-0.5 w-12">User:</span>
                      <span className="text-gray-300 text-sm">{ex.user}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 text-xs shrink-0 mt-0.5 w-12">Char:</span>
                      <span className="text-white text-sm">{ex.char}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExample(i)}
                    className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1 shrink-0"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-2">
          <div>
            <label className="block text-gray-500 text-xs mb-1">User</label>
            <input
              type="text"
              value={newExample.user}
              onChange={(e) => setNewExample((p) => ({ ...p, user: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              placeholder="ユーザーの発言"
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Character</label>
            <input
              type="text"
              value={newExample.char}
              onChange={(e) => setNewExample((p) => ({ ...p, char: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/60"
              placeholder="キャラの応答"
              onKeyDown={(e) => e.key === 'Enter' && addExample()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={addExample}
              disabled={!newExample.user.trim() || !newExample.char.trim()}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            >
              + 追加
            </button>
          </div>
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
    </div>
  );
}
