'use client';

import type { DlContent } from '../profileTypes';

interface DlTabProps {
  dlContents: DlContent[];
  dlLoading: boolean;
  onFcClick: () => void;
}

export function DlTab({ dlContents, dlLoading, onFcClick }: DlTabProps) {
  return (
    <div className="space-y-4 pt-2 pb-24">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">
        限定ダウンロードコンテンツ
      </p>
      {dlLoading ? (
        <div className="text-center py-10 text-white/30 text-sm">読み込み中...</div>
      ) : dlContents.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-white/40 text-sm">ダウンロードコンテンツはまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {dlContents.map((item) => (
            <div
              key={item.id}
              className={`relative rounded-2xl overflow-hidden border ${
                item.locked
                  ? 'border-gray-700/50 bg-gray-900/60'
                  : 'border-purple-500/30 bg-gray-900/80'
              }`}
            >
              {/* サムネイル */}
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className={`w-full h-28 object-cover ${item.locked ? 'filter blur-sm opacity-50' : ''}`}
                />
              ) : (
                <div className={`w-full h-28 flex items-center justify-center ${item.locked ? 'opacity-30 bg-gray-800/30' : 'bg-gray-800/50'}`}>
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    {item.type === 'wallpaper' || item.type === 'special_art' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    ) : item.type === 'voice_clip' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5M12 3h.008v.008H12V3zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    )}
                  </svg>
                </div>
              )}

              {/* ロックオーバーレイ */}
              {item.locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-gray-300 text-xs font-semibold text-center px-2">FC加入で解放</span>
                </div>
              )}

              {/* 情報 */}
              <div className="p-3">
                <p className={`text-xs font-semibold truncate ${item.locked ? 'text-gray-500' : 'text-white'}`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 text-xs">{item.downloadCount.toLocaleString()}DL</span>
                  {!item.locked ? (
                    <a
                      href={`/api/content/${item.id}/download`}
                      className="inline-flex items-center gap-1 text-xs bg-purple-700/60 hover:bg-purple-700/80 text-purple-200 px-2.5 py-1 rounded-lg transition-colors border border-purple-600/30"
                    >
                      <span>↓</span>DL
                    </a>
                  ) : (
                    <button
                      onClick={onFcClick}
                      className="text-xs bg-gray-800/60 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-700/30"
                    >
                      FC限定
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
