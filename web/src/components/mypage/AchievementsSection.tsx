'use client';

import { useMemo } from 'react';

/* ── Achievement definitions ── */
interface AchievementDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'rainbow';
  check: (data: AchievementInput) => boolean;
}

interface AchievementInput {
  totalMessages: number;
  followingCount: number;
  maxLevel: number;
  characterCount: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_chat',    icon: '💬', title: '初めてのチャット',    desc: 'キャラに初めてメッセージを送った',         rarity: 'bronze',  check: d => d.totalMessages >= 1 },
  { id: 'chat_50',       icon: '🗣️', title: 'おしゃべり好き',      desc: 'メッセージ累計50通以上',                  rarity: 'bronze',  check: d => d.totalMessages >= 50 },
  { id: 'chat_200',      icon: '🔥', title: 'チャット常連',        desc: 'メッセージ累計200通以上',                 rarity: 'silver',  check: d => d.totalMessages >= 200 },
  { id: 'chat_1000',     icon: '⚡', title: 'チャット廃人',        desc: 'メッセージ累計1000通以上',                rarity: 'gold',    check: d => d.totalMessages >= 1000 },
  { id: 'first_follow',  icon: '🤝', title: '初めてのナカマ',      desc: '初めてキャラをフォローした',               rarity: 'bronze',  check: d => d.followingCount >= 1 },
  { id: 'follow_5',      icon: '⚓', title: '仲間大好き',         desc: '5キャラ以上フォロー中',                   rarity: 'silver',  check: d => d.followingCount >= 5 },
  { id: 'follow_10',     icon: '🏴‍☠️', title: '大船長',           desc: '10キャラ以上フォロー中',                  rarity: 'gold',    check: d => d.followingCount >= 10 },
  { id: 'bond_lv3',      icon: '💜', title: '深まる絆',           desc: 'キャラとの絆Lv.3以上',                   rarity: 'bronze',  check: d => d.maxLevel >= 3 },
  { id: 'bond_lv5',      icon: '💎', title: '心の友',             desc: 'キャラとの絆Lv.5以上',                   rarity: 'silver',  check: d => d.maxLevel >= 5 },
  { id: 'bond_lv10',     icon: '👑', title: '永遠の仲間',          desc: 'キャラとの絆Lv.10以上',                  rarity: 'gold',    check: d => d.maxLevel >= 10 },
  { id: 'multi_char',    icon: '🌊', title: '多キャラ愛',         desc: '3キャラ以上とチャット経験あり',            rarity: 'silver',  check: d => d.characterCount >= 3 },
  { id: 'collector',     icon: '🌟', title: 'コレクター',         desc: '10キャラ以上とチャット経験あり',           rarity: 'gold',    check: d => d.characterCount >= 10 },
];

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  bronze:  { bg: 'bg-amber-900/30',   border: 'border-amber-700/50',   text: 'text-amber-400',   glow: '' },
  silver:  { bg: 'bg-gray-700/40',    border: 'border-gray-500/60',    text: 'text-gray-200',    glow: '' },
  gold:    { bg: 'bg-yellow-900/40',  border: 'border-yellow-500/60',  text: 'text-yellow-300',  glow: 'shadow-yellow-500/20 shadow-md' },
  rainbow: { bg: 'bg-purple-900/40',  border: 'border-pink-400/60',    text: 'text-pink-300',    glow: 'shadow-pink-500/30 shadow-md' },
};

interface Props {
  relationships: Array<{ totalMessages: number; level: number }>;
  followingCount: number;
}

export default function AchievementsSection({ relationships, followingCount }: Props) {
  const unlockedAchievements = useMemo(() => {
    const totalMessages = relationships.reduce((sum, r) => sum + r.totalMessages, 0);
    const maxLevel = relationships.reduce((max, r) => Math.max(max, r.level), 0);
    const characterCount = relationships.filter(r => r.totalMessages > 0).length;
    const input: AchievementInput = { totalMessages, followingCount, maxLevel, characterCount };
    return ACHIEVEMENTS.filter(a => a.check(input));
  }, [relationships, followingCount]);

  if (unlockedAchievements.length === 0) return null;

  return (
    <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">🏅 称号・実績</h3>
        <span className="text-xs text-purple-400">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {unlockedAchievements.map(a => {
          const s = RARITY_STYLES[a.rarity];
          return (
            <div
              key={a.id}
              title={a.desc}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${s.bg} ${s.border} ${s.text} ${s.glow}`}
            >
              <span>{a.icon}</span>
              <span>{a.title}</span>
            </div>
          );
        })}
      </div>
      {unlockedAchievements.length < ACHIEVEMENTS.length && (
        <p className="text-xs text-gray-600 mt-2">
          あと{ACHIEVEMENTS.length - unlockedAchievements.length}個の称号がロック中… 🔒
        </p>
      )}
    </section>
  );
}
