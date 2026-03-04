'use client';

import React from 'react';

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
  slug?: string;
  voiceModelId?: string | null;
}

interface RelationshipInfo {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  relationshipId?: string;
  character?: { name: string; slug: string };
  isFanclub?: boolean;
  isFollowing?: boolean;
  sharedTopics?: { type: string; text: string }[];
  streakDays?: number;
  isStreakActive?: boolean;
}

interface ChatMenuProps {
  character: Character | null;
  relationship: RelationshipInfo | null;
  characterId: string;
  isOpen: boolean;
  onClose: () => void;
  onFcClick?: () => void;
}

export function ChatMenu({
  character,
  relationship,
  characterId,
  isOpen,
  onClose,
  onFcClick,
}: ChatMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-72 h-full bg-gray-900 border-l border-white/10 flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-semibold">{character?.name ?? 'キャラクター'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button onClick={() => { onFcClick?.(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm text-left">
            <span className="text-xl">💜</span>
            <div>
              <div className="font-medium">ファンクラブ</div>
              <div className="text-gray-500 text-xs">{relationship?.isFanclub ? 'FC会員' : '未加入'}</div>
            </div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <a href={`/relationship/${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">📊</span>
            <div>
              <div className="font-medium">関係値</div>
              <div className="text-gray-500 text-xs">Lv.{relationship?.level ?? 1} {relationship?.levelName ?? ''}</div>
            </div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href={`/story/${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">📖</span>
            <div>
              <div className="font-medium">ストーリー</div>
              <div className="text-gray-500 text-xs">キャラとの物語</div>
            </div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href={`/moments?character=${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">📸</span>
            <div><div className="font-medium">Moments</div></div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href={`/events?character=${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">📅</span>
            <div><div className="font-medium">イベント</div></div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href={`/chat/export/${characterId}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">📝</span>
            <div><div className="font-medium">チャット履歴エクスポート</div></div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors text-white text-sm">
            <span className="text-xl">⚙️</span>
            <div><div className="font-medium">設定</div></div>
            <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </nav>
      </div>
    </div>
  );
}
