'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { track, EVENTS } from '@/lib/analytics';
import { DailyBonus } from '@/components/DailyBonus';
import { ProactiveMessagePanel } from '@/components/proactive/ProactiveMessagePanel';
import { getTodayMainEvent } from '@/lib/today-events';
import { getDailyState } from '@/lib/character-daily-state';
import { useMissionTrigger } from '@/hooks/useMissionTrigger';
import { useProactiveMessages } from '@/hooks/useProactiveMessages';
import { CountdownTimer } from '@/components/proactive/CountdownTimer';
import { useTutorial } from '@/hooks/useTutorial';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { SwipeModal } from '@/components/discover/SwipeModal';
import { FadeSection } from '@/components/explore/FadeSection';
import { GachaBannerSection } from '@/components/explore/GachaBannerSection';
import { RankingBannerSection } from '@/components/explore/RankingBannerSection';
import { PollBannerSection } from '@/components/explore/PollBannerSection';
import { ContentLinksSection } from '@/components/explore/ContentLinksSection';
import { LimitedScenariosSection } from '@/components/explore/LimitedScenariosSection';
import { TodayGreetingSection } from '@/components/explore/TodayGreetingSection';
import { getBirthdayCountdown } from '@/lib/birthday-utils';
import { CharacterVerticalCard } from '@/components/explore/CharacterVerticalCard';
import { CharacterHorizontalCard } from '@/components/explore/CharacterHorizontalCard';
import { MissionProgressSection } from '@/components/explore/MissionProgressSection';
import { EmptyState } from '@/components/explore/EmptyState';
import { HeroBanner } from '@/components/explore/HeroBanner';
import { FRANCHISE_CATEGORIES, type Character, type RelationshipInfo } from './explore-data';

