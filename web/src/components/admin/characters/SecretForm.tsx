'use client';

import React from 'react';

export interface SecretDraft {
  unlockLevel: number;
  type: string;
  title: string;
  content: string;
  promptAddition: string;
}

export function SecretForm({
  draft,
  onChange,
}: {
  draft: SecretDraft;
  onChange: (d: SecretDraft) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-gray-500 text-xs mb-1">アンロックレベル (1-10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.unlockLevel}
            onChange={e => onChange({ ...draft, unlockLevel: parseInt(e.target.value, 10) || 3 })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-gray-500 text-xs mb-1">タイプ</label>
          <select
            value={draft.type}
            onChange={e => onChange({ ...draft, type: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="conversation_topic">conversation_topic</option>
            <option value="backstory">backstory</option>
            <option value="moment">moment</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">タイトル</label>
        <input
          type="text"
          value={draft.title}
          onChange={e => onChange({ ...draft, title: e.target.value })}
          placeholder="例: エースの話"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
        />
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">内容</label>
        <textarea
          value={draft.content}
          onChange={e => onChange({ ...draft, content: e.target.value })}
          rows={2}
          placeholder="秘密の内容..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
        />
      </div>
      <div>
        <label className="block text-gray-500 text-xs mb-1">プロンプト追加文</label>
        <textarea
          value={draft.promptAddition}
          onChange={e => onChange({ ...draft, promptAddition: e.target.value })}
          rows={2}
          placeholder="【秘密解放: Lv●】..."
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
        />
      </div>
    </div>
  );
}
