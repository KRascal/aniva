'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { RELATIONSHIP_LEVELS } from '@/types/character';

interface RelationshipData {
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number | null;
  totalMessages: number;
  firstMessageAt?: string;
  lastMessageAt?: string;
  character?: { name: string; slug: string };
}

interface MilestoneWithAchieved {
  id: string;
  level: number;
  title: string;
  description: string;
  characterMessage: string;
  emoji: string;
  achieved: boolean;
}

interface MilestonesData {
  milestones: MilestoneWithAchieved[];
  currentLevel: number;
}

interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const characterId = params.characterId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [relationship, setRelationship] = useState<RelationshipData | null>(null);
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Get userId from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string };
      if (user.id) {
        setUserId(user.id);
      }
    }
  }, [session]);

  // Load character info
  useEffect(() => {
    if (!characterId) return;
    fetch(`/api/characters/id/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.character) setCharacter(data.character);
      })
      .catch(console.error);
  }, [characterId]);

  // Load relationship + milestones
  useEffect(() => {
    if (!userId || !characterId) return;

    const load = async () => {
      try {
        const [relRes, msRes] = await Promise.all([
          fetch(`/api/relationship/${characterId}`),
          fetch(`/api/relationship/${characterId}/milestones`),
        ]);
        const [relData, msData] = await Promise.all([relRes.json(), msRes.json()]);
        setRelationship(relData);
        setMilestonesData(msData);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId, characterId]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg animate-pulse">読み込み中...</div>
      </div>
    );
  }

  const level = relationship?.level ?? 1;
  const xp = relationship?.xp ?? 0;
  const nextLevelXp = relationship?.nextLevelXp;
  const levelInfo = RELATIONSHIP_LEVELS[Math.min(level - 1, RELATIONSHIP_LEVELS.length - 1)];

  // XPバー計算
  const prevLevelXp = levelInfo?.xpRequired ?? 0;
  const xpInLevel = xp - prevLevelXp;
  const xpNeeded = nextLevelXp ? nextLevelXp - prevLevelXp : 1;
  const xpPercent = nextLevelXp
    ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
    : 100;

  // 星表示
  const maxStars = 5;
  const filledStars = Math.min(level, maxStars);
  const emptyStars = maxStars - filledStars;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors p-1 -ml-1"
          aria-label="戻る"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg">
          {character?.name ?? 'キャラクター'}との絆
        </h1>
      </header>

      <div className="px-4 py-6 space-y-5">
        {/* Character card */}
        <div className="flex items-center gap-4 bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
            {character?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🏴‍☠️</span>
            )}
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">{character?.name ?? '—'}</h2>
            <p className="text-gray-400 text-sm">{character?.franchise ?? '—'}</p>
          </div>
        </div>

        {/* Level section */}
        <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700 space-y-3">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">現在のレベル</h3>
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {'⭐'.repeat(filledStars)}{'☆'.repeat(emptyStars)}
            </div>
            <div>
              <span className="text-white font-bold text-lg">Level {level}</span>
              <span className="text-purple-300 ml-2">「{levelInfo?.name}」</span>
            </div>
          </div>

          {/* XP bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>経験値</span>
              <span>{xp}{nextLevelXp ? ` / ${nextLevelXp} XP` : ' XP (MAX)'}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats section */}
        <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700 space-y-2">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">統計</h3>
          <div className="flex items-center gap-3">
            <span className="text-lg">💬</span>
            <span className="text-gray-300 text-sm">
              総メッセージ: <span className="text-white font-semibold">{relationship?.totalMessages ?? 0}件</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg">📅</span>
            <span className="text-gray-300 text-sm">
              初めて話した日: <span className="text-white font-semibold">{formatDate(relationship?.firstMessageAt)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg">⏰</span>
            <span className="text-gray-300 text-sm">
              最後に話した日: <span className="text-white font-semibold">{formatDate(relationship?.lastMessageAt)}</span>
            </span>
          </div>
        </div>

        {/* Milestones section */}
        <div className="bg-gray-800/60 rounded-2xl p-4 border border-gray-700">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">マイルストーン</h3>
          <div className="space-y-3">
            {milestonesData?.milestones.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  m.achieved
                    ? 'bg-purple-900/30 border-purple-500/50'
                    : 'bg-gray-700/30 border-gray-600/30 opacity-60'
                }`}
              >
                <span className="text-xl flex-shrink-0">
                  {m.achieved ? '✅' : '⬜'}
                </span>
                <span className="text-xl flex-shrink-0">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${m.achieved ? 'text-white' : 'text-gray-400'}`}>
                      {m.title}
                    </span>
                    {m.achieved && (
                      <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded-full">
                        達成
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {m.achieved ? m.description : `Level ${m.level}で解放`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/chat/${characterId}`)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95 shadow-lg shadow-purple-900/30"
        >
          💬 チャットを続ける
        </button>
      </div>
    </div>
  );
}
