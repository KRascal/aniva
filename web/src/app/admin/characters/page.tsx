'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  CharacterLocaleConfig,
  LocaleConfigMap,
  SupportedLocale,
} from '@/types/character-locale';
import { ImageUploadField } from '@/components/admin/characters/ImageUploadField';
import { GrossMarginPreview } from '@/components/admin/characters/GrossMarginPreview';
import { VoiceTester } from '@/components/admin/characters/VoiceTester';
import { SecretForm } from '@/components/admin/characters/SecretForm';
import { CharacterField } from '@/components/admin/characters/CharacterField';

interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  systemPrompt: string;
  voiceModelId: string | null;
  catchphrases: string[];
  personalityTraits: unknown;
  avatarUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  callCoinPerMin: number;
  fcOverageCallCoinPerMin: number;
  freeMessageLimit: number;
  freeCallMinutes: number;
  messageCount: number;
  uniqueUsers: number;
  fcMonthlyCoins?: number;
  chatCoinPerMessage?: number;
  localeConfig?: LocaleConfigMap | null;
  _count?: { relationships: number };
}

const EMPTY_FORM = {
  id: '',
  name: '',
  nameEn: '',
  slug: '',
  franchise: '',
  franchiseEn: '',
  description: '',
  systemPrompt: '',
  voiceModelId: '',
  catchphrases: '',
  personalityTraits: '[]',
  avatarUrl: '',
  coverUrl: '',
  isActive: true,
  fcMonthlyPriceJpy: '3480',
  fcIncludedCallMin: '30',
  callCoinPerMin: '200',
  fcOverageCallCoinPerMin: '100',
  freeMessageLimit: '10',
  freeCallMinutes: '5',
  fcMonthlyCoins: '500',
  chatCoinPerMessage: '10',
};




// ---- Inline Quick Voice Test (in table row) ----
function QuickVoiceTest({ character, onClose }: { character: Character; onClose: () => void }) {
  const [text, setText] = useState(`こんにちは！私は${character.name}です。`);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (!character.voiceModelId) return;
    setError('');
    setPlaying(true);
    try {
      const res = await fetch('/api/admin/voice-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceModelId: character.voiceModelId, text }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'テスト失敗');
        setPlaying(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => { URL.revokeObjectURL(url); setPlaying(false); };
      audio.onerror = () => { setError('再生エラー'); setPlaying(false); };
    } catch {
      setError('ネットワークエラー');
      setPlaying(false);
    }
  };

  return (
    <tr>
      <td colSpan={7} className="px-4 pb-3 pt-0 bg-gray-900">
        <div className="flex items-center gap-3 bg-gray-800/60 border border-purple-700/40 rounded-xl px-4 py-3">
          <span className="text-purple-400 text-sm shrink-0">🔊 {character.name}</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && play()}
            placeholder="テスト文章..."
            autoFocus
          />
          <button
            onClick={play}
            disabled={playing}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
          >
            {playing ? (
              <><svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> 再生中</>
            ) : '▶ 再生'}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg shrink-0">×</button>
          {error && <span className="text-red-400 text-xs shrink-0">{error}</span>}
        </div>
      </td>
    </tr>
  );
}

