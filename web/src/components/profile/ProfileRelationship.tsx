'use client';

import { RELATIONSHIP_LEVELS } from '@/types/character';
import { SparkStar } from './SparkStar';
import { PersonalityTraitsSection } from './PersonalityTraitsSection';
import {
  CHARACTER_PROFILES,
  PROFILE_LABELS,
  CREW_MEMBERS,
  PRESET_INTERESTS,
  type Character,
  type CharacterProfile,
  type PersonalityTrait,
  type RelationshipData,
  type MilestonesData,
  type RankingEntry,
} from '@/app/profile/[characterId]/profile-data';

export interface ProfileRelationshipProps {
  character: Character | null;
  characterId: string;
  relationship: RelationshipData | null;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpAnimated: boolean;
  xpPercent: number;
  maxStars: number;
  filledStars: number;
  levelInfo: { name: string; xpRequired: number } | undefined;
  catchphrases: string[];
  milestonesData: MilestonesData | null;
  ranking: RankingEntry[];
  rankingLoading: boolean;
  myRank: number | null;
  nickname: string;
  onNicknameChange: (value: string) => void;
  interests: string[];
  onToggleInterest: (interest: string) => void;
  customInterest: string;
  onCustomInterestChange: (value: string) => void;
  onAddCustomInterest: () => void;
  saveLoading: boolean;
  saveSuccess: boolean;
  onSaveCustomization: () => void;
}

