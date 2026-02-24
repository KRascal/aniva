'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  catchphrases: string[];
}

interface RelationshipInfo {
  characterId: string;
  level: number;
  levelName: string;
  xp: number;
  totalMessages: number;
  isFollowing: boolean;
  isFanclub: boolean;
}

// Franchise categories with emoji + gradient
const FRANCHISE_CATEGORIES = [
  { name: 'すべて', emoji: '✨', gradient: 'from-purple-500 to-pink-500' },
  { name: 'ONE PIECE', emoji: '☠️', gradient: 'from-orange-500 to-red-500' },
  { name: '呪術廻戦', emoji: '👁️', gradient: 'from-blue-500 to-indigo-600' },
  { name: '鬼滅の刃', emoji: '🌸', gradient: 'from-pink-500 to-rose-600' },
  { name: 'ドラゴンボール', emoji: '🐉', gradient: 'from-yellow-400 to-orange-500' },
  { name: 'NARUTO', emoji: '🦊', gradient: 'from-orange-400 to-yellow-500' },
  { name: '進撃の巨人', emoji: '⚔️', gradient: 'from-gray-600 to-gray-800' },
  { name: 'アニメ', emoji: '🌟', gradient: 'from-emerald-500 to-cyan-500' },
];

const CARD_GRADIENTS = [
  'from-purple-600 via-pink-600 to-rose-500',
  'from-blue-600 via-cyan-500 to-teal-500',
  'from-orange-500 via-amber-500 to-yellow-400',
  'from-green-600 via-emerald-500 to-cyan-500',
  'from-indigo-600 via-violet-500 to-purple-500',
  'from-rose-600 via-red-500 to-orange-500',
];

