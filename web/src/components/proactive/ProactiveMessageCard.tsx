'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
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

  const handleOpen = async () => {
    if (isOpening) return;
    setIsOpening(true);
    const chatUrl = await onRead(message.id);
    if (chatUrl) {
      router.push(chatUrl);
    } else {
      setIsOpening(false);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className={`
        relative cursor-pointer rounded-2xl border p-4 transition-all duration-200
        ${message.isRead
          ? 'border-white/10 bg-white/5 opacity-70'
          : 'border-purple-500/40 bg-gradient-to-br from-purple-900/40 to-pink-900/20 shadow-lg shadow-purple-500/10'
        }
        hover:scale-[1.02] active:scale-[0.98]
      `}
    >
      {/* 未読バッジ */}
      {!message.isRead && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500" />
        </span>
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
              className="rounded-full object-cover ring-2 ring-purple-500/50"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-800 flex items-center justify-center text-xl">
              💬
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-white text-sm">{message.characterName}</span>
            <CountdownTimer expiresAt={message.expiresAt} />
          </div>

          {/* メッセージ本文（未読は鮮明、既読はグレー） */}
          <p
            className={`text-sm leading-relaxed ${
              message.isRead ? 'text-gray-400' : 'text-gray-100'
            }`}
          >
            {message.content}
          </p>

          {!message.isRead && (
            <button
              disabled={isOpening}
              className="mt-2 text-xs text-purple-300 hover:text-purple-100 transition-colors"
            >
              {isOpening ? '開く中...' : '返信する →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
