'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface OshiRank {
  rank: number;
  characterId: string;
  characterName: string;
  characterAvatar: string | null;
  franchise: string;
  level: number;
  levelName: string;
  totalMessages: number;
  streakDays: number;
  isFanclub: boolean;
  globalRank: number | null;
  totalFans: number | null;
  daysSinceFirstMeet: number | null;
}

interface RareCard {
  id: string;
  name: string;
  rarity: string;
  cardImageUrl: string | null;
  franchise: string | null;
  characterName: string | null;
  characterAvatar: string | null;
}

interface FollowingCharacter {
  characterId: string;
  characterName: string;
  characterSlug: string;
  characterFranchise: string;
  characterAvatarUrl: string | null;
  level: number;
  levelName: string;
  isFanclub: boolean;
}

interface PublicProfile {
  id: string;
  displayName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  profilePublic: boolean;
  plan?: string;
  stats?: {
    totalMessages: number;
    maxStreak: number;
    totalFollowing: number;
    fcCount: number;
    maxLevel: number;
    totalCards: number;
    uniqueCards: number;
    totalCardTypes: number;
    collectionRate: number;
    daysSinceJoin: number;
  };
  badges?: Badge[];
  oshiRanking?: OshiRank[];
  rareCards?: RareCard[];
  cardsByRarity?: Record<string, number>;
  following?: FollowingCharacter[];
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  N:   { bg: 'bg-gray-700/50',   text: 'text-gray-400',   border: 'border-gray-600',   glow: '' },
  R:   { bg: 'bg-blue-900/50',   text: 'text-blue-400',   border: 'border-blue-600',   glow: '' },
  SR:  { bg: 'bg-purple-900/50', text: 'text-purple-400', border: 'border-purple-600', glow: 'shadow-purple-500/20' },
  SSR: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-500', glow: 'shadow-yellow-500/30' },
  UR:  { bg: 'bg-pink-900/50',   text: 'text-pink-400',   border: 'border-pink-500',   glow: 'shadow-pink-500/40' },
};

