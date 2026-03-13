'use client';

import { useEffect, useState } from 'react';

interface FcContentItem {
  id: string;
  kind: 'secret' | 'moment';
  type: string;
  title: string | null;
  content: string | null;
  unlockLevel: number | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  conversation_topic: { label: '秘密の話題', color: 'text-purple-400 bg-purple-500/10' },
  backstory: { label: '裏エピソード', color: 'text-blue-400 bg-blue-500/10' },
  special_message: { label: '特別メッセージ', color: 'text-pink-400 bg-pink-500/10' },
  premium_post: { label: '限定投稿', color: 'text-yellow-400 bg-yellow-500/10' },
};

export function FcContentList({ characterId }: { characterId: string }) {
  const [items, setItems] = useState<FcContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/fc/content?characterId=${characterId}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
          setUserLevel(data.userLevel ?? 1);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [characterId]);

  if (loading) {
    return <div className="text-center py-10 text-white/30 text-sm">読み込み中...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/40 text-sm">まだFC限定コンテンツがありません</p>
        <p className="text-white/25 text-xs mt-1">関係レベルを上げると新しいコンテンツが解放されます</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">
        FC限定コンテンツ
        <span className="ml-2 text-white/20 normal-case">Lv.{userLevel}</span>
      </p>
      <div className="space-y-3">
        {items.map((item) => {
          const typeConfig = TYPE_LABELS[item.type] ?? { label: item.type, color: 'text-gray-400 bg-gray-500/10' };
          return (
            <div key={item.id} className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
                {item.unlockLevel && (
                  <span className="text-[10px] text-white/20">Lv.{item.unlockLevel}+</span>
                )}
                <span className="text-[10px] text-white/20 ml-auto">
                  {new Date(item.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {item.title && (
                <p className="text-white font-medium text-sm mb-1">{item.title}</p>
              )}
              {item.content && (
                <p className="text-white/70 text-sm leading-relaxed">{item.content}</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