export default function ExplorePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // ミッション「キャラを探す」自動完了
  useMissionTrigger('explore_visit');

  // ポストオンボーディング・チュートリアル
  const { tutorialState, initialized: tutorialInitialized, advanceTutorial, skipTutorial, completeTutorial } = useTutorial(
    session?.user?.onboardingStep,
    session?.user?.nickname,
  );

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [incompleteMissions, setIncompleteMissions] = useState(0);
  const [missionHint, setMissionHint] = useState('');
  const [missionProgress, setMissionProgress] = useState<{ completed: number; total: number } | null>(null);
  const [freeGachaAvailable, setFreeGachaAvailable] = useState(false);
  const [exploreActivePollCount, setExploreActivePollCount] = useState(0);

  // パララックススクロール検知
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // プロアクティブメッセージ（未読マップ: characterId → message）
  const { messages: proactiveMsgs } = useProactiveMessages();
  const proactiveUnreadMap = new Map<string, { content: string; expiresAt: string }>(
    proactiveMsgs
      .filter(m => !m.isRead)
      .map(m => [m.characterId, { content: m.content, expiresAt: m.expiresAt }])
  );

  // オンボーディング未完了ならリダイレクト（stale JWT対策: proxyをバイパスした場合のフォールバック）
  useEffect(() => {
    if (status === 'authenticated') {
      const step = session?.user?.onboardingStep;
      if (step !== 'completed') {
        update().then((updated) => {
          const updatedStep = updated?.user?.onboardingStep;
          if (updatedStep !== 'completed') {
            router.push('/onboarding');
          }
        });
      }
    }
  }, [status, session, update, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 未完了ミッション数を取得
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/missions')
      .then(r => r.json())
      .then(data => {
        const allMissions = (data.missions ?? []) as { completed: boolean }[];
        const allWeekly = (data.weeklyMissions ?? []) as { completed: boolean }[];
        const totalMissions = allMissions.length + allWeekly.length;
        const completedMissions =
          allMissions.filter(m => m.completed).length +
          allWeekly.filter(m => m.completed).length;
        const incomplete = totalMissions - completedMissions;
        setIncompleteMissions(incomplete);
        setMissionProgress({ completed: completedMissions, total: totalMissions });
        if (incomplete === 1) setMissionHint('あと1個でコイン獲得！急げ！');
        else if (incomplete === 2) setMissionHint('あと2個！今日中にクリアしよう');
        else if (incomplete > 0) setMissionHint(`${incomplete}個の未完了ミッション`);
      })
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/gacha/banners')
        .then(r => r.json())
        .then(data => setFreeGachaAvailable(data.freeGachaAvailable ?? false))
        .catch(() => {});

      fetch('/api/polls/active')
        .then(r => r.ok ? r.json() : null)
        .then(data => setExploreActivePollCount((data?.polls ?? []).length))
        .catch(() => {});

      const charPromise = fetch('/api/characters').then(r => r.json()).then(charData => {
        const chars = charData.characters || [];
        setCharacters(chars);
        if (chars.length === 0) {
          setTimeout(() => {
            fetch('/api/characters').then(r => r.json()).then(d => {
              if (d.characters?.length > 0) setCharacters(d.characters);
            }).catch(() => {});
          }, 1000);
        }
      }).catch(err => console.error('Failed to fetch characters:', err));

      const relPromise = fetch('/api/relationship/all').then(r => r.json()).then(relData => {
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
          }
          setRelationships(map);
        }
      }).catch(err => console.error('Failed to fetch relationships:', err));

      Promise.all([charPromise, relPromise]).finally(() => setIsLoading(false));
    }
  }, [status]);

  // フォロー中キャラがゼロの新規ユーザーのみ /discover にリダイレクト
  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [discoverChecked, setDiscoverChecked] = useState(false);
  useEffect(() => {
    if (status !== 'authenticated' || isLoading || discoverChecked) return;
    setDiscoverChecked(true);
    const hasFollowing = Array.from(relationships.values()).some(r => r.isFollowing);
    if (!hasFollowing && relationships.size === 0) {
      const step = session?.user?.onboardingStep;
      if (step === 'completed') {
        setShowSwipeModal(true);
      } else {
        router.push('/discover');
      }
    }
  }, [status, isLoading, relationships, discoverChecked, session, router]);

  const handleFollow = useCallback((characterId: string, following: boolean) => {
    setRelationships(prev => {
      const next = new Map(prev);
      const existing = next.get(characterId);
      if (existing) {
        next.set(characterId, { ...existing, isFollowing: following });
      } else {
        next.set(characterId, {
          characterId,
          level: 1,
          levelName: '知り合い',
          xp: 0,
          totalMessages: 0,
          isFollowing: following,
          isFanclub: false,
        });
      }
      return next;
    });
  }, []);

  // Filter characters + sort by unread proactive messages first
  const filteredCharacters = characters
    .filter(c => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.franchise.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'すべて'
        || c.franchise === selectedCategory
        || selectedCategory === 'アニメ';

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aHasMsg = proactiveUnreadMap.has(a.id) ? 1 : 0;
      const bHasMsg = proactiveUnreadMap.has(b.id) ? 1 : 0;
      return bHasMsg - aHasMsg;
    });

  const availableFranchises = new Set(characters.map(c => c.franchise));
  const visibleCategories = FRANCHISE_CATEGORIES.filter(
    cat => cat.name === 'すべて' || availableFranchises.has(cat.name) || cat.name === 'アニメ'
  );

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-pink-600/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-30 bg-gray-950 border-b border-white/5">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">A</div>
              <div className="h-5 w-24 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="h-10 bg-white/6 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-hidden">
            {[60, 100, 70, 80, 90].map((w, i) => (
              <div key={i} className="flex-shrink-0 h-8 rounded-full bg-white/6 animate-pulse" style={{ width: `${w}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </header>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="h-44 rounded-3xl bg-white/5 animate-pulse mb-6" />
          <div className="mb-2 h-5 w-32 bg-white/10 rounded-full animate-pulse" />
          <div className="flex gap-3 overflow-hidden mt-3 mb-6 pb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex-shrink-0 w-44">
                <div className="h-64 rounded-2xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              </div>
            ))}
          </div>
          <div className="mb-2 h-5 w-36 bg-white/10 rounded-full animate-pulse" />
          <div className="space-y-3 mt-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 bg-white/[0.04] rounded-2xl p-4" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-16 h-16 rounded-full bg-white/8 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/8 rounded-full animate-pulse w-24" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-16" />
                  <div className="h-3 bg-white/5 rounded-full animate-pulse w-32" />
                </div>
                <div className="w-20 h-8 rounded-full bg-white/8 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && characters.length === 0 && status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center pb-24 px-4">
        <div className="text-6xl mb-4">🌊</div>
        <h2 className="text-white text-xl font-bold mb-2">キャラクターを準備中です</h2>
        <p className="text-gray-400 text-sm text-center">もうしばらくお待ちください。<br />新しいキャラクターが間もなく登場します！</p>
      </div>
    );
  }

  const followingChars = filteredCharacters.filter(c => relationships.get(c.id)?.isFollowing);
  const popularChars = filteredCharacters.slice(0, 6);
  const newChars = [...filteredCharacters].reverse().slice(0, 4);

  return (
    <>
      {/* デイリーログインボーナス */}
      <DailyBonus />

      {showSwipeModal && (
        <SwipeModal onClose={() => setShowSwipeModal(false)} />
      )}

      {/* ポストオンボーディング・チュートリアル */}
      {tutorialInitialized && tutorialState.step >= 1 && tutorialState.step <= 5 && (() => {
        let hasConversation = false;
        relationships.forEach(rel => {
          if (rel.totalMessages > 0) hasConversation = true;
        });
        return !hasConversation;
      })() && (
        <TutorialOverlay
          tutorialState={tutorialState}
          onAdvance={advanceTutorial}
          onSkip={skipTutorial}
          onComplete={completeTutorial}
        />
      )}
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes catBadgePop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .cat-badge-active { animation: catBadgePop 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes missionFw1 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-44px) translateX(-22px) scale(0); opacity:0; } }
        @keyframes missionFw2 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-38px) translateX(22px) scale(0); opacity:0; } }
        @keyframes missionFw3 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-50px) scale(0); opacity:0; } }
        @keyframes missionFw4 { 0% { transform: translateY(0) scale(1); opacity:1; } 100% { transform: translateY(-32px) translateX(-32px) scale(0); opacity:0; } }
      `}</style>

      <div className="min-h-screen bg-gray-950 pb-24">
        {/* Fixed background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-purple-600/12 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-72 h-72 rounded-full bg-pink-600/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-indigo-600/08 blur-3xl" />
          <div className="absolute top-2/3 left-0 w-60 h-60 rounded-full bg-orange-600/06 blur-3xl" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 transition-all duration-300"
          style={{
            background: scrollY > 40 ? 'rgba(3,7,18,0.85)' : 'rgb(3,7,18)',
            backdropFilter: scrollY > 40 ? 'blur(16px) saturate(180%)' : 'none',
            WebkitBackdropFilter: scrollY > 40 ? 'blur(16px) saturate(180%)' : 'none',
          }}
        >
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 2px 12px rgba(139,92,246,0.5)' }}
              >
                A
              </div>
              <h1 className="text-lg font-black text-white tracking-tight">推しを探す</h1>
            </div>

            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="キャラ名、作品名で検索…"
                className="w-full pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none transition-all rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = ''; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category scroll */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-4 pb-3">
              {visibleCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`
                    flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                    ${selectedCategory === cat.name ? 'cat-badge-active text-white' : 'text-gray-400 border border-white/10 hover:text-gray-200 hover:border-white/20'}
                  `}
                  style={selectedCategory === cat.name ? {
                    background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                    backgroundImage: `linear-gradient(135deg, ${cat.gradient.includes('purple') ? '#8b5cf6, #ec4899' : cat.gradient.includes('orange') ? '#f97316, #ef4444' : cat.gradient.includes('blue') ? '#3b82f6, #4f46e5' : cat.gradient.includes('pink') ? '#ec4899, #f43f5e' : cat.gradient.includes('yellow') ? '#facc15, #f97316' : cat.gradient.includes('gray') ? '#6b7280, #374151' : '#10b981, #06b6d4'})`,
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4">

          {/* HERO section — only on no search/filter */}
          {!searchQuery && selectedCategory === 'すべて' && (
            <div className="py-6">
              <HeroBanner characters={characters} />

              <RankingBannerSection />

              <div className="mt-3">
                <GachaBannerSection freeAvailable={freeGachaAvailable} />
              </div>

              <TodayGreetingSection characters={characters} relationships={relationships} />

              {missionProgress !== null && missionProgress.total > 0 && (
                <MissionProgressSection
                  completed={missionProgress.completed}
                  total={missionProgress.total}
                />
              )}

              {session?.user && (
                <FadeSection delay={20}>
                  <div className="mb-5">
                    <ProactiveMessagePanel />
                  </div>
                </FadeSection>
              )}

              <LimitedScenariosSection />
              <PollBannerSection />

              {/* 今日のイベントバナー */}
              {(() => {
                const todayEvent = getTodayMainEvent();
                const eventEmojis: Record<string, string> = {
                  'ひな祭り': '🎎', 'バレンタイン': '💝', 'ホワイトデー': '🍬',
                  'ハロウィン': '🎃', 'クリスマスイブ': '🎄', 'クリスマス': '🎄',
                  '元日': '🎍', '大晦日': '🎊', '七夕': '🌟', '花見シーズン': '🌸',
                  'TGIF！花金': '🎉', 'ポッキーの日': '🍫', '猫の日': '🐱',
                };
                if (!todayEvent) return null;
                const emoji = eventEmojis[todayEvent] ?? '✨';
                return (
                  <FadeSection delay={30}>
                    <div className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(139,92,246,0.18))',
                        border: '1px solid rgba(236,72,153,0.3)',
                        boxShadow: '0 2px 16px rgba(236,72,153,0.12)',
                      }}
                      onClick={() => router.push('/moments')}
                    >
                      <span className="text-2xl flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">今日は{todayEvent}！</p>
                        <p className="text-white/55 text-xs mt-0.5">推しと{todayEvent}を楽しもう →</p>
                      </div>
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 誕生日カウントダウンバナー */}
              {(() => {
                const upcomingBirthdays = characters
                  .map(c => ({ c, days: getBirthdayCountdown(c.birthday) }))
                  .filter(({ days }) => days !== null)
                  .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
                  .slice(0, 2);
                if (upcomingBirthdays.length === 0) return null;
                return (
                  <FadeSection delay={35}>
                    <div className="mb-5 space-y-2">
                      {upcomingBirthdays.map(({ c, days }) => (
                        <div
                          key={c.id}
                          className="rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                          style={{
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(244,63,94,0.15))',
                            border: '1px solid rgba(251,191,36,0.3)',
                            boxShadow: '0 2px 16px rgba(251,191,36,0.08)',
                          }}
                          onClick={() => router.push(`/chat/${c.slug}`)}
                        >
                          {c.avatarUrl ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-yellow-400/40">
                              <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-2xl flex-shrink-0">🎂</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">
                              {days === 0 ? `🎉 今日は${c.name.split('・').pop()}の誕生日！` : `🎂 ${c.name.split('・').pop()}の誕生日まであと${days}日`}
                            </p>
                            <p className="text-yellow-300/70 text-xs mt-0.5">
                              {days === 0 ? 'お祝いメッセージを送ろう ✨' : `特別なメッセージを届けよう →`}
                            </p>
                          </div>
                          <span className="text-yellow-400 text-lg flex-shrink-0">🎁</span>
                        </div>
                      ))}
                    </div>
                  </FadeSection>
                );
              })()}

              {/* 未完了ミッションリマインダー */}
              {incompleteMissions > 0 && (
                <FadeSection delay={40}>
                  <div
                    className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
                    style={{
                      background: incompleteMissions <= 2
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(99,102,241,0.12))',
                      border: incompleteMissions <= 2
                        ? '1px solid rgba(239,68,68,0.3)'
                        : '1px solid rgba(168,85,247,0.2)',
                    }}
                    onClick={() => {
                      router.push('/mypage');
                      setTimeout(() => { const el = document.getElementById('daily-missions'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 500);
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{incompleteMissions <= 2 ? '⚡' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${incompleteMissions <= 2 ? 'text-red-300' : 'text-purple-300'}`}>
                        {missionHint}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">タップしてミッションを確認 →</p>
                    </div>
                    <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded-full font-bold flex-shrink-0">{incompleteMissions}</span>
                  </div>
                </FadeSection>
              )}

              {/* Following characters strip */}
              {followingChars.length > 0 && (
                <FadeSection delay={60}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">フォロー中</h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {followingChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                          showChatButton={true}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* Popular characters */}
              <FadeSection delay={120}>
                <div id="popular-section" className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold text-base">人気のキャラクター</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.25)' }}
                    >
                      {popularChars.length}人
                    </span>
                  </div>
                  {popularChars.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                      {popularChars.map((character, i) => (
                        <CharacterVerticalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </FadeSection>

              {/* New characters */}
              {newChars.length > 0 && (
                <FadeSection delay={180}>
                  <div className="mb-6">
                    <h3 className="text-white font-bold text-base mb-3">新着キャラクター</h3>
                    <div className="space-y-3">
                      {newChars.map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              {/* All characters */}
              {characters.length > 6 && (
                <FadeSection delay={240}>
                  <div>
                    <h3 className="text-white font-bold text-base mb-3">すべてのキャラクター</h3>
                    <div className="space-y-3">
                      {characters.slice(6).map((character, i) => (
                        <CharacterHorizontalCard
                          key={character.id}
                          character={character}
                          index={i + 6}
                          relationship={relationships.get(character.id)}
                          onFollow={handleFollow}
                          onClick={() => router.push(`/profile/${character.id}`)}
                          proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                </FadeSection>
              )}

              <ContentLinksSection activePollCount={exploreActivePollCount} />
            </div>
          )}

          {/* Search / Filter results */}
          {(searchQuery || selectedCategory !== 'すべて') && (
            <FadeSection>
              <div className="py-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-white font-bold text-base">
                    {searchQuery ? `「${searchQuery}」の検索結果` : `${selectedCategory}のキャラクター`}
                  </h3>
                  <span className="text-gray-500 text-xs">{filteredCharacters.length}件</span>
                </div>

                {filteredCharacters.length > 0 ? (
                  <div className="space-y-3">
                    {filteredCharacters.map((character, i) => (
                      <CharacterHorizontalCard
                        key={character.id}
                        character={character}
                        index={i}
                        relationship={relationships.get(character.id)}
                        onFollow={handleFollow}
                        onClick={() => router.push(`/profile/${character.id}`)}
                        proactiveMessage={proactiveUnreadMap.get(character.id) ?? null}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="まだ出会えてないキャラがいるかも…" />
                )}
              </div>
            </FadeSection>
          )}
        </main>
      </div>
    </>
  );
}
