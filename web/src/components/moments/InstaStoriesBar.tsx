'use client';

import { useState, useEffect } from 'react';

export interface StoryItem {
  slug: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  activity: string;
  chatPrompt: string;
  franchise: string;
  timeAgo: string;
}

export function InstaStoriesBar({ onOpenStory, activeTab, stories }: { onOpenStory: (index: number) => void; activeTab: 'recommend' | 'following'; stories: StoryItem[] }) {
  const [viewedSlugs, setViewedSlugs] = useState<Set<string>>(new Set());
  const [followingSlugs, setFollowingSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    // Load viewed state
    try {
      const v = JSON.parse(localStorage.getItem('aniva_stories_viewed') || '[]');
      setViewedSlugs(new Set(v));
    } catch { /* ignore */ }

    // フォロー中キャラのslug取得
    fetch('/api/characters?followingOnly=true')
      .then((r) => r.json())
      .then((data) => {
        const chars = data.characters ?? [];
        const slugs = new Set<string>(chars.map((c: { slug: string }) => c.slug));
        setFollowingSlugs(slugs);
      })
      .catch(() => setFollowingSlugs(new Set()));
  }, []);

  // タブに応じてストーリーズをフィルタリング
  // フォロー中タブ: followingSlugsがロード完了するまで空表示、ロード後はフォロー中キャラのみ
  const visibleStories = activeTab === 'following'
    ? (followingSlugs === null ? [] : stories.filter((s) => followingSlugs.has(s.slug)))
    : stories;

  return (
    <div className="bg-gray-950 border-b border-white/5 overflow-hidden max-w-lg mx-auto">
      <div className="flex gap-3 overflow-x-auto py-3 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {visibleStories.length === 0 && activeTab === 'following' ? (
          <div className="text-white/30 text-xs py-2 px-2">フォロー中のキャラのストーリーがここに表示されます</div>
        ) : visibleStories.map((story, i) => {
          const avatar = story.avatarUrl;
          const viewed = viewedSlugs.has(story.slug);
          // StoryViewerはstories全体を受け取るので元のindexを渡す
          const originalIndex = stories.findIndex((s) => s.slug === story.slug);
          return (
            <button
              key={story.slug}
              onClick={() => {
                onOpenStory(originalIndex);
                // Mark as viewed
                setViewedSlugs((prev) => {
                  const next = new Set(prev);
                  next.add(story.slug);
                  try { localStorage.setItem('aniva_stories_viewed', JSON.stringify([...next])); } catch {}
                  return next;
                });
              }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className={`relative p-[3px] rounded-full transition-all ${
                viewed
                  ? 'bg-gray-600/50'
                  : 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500'
              }`}>
                <div className="bg-gray-950 rounded-full p-[2px]">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={story.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                        {story.name[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] text-center w-16 truncate ${viewed ? 'text-white/40' : 'text-white/80'}`}>{story.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
