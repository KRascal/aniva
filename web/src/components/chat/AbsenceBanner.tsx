'use client';

interface PresenceInfo {
  isAvailable: boolean;
  status: string;
  statusEmoji: string;
  statusMessage?: string | null;
}

interface AbsenceBannerProps {
  presence: PresenceInfo | null;
  absenceBannerDismissed: boolean;
  characterName: string;
  onDismiss: () => void;
}

export function AbsenceBanner({ presence, absenceBannerDismissed, characterName, onDismiss }: AbsenceBannerProps) {
  if (!presence || presence.isAvailable || absenceBannerDismissed) return null;

  return (
    <div className="mx-4 mt-2 flex items-start gap-3 bg-gray-800/80 border border-gray-700/60 rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex-shrink-0 text-2xl mt-0.5">{presence.statusEmoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-300">
          {characterName}は今 <span className="text-yellow-400">{presence.status}</span>
        </p>
        {presence.statusMessage && (
          <p className="text-xs text-gray-500 mt-0.5 italic">「{presence.statusMessage}」</p>
        )}
        <p className="text-xs text-gray-600 mt-1">メッセージは届くよ。後で返事が来るかも 📩</p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-400 transition-colors"
        aria-label="閉じる"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
