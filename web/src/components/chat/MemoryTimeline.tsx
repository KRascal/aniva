'use client';

import React, { useEffect, useState } from 'react';

/** エピソード記憶エントリの型 */
interface EpisodeEntry {
  summary: string;
  date: string;
  emotion: string;
  importance: number;
}

/** memories APIレスポンスの型 */
interface MemoriesResponse {
  memories: EpisodeEntry[];
  totalMessages: number;
  bondLevel: number;
  firstMessageAt: string | null;
}

/** 感情 → 絵文字マッピング */
const EMOTION_EMOJI: Record<string, string> = {
  嬉しい: '😄',
  楽しい: '🎉',
  excited: '🔥',
  happy: '😄',
  悲しい: '😢',
  つらい: '😔',
  sad: '😢',
  neutral: '😌',
  angry: '😤',
  怒り: '😤',
  surprised: '😲',
  love: '💕',
  shy: '😳',
  proud: '✨',
  teasing: '😏',
  stressed: '😰',
};

function getEmotionEmoji(emotion: string): string {
  return EMOTION_EMOJI[emotion] ?? '💬';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const currentYear = now.getFullYear();
  return year === currentYear ? `${month}月${day}日` : `${year}年${month}月${day}日`;
}

interface MemoryTimelineProps {
  characterId: string;
}

export function MemoryTimeline({ characterId }: MemoryTimelineProps) {
  const [data, setData] = useState<MemoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/memories/${characterId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MemoriesResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MemoryTimeline] fetch error:', err);
        setError('思い出の読み込みに失敗しました');
        setLoading(false);
      });
  }, [characterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-gray-600 border-t-purple-400 animate-spin mr-2" />
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center text-xs text-gray-500">{error}</div>
    );
  }

  if (!data || data.memories.length === 0) {
    return (
      <div className="py-8 px-4 text-center">
        <div className="text-3xl mb-3">📭</div>
        <p className="text-sm text-gray-400 leading-relaxed">
          まだ思い出がありません。<br />
          たくさん話しかけてね！
        </p>
      </div>
    );
  }

  return (
    <div className="px-1 pb-4">
      {/* 統計バッジ */}
      <div className="flex gap-2 mb-4 px-2">
        <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center border border-white/8">
          <div className="text-purple-300 font-bold text-base">{data.bondLevel}</div>
          <div className="text-gray-500 text-[10px] mt-0.5">絆レベル</div>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center border border-white/8">
          <div className="text-purple-300 font-bold text-base">{data.totalMessages}</div>
          <div className="text-gray-500 text-[10px] mt-0.5">会話数</div>
        </div>
        {data.firstMessageAt && (
          <div className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center border border-white/8">
            <div className="text-purple-300 font-bold text-[11px]">{formatDate(data.firstMessageAt)}</div>
            <div className="text-gray-500 text-[10px] mt-0.5">初めての会話</div>
          </div>
        )}
      </div>

      {/* 思い出リスト */}
      <div className="space-y-2">
        {data.memories.map((ep, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 px-3 py-3 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors"
          >
            {/* 感情emoji */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/15 flex items-center justify-center text-lg mt-0.5">
              {getEmotionEmoji(ep.emotion)}
            </div>
            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 text-xs leading-relaxed break-words">{ep.summary}</p>
              <p className="text-gray-600 text-[10px] mt-1">{formatDate(ep.date)}</p>
            </div>
            {/* 重要度インジケーター */}
            {ep.importance >= 4 && (
              <div className="flex-shrink-0 text-yellow-400 text-xs mt-0.5" title={`重要度: ${ep.importance}`}>
                ⭐
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
