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

interface Presence {
  isAvailable: boolean;
  status: string;
  statusEmoji: string;
  statusMessage?: string | null;
}

interface ChatHeaderProps {
  character: Character | null;
  relationship: RelationshipInfo | null;
  presence: Presence | null;
  characterId: string;
  isLateNight: boolean;
  onBack: () => void;
  onCallClick: () => void;
  onMenuClick: () => void;
  onMemoryClick: () => void;
  onProfileClick: () => void;
}

export function ChatHeader({
  character,
  relationship,
  presence,
  characterId,
  isLateNight,
  onBack,
  onCallClick,
  onMenuClick,
  onMemoryClick,
  onProfileClick,
}: ChatHeaderProps) {
  return (
    <header className="flex-shrink-0 bg-black/60 backdrop-blur-md border-b border-white/8 px-3 py-2.5 flex items-center gap-2.5 z-10">
      {/* 戻るボタン */}
      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 -ml-1 flex-shrink-0 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="戻る"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* アバター */}
      <button
        onClick={onProfileClick}
        className="flex-shrink-0"
        aria-label="キャラクタープロフィール"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-1 ring-offset-gray-900">
          {character?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">
              🏴‍☠️
            </div>
          )}
        </div>
      </button>

      {/* 名前 + FC + プレゼンス */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-white font-semibold text-sm leading-tight break-words">
            {character?.name ?? 'キャラクター'}
          </h1>
          {relationship?.isFanclub ? (
            <span className="text-base leading-none flex-shrink-0">💜</span>
          ) : (
            <a
              href={`/relationship/${characterId}/fanclub`}
              className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/80 text-white border border-purple-400/40 hover:bg-purple-500 transition-colors"
            >
              FC
            </a>
          )}
        </div>
        {/* プレゼンスステータス + ストリーク */}
        <div className="flex items-center gap-2 mt-0.5">
          {presence && (
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${presence.isAvailable ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-[10px] text-gray-400 truncate">
                {presence.statusEmoji} {presence.status}
              </span>
            </div>
          )}
          {relationship?.isStreakActive && (relationship.streakDays ?? 0) >= 2 && (
            <div className="flex items-center gap-0.5 bg-orange-900/40 border border-orange-500/30 rounded-full px-1.5 py-0.5">
              <span className="text-[10px]">🔥</span>
              <span className="text-[10px] font-bold text-orange-400">{relationship.streakDays}日</span>
            </div>
          )}
          {isLateNight && (
            <div className="flex items-center gap-0.5 bg-amber-900/40 border border-amber-600/30 rounded-full px-1.5 py-0.5 animate-pulse">
              <span className="text-[10px]">🌙</span>
              <span className="text-[10px] font-medium text-amber-300">ふたりだけの夜</span>
            </div>
          )}
        </div>
      </div>

      {/* 🧠 記憶ペークボタン */}
      <button
        onClick={onMemoryClick}
        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-purple-400 hover:bg-purple-900/30 transition-colors"
        aria-label="キャラの記憶を見る"
        title="キャラの記憶"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </button>

      {/* 📞 通話ボタン */}
      <button
        onClick={onCallClick}
        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-900/30 transition-colors"
        aria-label="通話する"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      </button>

      {/* ≡ メニューボタン */}
      <button
        onClick={onMenuClick}
        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        aria-label="メニュー"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  );
}
