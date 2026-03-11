'use client';

import React from 'react';
import { CharacterField } from '@/components/admin/characters/CharacterField';
import { ImageUploadField } from '@/components/admin/characters/ImageUploadField';
import { VoiceTester } from '@/components/admin/characters/VoiceTester';
import { PricingSection } from '@/components/admin/characters/PricingSection';
import { PresenceSection } from '@/components/admin/characters/PresenceSection';
import { SecretsSection, SecretItem, SecretDraft } from '@/components/admin/characters/SecretsSection';
import { CharacterFormData } from '@/components/admin/characters/types';

interface BasicSettingsTabProps {
  form: CharacterFormData;
  editingId: string | null;
  saving: boolean;
  error: string;
  // Presence
  presence: { statusEmoji?: string; status?: string } | null;
  mood: { moodLabel?: string; moodEmoji?: string } | null;
  presenceManualMode: boolean;
  presenceEditStatus: string;
  presenceEditEmoji: string;
  savingPresence: boolean;
  presenceSaveMsg: string;
  // Secrets
  secrets: SecretItem[];
  editingSecretIdx: number | null;
  secretDraft: SecretDraft;
  secretsError: string;
  generatingSecrets: boolean;
  // Handlers
  onChange: (key: keyof CharacterFormData, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSetPresenceManualMode: (mode: boolean) => void;
  onSetPresenceEditStatus: (status: string) => void;
  onSetPresenceEditEmoji: (emoji: string) => void;
  onSavePresence: () => void;
  onSetEditingSecretIdx: (idx: number | null) => void;
  onSetSecretDraft: (draft: SecretDraft) => void;
  onAddSecret: () => void;
  onUpdateSecret: (idx: number) => void;
  onDeleteSecret: (idx: number) => void;
  onGenerateSecrets: () => void;
}

export function BasicSettingsTab({
  form,
  editingId,
  saving,
  error,
  presence,
  mood,
  presenceManualMode,
  presenceEditStatus,
  presenceEditEmoji,
  savingPresence,
  presenceSaveMsg,
  secrets,
  editingSecretIdx,
  secretDraft,
  secretsError,
  generatingSecrets,
  onChange,
  onSubmit,
  onCancel,
  onSetPresenceManualMode,
  onSetPresenceEditStatus,
  onSetPresenceEditEmoji,
  onSavePresence,
  onSetEditingSecretIdx,
  onSetSecretDraft,
  onAddSecret,
  onUpdateSecret,
  onDeleteSecret,
  onGenerateSecrets,
}: BasicSettingsTabProps) {
  const f = (key: keyof CharacterFormData, val: string | boolean) => onChange(key, val);

  return (
    <div>
      {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CharacterField label="名前 *" value={form.name} onChange={(v) => f('name', v)} />
        <CharacterField label="名前（英語）" value={form.nameEn} onChange={(v) => f('nameEn', v)} />
        <CharacterField label="スラッグ *" value={form.slug} onChange={(v) => f('slug', v)} placeholder="e.g. luffy" />
        <CharacterField label="フランチャイズ *" value={form.franchise} onChange={(v) => f('franchise', v)} />
        <CharacterField label="フランチャイズ（英語）" value={form.franchiseEn} onChange={(v) => f('franchiseEn', v)} />
      </div>

      {/* ElevenLabs Voice Model ID */}
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

      {/* Avatar & Cover */}
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

      {/* Pricing */}
      <PricingSection form={form} onChange={(key, val) => f(key, val)} />

      {/* Presence */}
      {editingId && (
        <PresenceSection
          presence={presence}
          mood={mood}
          presenceManualMode={presenceManualMode}
          presenceEditStatus={presenceEditStatus}
          presenceEditEmoji={presenceEditEmoji}
          savingPresence={savingPresence}
          presenceSaveMsg={presenceSaveMsg}
          onSetManualMode={onSetPresenceManualMode}
          onSetEditStatus={onSetPresenceEditStatus}
          onSetEditEmoji={onSetPresenceEditEmoji}
          onSavePresence={onSavePresence}
        />
      )}

      {/* Secrets */}
      {editingId && (
        <SecretsSection
          secrets={secrets}
          editingSecretIdx={editingSecretIdx}
          secretDraft={secretDraft}
          secretsError={secretsError}
          generatingSecrets={generatingSecrets}
          onSetEditingSecretIdx={onSetEditingSecretIdx}
          onSetSecretDraft={onSetSecretDraft}
          onAddSecret={onAddSecret}
          onUpdateSecret={onUpdateSecret}
          onDeleteSecret={onDeleteSecret}
          onGenerateSecrets={onGenerateSecrets}
        />
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >{saving ? '保存中...' : '保存'}</button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
        >キャンセル</button>
      </div>
    </div>
  );
}
