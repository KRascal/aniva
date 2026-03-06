'use client';

export function ExpiredMessageCard({ characterName }: { characterName: string }) {
  return (
    <div className="relative rounded-2xl border border-white/5 bg-white/[0.03] p-4 opacity-50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
          <span className="text-2xl grayscale">💔</span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-500">{characterName}</p>
          <p className="text-sm text-gray-600 italic">
            読めなかった…
          </p>
          <p className="text-xs text-gray-700 mt-0.5">
            このメッセージは消えてしまいました
          </p>
        </div>
      </div>
    </div>
  );
}
