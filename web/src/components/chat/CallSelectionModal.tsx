'use client';

import type { Character } from './ChatMessageList';

interface Props {
  show: boolean;
  character: Character | null;
  onClose: () => void;
  onShowCallToast: () => void;
}

export function CallSelectionModal({ show, character, onClose, onShowCallToast }: Props) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between"
      style={{
        background: 'linear-gradient(160deg, rgba(10,5,30,0.96) 0%, rgba(20,5,50,0.98) 50%, rgba(5,5,20,0.97) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingTop: 'calc(env(safe-area-inset-top) + 3rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
      }}
      onClick={onClose}
    >
      {/* 背景グロー */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-pink-600/10 blur-3xl" />
      </div>

      {/* 上部: アバター + 名前 */}
      <div className="flex flex-col items-center gap-4 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-125" />
          <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-purple-500/40 ring-offset-4 ring-offset-transparent shadow-2xl shadow-purple-900/60">
            {character?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-5xl">🏴‍☠️</div>
            )}
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold tracking-wide">{character?.name ?? 'キャラクター'}</h2>
          <p className="text-gray-400 text-sm mt-1">通話方法を選んでください</p>
        </div>
      </div>

      {/* 中部: 通話選択カード */}
      <div className="w-full max-w-sm px-5 space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onShowCallToast}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-base">音声通話</div>
            <div className="text-gray-400 text-sm mt-0.5">声を聴く</div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-700/80 text-gray-400 border border-gray-600/30 flex-shrink-0">近日公開</span>
        </button>

        <button
          onClick={onShowCallToast}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-white font-semibold text-base">ビデオ通話</div>
            <div className="text-gray-400 text-sm mt-0.5">顔を見る</div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-700/80 text-gray-400 border border-gray-600/30 flex-shrink-0">近日公開</span>
        </button>
      </div>

      {/* 下部: キャンセルボタン */}
      <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="px-10 py-3 rounded-full text-gray-400 hover:text-white text-sm transition-colors border border-white/10 hover:border-white/20 hover:bg-white/5"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
