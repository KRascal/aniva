'use client';

import React from 'react';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  CharacterLocaleConfig,
  LocaleConfigMap,
  SupportedLocale,
} from '@/types/character-locale';
import { VoiceTester } from '@/components/admin/characters/VoiceTester';

interface LocaleTabProps {
  formName: string;
  formSystemPrompt: string;
  localeConfig: LocaleConfigMap;
  activeLocale: SupportedLocale;
  translating: boolean;
  translateError: string;
  saving: boolean;
  onSetActiveLocale: (locale: SupportedLocale) => void;
  onUpdateLocaleField: (locale: SupportedLocale, field: keyof CharacterLocaleConfig, value: string) => void;
  onAutoTranslate: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function LocaleTab({
  formName,
  formSystemPrompt,
  localeConfig,
  activeLocale,
  translating,
  translateError,
  saving,
  onSetActiveLocale,
  onUpdateLocaleField,
  onAutoTranslate,
  onSubmit,
  onCancel,
}: LocaleTabProps) {
  return (
    <div>
      {/* Auto translate button */}
      <div className="mb-4 p-4 bg-gray-800/60 border border-purple-700/40 rounded-xl">
        <p className="text-gray-300 text-sm mb-2">
          日本語のシステムプロンプトをベースに他言語へ自動翻訳します。
        </p>
        <button
          type="button"
          onClick={onAutoTranslate}
          disabled={translating || !formSystemPrompt}
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
            onClick={() => onSetActiveLocale(locale)}
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
            onChange={(e) => onUpdateLocaleField(activeLocale, 'name', e.target.value)}
            placeholder={`${formName} の${LOCALE_LABELS[activeLocale]}名`}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Bio / 説明 ({LOCALE_LABELS[activeLocale]})
          </label>
          <textarea
            value={localeConfig[activeLocale]?.bio ?? ''}
            onChange={(e) => onUpdateLocaleField(activeLocale, 'bio', e.target.value)}
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
            onChange={(e) => onUpdateLocaleField(activeLocale, 'greeting', e.target.value)}
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
            onChange={(e) => onUpdateLocaleField(activeLocale, 'systemPrompt', e.target.value)}
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
            onChange={(e) => onUpdateLocaleField(activeLocale, 'voiceModelId', e.target.value)}
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
