'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

interface CommentedMoment {
  id: string;
  content: string;
  createdAt: string;
  moment: {
    id: string;
    content: string | null;
    mediaUrl: string | null;
    characterName: string | null;
    characterAvatar: string | null;
    characterSlug: string | null;
  };
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
    daysSinceJoin: number;
  };
  oshiRanking?: OshiRank[];
  rareCards?: RareCard[];
  cardsByRarity?: Record<string, number>;
  recentComments?: CommentedMoment[];
  following?: FollowingCharacter[];
}

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  N: { bg: 'bg-gray-700/50', text: 'text-gray-400', border: 'border-gray-600' },
  R: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-600' },
  SR: { bg: 'bg-purple-900/50', text: 'text-purple-400', border: 'border-purple-600' },
  SSR: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-600' },
  UR: { bg: 'bg-pink-900/50', text: 'text-pink-400', border: 'border-pink-500' },
};

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

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
      .then((res) => {
        if (res.status === 404) throw new Error('not_found');
        return res.json();
      })
      .then(setProfile)
      .catch((err) => setError(err.message === 'not_found' ? 'ユーザーが見つかりません' : '読み込みに失敗しました'))
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
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
  const fcFollowing = (profile.following ?? []).filter(f => f.isFanclub);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="bg-gray-950 border-b border-white/8 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 -ml-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold">{displayName}</h1>
      </header>

      {/* Cover + Avatar */}
      <div className="relative h-40 overflow-hidden">
        {profile.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/80 via-indigo-900/80 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Profile Header */}
        <section className="-mt-14 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl ring-4 ring-gray-950 flex-shrink-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : avatarLetter}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white truncate">{displayName}</h2>
              {profile.bio && <p className="text-sm text-gray-400 line-clamp-2">{profile.bio}</p>}
              {stats && <p className="text-xs text-gray-500 mt-1">{stats.daysSinceJoin}日前に参加</p>}
            </div>
          </div>

          {/* Bio is shown inline above */}
        </section>

        {/* Private profile guard */}
        {!profile.profilePublic && (
          <div className="bg-gray-800/60 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-white font-semibold">非公開プロフィール</p>
          </div>
        )}

        {profile.profilePublic && (
          <>
            {/* ===== Stats Bar ===== */}
            {stats && (
              <section className="grid grid-cols-4 gap-2">
                {[
                  { label: 'メッセージ', value: stats.totalMessages.toLocaleString(), icon: '💬' },
                  { label: '最長連続', value: `${stats.maxStreak}日`, icon: '🔥' },
                  { label: 'フォロー', value: stats.totalFollowing.toString(), icon: '👥' },
                  { label: 'カード', value: stats.totalCards.toString(), icon: '🃏' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900/80 border border-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg mb-0.5">{s.icon}</div>
                    <div className="text-lg font-black text-white">{s.value}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </section>
            )}

            {/* ===== 推し度ランキング ===== */}
            {(profile.oshiRanking ?? []).length > 0 && (
              <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">🏆</span> 推し度ランキング
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {profile.oshiRanking!.map((oshi) => (
                    <a
                      key={oshi.characterId}
                      href={`/profile/${oshi.characterId}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-lg w-6 text-center flex-shrink-0">{RANK_MEDALS[oshi.rank - 1]}</span>
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/30 group-hover:ring-purple-400/60 transition-all">
                        {oshi.characterAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={oshi.characterAvatar} alt={oshi.characterName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">{oshi.characterName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{oshi.characterName}</span>
                          {oshi.isFanclub && (
                            <span className="text-xs bg-purple-600/60 text-purple-200 px-1.5 py-0.5 rounded-full font-bold">FC</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>{oshi.franchise}</span>
                          <span>·</span>
                          <span>{oshi.totalMessages}通</span>
                          {oshi.streakDays > 0 && <><span>·</span><span>🔥{oshi.streakDays}日</span></>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-bold text-purple-400">Lv.{oshi.level}</div>
                        <div className="text-[10px] text-gray-600">{oshi.levelName}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ===== レアカードコレクション ===== */}
            {(profile.rareCards ?? []).length > 0 && (
              <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">✨</span> レアカード
                  </h3>
                  {profile.cardsByRarity && (
                    <div className="flex gap-1.5">
                      {(['UR', 'SSR', 'SR'] as const).map(r => {
                        const count = profile.cardsByRarity![r] ?? 0;
                        if (count === 0) return null;
                        const style = RARITY_COLORS[r];
                        return (
                          <span key={r} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}>
                            {r} ×{count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                  {profile.rareCards!.slice(0, 9).map((card) => {
                    const style = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.N;
                    return (
                      <div key={card.id} className={`relative rounded-xl overflow-hidden border ${style.border} ${style.bg} aspect-[3/4]`}>
                        {card.characterAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={card.characterAvatar} alt={card.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🃏</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                          <span className={`text-[10px] font-black ${style.text}`}>{card.rarity}</span>
                          <p className="text-[10px] text-white font-medium truncate leading-tight">{card.name}</p>
                        </div>
                        {card.rarity === 'UR' && (
                          <div className="absolute inset-0 border-2 border-pink-400/40 rounded-xl pointer-events-none" style={{
                            boxShadow: 'inset 0 0 20px rgba(236,72,153,0.3)',
                          }} />
                        )}
                        {card.rarity === 'SSR' && (
                          <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-xl pointer-events-none" style={{
                            boxShadow: 'inset 0 0 15px rgba(250,204,21,0.2)',
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
              <section className="bg-gray-900/80 border border-purple-500/20 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-purple-500/10">
                  <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 001 1h8a1 1 0 001-1v-1H7v1z"/></svg>
                    ファンクラブ会員
                    <span className="text-xs text-purple-400/60 font-normal ml-1">{fcFollowing.length}キャラ</span>
                  </h3>
                </div>
                <div className="p-3 space-y-1">
                  {fcFollowing.map(char => (
                    <a key={char.characterId} href={`/profile/${char.characterId}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/30">
                        {char.characterAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={char.characterAvatarUrl} alt={char.characterName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">{char.characterName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{char.characterName}</p>
                        <p className="text-xs text-gray-500">{char.characterFranchise}</p>
                      </div>
                      <span className="text-xs bg-purple-600/40 text-purple-300 px-2 py-0.5 rounded-full font-bold">FC</span>
                      <span className="text-xs text-purple-400 font-medium">Lv.{char.level}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ===== コメントしたモーメンツ ===== */}
            {(profile.recentComments ?? []).length > 0 && (
              <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-lg">💬</span> コメントしたモーメンツ
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {profile.recentComments!.map(c => (
                    <a key={c.id} href={`/moments#${c.moment.id}`} className="flex gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      {c.moment.characterAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.moment.characterAvatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-purple-400 font-medium">{c.moment.characterName}</p>
                        <p className="text-xs text-gray-300 truncate">{c.content}</p>
                        {c.moment.content && (
                          <p className="text-[10px] text-gray-600 truncate mt-0.5">元投稿: {c.moment.content}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ===== フォロー中のキャラ（残り） ===== */}
            {(profile.following ?? []).filter(f => !f.isFanclub).length > 0 && (
              <section className="bg-gray-900/80 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-gray-400">フォロー中のキャラ</h3>
                </div>
                <div className="p-3 space-y-1">
                  {(profile.following ?? []).filter(f => !f.isFanclub).map(char => (
                    <a key={char.characterId} href={`/profile/${char.characterId}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {char.characterAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={char.characterAvatarUrl} alt={char.characterName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">{char.characterName.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{char.characterName}</p>
                        <p className="text-xs text-gray-500">{char.characterFranchise}</p>
                      </div>
                      <span className="text-xs text-purple-400">Lv.{char.level}</span>
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
