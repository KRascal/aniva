'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MemoryTimeline } from '@/components/chat/MemoryTimeline';

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

interface ChatMenuProps {
  character: Character | null;
  relationship: RelationshipInfo | null;
  characterId: string;
  isOpen: boolean;
  onClose: () => void;
  onFcClick?: () => void;
}

/* ── SVG Icons ── */
const IconUser = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconPhoto = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const IconBrain = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconBook = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconHeart = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconChart = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconCog = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconChevron = () => (
  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const IconMemory = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg
    className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
  accent?: string;
}

export function ChatMenu({
  character,
  relationship,
  characterId,
  isOpen,
  onClose,
  onFcClick,
}: ChatMenuProps) {
  const [showMemory, setShowMemory] = useState(false);

  const menuItems: MenuItem[] = [
    {
      icon: <IconUser />,
      label: 'プロフィール',
      sublabel: character?.franchise ?? '',
      href: `/profile/${characterId}`,
      accent: 'text-blue-400 bg-blue-500/15',
    },
    {
      icon: <IconPhoto />,
      label: 'アルバム',
      sublabel: '共有した画像',
      comingSoon: true,
      accent: 'text-pink-400 bg-pink-500/15',
    },
    {
      icon: <IconBrain />,
      label: '記憶',
      sublabel: 'キャラが覚えていること',
      comingSoon: true,
      accent: 'text-purple-400 bg-purple-500/15',
    },
    {
      icon: <IconMemory />,
      label: '思い出',
      sublabel: 'エピソードタイムライン',
      accent: 'text-amber-400 bg-amber-500/15',
      onClick: () => setShowMemory((v) => !v),
    },
    {
      icon: <IconBook />,
      label: 'ストーリー',
      sublabel: 'キャラとの物語',
      href: `/story/${characterId}`,
      accent: 'text-amber-400 bg-amber-500/15',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: '日記',
      sublabel: 'キャラの心の記録',
      href: `/diary/${characterId}`,
      accent: 'text-rose-400 bg-rose-500/15',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      label: 'メモリーブック',
      sublabel: '二人の思い出アルバム',
      href: `/memory-book/${characterId}`,
      accent: 'text-purple-400 bg-purple-500/15',
    },
    {
      icon: <IconHeart />,
      label: 'ファンクラブ',
      sublabel: relationship?.isFanclub ? 'FC会員' : '未加入',
      onClick: () => { onFcClick?.(); onClose(); },
      accent: 'text-red-400 bg-red-500/15',
    },
    {
      icon: <IconChart />,
      label: '関係値',
      sublabel: `Lv.${relationship?.level ?? 1} ${relationship?.levelName ?? ''}`,
      href: `/mypage?tab=relationships`,
      accent: 'text-green-400 bg-green-500/15',
    },
    {
      icon: <IconCog />,
      label: '設定',
      sublabel: 'アプリの設定',
      href: '/settings',
      accent: 'text-gray-400 bg-gray-500/15',
    },
  ];

  return (
    <>
      {/* バックドロップ */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* スライドインパネル */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[300px] flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(17,17,34,0.97) 0%, rgba(10,10,20,0.99) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3 px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-4 border-b border-white/8">
          {/* アバター */}
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/30 flex-shrink-0 relative">
            {character?.avatarUrl ? (
              <Image src={character.avatarUrl} alt={character?.name ?? ''} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">🏴‍☠️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{character?.name ?? 'キャラクター'}</p>
            <p className="text-gray-500 text-xs truncate">{character?.franchise ?? ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* メニューリスト */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isMemoryItem = item.label === '思い出';

            const content = (
              <>
                {/* アイコンバッジ */}
                <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${item.accent ?? 'text-gray-400 bg-gray-500/15'}`}>
                  {item.icon}
                </span>
                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium leading-tight">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-gray-500 text-xs mt-0.5 truncate">{item.sublabel}</div>
                  )}
                </div>
                {/* バッジ or シェブロン */}
                {item.comingSoon ? (
                  <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-700/80 text-gray-400 border border-gray-600/30">
                    近日公開
                  </span>
                ) : isMemoryItem ? (
                  <IconChevronDown open={showMemory} />
                ) : (
                  <IconChevron />
                )}
              </>
            );

            const baseClass = 'w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left group';
            const hoverClass = item.comingSoon
              ? 'opacity-60 cursor-default'
              : 'hover:bg-white/6 active:bg-white/10 cursor-pointer';

            if (item.onClick) {
              return (
                <div key={item.label}>
                  <button onClick={item.onClick} className={`${baseClass} ${hoverClass}`}>
                    {content}
                  </button>
                  {/* 思い出タイムライン — インライン展開 */}
                  {isMemoryItem && showMemory && (
                    <div className="mt-1 mx-1 rounded-2xl border border-white/8 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <MemoryTimeline characterId={characterId} />
                    </div>
                  )}
                </div>
              );
            }
            if (item.href && !item.comingSoon) {
              return (
                <a key={item.label} href={item.href} className={`${baseClass} ${hoverClass}`}>
                  {content}
                </a>
              );
            }
            return (
              <div key={item.label} className={`${baseClass} ${hoverClass}`}>
                {content}
              </div>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-white/8 pt-4">
          <p className="text-gray-600 text-xs text-center">ANIVA</p>
        </div>
      </div>
    </>
  );
}
