'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Letter {
  id: string;
  letterId: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  };
  title: string;
  content: string;
  imageUrl: string | null;
  type: string;
  isFcOnly: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export default function LettersPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    fetch('/api/letters')
      .then(r => r.json())
      .then(d => setLetters(d.letters ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openLetter = async (letter: Letter) => {
    setOpening(true);
    // 封筒オープン演出（0.8秒）
    setTimeout(() => {
      setSelectedLetter(letter);
      setOpening(false);
    }, 800);

    // 既読にする
    if (!letter.isRead) {
      await fetch(`/api/letters/${letter.id}/read`, { method: 'POST' }).catch(() => {});
      setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, isRead: true } : l));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-white">💌 手紙</h1>
          {letters.filter(l => !l.isRead).length > 0 && (
            <span className="text-xs text-purple-400 font-medium bg-purple-500/15 px-2 py-0.5 rounded-full">
              {letters.filter(l => !l.isRead).length}通 未読
            </span>
          )}
        </div>
      </header>

      {/* 手紙リスト */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="aniva-shimmer w-10 h-10 rounded-full bg-gray-700" />
          </div>
        ) : letters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💌</p>
            <p className="text-gray-400 text-sm">まだ手紙はありません</p>
            <p className="text-gray-600 text-xs mt-1">FC会員になるとキャラクターから手紙が届きます</p>
          </div>
        ) : (
          letters.map(letter => (
            <button
              key={letter.id}
              onClick={() => openLetter(letter)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                letter.isRead
                  ? 'bg-gray-900/40 border-white/5'
                  : 'bg-gradient-to-r from-purple-900/20 to-pink-900/10 border-purple-500/20 shadow-lg shadow-purple-500/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* キャラアバター */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                  {letter.character.avatarUrl ? (
                    <Image src={letter.character.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      {letter.type === 'letter' ? '✉️' : '💬'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{letter.character.name}</span>
                    {!letter.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    )}
                    {letter.isFcOnly && (
                      <span className="text-[10px] text-yellow-400/70 font-medium">👑FC</span>
                    )}
                  </div>
                  <p className="text-gray-300 text-sm font-medium mt-0.5 truncate">{letter.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{letter.content.slice(0, 50)}...</p>
                </div>

                <span className="text-gray-600 text-[10px] flex-shrink-0">
                  {new Date(letter.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 封筒オープン演出 */}
      {opening && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="animate-bounce">
            <span className="text-7xl">✉️</span>
          </div>
        </div>
      )}

      {/* 手紙本文モーダル */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedLetter(null)} />
          <div className="relative w-full max-w-md bg-gradient-to-b from-amber-50 to-amber-100 rounded-3xl shadow-2xl overflow-hidden" style={{ maxHeight: '80vh' }}>
            {/* 便箋ヘッダー */}
            <div className="bg-gradient-to-r from-amber-200/50 to-orange-200/30 px-6 pt-6 pb-4 border-b border-amber-300/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
                    {selectedLetter.character.avatarUrl && (
                      <Image src={selectedLetter.character.avatarUrl} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    )}
                  </div>
                  <div>
                    <p className="text-amber-900 font-bold text-sm">{selectedLetter.character.name}より</p>
                    <p className="text-amber-700/60 text-[10px]">
                      {new Date(selectedLetter.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLetter(null)}
                  className="w-8 h-8 rounded-full bg-amber-900/10 flex items-center justify-center text-amber-800 hover:bg-amber-900/20 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 本文 */}
            <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <h2 className="text-amber-900 font-bold text-base mb-4">{selectedLetter.title}</h2>
              {selectedLetter.imageUrl && (
                <div className="rounded-2xl overflow-hidden mb-4">
                  <Image src={selectedLetter.imageUrl} alt="" width={400} height={300} className="w-full h-auto" unoptimized />
                </div>
              )}
              <div className="text-amber-800 text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {selectedLetter.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
