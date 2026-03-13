'use client';

/**
 * Deep Reply 「考え中」バブル
 * キャラがじっくり考えている状態をアニメーションで表現
 */

interface DeepReplyBubbleProps {
  characterName: string;
  thinkingText: string;
  avatarUrl?: string | null;
}

export function DeepReplyBubble({ characterName, thinkingText, avatarUrl }: DeepReplyBubbleProps) {
  return (
    <div className="flex items-end gap-2 px-4 py-1 aniva-scroll-fade-in">
      {/* Character avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-700">
        {avatarUrl ? (
          <img src={avatarUrl} alt={characterName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
            {characterName.charAt(0)}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className="max-w-[75%]">
        <div
          className="relative rounded-2xl rounded-bl-sm px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          {/* Thinking text */}
          <p className="text-white/80 text-sm leading-relaxed mb-2">{thinkingText}</p>

          {/* Animated dots row */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="deep-dot" style={{ animationDelay: '0ms' }} />
              <span className="deep-dot" style={{ animationDelay: '200ms' }} />
              <span className="deep-dot" style={{ animationDelay: '400ms' }} />
            </div>
            <span className="text-purple-400/70 text-[10px] font-medium tracking-wide">じっくり考え中</span>
          </div>
        </div>

        {/* "Deep reply incoming" hint */}
        <p className="text-gray-600 text-[10px] mt-1 ml-1">
          {characterName}からの返事は少し時間がかかるかも
        </p>
      </div>

      <style>{`
        .deep-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.7);
          animation: deepPulse 1.2s ease-in-out infinite;
        }
        @keyframes deepPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
