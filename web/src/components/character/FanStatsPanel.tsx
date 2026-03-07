'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FanStats {
  topFanMessageCount: number;
  isCurrentUserTop: boolean;
  totalTodayMessages: number;
  activeFansToday: number;
  fcMemberCount: number;
  followerCount: number;
  myTodayMessages: number;
  myRank: number | null;
  weeklyTop: {
    rank: number;
    messageCount: number;
    isMe: boolean;
    label: string;
  }[];
}

/**
 * ファン統計パネル — 嫉妬メカニクス
 * 「他のファンの存在が見える」→ 負けたくない → 課金ドライバー
 */
export function FanStatsPanel({ characterId }: { characterId: string }) {
  const [stats, setStats] = useState<FanStats | null>(null);

  useEffect(() => {
    fetch(`/api/characters/${characterId}/fan-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => null);
  }, [characterId]);

  if (!stats || (stats.totalTodayMessages === 0 && stats.fcMemberCount === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-surface)] border border-white/5 rounded-2xl p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">ファンの動き</h3>

      {/* 今日の統計 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{stats.activeFansToday}</p>
          <p className="text-[10px] text-[var(--color-muted)]">今日の来訪者</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{stats.totalTodayMessages}</p>
          <p className="text-[10px] text-[var(--color-muted)]">今日のメッセージ</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-400">{stats.fcMemberCount}</p>
          <p className="text-[10px] text-[var(--color-muted)]">FC会員</p>
        </div>
      </div>

      {/* 今日のトップファン */}
      {stats.topFanMessageCount > 0 && (
        <div className="bg-[var(--color-surface-2)] rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm">👑</span>
            <span className="text-xs text-white">
              {stats.isCurrentUserTop ? 'あなたが今日のNo.1！' : `今日のNo.1: ${stats.topFanMessageCount}通`}
            </span>
          </div>
          {!stats.isCurrentUserTop && stats.myTodayMessages > 0 && (
            <span className="text-[10px] text-[var(--color-muted)]">
              あなた: {stats.myTodayMessages}通
            </span>
          )}
        </div>
      )}

      {/* 週間ランキング */}
      {stats.weeklyTop.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-[var(--color-muted)] font-semibold">週間ランキング</p>
          {stats.weeklyTop.map(entry => (
            <div
              key={entry.rank}
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                entry.isMe
                  ? 'bg-purple-900/30 border border-purple-500/30'
                  : 'bg-[var(--color-surface-2)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-bold ${entry.rank <= 3 ? 'text-yellow-400' : 'text-[var(--color-muted)]'}`}>
                  #{entry.rank}
                </span>
                <span className={entry.isMe ? 'text-purple-300 font-semibold' : 'text-white'}>
                  {entry.label}
                </span>
              </div>
              <span className="text-[var(--color-muted)]">{entry.messageCount}通</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
