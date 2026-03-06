'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  onFcClick?: () => void;
  proactiveUnreadCount?: number;
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: '😊',
  excited: '🔥',
  mysterious: '🌙',
  tired: '😴',
  nostalgic: '🌸',
  playful: '😆',
  sad: '😢',
  angry: '😤',
  normal: '✨',
};

const EMOTION_LABEL: Record<string, string> = {
  happy: '機嫌がいい',
  excited: '超テンション高め',
  mysterious: '謎めいている',
  tired: '疲れ気味',
  nostalgic: 'ノスタルジックな気分',
  playful: 'いたずらしたい気分',
  sad: '少し落ち込んでいる',
  angry: 'ちょっとイライラしている',
  normal: 'いつも通り',
};

interface DailyState {
  emotion: string;
  context: string | null;
  bonusXpMultiplier: number;
  isBonus: boolean;
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
  onFcClick,
  proactiveUnreadCount,
}: ChatHeaderProps) {
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [moodPopupOpen, setMoodPopupOpen] = useState(false);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const key = character?.slug || characterId;
    if (!key) return;
    fetch(`/api/characters/${key}/daily-state`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: DailyState | null) => {
        if (data) setDailyState(data);
      })
      .catch((err) => console.warn('[ChatHeader] daily-state fetch failed:', err));
  }, [characterId, character?.slug]);

  useEffect(() => {
    return () => {
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
  }, []);

  const handleMoodBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    setMoodPopupOpen(true);
    moodTimerRef.current = setTimeout(() => setMoodPopupOpen(false), 3000);
  };

  return (
    <div className="flex-shrink-0">
      <style>{`
        @keyframes moodBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        @keyframes moodPopupIn {
          0% { opacity: 0; transform: translateY(-6px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes moodPopupBar {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
      {/* ✨ ボーナスEXPバナー */}
      {dailyState?.isBonus && (
        <div className="bg-yellow-400 text-yellow-900 text-center text-xs font-bold py-1 px-3">
          ✨ 絆EXP {dailyState.bonusXpMultiplier}倍デー！
        </div>
      )}
    <header className="bg-gray-950 border-b border-white/8 px-3 py-2.5 flex items-center gap-2.5 z-10">
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

      {/* アバター + 気分バッジ */}
      <div className="flex-shrink-0 relative">
        <button
          onClick={onProfileClick}
          aria-label="キャラクタープロフィール"
        >
          <div className="relative">
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
            {presence?.isAvailable && !dailyState && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
            )}
          </div>
        </button>

        {/* 気分バッジ */}
        {dailyState && (
          <button
            onClick={handleMoodBadgeClick}
            aria-label={`今日の気分: ${EMOTION_LABEL[dailyState.emotion] ?? dailyState.emotion}`}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-[9px] leading-none z-10 aniva-emotion-badge"
            style={{ animation: 'moodBadgePulse 2.5s ease-in-out infinite' }}
          >
            {EMOTION_EMOJI[dailyState.emotion] ?? '✨'}
          </button>
        )}

        {/* 気分ポップアップ */}
        {moodPopupOpen && dailyState && (
          <div
            className="absolute left-0 top-full mt-2 z-30 rounded-xl px-3 py-2 shadow-2xl text-xs whitespace-nowrap"
            style={{
              background: 'rgba(17,24,39,0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              animation: 'moodPopupIn 0.2s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <p className="text-white font-bold mb-0.5">
              今日の{character?.name ?? 'キャラ'}
            </p>
            <p className="text-gray-300 leading-relaxed">
              {EMOTION_EMOJI[dailyState.emotion] ?? '✨'}{' '}
              {EMOTION_LABEL[dailyState.emotion] ?? dailyState.emotion}
              {dailyState.context && (
                <span className="text-gray-400"> — {dailyState.context}</span>
              )}
            </p>
            {/* 自動閉じプログレスバー */}
            <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  animation: 'moodPopupBar 3s linear forwards',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 名前 + FC + プレゼンス */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-white font-semibold text-sm leading-tight break-words">
            {character?.name ?? 'キャラクター'}
          </h1>
          {/* プロアクティブメッセージ未読バッジ */}
          {proactiveUnreadCount && proactiveUnreadCount > 0 ? (
            <span className="flex-shrink-0 bg-pink-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 animate-pulse">
              NEW
            </span>
          ) : null}
          {/* 気分バッジはアバター横に表示 */}
          {relationship?.isFanclub ? (
            <span className="text-base leading-none flex-shrink-0">💜</span>
          ) : (
            <button
              onClick={() => onFcClick?.()}
              className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600/80 text-white border border-purple-400/40 hover:bg-purple-500 transition-colors"
            >
              FC
            </button>
          )}
        </div>
        {/* プレゼンスステータス + ストリーク */}
        <div className="flex items-center gap-2 mt-0.5">
          {/* プレゼンス: アバター横の緑点で表現。テキスト不要 */}
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
        {/* XP プログレスバー */}
        {relationship && relationship.nextLevelXp !== null && relationship.nextLevelXp > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((relationship.xp / relationship.nextLevelXp) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  boxShadow: '0 0 6px rgba(139,92,246,0.5)',
                }}
              />
            </div>
            <span className="text-[9px] text-white/25 flex-shrink-0">
              Lv.{relationship.level}
            </span>
          </div>
        )}
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
    </div>
  );
}
