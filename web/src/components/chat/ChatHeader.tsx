'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface Character {
  id: string;
  name: string;
  nameEn?: string | null;
  franchise: string;
  franchiseEn?: string | null;
  description?: string | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  slug?: string;
  voiceModelId?: string | null;
  fcMonthlyPriceJpy?: number;
  fcIncludedCallMin?: number;
  fcMonthlyCoins?: number;
  catchphrases?: string[];
  personalityTraits?: string[];
  hasVoice?: boolean;
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
  happy: '😊', sad: '😢', angry: '😤', excited: '🔥', shy: '💕',
  lonely: '🌙', anxious: '💦', motivated: '💪', love: '💗', caring: '🤗',
  grateful: '🙏', confident: '😎', proud: '🏆', determined: '🔥',
  teasing: '😏', playful: '😆', curious: '🤔', thoughtful: '🧠',
  confused: '❓', relaxed: '😌', sleepy: '😴', nostalgic: '🌸',
  surprised: '😲', moved: '🥺', jealous: '😤', tired: '😫',
  mysterious: '🌙', normal: '✨', neutral: '✨',
};

const EMOTION_LABEL: Record<string, string> = {
  happy: '機嫌がいい', sad: '少し落ち込んでいる', angry: 'ちょっとイライラ',
  excited: 'テンション高め', shy: '照れてる', lonely: '寂しそう',
  anxious: '焦ってる', motivated: 'やる気満々', love: 'ときめいてる',
  caring: '心配してくれてる', grateful: '感謝の気持ち', confident: '自信に満ちてる',
  proud: '誇らしそう', determined: '覚悟を決めてる', teasing: 'からかいたい気分',
  playful: 'いたずらしたい', curious: '興味津々', thoughtful: '考え込んでる',
  confused: '混乱気味', relaxed: 'リラックス中', sleepy: '眠そう',
  nostalgic: '懐かしんでる', surprised: 'ビックリ', moved: '感動してる',
  jealous: 'ヤキモチ中', tired: '疲れ気味', mysterious: '謎めいている',
  normal: 'いつも通り', neutral: 'いつも通り',
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
  onProfileClick,
}: ChatHeaderProps) {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const [dailyState, setDailyState] = useState<DailyState | null>(null);

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

  // 関係値バー/気分の折りたたみ
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);

  // XP percentage (relationshipがあれば常に表示、xp=0でも0%として表示)
  const xpPct =
    relationship
      ? relationship.nextLevelXp && relationship.nextLevelXp > 0
        ? Math.min(Math.round((relationship.xp / relationship.nextLevelXp) * 100), 100)
        : 0
      : null;

  // Mood / status line
  const moodEmoji = dailyState ? (EMOTION_EMOJI[dailyState.emotion] ?? '✨') : null;
  const moodLabel = dailyState ? (EMOTION_LABEL[dailyState.emotion] ?? dailyState.emotion) : null;
  const statusText = isLateNight
    ? '🌙 ふたりだけの夜'
    : presence
    ? presence.status
    : null;

  // Streak
  const showStreak =
    relationship?.isStreakActive && (relationship.streakDays ?? 0) >= 2;

  return (
    <div className="flex-shrink-0">
      {/* ══ ヘッダー本体 (max-height: 70px) ══ */}
      <header
        className="bg-gray-950 border-b border-white/8 px-3 pt-2 pb-1.5 z-10"
        
      >
        {/* ── 1行目: 戻る / アバター / 名前 / ストリーク / 通話 / メニュー ── */}
        <div className="flex items-center gap-2">
          {/* 戻る */}
          <button
            onClick={onBack}
            className="flex-shrink-0 -ml-1 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors touch-manipulation"
            aria-label={tc('back')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* アバター 40px */}
          <button
            onClick={onProfileClick}
            className="flex-shrink-0 relative"
            aria-label={t('profileAriaLabel')}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-1 ring-offset-gray-950">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">
                  🏴‍☠️
                </div>
              )}
            </div>
            {/* オンラインドット (気分なし & オンライン時) */}
            {presence?.isAvailable && !dailyState && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-950 animate-pulse" />
            )}
          </button>

          {/* 名前 + バッジ群 */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <h1 className="text-white font-bold text-[15px] leading-tight truncate">
              {character?.name ?? 'キャラクター'}
            </h1>
            {/* 認証バッジ */}
            <span className="flex-shrink-0 text-blue-400 text-sm leading-none">✓</span>
            {/* ストリーク */}
            {showStreak && (
              <span className="flex-shrink-0 text-xs leading-none">
                🔥{relationship!.streakDays}
              </span>
            )}
          </div>

          {/* 通話ボタン（近日公開） */}
          <div className="relative flex-shrink-0">
            <button
              onClick={onCallClick}
              className="p-2 rounded-full text-gray-600 cursor-not-allowed opacity-50"
              aria-label={t('callFeatureAriaLabel')}
              title={t('callFeatureComingSoon')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>
            <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-purple-600/80 text-white px-1 rounded-full leading-4">
              {t('comingSoonShort')}
            </span>
          </div>

          {/* メニューボタン */}
          <button
            onClick={onMenuClick}
            className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label={tc('menu')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        {/* 折りたたみ可能: 関係値ゲージ + 気分 */}
        <div
          className="overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: collapsed ? 0 : 60, opacity: collapsed ? 0 : 1 }}
        >
          {/* ── 2行目: 関係値ゲージ ── */}
          {relationship && (
            <div className="flex items-center gap-2 mt-1 pl-[60px] pr-1">
              <span
                className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md tracking-wide"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
              >
                Lv.{relationship.level}
              </span>
              <div className="flex-1 relative">
                <div className="h-[6px] rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${xpPct ?? 0}%`,
                      background: 'linear-gradient(90deg, #8b5cf6, #d946ef, #ec4899)',
                      boxShadow: (xpPct ?? 0) > 0 ? '0 0 8px rgba(168,85,247,0.6)' : 'none',
                    }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-purple-300/70 flex-shrink-0 font-medium whitespace-nowrap">
                {relationship.levelName ?? '知り合い'}
              </span>
            </div>
          )}

          {/* ── 3行目: 気分 + ステータス ── */}
          {(moodEmoji || statusText) && (
            <div className="flex items-center gap-1 mt-0.5 pl-[60px]">
              {moodEmoji && (
                <>
                  <span className="text-xs leading-none">{moodEmoji}</span>
                  <span className="text-xs text-white/40 leading-none">{moodLabel}</span>
                </>
              )}
              {moodEmoji && statusText && (
                <span className="text-xs text-white/25 leading-none mx-0.5">·</span>
              )}
              {statusText && (
                <span className="text-xs text-white/40 leading-none">{statusText}</span>
              )}
            </div>
          )}
        </div>

        {/* 折りたたみトグル */}
        {relationship && (
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center w-full py-0.5 -mb-1"
            aria-label={collapsed ? t('statusExpand') : t('statusCollapse')}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-white/20 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </header>
    </div>
  );
}
