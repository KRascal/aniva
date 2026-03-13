'use client';

import type { MemoryData } from '@/types/chat';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  characterName?: string;
  memoryData: MemoryData | null;
  memoryLoading: boolean;
}

export function MemoryPeekModal({ isOpen, onClose, characterName, memoryData, memoryLoading }: Props) {
  if (!isOpen) return null;
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
            <h3 className="font-bold text-white text-sm">{characterName ?? 'キャラ'}の記憶</h3>
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
                  {memoryData.episodeMemory.map((ep, i) => (
                    <div key={i} className="bg-gray-900/70 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{ep.emotion}</span>
                        <span className="text-gray-500 text-[10px]">
                          {new Date(ep.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-gray-200 text-xs leading-relaxed">{ep.summary}</p>
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
                        <span key={i} className="text-[10px] bg-green-900/30 border border-green-700/30 text-green-300 rounded-full px-2 py-0.5">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
                {memoryData.preferences.dislikes.length > 0 && (
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-400 mb-1.5">🔴 苦手</p>
                    <div className="flex flex-wrap gap-1">
                      {memoryData.preferences.dislikes.slice(0, 6).map((d, i) => (
                        <span key={i} className="text-[10px] bg-red-900/30 border border-red-700/30 text-red-300 rounded-full px-2 py-0.5">{d}</span>
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
