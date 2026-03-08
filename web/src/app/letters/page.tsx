'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMissionTrigger } from '@/hooks/useMissionTrigger';

interface Letter {
  id: string;
  character: { name: string; avatarUrl: string | null; slug: string };
  monthKey: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// パーソナライズされた要素をハイライトする（ユーザー名など）
function highlightPersonalized(content: string, userName: string | undefined): React.ReactNode[] {
  if (!userName) return [content];
  // ユーザー名が手紙に含まれていたらハイライト
  const parts = content.split(new RegExp(`(${userName})`, 'g'));
  return parts.map((part, i) =>
    part === userName ? (
      <span key={i} className="text-amber-300 font-semibold underline decoration-dotted">
        {part}
      </span>
    ) : (
      part
    )
  );
}

// 封筒アニメーション付きモーダル
function LetterModal({
  letter,
  userName,
  onClose,
}: {
  letter: Letter;
  userName: string | undefined;
  onClose: () => void;
}) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);

  // マウント時に封筒→開封アニメーション
  useEffect(() => {
    const t = setTimeout(() => setOpened(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleReply = () => {
    onClose();
    router.push(`/chat/${letter.character.slug}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* 封筒 → 手紙への変形アニメーション */}
        <div
          className={`transition-all duration-500 ease-out ${
            opened ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          {/* 手紙カード */}
          <div className="bg-gradient-to-b from-amber-50/10 via-amber-950/90 to-gray-950 border border-amber-500/25 rounded-3xl overflow-hidden shadow-2xl shadow-amber-900/30">
            {/* ヘッダー（封筒フラップ風） */}
            <div className="relative bg-gradient-to-b from-amber-900/60 to-amber-950/80 px-8 pt-8 pb-6 border-b border-amber-500/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400/40 shadow-lg flex-shrink-0">
                  {letter.character.avatarUrl ? (
                    <img
                      src={letter.character.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-700 flex items-center justify-center text-2xl">
                      💜
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-amber-400/70 text-xs tracking-widest uppercase mb-0.5">
                    Special Letter ✉️
                  </p>
                  <h3 className="text-amber-100 font-bold text-lg leading-tight">
                    {letter.character.name}
                  </h3>
                  <p className="text-amber-500/60 text-xs mt-0.5">{letter.monthKey}</p>
                </div>
                <button
                  onClick={onClose}
                  className="ml-auto text-amber-500/60 hover:text-amber-300 transition-colors p-1"
                  aria-label="閉じる"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 手紙本文（手書き風フォント・スクロール可能） */}
            <div className="px-8 py-6 max-h-[50vh] overflow-y-auto">
              <div
                className="text-amber-100/90 leading-relaxed whitespace-pre-wrap text-sm"
                style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", serif', lineHeight: '2' }}
              >
                {highlightPersonalized(letter.content, userName)}
              </div>
            </div>

            {/* フッター */}
            <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
              {/* 返事を書くボタン */}
              <button
                onClick={handleReply}
                className="w-full py-3.5 bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
              >
                <span>✍️</span>
                <span>{letter.character.name}に返事を書く</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300/80 rounded-xl text-sm transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LettersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ミッション「レターをチェック」自動完了
  useMissionTrigger('letter_check');

  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const userName = (session?.user as { displayName?: string } | null | undefined)?.displayName;

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/letters').then(r => r.json()),
      fetch('/api/letters/unread-count').then(r => r.json()).catch(() => ({ count: 0 })),
    ]).then(([lettersData, unreadData]) => {
      setLetters(lettersData.letters || []);
      setUnreadCount(unreadData.count ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status, router]);

  const openLetter = async (letter: Letter) => {
    setSelectedLetter(letter);
    if (!letter.isRead) {
      await fetch(`/api/letters/${letter.id}/read`, { method: 'POST' });
      setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, isRead: true } : l));
      setUnreadCount(prev => Math.max(0, prev - 1));
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
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-xl font-bold">💌 手紙</h1>
            {/* 未読バッジ */}
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full shadow-lg shadow-purple-900/50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-gray-500 text-sm">FC会員限定</span>
        </div>

        {/* レター一覧 */}
        {letters.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-7xl mb-4 animate-bounce">💌</p>
            <p className="text-gray-300 font-medium">推しからの手紙はまだ届いていません</p>
            <p className="text-gray-500 text-xs mt-1">キャラとの絆を深めると、毎月特別な手紙が届くよ</p>
            <p className="text-gray-600 text-sm mt-2">FC会員になると毎月キャラクターから届きます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map(letter => (
              <button
                key={letter.id}
                onClick={() => openLetter(letter)}
                className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                  letter.isRead
                    ? 'bg-gray-900/50 border-white/5 hover:border-white/15 hover:bg-gray-900/70'
                    : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/60 shadow-md shadow-purple-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* アバター */}
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                    {letter.character.avatarUrl ? (
                      <img src={letter.character.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-purple-700 flex items-center justify-center text-lg">💜</div>
                    )}
                  </div>

                  {/* テキスト情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{letter.character.name}</span>
                      {!letter.isRead && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {letter.monthKey}の手紙 · {letter.content.slice(0, 25).trim()}…
                    </p>
                  </div>

                  {/* 日付 */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-gray-600 text-xs">
                      {new Date(letter.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                    <div className="text-amber-500/60 text-lg mt-0.5">✉️</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* レター詳細モーダル */}
      {selectedLetter && (
        <LetterModal
          letter={selectedLetter}
          userName={userName}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </div>
  );
}
