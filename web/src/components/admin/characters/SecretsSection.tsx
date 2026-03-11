'use client';

import React from 'react';
import { SecretForm } from '@/components/admin/characters/SecretForm';

export interface SecretItem {
  id?: string;
  unlockLevel: number;
  title: string;
  type: string;
  content: string;
  promptAddition?: string | null;
  order?: number;
}

export interface SecretDraft {
  unlockLevel: number;
  type: string;
  title: string;
  content: string;
  promptAddition: string;
}

interface SecretsSectionProps {
  secrets: SecretItem[];
  editingSecretIdx: number | null;
  secretDraft: SecretDraft;
  secretsError: string;
  generatingSecrets: boolean;
  onSetEditingSecretIdx: (idx: number | null) => void;
  onSetSecretDraft: (draft: SecretDraft) => void;
  onAddSecret: () => void;
  onUpdateSecret: (idx: number) => void;
  onDeleteSecret: (idx: number) => void;
  onGenerateSecrets: () => void;
}

export function SecretsSection({
  secrets,
  editingSecretIdx,
  secretDraft,
  secretsError,
  generatingSecrets,
  onSetEditingSecretIdx,
  onSetSecretDraft,
  onAddSecret,
  onUpdateSecret,
  onDeleteSecret,
  onGenerateSecrets,
}: SecretsSectionProps) {
  return (
    <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">🔒 秘密コンテンツ</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerateSecrets}
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
              onSetSecretDraft({ unlockLevel: 3, type: 'conversation_topic', title: '', content: '', promptAddition: '' });
              onSetEditingSecretIdx(-1);
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
          <SecretForm draft={secretDraft} onChange={onSetSecretDraft} />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onAddSecret} className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-medium">保存</button>
            <button type="button" onClick={() => onSetEditingSecretIdx(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">キャンセル</button>
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
                  <SecretForm draft={secretDraft} onChange={onSetSecretDraft} />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => onUpdateSecret(i)} className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-medium">更新</button>
                    <button type="button" onClick={() => onSetEditingSecretIdx(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">キャンセル</button>
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
                        onSetSecretDraft({
                          unlockLevel: s.unlockLevel,
                          type: s.type,
                          title: s.title,
                          content: s.content,
                          promptAddition: s.promptAddition ?? '',
                        });
                        onSetEditingSecretIdx(i);
                      }}
                      className="text-purple-400 hover:text-purple-300 text-xs px-1.5 py-0.5 rounded hover:bg-purple-900/30"
                    >編集</button>
                    <button
                      type="button"
                      onClick={() => onDeleteSecret(i)}
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
  );
}
