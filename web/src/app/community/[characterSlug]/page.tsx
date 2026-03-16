'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Thread {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  viewCount: number;
  replyCount: number;
  lastReplyAt: string;
  createdAt: string;
  author: {
    nickname?: string;
    displayName?: string;
    avatarUrl?: string;
    image?: string;
    isCharacter?: boolean;
  };
}

interface CharacterInfo {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
}

const CATEGORIES = [
  { id: 'popular', label: '人気', highlight: true },
  { id: 'all', label: 'すべて' },
  { id: 'general', label: '雑談' },
  { id: 'discussion', label: '考察' },
  { id: 'fanart', label: 'ファンアート' },
  { id: 'question', label: '質問' },
  { id: 'event', label: 'イベント' },
];

export default function CommunityPage() {
  const { characterSlug } = useParams<{ characterSlug: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ category });
      if (category === 'popular') {
        params.set('category', 'all');
        params.set('sort', 'popular');
      }
      const res = await fetch(`/api/community/${characterSlug}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads);
        setCharacter(data.character);
      }
    } catch (e) {
      console.error('Failed to fetch threads:', e);
    } finally {
      setLoading(false);
    }
  }, [characterSlug, category]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      let finalContent = newContent;

      // 画像がある場合はアップロードしてcontentに埋め込む
      if (imageFile) {
        setImageUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', imageFile);
          const uploadRes = await fetch('/api/upload/image', { method: 'POST', body: formData });
          if (uploadRes.ok) {
            const { url } = await uploadRes.json() as { url: string };
            finalContent = `${newContent}\n\n[画像: ${url}]`;
          }
        } catch (e) {
          console.error('Image upload failed:', e);
        } finally {
          setImageUploading(false);
        }
      }

      const res = await fetch(`/api/community/${characterSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: finalContent, category: newCategory }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewContent('');
        setImageFile(null);
        setImagePreview(null);
        setShowNewThread(false);
        fetchThreads();
      }
    } catch (e) {
      console.error('Failed to create thread:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日前`;
    return `${Math.floor(days / 7)}週間前`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="text-white/60 hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {character && (
            <div className="flex items-center gap-2">
              {character.avatarUrl && (
                <img src={character.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div>
                <h1 className="text-base font-semibold">{character.name} ファン掲示板</h1>
                <p className="text-xs text-white/40">{threads.length}件のスレッド</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                category === cat.id
                  ? (cat as { highlight?: boolean }).highlight ? 'bg-purple-500 text-white font-medium' : 'bg-white text-black font-medium'
                  : (cat as { highlight?: boolean }).highlight ? 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <div className="divide-y divide-white/5">
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/community/${characterSlug}/${thread.id}`}
            className="block px-4 py-3 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {thread.isPinned && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                      固定
                    </span>
                  )}
                  <span className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded">
                    {CATEGORIES.find(c => c.id === thread.category)?.label || thread.category}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-white/90 line-clamp-1">{thread.title}</h3>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{thread.content}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                  <span className="flex items-center gap-1">
                    {thread.author?.isCharacter ? (
                      <span className="text-yellow-400/80">{thread.author.nickname}</span>
                    ) : (
                      <span>{thread.author?.nickname || thread.author?.displayName || '匿名'}</span>
                    )}
                  </span>
                  <span>{timeAgo(thread.createdAt)}</span>
                  <span>{thread.replyCount}件の返信</span>
                  <span>{thread.viewCount}回閲覧</span>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {threads.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-white/30 text-sm">まだスレッドがありません</p>
            <p className="text-white/20 text-xs mt-1">最初のスレッドを作成しましょう</p>
          </div>
        )}
      </div>

      {/* New Thread Button */}
      {session?.user && (
        <button
          onClick={() => setShowNewThread(true)}
          className="fixed bottom-20 right-4 w-12 h-12 bg-white text-black rounded-full shadow-lg flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowNewThread(false)}>
          <div className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">新しいスレッド</h2>
              <button onClick={() => setShowNewThread(false)} className="text-white/40 hover:text-white p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-1 mb-3 overflow-x-auto">
              {CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'popular').map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap ${
                    newCategory === cat.id
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="タイトル"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 mb-3"
            />

            <textarea
              placeholder="内容を入力..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              maxLength={5000}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none mb-4"
            />

            {/* 画像アップロード */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer text-white/50 hover:text-white/70 text-xs w-fit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                画像を添付
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
              {imagePreview && (
                <div className="mt-2 relative w-fit">
                  <img src={imagePreview} alt="preview" className="max-h-32 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!newTitle.trim() || !newContent.trim() || submitting || imageUploading}
              className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              {submitting || imageUploading ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
