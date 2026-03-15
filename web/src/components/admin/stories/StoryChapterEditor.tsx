'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
}

export interface StoryChapter {
  id: string;
  characterId: string;
  character: { id: string; name: string };
  chapterNumber: number;
  locale: string;
  title: string;
  synopsis: string;
  unlockLevel: number;
  isFcOnly: boolean;
  triggerPrompt: string;
  choices: Choice[] | null;
  isActive: boolean;
  backgroundUrl: string | null;
  bgmType: string | null;
  coinReward: number;
  characterPose: string | null;
  createdAt: string;
}

interface Choice {
  text: string;
  consequence: string;
  nextTease?: string;
  xpReward?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKGROUND_PRESETS = [
  { value: '', label: '（なし）' },
  { value: 'schoolRooftop', label: '🏫 学校の屋上' },
  { value: 'bedroom', label: '🛏️ 寝室' },
  { value: 'park', label: '🌳 公園' },
  { value: 'cafe', label: '☕ カフェ' },
  { value: 'fantasy', label: '✨ ファンタジー' },
  { value: 'beach', label: '🏖️ ビーチ' },
  { value: 'night_city', label: '🌃 夜の街' },
  { value: 'temple', label: '⛩️ 神社' },
];

const BGM_TYPES = [
  { value: '', label: '（なし）' },
  { value: 'gentle_piano', label: '🎹 やさしいピアノ' },
  { value: 'dramatic', label: '🎭 ドラマチック' },
  { value: 'upbeat', label: '🎵 アップビート' },
  { value: 'silent', label: '🔇 無音' },
  { value: 'emotional', label: '💖 感動的' },
  { value: 'battle', label: '⚔️ バトル' },
];

const CHARACTER_POSES = [
  { value: 'normal', label: '😐 ノーマル' },
  { value: 'smile', label: '😊 笑顔' },
  { value: 'thinking', label: '🤔 考え中' },
  { value: 'serious', label: '😤 シリアス' },
  { value: 'crying', label: '😢 泣き顔' },
  { value: 'angry', label: '😡 怒り' },
];

// ─── Empty defaults ───────────────────────────────────────────────────────────

const EMPTY_CHOICE: Choice = { text: '', consequence: '', nextTease: '', xpReward: 0 };

// ─── Component ───────────────────────────────────────────────────────────────

interface StoryChapterEditorProps {
  chapter: StoryChapter;
  characters: Character[];
  onClose: () => void;
  onSaved: () => void;
}

export default function StoryChapterEditor({
  chapter,
  characters,
  onClose,
  onSaved,
}: StoryChapterEditorProps) {
  const [form, setForm] = useState({
    title: chapter.title,
    synopsis: chapter.synopsis,
    triggerPrompt: chapter.triggerPrompt,
    unlockLevel: chapter.unlockLevel,
    isFcOnly: chapter.isFcOnly,
    isActive: chapter.isActive,
    backgroundUrl: chapter.backgroundUrl ?? '',
    bgmType: chapter.bgmType ?? '',
    characterPose: chapter.characterPose ?? 'normal',
    coinReward: chapter.coinReward,
    choices: (chapter.choices ?? []) as Choice[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Choice helpers ──────────────────────────────────────────────────────────

  const addChoice = () =>
    setForm((f) => ({ ...f, choices: [...f.choices, { ...EMPTY_CHOICE }] }));

  const removeChoice = (idx: number) =>
    setForm((f) => ({ ...f, choices: f.choices.filter((_, i) => i !== idx) }));

  const updateChoice = (idx: number, field: keyof Choice, value: string | number) =>
    setForm((f) => {
      const choices = [...f.choices];
      choices[idx] = { ...choices[idx], [field]: value };
      return { ...f, choices };
    });

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      title: form.title,
      synopsis: form.synopsis,
      triggerPrompt: form.triggerPrompt,
      unlockLevel: Number(form.unlockLevel),
      isFcOnly: form.isFcOnly,
      isActive: form.isActive,
      backgroundUrl: form.backgroundUrl || null,
      bgmType: form.bgmType || null,
      characterPose: form.characterPose || null,
      coinReward: Number(form.coinReward),
      choices: form.choices.length > 0 ? form.choices : null,
    };

    try {
      const res = await fetch(`/api/admin/stories/${chapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '保存に失敗しました');
      } else {
        setSuccess('保存しました');
        onSaved();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'rgba(15,15,25,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">📖 チャプター演出エディタ</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {chapter.character.name} — Ch.{chapter.chapterNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 flex-1">
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-xl text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl text-sm text-green-300" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              {success}
            </div>
          )}

          {/* Basic Info */}
          <section>
            <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">基本情報</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">あらすじ</label>
                <textarea
                  value={form.synopsis}
                  onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm resize-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">トリガープロンプト</label>
                <textarea
                  value={form.triggerPrompt}
                  onChange={(e) => setForm({ ...form, triggerPrompt: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm resize-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
          </section>

          {/* Scene Settings */}
          <section>
            <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">演出設定</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Background */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">🖼️ 背景</label>
                <select
                  value={form.backgroundUrl}
                  onChange={(e) => setForm({ ...form, backgroundUrl: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {BACKGROUND_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="url"
                  placeholder="またはカスタムURL"
                  value={BACKGROUND_PRESETS.some(p => p.value === form.backgroundUrl) ? '' : form.backgroundUrl}
                  onChange={(e) => setForm({ ...form, backgroundUrl: e.target.value })}
                  className="w-full mt-1 rounded-xl px-3 py-1.5 text-white text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* BGM */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">🎵 BGM</label>
                <select
                  value={form.bgmType}
                  onChange={(e) => setForm({ ...form, bgmType: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {BGM_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Character Pose */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">🧍 キャラポーズ</label>
                <select
                  value={form.characterPose}
                  onChange={(e) => setForm({ ...form, characterPose: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {CHARACTER_POSES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Choices */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold">選択肢</h3>
              <button
                onClick={addChoice}
                className="text-xs px-3 py-1 rounded-lg text-indigo-300 transition"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                ＋ 追加
              </button>
            </div>
            <div className="space-y-3">
              {form.choices.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">選択肢はありません</p>
              )}
              {form.choices.map((choice, idx) => (
                <div
                  key={idx}
                  className="rounded-xl p-4 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-500 text-xs font-medium">選択肢 {idx + 1}</span>
                    <button onClick={() => removeChoice(idx)} className="text-red-400 hover:text-red-300 text-xs">削除</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">テキスト</label>
                      <input
                        value={choice.text}
                        onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                        placeholder="選択肢のテキスト"
                        className="w-full rounded-lg px-2.5 py-1.5 text-white text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">結果・consequence</label>
                      <input
                        value={choice.consequence}
                        onChange={(e) => updateChoice(idx, 'consequence', e.target.value)}
                        placeholder="選択後の展開"
                        className="w-full rounded-lg px-2.5 py-1.5 text-white text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">次章ティーザー</label>
                      <input
                        value={choice.nextTease ?? ''}
                        onChange={(e) => updateChoice(idx, 'nextTease', e.target.value)}
                        placeholder="次のチャプターの予告"
                        className="w-full rounded-lg px-2.5 py-1.5 text-white text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">XP報酬</label>
                      <input
                        type="number"
                        value={choice.xpReward ?? 0}
                        onChange={(e) => updateChoice(idx, 'xpReward', Number(e.target.value))}
                        min={0}
                        className="w-full rounded-lg px-2.5 py-1.5 text-white text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rewards & Visibility */}
          <section>
            <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">報酬・公開設定</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">🪙 コイン報酬</label>
                <input
                  type="number"
                  value={form.coinReward}
                  onChange={(e) => setForm({ ...form, coinReward: Number(e.target.value) })}
                  min={0}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">解放レベル</label>
                <input
                  type="number"
                  value={form.unlockLevel}
                  onChange={(e) => setForm({ ...form, unlockLevel: Number(e.target.value) })}
                  min={1}
                  className="w-full rounded-xl px-3 py-2 text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
            <div className="flex gap-6 mt-3">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isFcOnly}
                  onChange={(e) => setForm({ ...form, isFcOnly: e.target.checked })}
                  className="w-4 h-4 accent-violet-500"
                />
                FC限定
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-violet-500"
                />
                公開する
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            閉じる
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
          >
            {saving ? '保存中...' : '💾 保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