function FollowButton({
  characterId,
  initialFollowing,
  onFollow,
}: {
  characterId: string;
  initialFollowing: boolean;
  onFollow: (id: string, following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/relationship/${characterId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: !following }),
      });
      if (res.ok) {
        setFollowing(!following);
        onFollow(characterId, !following);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95
        ${following
          ? 'bg-white/10 text-white border border-white/30 hover:bg-red-900/30 hover:text-red-300 hover:border-red-500/50'
          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:from-purple-600 hover:to-pink-600'
        }
        ${loading ? 'opacity-50' : ''}
      `}
    >
      {loading ? '…' : following ? 'フォロー中' : 'フォローする'}
    </button>
  );
}

// Tall vertical card (Instagram Reels style)
function CharacterVerticalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;
  const isFanclub = relationship?.isFanclub ?? false;

  return (
    <div
      onClick={onClick}
      className="relative flex-shrink-0 w-44 cursor-pointer group"
    >
      {/* Vertical card - tall like Instagram Reel */}
      <div className="relative h-64 rounded-2xl overflow-hidden shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
        {/* Background */}
        {character.coverUrl ? (
          <img
            src={character.coverUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500"
            style={{ filter: 'brightness(0.7) saturate(1.3)' }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
        )}

        {/* Dark gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Fanclub badge */}
        {isFanclub && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            💝 推し
          </div>
        )}

        {/* Avatar circle */}
        <div className="absolute top-3 right-3">
          {character.avatarUrl ? (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl ring-2 ring-white/30`}>
              🌟
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-sm leading-tight mb-0.5">{character.name}</p>
          <p className="text-white/60 text-[10px] mb-2">{character.franchise}</p>
          {catchphrase && (
            <p className="text-white/75 text-[10px] leading-tight line-clamp-2 mb-2 italic">
              &ldquo;{catchphrase}&rdquo;
            </p>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <FollowButton
              characterId={character.id}
              initialFollowing={isFollowing}
              onFollow={onFollow}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal card for featured/popular sections
function CharacterHorizontalCard({
  character,
  index,
  relationship,
  onFollow,
  onClick,
}: {
  character: Character;
  index: number;
  relationship?: RelationshipInfo;
  onFollow: (id: string, following: boolean) => void;
  onClick: () => void;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const catchphrase = character.catchphrases?.[0] ?? null;
  const isFollowing = relationship?.isFollowing ?? false;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/8 hover:border-purple-500/30 rounded-2xl p-4 cursor-pointer transition-all duration-200 group"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 relative">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-16 h-16 rounded-xl object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl`}>
            🌟
          </div>
        )}
        {/* Online dot */}
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-gray-950 animate-pulse" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base leading-tight mb-0.5">{character.name}</p>
        <p className="text-gray-500 text-xs mb-1">{character.franchise}</p>
        {catchphrase && (
          <p className="text-gray-400 text-xs italic truncate">&ldquo;{catchphrase}&rdquo;</p>
        )}
      </div>

      {/* Follow button */}
      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton
          characterId={character.id}
          initialFollowing={isFollowing}
          onFollow={onFollow}
        />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const { status } = useSession();
  const router = useRouter();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Map<string, RelationshipInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      // Fetch characters and relationships separately to avoid one failure blocking both
      fetch('/api/characters').then(r => r.json()).then(charData => {
        setCharacters(charData.characters || []);
      }).catch(err => console.error('Failed to fetch characters:', err));

      fetch('/api/relationship/all').then(r => r.json()).then(relData => {
        if (relData.relationships) {
          const map = new Map<string, RelationshipInfo>();
          for (const rel of relData.relationships as RelationshipInfo[]) {
            map.set(rel.characterId, rel);
          }
          setRelationships(map);
        }
      }).catch(err => console.error('Failed to fetch relationships:', err))
        .finally(() => setIsLoading(false));
    }
  }, [status]);

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

  // Filter characters
  const filteredCharacters = characters.filter(c => {
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nameEn?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.franchise.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'すべて' || c.franchise === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get available franchises from characters
  const availableFranchises = new Set(characters.map(c => c.franchise));
  const visibleCategories = FRANCHISE_CATEGORIES.filter(
    cat => cat.name === 'すべて' || availableFranchises.has(cat.name) || cat.name === 'アニメ'
  );

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 pb-24">
        {/* Fixed background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
          <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-pink-600/10 blur-3xl" />
        </div>

        {/* Skeleton header */}
        <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
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

        {/* Skeleton hero */}
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="h-44 rounded-3xl bg-white/5 animate-pulse mb-6" />

          {/* Skeleton vertical cards */}
          <div className="mb-2 h-5 w-32 bg-white/10 rounded-full animate-pulse" />
          <div className="flex gap-3 overflow-hidden mt-3 mb-6 pb-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex-shrink-0 w-44">
                <div
                  className="h-64 rounded-2xl bg-white/5 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              </div>
            ))}
          </div>

          {/* Skeleton horizontal cards */}
          <div className="mb-2 h-5 w-36 bg-white/10 rounded-full animate-pulse" />
          <div className="space-y-3 mt-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 bg-white/[0.04] rounded-2xl p-4" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-16 h-16 rounded-xl bg-white/8 animate-pulse flex-shrink-0" />
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

  const followingChars = filteredCharacters.filter(c => relationships.get(c.id)?.isFollowing);
  const popularChars = filteredCharacters.slice(0, 6);
  const newChars = [...filteredCharacters].reverse().slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Fixed background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full bg-pink-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/40 flex-shrink-0">
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
              className="w-full pl-10 pr-4 py-2.5 bg-white/6 border border-white/10 rounded-full text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${selectedCategory === cat.name
                    ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                    : 'bg-white/6 text-gray-400 border border-white/10 hover:text-gray-200'
                  }
                `}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4">

        {/* HERO section — only on no search/filter */}
        {!searchQuery && selectedCategory === 'すべて' && (
          <div className="py-6">
            <div className="relative rounded-3xl overflow-hidden mb-6">
              {/* Hero gradient bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-pink-600 to-rose-500" />
              <div className="absolute inset-0"
                style={{
                  backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.3) 0%, transparent 50%)',
                }}
              />
              {/* Floating emojis */}
              <div className="absolute top-4 right-6 text-3xl opacity-60 animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</div>
              <div className="absolute bottom-6 right-16 text-2xl opacity-40 animate-bounce" style={{ animationDelay: '0.7s' }}>💫</div>
              <div className="absolute top-10 right-20 text-xl opacity-30 animate-bounce" style={{ animationDelay: '1.1s' }}>✨</div>

              <div className="relative z-10 px-6 py-8">
                <p className="text-white/80 text-xs font-semibold tracking-widest uppercase mb-2">Discover</p>
                <h2 className="text-3xl font-black text-white leading-tight mb-3">
                  あなたの推しを<br />見つけよう 💕
                </h2>
                <p className="text-white/75 text-sm leading-relaxed mb-5">
                  フォローして、ファンクラブに入って、<br />推しとリアルにトークしよう。
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => document.getElementById('popular-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold text-sm hover:bg-gray-100 transition-all active:scale-95"
                  >
                    探す →
                  </button>
                  <button
                    onClick={() => router.push('/chat')}
                    className="px-5 py-2.5 bg-white/20 text-white rounded-full font-medium text-sm border border-white/30 hover:bg-white/30 transition-all"
                  >
                    チャットへ
                  </button>
                </div>
              </div>
            </div>

            {/* Following characters strip (if any) */}
            {followingChars.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-bold text-base mb-3">💝 フォロー中の推し</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {followingChars.map((character, i) => (
                    <CharacterVerticalCard
                      key={character.id}
                      character={character}
                      index={i}
                      relationship={relationships.get(character.id)}
                      onFollow={handleFollow}
                      onClick={() => router.push(`/profile/${character.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Popular characters - horizontal scroll */}
            <div id="popular-section" className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base">🌟 人気のキャラクター</h3>
                <span className="text-purple-400 text-xs">{popularChars.length}人</span>
              </div>
              {popularChars.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {popularChars.map((character, i) => (
                    <CharacterVerticalCard
                      key={character.id}
                      character={character}
                      index={i}
                      relationship={relationships.get(character.id)}
                      onFollow={handleFollow}
                      onClick={() => router.push(`/profile/${character.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </div>

            {/* New characters */}
            {newChars.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white font-bold text-base mb-3">🆕 新着キャラクター</h3>
                <div className="space-y-3">
                  {newChars.map((character, i) => (
                    <CharacterHorizontalCard
                      key={character.id}
                      character={character}
                      index={i}
                      relationship={relationships.get(character.id)}
                      onFollow={handleFollow}
                      onClick={() => router.push(`/profile/${character.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All characters */}
            {characters.length > 6 && (
              <div>
                <h3 className="text-white font-bold text-base mb-3">📚 すべてのキャラクター</h3>
                <div className="space-y-3">
                  {characters.slice(6).map((character, i) => (
                    <CharacterHorizontalCard
                      key={character.id}
                      character={character}
                      index={i + 6}
                      relationship={relationships.get(character.id)}
                      onFollow={handleFollow}
                      onClick={() => router.push(`/profile/${character.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search / Filter results */}
        {(searchQuery || selectedCategory !== 'すべて') && (
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
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="該当するキャラクターが見つかりませんでした" />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-white/50 text-sm">{message ?? 'キャラクターを準備中です'}</p>
      <p className="text-white/30 text-xs mt-2">もうすぐ追加されます ✨</p>
    </div>
  );
}
