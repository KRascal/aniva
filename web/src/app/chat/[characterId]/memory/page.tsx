'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface MemoryItem {
  id: string;
  content: string;
  summary: string | null;
  category: string;
  importance: number;
  emotionalValence: number;
  createdAt: string;
}

const categoryLabels: Record<string, { label: string; color: string; icon: string }> = {
  conversation: { label: '会話', color: 'text-blue-400 bg-blue-500/15', icon: '💬' },
  preference: { label: '好み', color: 'text-pink-400 bg-pink-500/15', icon: '❤️' },
  fact: { label: '事実', color: 'text-green-400 bg-green-500/15', icon: '📝' },
  emotion: { label: '感情', color: 'text-purple-400 bg-purple-500/15', icon: '🎭' },
  event: { label: 'イベント', color: 'text-amber-400 bg-amber-500/15', icon: '🎉' },
};

export default function MemoryPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [characterName, setCharacterName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chat/${characterId}/memory`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setMemories(data.memories ?? []);
        setCharacterName(data.characterName ?? '');
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [characterId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getImportanceBar = (importance: number) => {
    const pct = Math.round(importance * 100);
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-white/8">
        <div className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold">記憶</h1>
            <p className="text-xs text-gray-500">{characterName}が覚えていること</p>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-gray-500 text-sm">まだ記憶がありません</p>
            <p className="text-gray-600 text-xs">会話を重ねると{characterName}が覚えていきます</p>
          </div>
        ) : (
          memories.map((mem) => {
            const cat = categoryLabels[mem.category] ?? categoryLabels.conversation;
            return (
              <div
                key={mem.id}
                className="bg-gray-900/60 border border-white/6 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] text-gray-500">{formatDate(mem.createdAt)}</span>
                  </div>
                  {getImportanceBar(mem.importance)}
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {mem.summary ?? mem.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
