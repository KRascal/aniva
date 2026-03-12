'use client';

import React from 'react';
import type { Character } from '@/components/chat/ChatMessageList';
import type { MemoryData, RelationshipInfo } from '@/app/chat/[characterId]/chat-constants';

/* ─────────────── 記憶ペークモーダル ─────────────── */
export function MemoryPeekModal({
  character,
  memoryData,
  memoryLoading,
  onClose,
}: {
  character: Character | null;
  memoryData: MemoryData | null;
  memoryLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-950 border-t border-purple-500/20 rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h3 className="font-bold text-white text-sm">
              {character?.name ?? 'キャラ'}の記憶
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs p-1">✕</button>
        </div>

        {memoryLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : !memoryData || (memoryData.factMemory.length === 0 && memoryData.episodeMemory.length === 0) ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">💭</p>
            <p className="text-gray-400 text-xs">まだ記憶がありません</p>
            <p className="text-gray-600 text-xs mt-1">会話を重ねると覚えてくれます</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-900 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{memoryData.totalMessages}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">通話メッセージ</p>
              </div>
              {memoryData.firstMessageAt && (
                <div className="flex-1 bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-pink-400">
                    {new Date(memoryData.firstMessageAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  </p>
                  <p className="text-gray-500 text-[10px] mt-0.5">初めて話した日</p>
                </div>
              )}
            </div>

            {memoryData.factMemory.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                  <span>📌</span> あなたのこと
                </p>
                <div className="space-y-1.5">
                  {memoryData.factMemory.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-900/70 rounded-lg px-3 py-2">
                      <span className="text-purple-400 mt-0.5 text-xs">•</span>
                      <span className="text-gray-200 text-xs leading-relaxed flex-1">{f.fact}</span>
                      <span className="text-gray-600 text-[10px] flex-shrink-0 mt-0.5">{Math.round(f.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {memoryData.episodeMemory.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-pink-400 mb-2 flex items-center gap-1">
                  <span>✨</span> 大切な思い出
                </p>
                <div className="space-y-1.5">
                  {memoryData.episodeMemory.map((e, i) => (
                    <div key={i} className="bg-gray-900/70 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{e.emotion}</span>
                        <span className="text-gray-500 text-[10px]">
                          {new Date(e.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-gray-200 text-xs leading-relaxed">{e.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(memoryData.preferences.likes.length > 0 || memoryData.preferences.dislikes.length > 0) && (
              <div className="flex gap-2">
                {memoryData.preferences.likes.length > 0 && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-400 mb-1.5">💚 好き</p>
                    <div className="flex flex-wrap gap-1">
                      {memoryData.preferences.likes.slice(0, 6).map((l, i) => (
                        <span key={i} className="text-[10px] bg-green-900/30 border border-green-700/30 text-green-300 rounded-full px-2 py-0.5">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {memoryData.preferences.dislikes.length > 0 && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-400 mb-1.5">🔴 苦手</p>
                    <div className="flex flex-wrap gap-1">
                      {memoryData.preferences.dislikes.slice(0, 6).map((d, i) => (
                        <span key={i} className="text-[10px] bg-red-900/30 border border-red-700/30 text-red-300 rounded-full px-2 py-0.5">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── 通話選択モーダル ─────────────── */
export function CallSelectModal({
  character,
  onClose,
  onCallToast,
}: {
  character: Character | null;
  onClose: () => void;
  onCallToast: () => void;
}) {
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-pink-600/10 blur-3xl" />
      </div>

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

      <div className="w-full max-w-sm px-5 space-y-3 relative z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onCallToast}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
          }}
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
          onClick={onCallToast}
          className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98] group"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
          }}
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

/* ─────────────── FC加入完了お祝いモーダル ─────────────── */
export function FcSuccessModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-gradient-to-b from-[#1a0a2e] to-[#0d0d1a] border border-yellow-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-2 animate-bounce">🎉</div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {['✨','⭐','💫','🌟','✨'].map((s, i) => (
            <span key={i} className="absolute text-xl animate-ping opacity-70"
              style={{ top: `${15 + i * 16}%`, left: `${10 + i * 18}%`, animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}>
              {s}
            </span>
          ))}
        </div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">FC加入完了！</h2>
        <p className="text-white/80 text-sm mb-1">
          {character.name}のファンクラブへようこそ💖
        </p>
        <p className="text-white/60 text-xs mb-6">
          チャット無制限・月{character.fcMonthlyCoins ?? 500}コイン・特典コンテンツが解放されました
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-base hover:opacity-90 transition"
        >
          {character.name}と話す ▶
        </button>
      </div>
    </div>
  );
}

/* ─────────────── コンテキストメニュー ─────────────── */
export function MessageContextMenu({
  ctxMenu,
  onCopy,
  onBookmark,
  onShare,
  onClose,
}: {
  ctxMenu: { msgId: string; content: string };
  onCopy: (content: string) => void;
  onBookmark: (msgId: string, content: string) => void;
  onShare: (content: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-white/10 rounded-2xl shadow-2xl p-1 min-w-[160px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onCopy(ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">📋</span>
          <span>コピー</span>
        </button>
        <button
          onClick={() => onBookmark(ctxMenu.msgId, ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">🔖</span>
          <span>ブックマーク</span>
        </button>
        <button
          onClick={() => onShare(ctxMenu.content)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-white text-sm text-left"
        >
          <span className="text-lg">🔗</span>
          <span>シェア</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors text-gray-400 text-sm text-left"
        >
          <span className="text-lg">✕</span>
          <span>閉じる</span>
        </button>
      </div>
    </div>
  );
}
