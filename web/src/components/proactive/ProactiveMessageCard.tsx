'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { CountdownTimer } from './CountdownTimer';

interface ProactiveMessageCardProps {
  message: {
    id: string;
    characterName: string;
    characterAvatarUrl: string | null;
    characterSlug: string;
    content: string;
    expiresAt: string;
    isRead: boolean;
  };
  onRead: (id: string) => Promise<string | null>;
}

export function ProactiveMessageCard({ message, onRead }: ProactiveMessageCardProps) {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isCrumbling, setIsCrumbling] = useState(false);

  useEffect(() => {
    const check = () => {
      const diff = new Date(message.expiresAt).getTime() - Date.now();
      const urgent = diff < 60 * 60 * 1000 && diff > 0; // 残り1時間未満
      const expired = diff <= 0;

      setIsUrgent(urgent);

      if (expired && !isExpired) {
        // 消滅シーケンス: まずcrumbleアニメーション→フェード→expired状態
        setIsCrumbling(true);
        setTimeout(() => {
          setIsExpired(true);
          setIsCrumbling(false);
        }, 1200); // crumbleアニメーション完了後に切り替え
      }
    };

    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [message.expiresAt, isExpired]);

  const handleOpen = async () => {
    if (isOpening || isExpired) return;
    setIsOpening(true);
    const chatUrl = await onRead(message.id);
    if (chatUrl) {
      router.push(chatUrl);
    } else {
      setIsOpening(false);
    }
  };

  // 消滅済み表示
  if (isExpired) {
    return (
      <div className="relative rounded-2xl border border-white/5 bg-white/[0.03] p-4 opacity-50 animate-[fadeIn_0.5s_ease-in]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-2xl grayscale">💔</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500">{message.characterName}</p>
            <p className="text-sm text-gray-500 italic">
              {message.characterName}からのメッセージを読めませんでした…
            </p>
            <p className="text-xs text-gray-700 mt-0.5">
              このメッセージは消えてしまいました
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 砂のように崩れるアニメーション中
  if (isCrumbling) {
    return (
      <div className="relative rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-gray-900/60 p-4 animate-[crumble_1.2s_ease-in_forwards] overflow-hidden">
        <div className="flex items-start gap-3 opacity-60">
          <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⌛</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-300 text-sm">{message.characterName}</p>
            <p className="text-sm text-gray-400 mt-1">{message.content}</p>
          </div>
        </div>
        {/* 砂粒エフェクト */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-red-400/60 animate-[sandfall_1.2s_ease-in_forwards]"
              style={{
                left: `${8 + i * 7}%`,
                top: `${10 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleOpen}
      className={`
        relative cursor-pointer rounded-2xl border p-4 transition-all duration-200
        ${isUrgent
          ? 'border-red-500/60 bg-gradient-to-br from-red-950/50 to-orange-950/30 shadow-lg shadow-red-500/20 animate-[urgentPulse_2s_ease-in-out_infinite]'
          : message.isRead
            ? 'border-white/10 bg-white/5 opacity-70'
            : 'border-purple-500/40 bg-gradient-to-br from-purple-900/40 to-pink-900/20 shadow-lg shadow-purple-500/10'
        }
        hover:scale-[1.02] active:scale-[0.98]
      `}
    >
      {/* 未読バッジ */}
      {!message.isRead && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isUrgent ? 'bg-red-400' : 'bg-pink-400'} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-4 w-4 ${isUrgent ? 'bg-red-500' : 'bg-pink-500'}`} />
        </span>
      )}

      {/* 緊急警告バナー（残り1時間未満） */}
      {isUrgent && (
        <div className="absolute -top-2 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-red-500/50">
          ⚠️ もうすぐ消える…
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* アバター */}
        <div className="relative flex-shrink-0">
          {message.characterAvatarUrl ? (
            <Image
              src={message.characterAvatarUrl}
              alt={message.characterName}
              width={48}
              height={48}
              className={`rounded-full object-cover ring-2 ${isUrgent ? 'ring-red-500/70' : 'ring-purple-500/50'}`}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${isUrgent ? 'bg-red-900' : 'bg-purple-800'}`}>
              💬
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-bold text-sm ${isUrgent ? 'text-red-200' : 'text-white'}`}>{message.characterName}</span>
            <CountdownTimer expiresAt={message.expiresAt} />
          </div>

          {/* メッセージ本文（未読は鮮明、既読はグレー） */}
          <p
            className={`text-sm leading-relaxed ${
              message.isRead ? 'text-gray-400' : isUrgent ? 'text-orange-100' : 'text-gray-100'
            }`}
          >
            {message.content}
          </p>

          {!message.isRead && (
            <button
              disabled={isOpening}
              className={`mt-2 text-xs transition-colors ${isUrgent ? 'text-red-300 hover:text-red-100' : 'text-purple-300 hover:text-purple-100'}`}
            >
              {isOpening ? '開く中...' : '返信する →'}
            </button>
          )}
        </div>
      </div>

      {/* アニメーション定義 */}
      <style>{`
        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        @keyframes crumble {
          0%   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          40%  { opacity: 0.7; transform: translateY(4px) scale(0.98); filter: blur(1px); }
          70%  { opacity: 0.4; transform: translateY(10px) scale(0.94); filter: blur(3px); }
          100% { opacity: 0; transform: translateY(20px) scale(0.9); filter: blur(6px); }
        }
        @keyframes sandfall {
          0%   { opacity: 0.8; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(40px) rotate(${Math.random() > 0.5 ? '' : '-'}${Math.floor(Math.random() * 30 + 10)}deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 0.5; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