export function ProfileRelationship({
  character,
  characterId,
  relationship,
  level,
  xp,
  nextLevelXp,
  xpAnimated,
  xpPercent,
  maxStars,
  filledStars,
  levelInfo,
  catchphrases,
  milestonesData,
  ranking,
  rankingLoading,
  myRank,
  nickname,
  onNicknameChange,
  interests,
  onToggleInterest,
  customInterest,
  onCustomInterestChange,
  onAddCustomInterest,
  saveLoading,
  saveSuccess,
  onSaveCustomization,
}: ProfileRelationshipProps) {
  return (
    <div className="space-y-5 pt-2 pb-24">

      {/* ══════════════ 絆レベル表示 ══════════════ */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-purple-900/50 to-pink-900/30 border border-purple-500/30 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-600/40 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-purple-300 font-semibold">あなたの絆レベル</p>
            <p className="text-white font-black text-lg leading-tight">Lv.{level} <span className="text-purple-300 text-sm font-semibold">「{levelInfo?.name ?? '—'}」</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{(relationship?.totalMessages ?? 0).toLocaleString()} 通</p>
          <p className="text-xs text-purple-400 mt-0.5">会話回数</p>
        </div>
      </div>

      {/* ══════════════ あなただけの設定（IKEA効果） ══════════════ */}
      <div className="bg-gray-900/60 rounded-2xl p-4 border border-white/5 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <p className="text-white font-semibold text-sm">あなただけの設定</p>
        </div>

        {/* 呼び名 */}
        <div className="space-y-1.5">
          <label className="text-gray-400 text-xs">呼び名（キャラがあなたをどう呼ぶか）</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            placeholder="例: 太郎くん"
            className="w-full bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
            maxLength={20}
          />
        </div>

        {/* 共通の趣味 */}
        <div className="space-y-2">
          <label className="text-gray-400 text-xs">共通の趣味（会話の話題に影響します）</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => onToggleInterest(interest)}
                className={`text-sm px-3 py-1 rounded-full border transition-all ${
                  interests.includes(interest)
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-purple-600/20 text-purple-300 border-purple-500/30 hover:bg-purple-600/30'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInterest}
              onChange={(e) => onCustomInterestChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAddCustomInterest(); }}
              placeholder="カスタム追加..."
              className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors"
              maxLength={15}
            />
            <button
              onClick={onAddCustomInterest}
              disabled={!customInterest.trim()}
              className="px-3 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          {interests.filter((i) => !(PRESET_INTERESTS as readonly string[]).includes(i)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interests.filter((i) => !(PRESET_INTERESTS as readonly string[]).includes(i)).map((interest) => (
                <button
                  key={interest}
                  onClick={() => onToggleInterest(interest)}
                  className="text-sm px-3 py-1 rounded-full border bg-purple-600 text-white border-purple-500 flex items-center gap-1"
                >
                  {interest}
                  <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={onSaveCustomization}
          disabled={saveLoading}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            saveSuccess
              ? 'bg-green-600/80 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          } ${saveLoading ? 'opacity-60' : ''}`}
        >
          {saveLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : saveSuccess ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              設定を保存しました
            </>
          ) : (
            '保存する'
          )}
        </button>
      </div>

      {/* ══════════════ 今週のTOP3ランキング ══════════════ */}
      <div>
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">今週の親密度TOP3</p>
        </div>
        <div className="bg-gray-900/80 rounded-2xl border border-white/8 overflow-hidden">
          {rankingLoading ? (
            <div className="py-8 text-center text-white/30 text-sm">読み込み中…</div>
          ) : ranking.length === 0 ? (
            <div className="py-8 text-center text-white/30 text-sm">ランキングデータなし</div>
          ) : (
            <>
              {ranking.slice(0, 3).map((entry) => {
                const medalColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                return (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
                      entry.isMe ? 'bg-purple-900/30' : ''
                    }`}
                  >
                    <span className={`text-sm font-black w-6 text-center flex-shrink-0 ${medalColors[entry.rank - 1] ?? 'text-white/40'}`}>
                      {entry.rank <= 3 ? `#${entry.rank}` : `#${entry.rank}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${entry.isMe ? 'text-purple-200' : 'text-white/80'}`}>
                        {entry.maskedName}
                        {entry.isMe && <span className="ml-2 text-xs text-purple-400 bg-purple-900/50 px-1.5 py-0.5 rounded-full">あなた</span>}
                      </p>
                      <p className="text-xs text-gray-500">{entry.totalMessages.toLocaleString()} 通</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-yellow-400 font-bold">Lv.{entry.level}</p>
                    </div>
                  </div>
                );
              })}

              {myRank !== null && myRank > 3 && (
                <div className="px-4 py-3 bg-orange-950/20 border-t border-orange-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-orange-300 text-xs font-semibold">あなたは現在 {myRank}位</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        まだ{character?.name ?? 'キャラ'}に追いつけるかも…もっと話しかけてみよう！
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {myRank === 1 && (
                <div className="px-4 py-2 bg-yellow-950/20 border-t border-yellow-500/20 text-center">
                  <p className="text-yellow-300 text-xs font-semibold">あなたが最も親しい存在です</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════ 基本情報カード ══════════════ */}
      {character && (() => {
        const hardcoded = CHARACTER_PROFILES[character.slug];
        const dbProfile: Record<string, string> = {};
        if (character.birthday) dbProfile['誕生日'] = character.birthday;
        if (character.franchise) dbProfile['作品'] = character.franchise;
        if (character.catchphrases?.length) dbProfile['口癖'] = character.catchphrases.slice(0, 2).join(' / ');
        if (character.personalityTraits?.length) {
          const traits = Array.isArray(character.personalityTraits) ? character.personalityTraits : [];
          if (traits.length) dbProfile['性格'] = traits.slice(0, 3).join('、');
        }

        const profileEntries = hardcoded
          ? (Object.entries(hardcoded) as [keyof CharacterProfile, string][])
              .filter(([, v]) => !!v)
              .map(([key, value]) => ({ label: PROFILE_LABELS[key], value }))
          : Object.entries(dbProfile).map(([label, value]) => ({ label, value }));

        if (profileEntries.length === 0) return null;

        return (
          <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/10 shadow-lg">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-4">
              プロフィール
            </p>
            <div className="space-y-0">
              {profileEntries.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-gray-400 text-xs flex-shrink-0">{label}</span>
                  <span className="text-white text-sm font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════════════ 紹介文 ══════════════ */}
      {character?.description && (
        <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/10 shadow-lg">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
            紹介
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">{character.description}</p>
        </div>
      )}

      {/* ══════════════ 関連キャラ ══════════════ */}
      {character && CREW_MEMBERS[character.slug] && (
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
            関連キャラクター
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}>
            {CREW_MEMBERS[character.slug].map((member) => (
              <div
                key={member.name}
                className="flex-shrink-0 bg-gray-900/80 rounded-xl p-3 border border-white/5 text-center w-24"
              >
                <div className="w-8 h-8 rounded-full bg-gray-700/80 flex items-center justify-center mx-auto mb-1.5">
                  <span className="text-white text-xs font-bold">{member.name.charAt(0)}</span>
                </div>
                <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{member.name}</p>
                <p className="text-gray-500 text-[10px] mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ パーソナリティトレイト ══════════════ */}
      {character?.personalityTraits && Array.isArray(character.personalityTraits) && character.personalityTraits.length > 0 && (() => {
        const rawTraits = character.personalityTraits as (string | PersonalityTrait)[];
        const converted: PersonalityTrait[] = rawTraits.map((t, i) => {
          if (typeof t === 'object' && t !== null && 'trait' in t && 'value' in t) {
            return t as PersonalityTrait;
          }
          const value = Math.max(55, 95 - i * 8);
          return { trait: String(t), value };
        });
        return <PersonalityTraitsSection traits={converted} />;
      })()}

      {/* ══════════════ 名言セクション ══════════════ */}
      {catchphrases.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
            名言
          </p>
          <div className="space-y-3">
            {catchphrases.map((phrase, i) => (
              <div
                key={i}
                className="bg-gray-900/70 rounded-xl p-4 border border-purple-900/30 relative overflow-hidden"
              >
                <span className="absolute top-2 left-3 text-3xl text-purple-800/30 font-serif leading-none select-none">&ldquo;</span>
                <p className="text-gray-200 text-sm leading-relaxed pl-4 italic">{phrase}</p>
                <span className="absolute bottom-1 right-3 text-3xl text-purple-800/30 font-serif leading-none select-none">&rdquo;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ レベル & 星 ══════════════ */}
      <div className="bg-gray-900/80 rounded-2xl p-5 border border-white/5 shadow-lg">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">絆レベル</p>

        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: maxStars }).map((_, i) => (
            <SparkStar key={i} filled={i < filledStars} delay={i * 0.15} />
          ))}
          <span className="ml-2 text-white font-bold text-lg">Level {level}</span>
          <span className="ml-1 text-gray-400 text-sm">「{levelInfo?.name ?? '—'}」</span>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-400">経験値</span>
            <span className="text-purple-300 font-semibold">
              {xp.toLocaleString()}{nextLevelXp ? ` / ${nextLevelXp.toLocaleString()} XP` : ' XP (MAX)'}
            </span>
          </div>
          <div className="relative w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-purple-500/10" />
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{
                width: xpAnimated ? `${xpPercent}%` : '0%',
                background: 'linear-gradient(90deg, #7c3aed, #db2777)',
                boxShadow: '0 0 12px rgba(168,85,247,0.8)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_linear_infinite]" />
            </div>
          </div>
          {nextLevelXp && (
            <p className="text-xs text-gray-500 mt-1.5 text-right">
              あと {(nextLevelXp - xp).toLocaleString()} XP で次のレベル
            </p>
          )}
        </div>
      </div>

      {/* ══════════════ 統計カード ══════════════ */}
      <div>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3 px-1">統計</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
            <div className="flex justify-center mb-1.5">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div className="text-white font-black text-xl leading-none">
              {(relationship?.totalMessages ?? 0).toLocaleString()}
            </div>
            <div className="text-gray-500 text-xs mt-1">メッセージ</div>
          </div>
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
            <div className="flex justify-center mb-1.5">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div className="text-white font-bold text-sm leading-tight">
              {relationship?.firstMessageAt
                ? new Date(relationship.firstMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                : '—'}
            </div>
            <div className="text-gray-500 text-xs mt-1">最初の会話</div>
          </div>
          <div className="bg-gray-900/80 rounded-2xl p-4 border border-white/5 text-center">
            <div className="flex justify-center mb-1.5">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-white font-bold text-sm leading-tight">
              {relationship?.lastMessageAt
                ? new Date(relationship.lastMessageAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
                : '—'}
            </div>
            <div className="text-gray-500 text-xs mt-1">最後の会話</div>
          </div>
        </div>
      </div>

      {/* ══════════════ マイルストーン タイムライン ══════════════ */}
      <div>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-4 px-1">マイルストーン</p>
        <div className="relative">
          <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-600/60 via-gray-700/40 to-transparent" />
          <div className="space-y-3">
            {milestonesData?.milestones.map((m, idx) => (
              <div key={m.id} className="relative flex items-start gap-4 pl-2">
                <div
                  className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                    m.achieved
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'bg-gray-900 border-gray-700'
                  }`}
                  style={m.achieved ? { animationDelay: `${idx * 0.1}s` } : {}}
                >
                  {m.achieved ? (
                    <span>{m.emoji}</span>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                </div>
                <div
                  className={`flex-1 min-w-0 rounded-xl p-3.5 border transition-all ${
                    m.achieved
                      ? 'bg-purple-900/20 border-purple-500/30'
                      : 'bg-gray-900/40 border-gray-800/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${m.achieved ? 'text-white' : 'text-gray-500'}`}>
                      {m.title}
                    </span>
                    {m.achieved ? (
                      <span className="text-xs text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-full">
                        ✓ 達成
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600 bg-gray-800/60 px-2 py-0.5 rounded-full">
                        Lv.{m.level}で解放
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${m.achieved ? 'text-gray-400' : 'text-gray-600'}`}>
                    {m.achieved ? m.description : `Level ${m.level} に到達すると解放されます`}
                  </p>
                  {m.achieved && m.characterMessage && (
                    <p className="text-xs text-purple-300/80 italic mt-1.5 border-l-2 border-purple-500/40 pl-2">
                      「{m.characterMessage}」
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