// ---- Wizard Step Indicator ----
function WizardStepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ['基本情報', 'キャラ設定', 'SOUL生成', '料金設定', '確認・作成', 'Moments'];
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  i + 1 === step
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : i + 1 < step
                    ? 'bg-purple-900/60 border-purple-500 text-purple-300'
                    : 'bg-gray-800 border-gray-600 text-gray-500'
                }`}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i + 1 === step ? 'text-purple-300' : 'text-gray-600'}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i + 1 < step ? 'bg-purple-500' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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

  // Wizard state (new character only)
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
      id: c.id,
      name: c.name,
      nameEn: c.nameEn || '',
      slug: c.slug,
      franchise: c.franchise,
      franchiseEn: c.franchiseEn || '',
      description: c.description || '',
      systemPrompt: c.systemPrompt,
      voiceModelId: c.voiceModelId || '',
      catchphrases: Array.isArray(c.catchphrases) ? c.catchphrases.join(', ') : '',
      personalityTraits: typeof c.personalityTraits === 'string' ? c.personalityTraits : JSON.stringify(c.personalityTraits, null, 2),
      avatarUrl: c.avatarUrl || '',
      coverUrl: c.coverUrl || '',
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
    // Fetch presence
    fetch(`/api/characters/${c.id}/presence`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setPresence({ statusEmoji: data.presence?.statusEmoji, status: data.presence?.status });
          setMood({ moodLabel: data.mood?.moodLabel, moodEmoji: data.mood?.moodEmoji });
        } else {
          setPresence(null); setMood(null);
        }
      })
      .catch(() => { setPresence(null); setMood(null); });
    // Load character presence settings
    fetch(`/api/admin/characters?id=${c.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // The API returns an array, find our char
        const chars = Array.isArray(data) ? data : (data ? [data] : []);
        // Use what we already have from the `c` object
      })
      .catch(() => {});
    // Initialize presence edit from character data (will be overridden by actual API data)
    setPresenceManualMode(false);
    setPresenceEditStatus('');
    setPresenceEditEmoji('');
    // Load character presence manual settings directly
    fetch(`/api/admin/characters`)
      .then(r => r.ok ? r.json() : [])
      .then((chars: Array<{ id: string; presenceManualMode?: boolean; presenceStatus?: string; presenceEmoji?: string }>) => {
        const found = Array.isArray(chars) ? chars.find((ch) => ch.id === c.id) : null;
        if (found) {
          setPresenceManualMode(found.presenceManualMode ?? false);
          setPresenceEditStatus(found.presenceStatus ?? '');
          setPresenceEditEmoji(found.presenceEmoji ?? '');
        }
      })
      .catch(() => {});
    // Load secrets from DB (with characterId), fallback to slug
    fetch(`/api/admin/characters/secrets?characterId=${c.id}&slug=${c.slug}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSecrets(Array.isArray(data) ? data : []))
      .catch(() => setSecrets([]));
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    const fcPrice = parseInt(form.fcMonthlyPriceJpy, 10);
    const callCoin = parseInt(form.callCoinPerMin, 10);
    const overageCoin = parseInt(form.fcOverageCallCoinPerMin, 10);

    if (!Number.isFinite(fcPrice) || fcPrice < 3480) {
      setError('FC月額は3480円以上を設定してください');
      return;
    }
    if (!Number.isFinite(callCoin) || callCoin < 200) {
      setError('通話料金（非FC）は200コイン/分以上を設定してください');
      return;
    }
    if (!Number.isFinite(overageCoin) || overageCoin < 100) {
      setError('FC超過通話料金は100コイン/分以上を設定してください');
      return;
    }

    setSaving(true);
    try {
      let personalityTraitsParsed;
      try {
        personalityTraitsParsed = JSON.parse(form.personalityTraits || '[]');
      } catch {
        setError('personalityTraitsのJSONが不正です');
        setSaving(false);
        return;
      }

      const toInt = (v: string, fallback = 0) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
      };

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        nameEn: form.nameEn || null,
        slug: form.slug,
        franchise: form.franchise,
        franchiseEn: form.franchiseEn || null,
        description: form.description || null,
        systemPrompt: form.systemPrompt,
        voiceModelId: form.voiceModelId || null,
        catchphrases: form.catchphrases.split(',').map((s) => s.trim()).filter(Boolean),
        personalityTraits: personalityTraitsParsed,
        avatarUrl: form.avatarUrl || null,
        coverUrl: form.coverUrl || null,
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

      const r = await fetch('/api/admin/characters', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const d = await r.json();
        setError(d.error || '保存に失敗しました');
      } else {
        const result = await r.json();
        if (!editingId) {
          // New character created: move to step 6
          setCreatedCharacterId(result.id || result.character?.id || null);
          setWizardStep(6);
          load();
        } else {
          setShowForm(false);
          load();
        }
      }
    } catch {
      setError('保存に失敗しました');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const r = await fetch(`/api/admin/characters?id=${id}`, { method: 'DELETE' });
    if (r.ok) {
      setDeleteConfirm(null);
      load();
    }
  };

  const handleGenerateSoul = async () => {
    setSoulError('');
    setGeneratingSoul(true);
    try {
      const res = await fetch('/api/admin/characters/generate-soul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          franchise: form.franchise,
          description: form.description,
          systemPrompt: form.systemPrompt,
          catchphrases: form.catchphrases,
          voiceModelId: form.voiceModelId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSoulError(data.error || 'AI生成に失敗しました');
      } else {
        setSoulText(data.soul || '');
        setVoiceText(data.voice || '');
        setBoundariesText(data.boundaries || '');
      }
    } catch {
      setSoulError('AI生成に失敗しました');
    }
    setGeneratingSoul(false);
  };

  const handleGenerateMoments = async () => {
    if (!createdCharacterId) return;
    setMomentsError('');
    setGeneratingMoments(true);
    try {
      const res = await fetch('/api/admin/characters/generate-moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: createdCharacterId, slug: form.slug, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMomentsError(data.error || 'Moments生成に失敗しました');
      } else {
        setMomentsGenerated(true);
      }
    } catch {
      setMomentsError('Moments生成に失敗しました');
    }
    setGeneratingMoments(false);
  };

  const handleGenerateStory = async () => {
    if (!createdCharacterId) return;
    setStoryError('');
    setGeneratingStory(true);
    try {
      const res = await fetch('/api/admin/characters/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: createdCharacterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStoryError(data.error || 'ストーリー生成に失敗しました');
      } else {
        setStoryGenerated(true);
      }
    } catch {
      setStoryError('ストーリー生成に失敗しました');
    }
    setGeneratingStory(false);
  };

  const f = (key: keyof typeof EMPTY_FORM, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ---- Locale config helpers ----
  const updateLocaleField = (locale: SupportedLocale, field: keyof CharacterLocaleConfig, value: string) => {
    setLocaleConfig(prev => ({
      ...prev,
      [locale]: {
        ...(prev[locale] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleAutoTranslate = async () => {
    if (!form.systemPrompt) {
      setTranslateError('日本語のシステムプロンプトを入力してください');
      return;
    }
    setTranslateError('');
    setTranslating(true);
    try {
      const targetLangs = SUPPORTED_LOCALES.filter(l => l !== 'ja') as SupportedLocale[];
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.systemPrompt,
          sourceLang: 'ja',
          targetLangs,
          context: form.name ? `キャラクター名: ${form.name}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTranslateError(data.error || '翻訳に失敗しました');
        return;
      }
      const { translations } = data as { translations: Record<string, string> };
      setLocaleConfig(prev => {
        const updated = { ...prev };
        for (const lang of targetLangs) {
          if (translations[lang]) {
            updated[lang] = {
              ...(updated[lang] ?? {}),
              systemPrompt: translations[lang],
            };
          }
        }
        return updated;
      });
    } catch {
      setTranslateError('翻訳に失敗しました');
    }
    setTranslating(false);
  };

  // ---- Presence save ----
  const handleSavePresence = async () => {
    if (!editingId) return;
    setSavingPresence(true);
    setPresenceSaveMsg('');
    try {
      const res = await fetch('/api/admin/characters/presence', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: editingId,
          status: presenceEditStatus,
          emoji: presenceEditEmoji,
          manualMode: presenceManualMode,
        }),
      });
      if (res.ok) {
        setPresenceSaveMsg('保存しました');
        setTimeout(() => setPresenceSaveMsg(''), 3000);
      } else {
        setPresenceSaveMsg('保存失敗');
      }
    } catch {
      setPresenceSaveMsg('保存失敗');
    }
    setSavingPresence(false);
  };

  // ---- Secret CRUD ----
  const handleAddSecret = async () => {
    if (!editingId) return;
    setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: editingId,
          ...secretDraft,
          order: secrets.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || '追加失敗'); return; }
      setSecrets(prev => [...prev, data]);
      setEditingSecretIdx(null);
      setSecretDraft({ unlockLevel: 3, type: 'conversation_topic', title: '', content: '', promptAddition: '' });
    } catch {
      setSecretsError('追加失敗');
    }
  };

  const handleUpdateSecret = async (idx: number) => {
    const s = secrets[idx];
    if (!s?.id) return;
    setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, ...secretDraft }),
      });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || '更新失敗'); return; }
      setSecrets(prev => prev.map((item, i) => i === idx ? data : item));
      setEditingSecretIdx(null);
    } catch {
      setSecretsError('更新失敗');
    }
  };

  const handleDeleteSecret = async (idx: number) => {
    const s = secrets[idx];
    if (!s?.id) {
      // No DB id, just remove from local state
      setSecrets(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setSecretsError('');
    try {
      const res = await fetch(`/api/admin/characters/secrets?id=${s.id}`, { method: 'DELETE' });
      if (!res.ok) { setSecretsError('削除失敗'); return; }
      setSecrets(prev => prev.filter((_, i) => i !== idx));
    } catch {
      setSecretsError('削除失敗');
    }
  };

  const handleGenerateSecrets = async () => {
    if (!editingId) return;
    setGeneratingSecrets(true);
    setSecretsError('');
    try {
      const res = await fetch('/api/admin/characters/generate-secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: editingId }),
      });
      const data = await res.json();
      if (!res.ok) { setSecretsError(data.error || 'AI生成失敗'); return; }
      setSecrets(prev => [...prev, ...data]);
    } catch {
      setSecretsError('AI生成失敗');
    }
    setGeneratingSecrets(false);
  };

  // ---- Wizard form for new characters ----
  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 1: 基本情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CharacterField label="名前 *" value={form.name} onChange={(v) => f('name', v)} />
              <CharacterField label="名前（英語）" value={form.nameEn} onChange={(v) => f('nameEn', v)} />
              <CharacterField label="スラッグ *" value={form.slug} onChange={(v) => f('slug', v)} placeholder="e.g. luffy" />
              <CharacterField label="フランチャイズ *" value={form.franchise} onChange={(v) => f('franchise', v)} />
              <CharacterField label="フランチャイズ（英語）" value={form.franchiseEn} onChange={(v) => f('franchiseEn', v)} />
            </div>
            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">説明</label>
              <textarea
                value={form.description}
                onChange={(e) => f('description', e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="アバター画像"
                value={form.avatarUrl}
                onChange={(v) => f('avatarUrl', v)}
                slug={form.slug}
              />
              <ImageUploadField
                label="カバー画像"
                value={form.coverUrl}
                onChange={(v) => f('coverUrl', v)}
                slug={form.slug}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 2: キャラクター設定</h3>
            {/* ElevenLabs Voice Model ID */}
            <div className="p-4 bg-gray-800/60 border border-purple-700/40 rounded-xl mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-400 text-sm font-semibold">🎙 ElevenLabs ボイスID</span>
                {form.voiceModelId ? (
                  <span className="bg-green-900/40 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-800/40">設定済み</span>
                ) : (
                  <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">未設定</span>
                )}
              </div>
              <input
                type="text"
                value={form.voiceModelId}
                onChange={(e) => f('voiceModelId', e.target.value)}
                placeholder="ElevenLabs Voice ID を入力 (例: 21m00Tcm4TlvDq8ikWAM)"
                className="w-full bg-gray-900 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 font-mono placeholder-gray-600"
              />
              <p className="text-gray-500 text-xs mt-1.5">ElevenLabs の Voice ID (Voices ページから確認できます)</p>
              <VoiceTester voiceModelId={form.voiceModelId} />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">システムプロンプト *</label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => f('systemPrompt', e.target.value)}
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">キャッチフレーズ（カンマ区切り）</label>
              <input
                type="text"
                value={form.catchphrases}
                onChange={(e) => f('catchphrases', e.target.value)}
                placeholder="俺は海賊王になる！, 一緒に冒険しよう"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-gray-400 text-sm mb-1">パーソナリティトレイト（JSON配列）</label>
              <textarea
                value={form.personalityTraits}
                onChange={(e) => f('personalityTraits', e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-gray-400 text-sm">アクティブ</label>
              <button
                type="button"
                onClick={() => f('isActive', !form.isActive)}
                className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 3: SOUL / VOICE / BOUNDARIES 生成</h3>
            <p className="text-gray-400 text-sm mb-4">
              AIがキャラクターの性格定義ファイルを自動生成します。生成後に編集することもできます。
            </p>

            <button
              type="button"
              onClick={handleGenerateSoul}
              disabled={generatingSoul || !form.name || !form.slug}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-4"
            >
              {generatingSoul ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  AI生成中...
                </>
              ) : '✨ AIで自動生成'}
            </button>

            {soulError && (
              <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{soulError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-purple-400 text-sm font-semibold mb-1">🌟 SOUL（性格の核・価値観）</label>
                <textarea
                  value={soulText}
                  onChange={(e) => setSoulText(e.target.value)}
                  rows={6}
                  placeholder="AIで生成するか、直接入力してください..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-400 text-sm font-semibold mb-1">🎭 VOICE（台詞サンプル）</label>
                <textarea
                  value={voiceText}
                  onChange={(e) => setVoiceText(e.target.value)}
                  rows={5}
                  placeholder="AIで生成するか、直接入力してください..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-400 text-sm font-semibold mb-1">🚫 BOUNDARIES（禁止事項）</label>
                <textarea
                  value={boundariesText}
                  onChange={(e) => setBoundariesText(e.target.value)}
                  rows={4}
                  placeholder="AIで生成するか、直接入力してください..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            {(soulText || voiceText || boundariesText) && (
              <p className="text-green-400 text-xs mt-2">✓ 生成済み — エージェントフォルダに保存されます</p>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 4: 料金設定</h3>
            <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
              <h4 className="text-white font-semibold text-sm mb-4">💰 料金設定</h4>

              {/* 通常（非FC） */}
              <div className="mb-4">
                <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">🪙 通常（非FC会員）</p>
                <p className="text-gray-500 text-xs mb-3">FC未加入ユーザーのコイン消費設定</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">チャット / 1通</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={form.chatCoinPerMessage}
                        onChange={(e) => f('chatCoinPerMessage', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        min={1}
                        max={100}
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">デフォルト: 10コイン</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">通話 / 1分</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="200"
                        value={form.callCoinPerMin}
                        onChange={(e) => f('callCoinPerMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 200コイン</p>
                  </div>
                </div>
              </div>

              {/* FCメンバーシップ */}
              <div className="pt-4 border-t border-gray-700/60">
                <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">👑 FCメンバーシップ</p>
                <p className="text-gray-500 text-xs mb-3">FC加入者はチャット無制限 + 通話時間インクルード</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">FC月額</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="3480"
                        value={form.fcMonthlyPriceJpy}
                        onChange={(e) => f('fcMonthlyPriceJpy', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">円</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 ¥3,480</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">月額無料コイン付与</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={form.fcMonthlyCoins}
                        onChange={(e) => f('fcMonthlyCoins', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        min={0}
                        max={10000}
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">毎月FC加入者に付与（デフォルト: 500）</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">込み通話時間</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={form.fcIncludedCallMin}
                        onChange={(e) => f('fcIncludedCallMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">分/月</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">超過通話料金</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="100"
                        value={form.fcOverageCallCoinPerMin}
                        onChange={(e) => f('fcOverageCallCoinPerMin', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-gray-400 text-sm shrink-0">コイン/分</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">最低 100コイン</p>
                  </div>
                </div>
              </div>

              <GrossMarginPreview
                fcMonthlyPriceJpy={form.fcMonthlyPriceJpy}
                freeMessageLimit={'0'}
                fcIncludedCallMin={form.fcIncludedCallMin}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 5: 確認・作成</h3>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3 text-sm mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">名前</span>
                  <p className="text-white">{form.name || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">スラッグ</span>
                  <p className="text-white font-mono">{form.slug || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">フランチャイズ</span>
                  <p className="text-white">{form.franchise || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">ボイスID</span>
                  <p className="text-white font-mono text-xs truncate">{form.voiceModelId || '未設定'}</p>
                </div>
                <div>
                  <span className="text-gray-500">FC月額</span>
                  <p className="text-yellow-400 font-bold">¥{parseInt(form.fcMonthlyPriceJpy, 10).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">状態</span>
                  <p className={form.isActive ? 'text-green-400' : 'text-gray-500'}>
                    {form.isActive ? '● アクティブ' : '○ 停止中'}
                  </p>
                </div>
              </div>
              {form.description && (
                <div>
                  <span className="text-gray-500">説明</span>
                  <p className="text-gray-300 text-xs mt-1">{form.description}</p>
                </div>
              )}
              {(soulText || voiceText || boundariesText) && (
                <div className="pt-2 border-t border-gray-700/60">
                  <span className="text-purple-400 text-xs">✓ SOUL/VOICE/BOUNDARIES 生成済み</span>
                </div>
              )}
            </div>

            {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !form.name || !form.slug || !form.franchise}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  作成中...
                </>
              ) : '🚀 キャラクターを作成'}
            </button>
          </div>
        );

      case 6:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 6: 初期Moments生成</h3>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-900/40 border border-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-green-400 font-semibold">キャラクター「{form.name}」を作成しました！</p>
              <p className="text-gray-400 text-sm mt-1">次に初期Momentsを生成してキャラを賑やかにしましょう。</p>
            </div>

            {!momentsGenerated ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerateMoments}
                  disabled={generatingMoments}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {generatingMoments ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Moments生成中...
                    </>
                  ) : '✨ AIで初期Moments生成（5件）'}
                </button>
                {momentsError && (
                  <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{momentsError}</div>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  スキップして閉じる
                </button>
              </>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-green-400 font-semibold">🎉 5件のMomentsを生成しました！</p>
                <button
                  type="button"
                  onClick={() => setWizardStep(7)}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  次へ: ストーリーチャプター生成 →
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="block w-full mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  スキップして閉じる
                </button>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div>
            <h3 className="text-purple-300 font-semibold mb-4">Step 7: ストーリーチャプター生成</h3>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-900/40 border border-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📖</span>
              </div>
              <p className="text-gray-300 font-semibold">ストーリーモード初期コンテンツを生成</p>
              <p className="text-gray-500 text-sm mt-1">Chapter 1〜3（Ch.3はFC限定）をAIが自動作成します。</p>
            </div>

            {!storyGenerated ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerateStory}
                  disabled={generatingStory}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  {generatingStory ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      ストーリー生成中...
                    </>
                  ) : '📖 AIでストーリーチャプター生成（3章）'}
                </button>
                {storyError && (
                  <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{storyError}</div>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  スキップして閉じる
                </button>
              </>
            ) : (
              <div className="text-center space-y-3">
                <div className="space-y-2">
                  <p className="text-green-400 font-semibold">🎉 ストーリーチャプター3章を生成しました！</p>
                  <p className="text-gray-500 text-xs">Chapter 1（無料）/ Chapter 2（Lv3解放）/ Chapter 3（FC限定）</p>
                </div>
                <a
                  href="/story"
                  className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  🎊 完了！ /story で確認する →
                </a>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="block w-full mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-colors"
                >
                  管理画面に戻る
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">キャラクター管理</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ＋ 新規キャラ追加
        </button>
      </div>

      {/* Feature Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs">Smart DM</p>
          <p className="text-green-400 text-sm font-bold">Active</p>
          <p className="text-gray-600 text-xs">8:00/14:00/1:00</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs">キャラコメント</p>
          <p className="text-green-400 text-sm font-bold">Active</p>
          <p className="text-gray-600 text-xs">10:00/16:00/22:00</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs">月次手紙</p>
          <p className="text-green-400 text-sm font-bold">Active</p>
          <p className="text-gray-600 text-xs">毎月1日 9:00</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-xs">不在演出</p>
          <p className="text-green-400 text-sm font-bold">Active</p>
          <p className="text-gray-600 text-xs">自動（時間帯）</p>
        </div>
      </div>

      {/* Characters table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/40">
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">キャラ</th>
                <th className="text-left text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">フランチャイズ</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">月額</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">会話数</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">ユーザー数</th>
                <th className="text-center text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">状態</th>
                <th className="text-right text-gray-400 text-xs font-medium uppercase tracking-wider px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    読み込み中...
                  </div>
                </td></tr>
              ) : characters.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">キャラクターがありません</td></tr>
              ) : (
                characters.map((c) => (
                  <React.Fragment key={c.id}>
                  <tr className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden shrink-0 border border-gray-600">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-base font-bold">
                              {c.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{c.name}</div>
                          <div className="text-gray-500 text-xs">{c.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{c.franchise}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="text-yellow-400 font-medium">¥{c.fcMonthlyPriceJpy.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-white text-sm font-medium">{(c.messageCount ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-sm">{(c.uniqueUsers ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={async () => {
                          const r = await fetch('/api/admin/characters', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
                          });
                          if (r.ok) load();
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full transition-colors font-medium ${
                          c.isActive
                            ? 'bg-green-900/50 text-green-400 hover:bg-red-900/50 hover:text-red-400'
                            : 'bg-gray-800 text-gray-500 hover:bg-green-900/50 hover:text-green-400'
                        }`}
                        title={c.isActive ? 'クリックで無効化' : 'クリックで有効化'}
                      >
                        {c.isActive ? '● アクティブ' : '○ 停止中'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.voiceModelId && (
                        <button
                          onClick={() => setVoiceTestCharId(voiceTestCharId === c.id ? null : c.id)}
                          className={`text-sm mr-3 transition-colors ${voiceTestCharId === c.id ? 'text-purple-300' : 'text-gray-500 hover:text-purple-400'}`}
                          title="ボイステスト"
                        >🔊</button>
                      )}
                      <a
                        href={`/admin/characters/${c.id}/bible`}
                        className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                      >バイブル</a>
                      <button
                        onClick={() => openEdit(c)}
                        className="text-purple-400 hover:text-purple-300 text-sm mr-3"
                      >編集</button>
                      <button
                        onClick={() => setDeleteConfirm(c.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >削除</button>
                    </td>
                  </tr>
                  {voiceTestCharId === c.id && (
                    <QuickVoiceTest
                      character={c}
                      onClose={() => setVoiceTestCharId(null)}
                    />
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">キャラクターを削除しますか？</h3>
            <p className="text-gray-400 text-sm mb-6">この操作は取り消せません。関連するすべてのデータが削除されます。</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >削除する</button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >キャンセル</button>
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

            {/* ---- WIZARD MODE (new character only) ---- */}
            {!editingId ? (
              <>
                <WizardStepIndicator step={wizardStep} total={7} />

                {renderWizardStep()}

                {/* Navigation buttons (not on step 5 or 6 - those have their own buttons) */}
                {wizardStep < 5 && (
                  <div className="mt-6 flex gap-3">
                    {wizardStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setWizardStep(s => s - 1)}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                      >← 戻る</button>
                    )}
                    <button
                      type="button"
                      onClick={() => setWizardStep(s => s + 1)}
                      disabled={wizardStep === 1 && (!form.name || !form.slug || !form.franchise)}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >次へ →</button>
                  </div>
                )}

                {/* Back button on step 5 (before create) */}
                {wizardStep === 5 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                    >← 戻る</button>
                  </div>
                )}

                {/* Cancel button (always visible except step 6) */}
                {wizardStep < 7 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="w-full px-4 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
                    >キャンセル</button>
                  </div>
                )}
              </>
            ) : (
              /* ---- EDIT MODE (existing character, flat form) ---- */
              <>
                {/* Tab navigation */}
                <div className="flex gap-1 mb-6 border-b border-gray-700">
                  <button
                    type="button"
                    onClick={() => setEditTab('basic')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${editTab === 'basic' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >基本設定</button>
                  <button
                    type="button"
                    onClick={() => setEditTab('locale')}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${editTab === 'locale' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  >🌐 多言語設定</button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

                {/* ---- LOCALE CONFIG TAB ---- */}
                {editTab === 'locale' && (
                  <div>
                    {/* Auto translate button */}
                    <div className="mb-4 p-4 bg-gray-800/60 border border-purple-700/40 rounded-xl">
                      <p className="text-gray-300 text-sm mb-2">
                        日本語のシステムプロンプトをベースに他言語へ自動翻訳します。
                      </p>
                      <button
                        type="button"
                        onClick={handleAutoTranslate}
                        disabled={translating || !form.systemPrompt}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        {translating ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            翻訳中...
                          </>
                        ) : '🤖 自動翻訳 (EN / KO / ZH)'}
                      </button>
                      {translateError && (
                        <p className="text-red-400 text-xs mt-2">{translateError}</p>
                      )}
                    </div>

                    {/* Locale sub-tabs */}
                    <div className="flex gap-1 mb-4 overflow-x-auto">
                      {SUPPORTED_LOCALES.filter(l => l !== 'ja').map(locale => (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => setActiveLocale(locale)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg shrink-0 transition-colors ${
                            activeLocale === locale
                              ? 'bg-blue-700 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          {LOCALE_LABELS[locale]}
                          {localeConfig[locale]?.systemPrompt && (
                            <span className="ml-1 text-green-400 text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Locale fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          キャラ名 ({LOCALE_LABELS[activeLocale]})
                        </label>
                        <input
                          type="text"
                          value={localeConfig[activeLocale]?.name ?? ''}
                          onChange={(e) => updateLocaleField(activeLocale, 'name', e.target.value)}
                          placeholder={`${form.name} の${LOCALE_LABELS[activeLocale]}名`}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          Bio / 説明 ({LOCALE_LABELS[activeLocale]})
                        </label>
                        <textarea
                          value={localeConfig[activeLocale]?.bio ?? ''}
                          onChange={(e) => updateLocaleField(activeLocale, 'bio', e.target.value)}
                          rows={2}
                          placeholder="キャラクター説明文..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          グリーティング ({LOCALE_LABELS[activeLocale]})
                        </label>
                        <input
                          type="text"
                          value={localeConfig[activeLocale]?.greeting ?? ''}
                          onChange={(e) => updateLocaleField(activeLocale, 'greeting', e.target.value)}
                          placeholder="初回挨拶..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-1">
                          システムプロンプト ({LOCALE_LABELS[activeLocale]})
                        </label>
                        <textarea
                          value={localeConfig[activeLocale]?.systemPrompt ?? ''}
                          onChange={(e) => updateLocaleField(activeLocale, 'systemPrompt', e.target.value)}
                          rows={10}
                          placeholder={`${LOCALE_LABELS[activeLocale]}版のシステムプロンプト（🤖 自動翻訳で生成可）`}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>

                      <div className="p-4 bg-gray-800/60 border border-purple-700/40 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-purple-400 text-sm font-semibold">
                            🎙 ElevenLabs ボイスID ({LOCALE_LABELS[activeLocale]})
                          </span>
                          {localeConfig[activeLocale]?.voiceModelId ? (
                            <span className="bg-green-900/40 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-800/40">設定済み</span>
                          ) : (
                            <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">未設定</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={localeConfig[activeLocale]?.voiceModelId ?? ''}
                          onChange={(e) => updateLocaleField(activeLocale, 'voiceModelId', e.target.value)}
                          placeholder="ElevenLabs Voice ID (例: 21m00Tcm4TlvDq8ikWAM)"
                          className="w-full bg-gray-900 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 font-mono placeholder-gray-600"
                        />
                        <p className="text-gray-500 text-xs mt-1.5">
                          {LOCALE_LABELS[activeLocale]}用の声優 (未設定時はデフォルト声優にフォールバック)
                        </p>
                        {localeConfig[activeLocale]?.voiceModelId && (
                          <VoiceTester voiceModelId={localeConfig[activeLocale]?.voiceModelId ?? ''} />
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >{saving ? '保存中...' : '保存'}</button>
                      <button
                        onClick={() => setShowForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                      >キャンセル</button>
                    </div>
                  </div>
                )}

                {/* ---- BASIC SETTINGS TAB ---- */}
                {editTab === 'basic' && (
                <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CharacterField label="名前 *" value={form.name} onChange={(v) => f('name', v)} />
                  <CharacterField label="名前（英語）" value={form.nameEn} onChange={(v) => f('nameEn', v)} />
                  <CharacterField label="スラッグ *" value={form.slug} onChange={(v) => f('slug', v)} placeholder="e.g. luffy" />
                  <CharacterField label="フランチャイズ *" value={form.franchise} onChange={(v) => f('franchise', v)} />
                  <CharacterField label="フランチャイズ（英語）" value={form.franchiseEn} onChange={(v) => f('franchiseEn', v)} />
                </div>

                {/* ElevenLabs Voice Model ID - prominent section */}
                <div className="mt-4 p-4 bg-gray-800/60 border border-purple-700/40 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-purple-400 text-sm font-semibold">🎙 ElevenLabs ボイスID</span>
                    {form.voiceModelId && (
                      <span className="bg-green-900/40 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-800/40">設定済み</span>
                    )}
                    {!form.voiceModelId && (
                      <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">未設定</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.voiceModelId}
                      onChange={(e) => f('voiceModelId', e.target.value)}
                      placeholder="ElevenLabs Voice ID を入力 (例: 21m00Tcm4TlvDq8ikWAM)"
                      className="flex-1 bg-gray-900 border border-purple-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400 font-mono placeholder-gray-600"
                    />
                  </div>
                  <p className="text-gray-500 text-xs mt-1.5">
                    ElevenLabs の Voice ID (Voices ページから確認できます)
                  </p>
                  <VoiceTester voiceModelId={form.voiceModelId} />
                </div>

                {/* Avatar & Cover image upload fields */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUploadField
                    label="アバター画像"
                    value={form.avatarUrl}
                    onChange={(v) => f('avatarUrl', v)}
                    slug={form.slug}
                  />
                  <ImageUploadField
                    label="カバー画像"
                    value={form.coverUrl}
                    onChange={(v) => f('coverUrl', v)}
                    slug={form.slug}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-gray-400 text-sm mb-1">説明</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => f('description', e.target.value)}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-gray-400 text-sm mb-1">システムプロンプト *</label>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => f('systemPrompt', e.target.value)}
                    rows={8}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-gray-400 text-sm mb-1">キャッチフレーズ（カンマ区切り）</label>
                  <input
                    type="text"
                    value={form.catchphrases}
                    onChange={(e) => f('catchphrases', e.target.value)}
                    placeholder="俺は海賊王になる！, 一緒に冒険しよう"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-gray-400 text-sm mb-1">パーソナリティトレイト（JSON配列）</label>
                  <textarea
                    value={form.personalityTraits}
                    onChange={(e) => f('personalityTraits', e.target.value)}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label className="text-gray-400 text-sm">アクティブ</label>
                  <button
                    type="button"
                    onClick={() => f('isActive', !form.isActive)}
                    className={`w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-purple-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* 料金設定セクション */}
                <div className="mt-6 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
                  <h3 className="text-white font-semibold text-sm mb-4">💰 料金設定</h3>

                  {/* 通常（非FC） */}
                  <div className="mb-4">
                    <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">🪙 通常（非FC会員）</p>
                    <p className="text-gray-500 text-xs mb-3">FC未加入ユーザーのコイン消費設定</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">チャット / 1通</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={form.chatCoinPerMessage}
                            onChange={(e) => f('chatCoinPerMessage', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            min={1}
                            max={100}
                          />
                          <span className="text-gray-400 text-sm shrink-0">コイン</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">デフォルト: 10コイン</p>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">通話 / 1分</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="200"
                            value={form.callCoinPerMin}
                            onChange={(e) => f('callCoinPerMin', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-gray-400 text-sm shrink-0">コイン</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">最低 200コイン</p>
                      </div>
                    </div>
                  </div>

                  {/* FCメンバーシップ */}
                  <div className="pt-4 border-t border-gray-700/60">
                    <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">👑 FCメンバーシップ</p>
                    <p className="text-gray-500 text-xs mb-3">FC加入者はチャット無制限 + 通話時間インクルード</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">FC月額</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="3480"
                            value={form.fcMonthlyPriceJpy}
                            onChange={(e) => f('fcMonthlyPriceJpy', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-gray-400 text-sm shrink-0">円</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">最低 ¥3,480</p>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">月額無料コイン付与</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={form.fcMonthlyCoins}
                            onChange={(e) => f('fcMonthlyCoins', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                            min={0}
                            max={10000}
                          />
                          <span className="text-gray-400 text-sm shrink-0">コイン</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">毎月FC加入者に付与（デフォルト: 500）</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">込み通話時間</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={form.fcIncludedCallMin}
                            onChange={(e) => f('fcIncludedCallMin', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-gray-400 text-sm shrink-0">分/月</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">超過通話料金</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="100"
                            value={form.fcOverageCallCoinPerMin}
                            onChange={(e) => f('fcOverageCallCoinPerMin', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                          <span className="text-gray-400 text-sm shrink-0">コイン/分</span>
                        </div>
                        <p className="text-gray-600 text-xs mt-1">最低 100コイン</p>
                      </div>
                    </div>
                  </div>

                  {/* 粗利率プレビュー */}
                  <GrossMarginPreview
                    fcMonthlyPriceJpy={form.fcMonthlyPriceJpy}
                    freeMessageLimit={'0'}
                    fcIncludedCallMin={form.fcIncludedCallMin}
                  />
                </div>

                {/* プレゼンス状態（編集可能） */}
                {editingId && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">🟢 プレゼンス設定</h4>

                    {/* 現在の自動状態 */}
                    {presence && !presenceManualMode && (
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                        <span>現在: {presence.statusEmoji} {presence.status}</span>
                        {mood && <span className="text-gray-600">/ ムード: {mood.moodLabel} {mood.moodEmoji}</span>}
                      </div>
                    )}

                    {/* 手動/自動トグル */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-gray-400 text-sm">モード:</span>
                      <button
                        type="button"
                        onClick={() => setPresenceManualMode(false)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!presenceManualMode ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                      >自動</button>
                      <button
                        type="button"
                        onClick={() => setPresenceManualMode(true)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${presenceManualMode ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                      >手動上書き</button>
                    </div>

                    {/* 手動モード入力 */}
                    {presenceManualMode && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-gray-500 text-xs mb-1">ステータステキスト</label>
                          <input
                            type="text"
                            value={presenceEditStatus}
                            onChange={e => setPresenceEditStatus(e.target.value)}
                            placeholder="例: 修行中"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-xs mb-1">絵文字</label>
                          <input
                            type="text"
                            value={presenceEditEmoji}
                            onChange={e => setPresenceEditEmoji(e.target.value)}
                            placeholder="例: ⚔️"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSavePresence}
                        disabled={savingPresence}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >{savingPresence ? '保存中...' : '保存'}</button>
                      {presenceSaveMsg && (
                        <span className={`text-xs ${presenceSaveMsg === '保存しました' ? 'text-green-400' : 'text-red-400'}`}>{presenceSaveMsg}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 秘密コンテンツ（編集可能） */}
                {editingId && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-300">🔒 秘密コンテンツ</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateSecrets}
                          disabled={generatingSecrets}
                          className="px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          {generatingSecrets ? (
                            <><svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>AI生成中...</>
                          ) : '🤖 AIで自動生成'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSecretDraft({ unlockLevel: 3, type: 'conversation_topic', title: '', content: '', promptAddition: '' });
                            setEditingSecretIdx(-1); // -1 = new
                          }}
                          className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                        >＋ 追加</button>
                      </div>
                    </div>

                    {secretsError && (
                      <p className="text-red-400 text-xs mb-2">{secretsError}</p>
                    )}

                    {/* Add new form */}
                    {editingSecretIdx === -1 && (
                      <div className="mb-3 p-3 bg-gray-900/60 rounded-lg border border-green-700/40">
                        <p className="text-green-400 text-xs font-semibold mb-2">新規追加</p>
                        <SecretForm draft={secretDraft} onChange={setSecretDraft} />
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={handleAddSecret} className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium">保存</button>
                          <button type="button" onClick={() => setEditingSecretIdx(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">キャンセル</button>
                        </div>
                      </div>
                    )}

                    {/* Secrets list */}
                    {secrets.length === 0 ? (
                      <p className="text-gray-500 text-xs">秘密コンテンツなし</p>
                    ) : (
                      <div className="space-y-2">
                        {secrets.map((s, i) => (
                          <div key={s.id ?? i} className="bg-gray-900/60 rounded-lg p-2">
                            {editingSecretIdx === i ? (
                              <div>
                                <SecretForm draft={secretDraft} onChange={setSecretDraft} />
                                <div className="flex gap-2 mt-2">
                                  <button type="button" onClick={() => handleUpdateSecret(i)} className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium">更新</button>
                                  <button type="button" onClick={() => setEditingSecretIdx(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">キャンセル</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${s.unlockLevel <= 3 ? 'bg-green-900 text-green-300' : s.unlockLevel <= 5 ? 'bg-yellow-900 text-yellow-300' : 'bg-purple-900 text-purple-300'}`}>Lv.{s.unlockLevel}</span>
                                    <span className="text-white text-xs font-medium truncate">{s.title}</span>
                                    <span className="text-gray-600 text-xs shrink-0">({s.type})</span>
                                  </div>
                                  <p className="text-gray-500 text-xs mt-0.5 truncate">{s.content}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSecretDraft({
                                        unlockLevel: s.unlockLevel,
                                        type: s.type,
                                        title: s.title,
                                        content: s.content,
                                        promptAddition: s.promptAddition ?? '',
                                      });
                                      setEditingSecretIdx(i);
                                    }}
                                    className="text-purple-400 hover:text-purple-300 text-xs px-1.5 py-0.5 rounded hover:bg-purple-900/30"
                                  >編集</button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSecret(i)}
                                    className="text-red-400 hover:text-red-300 text-xs px-1.5 py-0.5 rounded hover:bg-red-900/30"
                                  >削除</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >{saving ? '保存中...' : '保存'}</button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
                  >キャンセル</button>
                </div>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

