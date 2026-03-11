'use client';

import React from 'react';
import { Character } from '@/components/admin/characters/types';
import { QuickVoiceTest } from '@/components/admin/characters/QuickVoiceTest';

interface CharacterTableProps {
  characters: Character[];
  loading: boolean;
  voiceTestCharId: string | null;
  onEdit: (c: Character) => void;
  onDelete: (id: string) => void;
  onToggleActive: (c: Character) => void;
  onVoiceTest: (id: string | null) => void;
}

export function CharacterTable({
  characters,
  loading,
  voiceTestCharId,
  onEdit,
  onDelete,
  onToggleActive,
  onVoiceTest,
}: CharacterTableProps) {
  return (
    <>
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
                        onClick={() => onToggleActive(c)}
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
                          onClick={() => onVoiceTest(voiceTestCharId === c.id ? null : c.id)}
                          className={`text-sm mr-3 transition-colors ${voiceTestCharId === c.id ? 'text-purple-300' : 'text-gray-500 hover:text-purple-400'}`}
                          title="ボイステスト"
                        >🔊</button>
                      )}
                      <a
                        href={`/admin/characters/${c.id}/bible`}
                        className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                      >バイブル</a>
                      <a
                        href={`/admin/characters/${c.id}/ai-enrich`}
                        className="text-emerald-400 hover:text-emerald-300 text-sm mr-3"
                        title="AIで人格を深掘り"
                      >🤖AI深掘り</a>
                      <button
                        onClick={() => onEdit(c)}
                        className="text-purple-400 hover:text-purple-300 text-sm mr-3"
                      >編集</button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >削除</button>
                    </td>
                  </tr>
                  {voiceTestCharId === c.id && (
                    <QuickVoiceTest
                      character={c}
                      onClose={() => onVoiceTest(null)}
                    />
                  )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
