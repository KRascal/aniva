'use client';

import type { Character } from '@/app/profile/[characterId]/profile-data';

export interface ProfileHeaderProps {
  character: Character | null;
  level: number;
  followerCount: number;
  catchphrases: string[];
  isFollowing: boolean;
  followLoading: boolean;
  characterId: string;
  onFollow: () => void;
  onChat: () => void;
  onBack: () => void;
  onMemoryBook: () => void;
  onCommunity: () => void;
}

export function ProfileHeader({
  character,
  level,
  followerCount,
  catchphrases,
  isFollowing,
  followLoading,
  characterId,
  onFollow,
  onChat,
  onBack,
  onMemoryBook,
  onCommunity,
}: ProfileHeaderProps) {
  return (
    <>
      {/* ══════════════ ヒーローセクション ══════════════ */}
      <div className="relative">
        {/* カバー画像（ヒーロー） */}
        <div className="relative h-56 overflow-hidden">
          {character?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.coverUrl}
              alt="cover"
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
            />
          ) : character?.avatarUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.avatarUrl}
                alt=""
                className="w-full h-full object-cover scale-110"
                style={{ filter: 'blur(20px) brightness(0.4) saturate(1.8)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-900/60 via-red-900/40 to-purple-950/60" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-900 via-red-900 to-purple-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
        </div>

        {/* ナビゲーション */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white transition-colors border border-white/15"
            aria-label="戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* アバター + 名前エリア */}
        <div className="relative z-10 px-5 -mt-14 flex items-end gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-gray-950 shadow-[0_0_32px_rgba(234,88,12,0.4)]">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{character?.name?.charAt(0) ?? '?'}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-black text-xs font-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-gray-950">
              {level}
            </div>
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-950 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <h1 className="text-white font-black text-2xl leading-tight truncate">
              {character?.name ?? '—'}
            </h1>
            <p className="text-orange-400 text-sm font-medium">{character?.franchise ?? '—'}</p>
            {followerCount > 0 && (
              <p className="text-gray-400 text-xs mt-0.5">
                {followerCount.toLocaleString()} フォロワー
              </p>
            )}
            {catchphrases.length > 0 && (
              <p className="text-gray-300 text-xs mt-1 italic leading-relaxed line-clamp-2">
                「{catchphrases[0]}」
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {/* キャラクター紹介文 */}
        {character?.description && (
          <div className="bg-gray-900/60 rounded-2xl p-4 border border-white/5">
            <p className="text-gray-300 text-sm leading-relaxed">{character.description}</p>
          </div>
        )}

        {/* ファン統計パネル */}
        {character?.slug && (
          <div>
            {/* FanStatsPanel is rendered in the parent to avoid prop drilling the component */}
          </div>
        )}

        {/* ══════════════ アクションボタン ══════════════ */}
        <button
          onClick={onMemoryBook}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 bg-amber-900/40 border border-amber-700/40 text-amber-300 hover:bg-amber-900/60 mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          思い出ブック
        </button>

        <button
          onClick={onCommunity}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 bg-indigo-900/30 border border-indigo-700/30 text-indigo-300 hover:bg-indigo-900/50 mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          ファン掲示板
        </button>

        <div className="flex gap-3">
          <button
            onClick={onFollow}
            disabled={followLoading}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 border ${
              isFollowing
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500'
            } ${followLoading ? 'opacity-60' : ''}`}
          >
            {followLoading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                フォロー中
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                フォローする
              </>
            )}
          </button>

          <button
            onClick={onChat}
            className="flex-1 relative py-3 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 overflow-hidden text-white"
            style={{ background: 'linear-gradient(135deg, #ea580c, #dc2626, #7c3aed)' }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_linear_infinite]" />
            <span className="relative z-10 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              チャット
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
