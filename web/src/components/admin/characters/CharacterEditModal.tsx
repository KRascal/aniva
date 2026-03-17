'use client';

import React from 'react';
import { CharacterLocaleConfig, LocaleConfigMap, SupportedLocale } from '@/types/character-locale';
import { BasicSettingsTab } from '@/components/admin/characters/BasicSettingsTab';
import { LocaleTab } from '@/components/admin/characters/LocaleTab';
import { CrosstalkControlTab } from '@/components/admin/characters/CrosstalkControlTab';
import { CharacterFormData } from '@/components/admin/characters/types';
import { SecretItem, SecretDraft } from '@/components/admin/characters/SecretsSection';

interface CharacterEditModalProps {
  form: CharacterFormData;
  editingId: string | null;
  editTab: 'basic' | 'locale' | 'crosstalk';
  saving: boolean;
  error: string;
  // Locale
  localeConfig: LocaleConfigMap;
  activeLocale: SupportedLocale;
  translating: boolean;
  translateError: string;
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
  onSetEditTab: (tab: 'basic' | 'locale' | 'crosstalk') => void;
  onChange: (key: keyof CharacterFormData, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSetActiveLocale: (locale: SupportedLocale) => void;
  onUpdateLocaleField: (locale: SupportedLocale, field: keyof CharacterLocaleConfig, value: string) => void;
  onAutoTranslate: () => void;
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

export function CharacterEditModal({
  form,
  editingId,
  editTab,
  saving,
  error,
  localeConfig,
  activeLocale,
  translating,
  translateError,
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
  onSetEditTab,
  onChange,
  onSubmit,
  onCancel,
  onSetActiveLocale,
  onUpdateLocaleField,
  onAutoTranslate,
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
}: CharacterEditModalProps) {
  return (
    <>
      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        <button
          type="button"
          onClick={() => onSetEditTab('basic')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${editTab === 'basic' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
        >基本設定</button>
        <button
          type="button"
          onClick={() => onSetEditTab('locale')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${editTab === 'locale' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
        >多言語設定</button>
        {editingId && (
          <button
            type="button"
            onClick={() => onSetEditTab('crosstalk')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${editTab === 'crosstalk' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >掛け合い制御</button>
        )}
      </div>

      {editTab === 'crosstalk' && editingId ? (
        <CrosstalkControlTab
          characterId={editingId}
          characterName={form.name}
        />
      ) : editTab === 'locale' ? (
        <LocaleTab
          formName={form.name}
          formSystemPrompt={form.systemPrompt}
          localeConfig={localeConfig}
          activeLocale={activeLocale}
          translating={translating}
          translateError={translateError}
          saving={saving}
          onSetActiveLocale={onSetActiveLocale}
          onUpdateLocaleField={onUpdateLocaleField}
          onAutoTranslate={onAutoTranslate}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ) : (
        <BasicSettingsTab
          form={form}
          editingId={editingId}
          saving={saving}
          error={error}
          presence={presence}
          mood={mood}
          presenceManualMode={presenceManualMode}
          presenceEditStatus={presenceEditStatus}
          presenceEditEmoji={presenceEditEmoji}
          savingPresence={savingPresence}
          presenceSaveMsg={presenceSaveMsg}
          secrets={secrets}
          editingSecretIdx={editingSecretIdx}
          secretDraft={secretDraft}
          secretsError={secretsError}
          generatingSecrets={generatingSecrets}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onSetPresenceManualMode={onSetPresenceManualMode}
          onSetPresenceEditStatus={onSetPresenceEditStatus}
          onSetPresenceEditEmoji={onSetPresenceEditEmoji}
          onSavePresence={onSavePresence}
          onSetEditingSecretIdx={onSetEditingSecretIdx}
          onSetSecretDraft={onSetSecretDraft}
          onAddSecret={onAddSecret}
          onUpdateSecret={onUpdateSecret}
          onDeleteSecret={onDeleteSecret}
          onGenerateSecrets={onGenerateSecrets}
        />
      )}
    </>
  );
}
