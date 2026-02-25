'use client';

export interface FcMembershipSectionProps {
  characterId: string;
  characterName: string;
  isFanclub: boolean;
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  fcOverageCallCoinPerMin: number;
  callMinutesRemaining?: number;
  currentPeriodEnd?: string;
  onJoinFC: () => void;
  onCancel?: () => void;
}

export function FcMembershipSection({
  characterId: _characterId,
  characterName,
  isFanclub,
  fcMonthlyPriceJpy,
  fcIncludedCallMin,
  fcOverageCallCoinPerMin,
  callMinutesRemaining,
  currentPeriodEnd,
  onJoinFC,
  onCancel,
}: FcMembershipSectionProps) {
  if (isFanclub) {
    // ── 加入済み表示 ──
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-white font-bold text-base">FCメンバー</span>
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-5">
          {callMinutesRemaining !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                通話残り（今月）
              </span>
              <span className="text-white font-semibold">{callMinutesRemaining}分</span>
            </div>
          )}
          {currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                次回更新
              </span>
              <span className="text-white">{formatPeriodEnd(currentPeriodEnd)}</span>
            </div>
          )}
        </div>

        {/* Cancel button (subtle) */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl border border-gray-700 text-gray-500 text-xs hover:border-gray-600 hover:text-gray-400 transition-all active:scale-95"
          >
            解約する
          </button>
        )}
      </div>
    );
  }

  // ── 未加入表示 ──
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 overflow-hidden">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-white font-bold text-base mb-0.5">FCメンバーになる</h3>
        <p className="text-gray-400 text-xs">{characterName}のファンクラブ</p>
      </div>

      {/* Feature list */}
      <ul className="space-y-2.5 mb-5">
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span>チャット無制限</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <span>{fcIncludedCallMin}分/月通話込み</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <span>FC限定コンテンツ閲覧</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <span>超過通話がお得（{fcOverageCallCoinPerMin}コイン/分）</span>
        </li>
      </ul>

      {/* Price + CTA */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-2xl font-bold text-white">¥{fcMonthlyPriceJpy.toLocaleString()}</span>
          <span className="text-gray-400 text-sm">/月</span>
        </div>
      </div>

      {/* Join button with shimmer */}
      <button
        onClick={onJoinFC}
        className="relative w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm overflow-hidden hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95 group"
      >
        {/* Shimmer overlay */}
        <span
          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
        />
        <span className="relative">FCメンバーになる</span>
      </button>
    </div>
  );
}

/** ISO日付文字列を日本語表記に変換 */
function formatPeriodEnd(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}
