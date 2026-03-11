'use client';

import React from 'react';

interface PresenceSectionProps {
  presence: { statusEmoji?: string; status?: string } | null;
  mood: { moodLabel?: string; moodEmoji?: string } | null;
  presenceManualMode: boolean;
  presenceEditStatus: string;
  presenceEditEmoji: string;
  savingPresence: boolean;
  presenceSaveMsg: string;
  onSetManualMode: (mode: boolean) => void;
  onSetEditStatus: (status: string) => void;
  onSetEditEmoji: (emoji: string) => void;
  onSavePresence: () => void;
}

export function PresenceSection({
  presence,
  mood,
  presenceManualMode,
  presenceEditStatus,
  presenceEditEmoji,
  savingPresence,
  presenceSaveMsg,
  onSetManualMode,
  onSetEditStatus,
  onSetEditEmoji,
  onSavePresence,
}: PresenceSectionProps) {
  return (
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
          onClick={() => onSetManualMode(false)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!presenceManualMode ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
        >自動</button>
        <button
          type="button"
          onClick={() => onSetManualMode(true)}
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
              onChange={e => onSetEditStatus(e.target.value)}
              placeholder="例: 修行中"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">絵文字</label>
            <input
              type="text"
              value={presenceEditEmoji}
              onChange={e => onSetEditEmoji(e.target.value)}
              placeholder="例: ⚔️"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSavePresence}
          disabled={savingPresence}
          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >{savingPresence ? '保存中...' : '保存'}</button>
        {presenceSaveMsg && (
          <span className={`text-xs ${presenceSaveMsg === '保存しました' ? 'text-green-400' : 'text-red-400'}`}>{presenceSaveMsg}</span>
        )}
      </div>
    </div>
  );
}
