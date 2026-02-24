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
          <span className="text-lg">✨</span>
        </div>

        {/* Stats */}
        <div className="space-y-2 mb-5">
          {callMinutesRemaining !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">📞 通話残り（今月）</span>
              <span className="text-white font-semibold">{callMinutesRemaining}分</span>
            </div>
          )}
          {currentPeriodEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">🔄 次回更新</span>
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
          <span className="text-base leading-none">💬</span>
          <span>チャット無制限</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <span className="text-base leading-none">📞</span>
          <span>{fcIncludedCallMin}分/月通話込み</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <span className="text-base leading-none">⭐</span>
          <span>FC限定コンテンツ閲覧</span>
        </li>
        <li className="flex items-center gap-2.5 text-sm text-gray-200">
          <span className="text-base leading-none">🎁</span>
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
