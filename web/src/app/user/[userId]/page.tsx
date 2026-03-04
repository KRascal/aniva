'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
  following?: FollowingCharacter[];
}

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
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
      })
      .catch((err) => {
        setError(err.message === 'not_found' ? 'ユーザーが見つかりません' : '読み込みに失敗しました');
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center space-y-4">
          <p className="text-5xl">🔍</p>
          <p className="text-white font-bold text-lg">{error ?? 'ページが見つかりません'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || 'ユーザー';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const fcFollowing = (profile.following ?? []).filter((f) => f.isFanclub);
  const regularFollowing = (profile.following ?? []).filter((f) => !f.isFanclub);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      {/* ヘッダー */}
      <header className="bg-black/60 backdrop-blur-md border-b border-white/8 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800 -ml-1"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">プロフィール</h1>
      </header>

      {/* カバー画像エリア */}
      <div className="relative h-36 overflow-hidden">
        {profile.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverImageUrl}
            alt="cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* プロフィールカード */}
        <section className="-mt-12 relative z-10">
          <div className="flex items-end gap-4">
            {/* アバター */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-2 ring-gray-950 flex-shrink-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
              {profile.nickname && (
                <p className="text-sm text-purple-300">「{profile.nickname}」と呼んで</p>
              )}
            </div>
          </div>

          {/* 非公開の場合 */}
          {!profile.profilePublic && (
            <div className="mt-4 bg-gray-800/60 border border-white/10 rounded-2xl p-5 text-center space-y-2">
              <p className="text-3xl">🔒</p>
              <p className="text-white font-semibold">このプロフィールは非公開です</p>
              <p className="text-gray-500 text-sm">このユーザーはプロフィールを非公開に設定しています</p>
            </div>
          )}

          {/* 公開の場合 */}
          {profile.profilePublic && (
            <>
              {/* Bio */}
              {profile.bio && (
                <div className="mt-4 bg-gray-900/70 border border-white/8 rounded-2xl p-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* FC加入中キャラ */}
              {fcFollowing.length > 0 && (
                <div className="mt-4 bg-gray-900/80 border border-purple-500/20 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2 3a1 1 0 001 1h8a1 1 0 001-1v-1H7v1z"/>
                    </svg>
                    ファンクラブ加入中
                  </h3>
                  <div className="space-y-2">
                    {fcFollowing.map((char) => (
                      <a
                        key={char.characterId}
                        href={`/profile/${char.characterId}`}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/30">
                          {char.characterAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={char.characterAvatarUrl} alt={char.characterName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                              {char.characterName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{char.characterName}</p>
                          <p className="text-xs text-gray-500 truncate">{char.characterFranchise}</p>
                        </div>
                        <span className="text-xs bg-purple-900/40 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          FC
                        </span>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-purple-400 font-medium">Lv.{char.level}</p>
                          <p className="text-[10px] text-gray-600">{char.levelName}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* フォロー中キャラ */}
              {regularFollowing.length > 0 && (
                <div className="mt-4 bg-gray-900/80 border border-white/8 rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">
                    フォロー中のキャラ
                  </h3>
                  <div className="space-y-2">
                    {regularFollowing.map((char) => (
                      <a
                        key={char.characterId}
                        href={`/profile/${char.characterId}`}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {char.characterAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={char.characterAvatarUrl} alt={char.characterName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold text-white">
                              {char.characterName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{char.characterName}</p>
                          <p className="text-xs text-gray-500 truncate">{char.characterFranchise}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-purple-400 font-medium">Lv.{char.level}</p>
                          <p className="text-[10px] text-gray-600">{char.levelName}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* フォローなし */}
              {(profile.following ?? []).length === 0 && (
                <div className="mt-4 bg-gray-900/50 border border-white/5 rounded-2xl p-6 text-center">
                  <p className="text-gray-600 text-sm">フォロー中のキャラはありません</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
