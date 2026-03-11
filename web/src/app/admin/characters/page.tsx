'use client';

import React, { useEffect, useState } from 'react';
import {
  SUPPORTED_LOCALES,
  CharacterLocaleConfig,
  LocaleConfigMap,
  SupportedLocale,
} from '@/types/character-locale';
import { Character, CharacterFormData, EMPTY_FORM } from '@/components/admin/characters/types';
import { CharacterTable } from '@/components/admin/characters/CharacterTable';
import { CharacterWizard } from '@/components/admin/characters/CharacterWizard';
import { CharacterEditModal } from '@/components/admin/characters/CharacterEditModal';

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CharacterFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [voiceTestCharId, setVoiceTestCharId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [presence, setPresence] = useState<{ statusEmoji?: string; status?: string } | null>(null);
  const [mood, setMood] = useState<{ moodLabel?: string; moodEmoji?: string } | null>(null);
  const [secrets, setSecrets] = useState<{ id?: string; unlockLevel: number; title: string; type: string; content: string; promptAddition?: string | null; order?: number }[]>([]);

  // Locale config state
  const [editTab, setEditTab] = useState<'basic' | 'locale'>('basic');
  const [localeConfig, setLocaleConfig] = useState<LocaleConfigMap>({});
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');

  // Presence edit state
  const [presenceManualMode, setPresenceManualMode] = useState(false);
  const [presenceEditStatus, setPresenceEditStatus] = useState('');
  const [presenceEditEmoji, setPresenceEditEmoji] = useState('');
  const [savingPresence, setSavingPresence] = useState(false);
  const [presenceSaveMsg, setPresenceSaveMsg] = useState('');

  // Secret content edit state
  const [editingSecretIdx, setEditingSecretIdx] = useState<number | null>(null);
  const [secretDraft, setSecretDraft] = useState<{ unlockLevel: number; type: string; title: string; content: string; promptAddition: string }>({ unlockLevel: 3, type: 'conversation_topic', title: '', content: '', promptAddition: '' });
  const [generatingSecrets, setGeneratingSecrets] = useState(false);
  const [secretsError, setSecretsError] = useState('');

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [generatingSoul, setGeneratingSoul] = useState(false);
  const [soulText, setSoulText] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [boundariesText, setBoundariesText] = useState('');
  const [generatingMoments, setGeneratingMoments] = useState(false);
  const [momentsGenerated, setMomentsGenerated] = useState(false);
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null);
  const [soulError, setSoulError] = useState('');
  const [momentsError, setMomentsError] = useState('');
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyGenerated, setStoryGenerated] = useState(false);
  const [storyError, setStoryError] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/characters');
    const data = await r.json();
    setCharacters(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const f = (key: keyof CharacterFormData, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setError('');
    setWizardStep(1);
    setLocaleConfig({});
    setEditTab('basic');
    setSoulText('');
    setVoiceText('');
    setBoundariesText('');
    setMomentsGenerated(false);
    setCreatedCharacterId(null);
    setSoulError('');
    setMomentsError('');
    setStoryGenerated(false);
    setStoryError('');
  };

  const openEdit = (c: Character) => {
    setEditTab('basic');
    setLocaleConfig((c.localeConfig as LocaleConfigMap) ?? {});
    setActiveLocale('en');
    setTranslateError('');
    setForm({
      id: c.id, name: c.name, nameEn: c.nameEn || '', slug: c.slug,
      franchise: c.franchise, franchiseEn: c.franchiseEn || '',
      description: c.description || '', systemPrompt: c.systemPrompt,
      voiceModelId: c.voiceModelId || '',
      catchphrases: Array.isArray(c.catchphrases) ? c.catchphrases.join(', ') : '',
      personalityTraits: typeof c.personalityTraits === 'string' ? c.personalityTraits : JSON.stringify(c.personalityTraits, null, 2),
      avatarUrl: c.avatarUrl || '', coverUrl: c.coverUrl || '',
      isActive: c.isActive,
      fcMonthlyPriceJpy: String(c.fcMonthlyPriceJpy ?? 3480),
      fcIncludedCallMin: String(c.fcIncludedCallMin ?? 30),
      callCoinPerMin: String(c.callCoinPerMin ?? 200),
      fcOverageCallCoinPerMin: String(c.fcOverageCallCoinPerMin ?? 100),
      freeMessageLimit: String(c.freeMessageLimit ?? 10),
      freeCallMinutes: String(c.freeCallMinutes ?? 5),
      fcMonthlyCoins: String(c.fcMonthlyCoins || 500),
      chatCoinPerMessage: String(c.chatCoinPerMessage ?? 10),
    });
    setEditingId(c.id);
    setShowForm(true);
    setError('');
    setPresenceSaveMsg('');
    setSecretsError('');
    setEditingSecretIdx(null);
    fetch(`/api/characters/${c.id}/presence`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPresence({ statusEmoji: data.presence?.statusEmoji, status: data.presence?.status });
          setMood({ moodLabel: data.mood?.moodLabel, moodEmoji: data.mood?.moodEmoji });
        } else { setPresence(null); setMood(null); }
      }).catch(() => { setPresence(null); setMood(null); });
    setPresenceManualMode(false);
    setPresenceEditStatus('');
    setPresenceEditEmoji('');
    fetch(`/api/admin/characters`)
      .then(r => r.ok ? r.json() : [])
      .then((chars: Array<{ id: string; presenceManualMode?: boolean; presenceStatus?: string; presenceEmoji?: string }>) => {
        const found = Array.isArray(chars) ? chars.find((ch) => ch.id === c.id) : null;
        if (found) {
          setPresenceManualMode(found.presenceManualMode ?? false);
          setPresenceEditStatus(found.presenceStatus ?? '');
          setPresenceEditEmoji(found.presenceEmoji ?? '');
        }
      }).catch(() => {});
    fetch(`/api/admin/characters/secrets?characterId=${c.id}&slug=${c.slug}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSecrets(Array.isArray(data) ? data : []))
      .catch(() => setSecrets([]));
  };

  const handleSubmit = async () => {
    setError('');
    const fcPrice = parseInt(form.fcMonthlyPriceJpy, 10);
    const callCoin = parseInt(form.callCoinPerMin, 10);
    const overageCoin = parseInt(form.fcOverageCallCoinPerMin, 10);
    if (!Number.isFinite(fcPrice) || fcPrice < 3480) { setError('FC月額は3480円以上を設定してください'); return; }
    if (!Number.isFinite(callCoin) || callCoin < 200) { setError('通話料金（非FC）は200コイン/分以上を設定してください'); return; }
    if (!Number.isFinite(overageCoin) || overageCoin < 100) { setError('FC超過通話料金は100コイン/分以上を設定してください'); return; }
    setSaving(true);
    try {
      let personalityTraitsParsed;
      try { personalityTraitsParsed = JSON.parse(form.personalityTraits || '[]'); } catch { setError('personalityTraitsのJSONが不正です'); setSaving(false); return; }
      const toInt = (v: string, fallback = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : fallback; };
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name, nameEn: form.nameEn || null, slug: form.slug,
        franchise: form.franchise, franchiseEn: form.franchiseEn || null,
        description: form.description || null, systemPrompt: form.systemPrompt,
        voiceModelId: form.voiceModelId || null,
        catchphrases: form.catchphrases.split(',').map((s) => s.trim()).filter(Boolean),
        personalityTraits: personalityTraitsParsed,
        avatarUrl: form.avatarUrl || null, coverUrl: form.coverUrl || null,
        isActive: form.isActive,
        fcMonthlyPriceJpy: toInt(form.fcMonthlyPriceJpy, 3480),
        fcIncludedCallMin: toInt(form.fcIncludedCallMin, 30),
        callCoinPerMin: toInt(form.callCoinPerMin, 200),
        fcOverageCallCoinPerMin: toInt(form.fcOverageCallCoinPerMin, 100),
        freeMessageLimit: toInt(form.freeMessageLimit, 10),
        freeCallMinutes: toInt(form.freeCallMinutes, 5),
        fcMonthlyCoins: toInt(form.fcMonthlyCoins, 500),
        chatCoinPerMessage: toInt(form.chatCoinPerMessage, 10),
        localeConfig: localeConfig,
      };
      const r = await fetch('/api/admin/characters', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); setError(d.error || '保存に失敗しました'); }
      else {
        const result = await r.json();
        if (!editingId) { setCreatedCharacterId(result.id || result.character?.id || null); setWizardStep(6); load(); }
        else { setShowForm(false); load(); }
      }
    } catch { setError('保存に失敗しました'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`/api/admin/characters?id=${id}`, { method: 'DELETE' });
    if (r.ok) { setDeleteConfirm(null); load(); }
  };

  const handleToggleActive = async (c: Character) => {
    const r = await fetch('/api/admin/characters', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) });
    if (r.ok) load();
  };

  const handleGenerateSoul = async () => {
    setSoulError(''); setGeneratingSoul(true);
    try {
      const res = await fetch('/api/admin/characters/generate-soul', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, slug: form.slug, franchise: form.franchise, description: form.description, systemPrompt: form.systemPrompt, catchphrases: form.catchphrases, voiceModelId: form.voiceModelId }) });
      const data = await res.json();
      if (!res.ok) { setSoulError(data.error || 'AI生成に失敗しました'); } else { setSoulText(data.soul || ''); setVoiceText(data.voice || ''); setBoundariesText(data.boundaries || ''); }
    } catch { setSoulError('AI生成に失敗しました'); }
    setGeneratingSoul(false);
  };

  const handleGenerateMoments = async () => {
    if (!createdCharacterId) return;
    setMomentsError(''); setGeneratingMoments(true);
    try {
      const res = await fetch('/api/admin/characters/generate-moments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: createdCharacterId, slug: form.slug, count: 5 }) });
      const data = await res.json();
      if (!res.ok) { setMomentsError(data.error || 'Moments生成に失敗しました'); } else { setMomentsGenerated(true); }
    } catch { setMomentsError('Moments生成に失敗しました'); }
    setGeneratingMoments(false);
  };

  const handleGenerateStory = async () => {
    if (!createdCharacterId) return;
    setStoryError(''); setGeneratingStory(true);
    try {
      const res = await fetch('/api/admin/characters/generate-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: createdCharacterId }) });
      const data = await res.json();
      if (!res.ok) { setStoryError(data.error || 'ストーリー生成に失敗しました'); } else { setStoryGenerated(true); }
    } catch { setStoryError('ストーリー生成に失敗しました'); }
    setGeneratingStory(false);
  };

  const updateLocaleField = (locale: SupportedLocale, field: keyof CharacterLocaleConfig, value: string) => {
    setLocaleConfig(prev => ({ ...prev, [locale]: { ...(prev[locale] ?? {}), [field]: value } }));
  };

  const handleAutoTranslate = async () => {
    if (!form.systemPrompt) { setTranslateError('日本語のシステムプロンプトを入力してください'); return; }
    setTranslateError(''); setTranslating(true);
    try {
      const targetLangs = SUPPORTED_LOCALES.filter(l => l !== 'ja') as SupportedLocale[];
      const res = await fetch('/api/admin/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: form.systemPrompt, sourceLang: 'ja', targetLangs, context: form.name ? `キャラクター名: ${form.name}` : undefined }) });
      const data = await res.json();
      if (!res.ok) { setTranslateError(data.error || '翻訳に失敗しました'); return; }
      const { translations } = data as { translations: Record<string, string> };
      setLocaleConfig(prev => {
        const updated = { ...prev };
        for (const lang of targetLangs) { if (translations[lang]) { updated[lang] = { ...(updated[lang] ?? {}), systemPrompt: translations[lang] }; } }
        return updated;
      });
    } catch { setTranslateError('翻訳に失敗しました'); }
    setTranslating(false);
  };

  const handleSavePresence = async () => {
    if (!editingId) return;
    setSavingPresence(true); setPresenceSaveMsg('');
    try {
      const res = await fetch('/api/admin/characters/presence', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: editingId, status: presenceEditStatus, emoji: presenceEditEmoji, manualMode: presenceManualMode }) });
      if (res.ok) { setPresenceSaveMsg('保存しました'); setTimeout(() => setPresenceSaveMsg(''), 3000); } else { setPresenceSaveMsg('保存失敗'); }
    } catch { setPresenceSaveMsg('保存失敗'); }
    setSavingPresence(false);
  };

  const handleAddSecret = async () => {
    if (!editingId) return; setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: editingId, ...secretDraft, order: secrets.length }) });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || '追加失敗'); return; }
      setSecrets(prev => [...prev, data]);
      setEditingSecretIdx(null);
      setSecretDraft({ unlockLevel: 3, type: 'conversation_topic', title: '', content: '', promptAddition: '' });
    } catch { setSecretsError('追加失敗'); }
  };

  const handleUpdateSecret = async (idx: number) => {
    const s = secrets[idx]; if (!s?.id) return; setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/secrets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, ...secretDraft }) });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || '更新失敗'); return; }
      setSecrets(prev => prev.map((item, i) => i === idx ? data : item));
      setEditingSecretIdx(null);
    } catch { setSecretsError('更新失敗'); }
  };

  const handleDeleteSecret = async (idx: number) => {
    const s = secrets[idx];
    if (!s?.id) { setSecrets(prev => prev.filter((_, i) => i !== idx)); return; }
    setSecretsError('');
    try {
      const res = await fetch(`/api/admin/characters/secrets?id=${s.id}`, { method: 'DELETE' });
      if (!res.ok) { setSecretsError('削除失敗'); return; }
      setSecrets(prev => prev.filter((_, i) => i !== idx));
    } catch { setSecretsError('削除失敗'); }
  };

  const handleGenerateSecrets = async () => {
    if (!editingId) return; setGeneratingSecrets(true); setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/generate-secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: editingId }) });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || 'AI生成失敗'); return; }
      setSecrets(prev => [...prev, ...data]);
    } catch { setSecretsError('AI生成失敗'); }
    setGeneratingSecrets(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">キャラクター管理</h1>
        <button onClick={openNew} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">＋ 新規キャラ追加</button>
      </div>

      <CharacterTable
        characters={characters}
        loading={loading}
        voiceTestCharId={voiceTestCharId}
        onEdit={openEdit}
        onDelete={(id) => setDeleteConfirm(id)}
        onToggleActive={handleToggleActive}
        onVoiceTest={setVoiceTestCharId}
      />

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">キャラクターを削除しますか？</h3>
            <p className="text-gray-400 text-sm mb-6">この操作は取り消せません。関連するすべてのデータが削除されます。</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">削除する</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-2xl my-8">
            <h2 className="text-white font-bold text-lg mb-6">
              {editingId ? 'キャラクター編集' : '新規キャラクター追加'}
            </h2>

            {!editingId ? (
              <CharacterWizard
                form={form} wizardStep={wizardStep} saving={saving} error={error}
                generatingSoul={generatingSoul} soulText={soulText} voiceText={voiceText}
                boundariesText={boundariesText} soulError={soulError}
                generatingMoments={generatingMoments} momentsGenerated={momentsGenerated} momentsError={momentsError}
                generatingStory={generatingStory} storyGenerated={storyGenerated} storyError={storyError}
                onChange={f} onSetWizardStep={setWizardStep} onSetSoulText={setSoulText}
                onSetVoiceText={setVoiceText} onSetBoundariesText={setBoundariesText}
                onSubmit={handleSubmit} onGenerateSoul={handleGenerateSoul}
                onGenerateMoments={handleGenerateMoments} onGenerateStory={handleGenerateStory}
                onClose={() => setShowForm(false)}
              />
            ) : (
              <CharacterEditModal
                form={form} editingId={editingId} editTab={editTab} saving={saving} error={error}
                localeConfig={localeConfig} activeLocale={activeLocale} translating={translating} translateError={translateError}
                presence={presence} mood={mood}
                presenceManualMode={presenceManualMode} presenceEditStatus={presenceEditStatus}
                presenceEditEmoji={presenceEditEmoji} savingPresence={savingPresence} presenceSaveMsg={presenceSaveMsg}
                secrets={secrets} editingSecretIdx={editingSecretIdx} secretDraft={secretDraft}
                secretsError={secretsError} generatingSecrets={generatingSecrets}
                onSetEditTab={setEditTab} onChange={f} onSubmit={handleSubmit} onCancel={() => setShowForm(false)}
                onSetActiveLocale={setActiveLocale} onUpdateLocaleField={updateLocaleField} onAutoTranslate={handleAutoTranslate}
                onSetPresenceManualMode={setPresenceManualMode} onSetPresenceEditStatus={setPresenceEditStatus}
                onSetPresenceEditEmoji={setPresenceEditEmoji} onSavePresence={handleSavePresence}
                onSetEditingSecretIdx={setEditingSecretIdx} onSetSecretDraft={setSecretDraft}
                onAddSecret={handleAddSecret} onUpdateSecret={handleUpdateSecret}
                onDeleteSecret={handleDeleteSecret} onGenerateSecrets={handleGenerateSecrets}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
