'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Letter {
  id: string;
  character: { name: string; avatarUrl: string | null; slug: string };
  monthKey: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function LettersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status !== 'authenticated') return;

    fetch('/api/letters')
      .then(r => r.json())
      .then(data => { setLetters(data.letters || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status, router]);

  const openLetter = async (letter: Letter) => {
    setSelectedLetter(letter);
    if (!letter.isRead) {
      await fetch(`/api/letters/${letter.id}/read`, { method: 'POST' });
      setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, isRead: true } : l));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-bold">💌 手紙</h1>
          <span className="text-gray-500 text-sm">FC会員限定</span>
        </div>

        {letters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">💌</p>
            <p className="text-gray-400">まだ手紙はありません</p>
            <p className="text-gray-600 text-sm mt-2">FC会員になると毎月キャラクターから届きます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map(letter => (
              <button
                key={letter.id}
                onClick={() => openLetter(letter)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  letter.isRead
                    ? 'bg-gray-900/50 border-white/5 hover:border-white/10'
                    : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {letter.character.avatarUrl ? (
                      <img src={letter.character.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-600 flex items-center justify-center text-lg">💜</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{letter.character.name}</span>
                      {!letter.isRead && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                    </div>
                    <p className="text-gray-500 text-xs">{letter.monthKey}の手紙</p>
                  </div>
                  <span className="text-gray-600 text-xs">{new Date(letter.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLetter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedLetter(null)}
        >
          <div
            className="mx-4 max-w-md w-full max-h-[80vh] overflow-y-auto bg-gradient-to-b from-amber-950/90 to-gray-950 border border-amber-500/20 rounded-3xl p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 border-2 border-amber-500/30">
                {selectedLetter.character.avatarUrl ? (
                  <img src={selectedLetter.character.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-600 flex items-center justify-center text-2xl">💜</div>
                )}
              </div>
              <h3 className="text-amber-200 font-semibold">{selectedLetter.character.name}からの手紙</h3>
              <p className="text-amber-500/60 text-xs mt-1">{selectedLetter.monthKey}</p>
            </div>

            <div className="text-amber-100/90 leading-relaxed whitespace-pre-wrap text-sm font-serif">
              {selectedLetter.content}
            </div>

            <button
              onClick={() => setSelectedLetter(null)}
              className="w-full mt-6 py-3 bg-amber-900/50 hover:bg-amber-900/70 text-amber-200 rounded-xl text-sm transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