const BADGE_RARITY_STYLE: Record<string, string> = {
  common: 'bg-gray-800 border-gray-600 text-gray-300',
  rare: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
  epic: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
  legendary: 'bg-gradient-to-r from-yellow-950/80 to-amber-950/80 border-yellow-500/50 text-yellow-300',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/profile`)
      .then((res) => { if (res.status === 404) throw new Error('not_found'); return res.json(); })
      .then(setProfile)
      .catch((err) => setError(err.message === 'not_found' ? 'ユーザーが見つかりません' : '読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center space-y-4">
          <p className="text-5xl">🔍</p>
          <p className="text-white font-bold">{error ?? 'ページが見つかりません'}</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">戻る</button>
        </div>
      </div>
    );
  }

  const displayName = profile.nickname || profile.displayName || 'ユーザー';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const stats = profile.stats;
  const badges = profile.badges ?? [];
  const fcFollowing = (profile.following ?? []).filter(f => f.isFanclub);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <header className="bg-[#0a0a0a]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 -ml-1 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold">{displayName}</h1>
      </header>

      {/* Cover + Avatar */}
      <div className="relative h-44 overflow-hidden">
        {profile.coverImageUrl ? (
          <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Profile Header */}
        <section className="-mt-16 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-[#0a0a0a] flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : avatarLetter}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white truncate">{displayName}</h2>
              {profile.bio && <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">{profile.bio}</p>}
              {stats && <p className="text-xs text-gray-600 mt-1">{stats.daysSinceJoin}日前に参加</p>}
            </div>
          </div>
        </section>

        {/* Private guard */}
        {!profile.profilePublic && (
          <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-white font-semibold">非公開プロフィール</p>
          </div>
        )}

        {profile.profilePublic && (
          <>
            {/* ===== バッジ =====  */}
            {badges.length > 0 && (
              <section className="flex flex-wrap gap-2">
                {badges.map(badge => (
                  <div
                    key={badge.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${BADGE_RARITY_STYLE[badge.rarity] ?? BADGE_RARITY_STYLE.common}`}
                    title={badge.description}
                  >
                    <span className="text-sm">{badge.icon}</span>
                    <span>{badge.name}</span>
                  </div>
                ))}
              </section>
            )}

            {/* ===== Stats Bar ===== */}
            {stats && (
              <section className="grid grid-cols-4 gap-2">
                {[
                  { label: 'メッセージ', value: stats.totalMessages >= 1000 ? `${(stats.totalMessages / 1000).toFixed(1)}K` : stats.totalMessages.toString() },
                  { label: '最長連続', value: `${stats.maxStreak}日` },
                  { label: 'FC加入', value: stats.fcCount.toString() },
                  { label: 'カード', value: stats.totalCards.toString() },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
                    <div className="text-xl font-black text-white leading-tight">{s.value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </section>
            )}

            {/* ===== コレクション率 ===== */}
            {stats && stats.totalCardTypes > 0 && (
              <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">カードコレクション</span>
                  <span className="text-sm font-black text-purple-400">{stats.collectionRate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-1000"
                    style={{ width: `${stats.collectionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-600">{stats.uniqueCards} / {stats.totalCardTypes} 種類</span>
                  {profile.cardsByRarity && (
                    <div className="flex gap-1">
                      {(['UR', 'SSR', 'SR', 'R'] as const).map(r => {
                        const count = profile.cardsByRarity![r] ?? 0;
                        if (count === 0) return null;
                        const style = RARITY_COLORS[r];
                        return (
                          <span key={r} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                            {r}×{count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ===== 推し度ランキング ===== */}
            {(profile.oshiRanking ?? []).length > 0 && (
              <section className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">推し度ランキング</h3>
                </div>
                <div className="p-3 space-y-1">
                  {profile.oshiRanking!.map((oshi) => (
                    <a
                      key={oshi.characterId}
                      href={`/profile/${oshi.characterId}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">
                        {oshi.rank <= 3 ? RANK_MEDALS[oshi.rank - 1] : <span className="text-sm text-gray-500">#{oshi.rank}</span>}
                      </span>
                      <div className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ${oshi.isFanclub ? 'ring-purple-500' : 'ring-white/10'} group-hover:ring-purple-400/60 transition-all`}>
                        {oshi.characterAvatar ? (
                          <img src={oshi.characterAvatar} alt={oshi.characterName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">{oshi.characterName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{oshi.characterName}</span>
                          {oshi.isFanclub && (
                            <span className="text-[10px] bg-purple-600/60 text-purple-200 px-1.5 py-0.5 rounded-full font-bold leading-none">FC</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                          <span>{oshi.franchise}</span>
                          <span className="text-gray-700">|</span>
                          <span>{oshi.totalMessages}通</span>
                          {oshi.streakDays > 0 && <><span className="text-gray-700">|</span><span className="text-orange-400">🔥{oshi.streakDays}日</span></>}
                          {oshi.daysSinceFirstMeet != null && (
                            <><span className="text-gray-700">|</span><span>出会い{oshi.daysSinceFirstMeet}日目</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-base font-black text-purple-400">Lv.{oshi.level}</div>
                        <div className="text-[10px] text-gray-600">{oshi.levelName}</div>
                        {oshi.globalRank != null && oshi.totalFans != null && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            全体 <span className={oshi.globalRank <= 3 ? 'text-yellow-400 font-bold' : 'text-gray-400'}>{oshi.globalRank}位</span>/{oshi.totalFans}人
                          </div>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ===== レアカードコレクション ===== */}
            {(profile.rareCards ?? []).length > 0 && (
              <section className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white">レアカード</h3>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                  {profile.rareCards!.slice(0, 9).map((card) => {
                    const style = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.N;
                    return (
                      <div key={card.id} className={`relative rounded-xl overflow-hidden border ${style.border} ${style.bg} aspect-[3/4] shadow-lg ${style.glow}`}>
                        {card.characterAvatar ? (
                          <img src={card.characterAvatar} alt={card.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-2xl">🃏</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
                          <span className={`text-[10px] font-black ${style.text}`}>{card.rarity}</span>
                          <p className="text-[10px] text-white font-medium truncate leading-tight">{card.name}</p>
                        </div>
                        {card.rarity === 'UR' && (
                          <div className="absolute inset-0 border-2 border-pink-400/40 rounded-xl pointer-events-none animate-pulse" style={{
                            boxShadow: 'inset 0 0 25px rgba(236,72,153,0.25), 0 0 15px rgba(236,72,153,0.15)',
                          }} />
                        )}
                        {card.rarity === 'SSR' && (
                          <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-xl pointer-events-none" style={{
                            boxShadow: 'inset 0 0 20px rgba(250,204,21,0.15)',
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===== FC加入中 ===== */}
            {fcFollowing.length > 0 && (
              <section className="bg-white/[0.03] border border-purple-500/20 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-purple-500/10">
                  <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 001 1h8a1 1 0 001-1v-1H7v1z"/></svg>
                    ファンクラブ
                    <span className="text-xs text-purple-400/60 font-normal">{fcFollowing.length}キャラ</span>
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {fcFollowing.map(char => (
                    <a key={char.characterId} href={`/profile/${char.characterId}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/40">
                        {char.characterAvatarUrl ? (
                          <img src={char.characterAvatarUrl} alt={char.characterName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">{char.characterName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{char.characterName}</p>
                        <p className="text-[10px] text-gray-500">{char.characterFranchise}</p>
                      </div>
                      <span className="text-xs bg-purple-600/40 text-purple-300 px-2 py-0.5 rounded-full font-bold">FC</span>
                      <span className="text-sm font-bold text-purple-400">Lv.{char.level}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ===== フォロー中のキャラ ===== */}
            {(profile.following ?? []).filter(f => !f.isFanclub).length > 0 && (
              <section className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-gray-400">フォロー中</h3>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {(profile.following ?? []).filter(f => !f.isFanclub).map(char => (
                    <a
                      key={char.characterId}
                      href={`/profile/${char.characterId}`}
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {char.characterAvatarUrl ? (
                          <img src={char.characterAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-300">{char.characterName}</span>
                      <span className="text-[10px] text-purple-400/80 font-bold">Lv.{char.level}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
