'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface BookmarkedMessage {
  id: string;
  characterId: string;
  characterName: string;
  avatarUrl: string | null;
  content: string;
  savedAt: number;
}

export default function BookmarkSection() {
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [showAllBookmarks, setShowAllBookmarks] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aniva_bookmarks');
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const removeBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    try { localStorage.setItem('aniva_bookmarks', JSON.stringify(updated)); } catch {}
  };

  if (bookmarks.length === 0) return null;

  return (
    <section className="bg-gray-900/80 border border-white/8 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">🔖 お気に入りメッセージ</h3>
        <span className="text-xs text-purple-400">{bookmarks.length}件</span>
      </div>
      <div className="flex flex-col gap-2">
        {(showAllBookmarks ? bookmarks : bookmarks.slice(0, 3)).map(b => (
          <div key={b.id} className="flex items-start gap-2 bg-gray-800/60 rounded-xl px-3 py-2.5 group">
            {b.avatarUrl ? (
              <Image src={b.avatarUrl} alt={b.characterName} width={28} height={28} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" unoptimized />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                🏴
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-400 font-medium mb-0.5">{b.characterName}</p>
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{b.content}</p>
            </div>
            <button
              onClick={() => removeBookmark(b.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 text-sm flex-shrink-0 mt-0.5"
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {bookmarks.length > 3 && (
        <button
          onClick={() => setShowAllBookmarks(v => !v)}
          className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showAllBookmarks ? '折りたたむ ▲' : `さらに${bookmarks.length - 3}件表示 ▼`}
        </button>
      )}
    </section>
  );
}
