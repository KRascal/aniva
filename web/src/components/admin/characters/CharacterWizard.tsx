'use client';

import React from 'react';
import { CharacterField } from '@/components/admin/characters/CharacterField';
import { ImageUploadField } from '@/components/admin/characters/ImageUploadField';
import { GrossMarginPreview } from '@/components/admin/characters/GrossMarginPreview';
import { VoiceTester } from '@/components/admin/characters/VoiceTester';
import { WizardStepIndicator } from '@/components/admin/characters/WizardStepIndicator';
import { CharacterFormData } from '@/components/admin/characters/types';

interface CharacterWizardProps {
  form: CharacterFormData;
  wizardStep: number;
  saving: boolean;
  error: string;
  // Soul generation
  generatingSoul: boolean;
  soulText: string;
  voiceText: string;
  boundariesText: string;
  soulError: string;
  // Moments
  generatingMoments: boolean;
  momentsGenerated: boolean;
  momentsError: string;
  // Story
  generatingStory: boolean;
  storyGenerated: boolean;
  storyError: string;
  // Handlers
  onChange: (key: keyof CharacterFormData, value: string | boolean) => void;
  onSetWizardStep: (step: number | ((s: number) => number)) => void;
  onSetSoulText: (text: string) => void;
  onSetVoiceText: (text: string) => void;
  onSetBoundariesText: (text: string) => void;
  onSubmit: () => void;
  onGenerateSoul: () => void;
  onGenerateMoments: () => void;
  onGenerateStory: () => void;
  onClose: () => void;
}

export function CharacterWizard({
  form,
  wizardStep,
  saving,
  error,
  generatingSoul,
  soulText,
  voiceText,
  boundariesText,
  soulError,
  generatingMoments,
  momentsGenerated,
  momentsError,
  generatingStory,
  storyGenerated,
  storyError,
  onChange,
  onSetWizardStep,
  onSetSoulText,
  onSetVoiceText,
  onSetBoundariesText,
  onSubmit,
  onGenerateSoul,
  onGenerateMoments,
  onGenerateStory,
  onClose,
}: CharacterWizardProps) {
  const f = (key: keyof CharacterFormData, val: string | boolean) => onChange(key, val);

  const renderStep = () => {
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
              onClick={onGenerateSoul}
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
                  onChange={(e) => onSetSoulText(e.target.value)}
                  rows={6}
                  placeholder="AIで生成するか、直接入力してください..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-400 text-sm font-semibold mb-1">🎭 VOICE（台詞サンプル）</label>
                <textarea
                  value={voiceText}
                  onChange={(e) => onSetVoiceText(e.target.value)}
                  rows={5}
                  placeholder="AIで生成するか、直接入力してください..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-400 text-sm font-semibold mb-1">🚫 BOUNDARIES（禁止事項）</label>
                <textarea
                  value={boundariesText}
                  onChange={(e) => onSetBoundariesText(e.target.value)}
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
              onClick={onSubmit}
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
                  onClick={onGenerateMoments}
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
                  onClick={onClose}
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
                  onClick={() => onSetWizardStep(7)}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  次へ: ストーリーチャプター生成 →
                </button>
                <button
                  type="button"
                  onClick={onClose}
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
                  onClick={onGenerateStory}
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
                  onClick={onClose}
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
                  onClick={onClose}
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
    <>
      <WizardStepIndicator step={wizardStep} total={7} />

      {renderStep()}

      {/* Navigation buttons (not on step 5 or 6 - those have their own buttons) */}
      {wizardStep < 5 && (
        <div className="mt-6 flex gap-3">
          {wizardStep > 1 && (
            <button
              type="button"
              onClick={() => onSetWizardStep(s => s - 1)}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
            >← 戻る</button>
          )}
          <button
            type="button"
            onClick={() => onSetWizardStep(s => s + 1)}
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
            onClick={() => onSetWizardStep(4)}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
          >← 戻る</button>
        </div>
      )}

      {/* Cancel button (always visible except step 6) */}
      {wizardStep < 7 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
          >キャンセル</button>
        </div>
      )}
    </>
  );
}
