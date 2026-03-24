'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ChatDeliveryMeta {
  type: 'letter' | 'story_chapter' | 'event_scenario';
  referenceId: string;
  isDelivery: true;
}

interface Props {
  messageId: string;
  metadata: ChatDeliveryMeta;
  characterName?: string;
  characterId?: string;
  createdAt: string;
  /** 既読状態（外部から制御可能） */
  isRead?: boolean;
  /** 既読コールバック */
  onMarkRead?: (messageId: string) => Promise<void>;
}

/* ─── 手紙モーダル ─── */
interface LetterModalProps {
  letterId: string;
  characterName?: string;
  onClose: () => void;
}

function LetterModal({ letterId, characterName, onClose }: LetterModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch(`/api/letters/${letterId}`)
      .then((r) => r.json())
      .then((d) => setContent(d.letter?.content ?? d.content ?? null))
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [letterId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-950 border border-white/10 rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ハンドル */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💌</span>
          <h2 className="text-base font-bold text-white">
            {characterName ? `${characterName}からの手紙` : '手紙'}
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 rounded-full border border-amber-400 border-t-transparent animate-spin inline-block" />
          </div>
        ) : content ? (
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">内容を取得できませんでした</p>
        )}
        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-2xl bg-white/8 text-gray-400 text-sm hover:bg-white/12 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

/* ─── ChatDeliveryBubble ─── */
export function ChatDeliveryBubble({
  messageId,
  metadata,
  characterName,
  characterId,
  createdAt,
  isRead: initialIsRead = false,
  onMarkRead,
}: Props) {
  const router = useRouter();
  const [isRead, setIsRead] = useState(initialIsRead);
  const [showModal, setShowModal] = useState(false);

  const handleMarkRead = useCallback(async () => {
    if (!isRead) {
      setIsRead(true);
      await onMarkRead?.(messageId);
    }
  }, [isRead, messageId, onMarkRead]);

  const handleTap = useCallback(async () => {
    await handleMarkRead();

    if (metadata.type === 'letter') {
      setShowModal(true);
    } else if (metadata.type === 'story_chapter') {
      router.push(`/story/${characterId}/${metadata.referenceId}`);
    } else if (metadata.type === 'event_scenario') {
      router.push(`/scenario/${metadata.referenceId}`);
    }
  }, [metadata, characterId, router, handleMarkRead]);

  /* ─── スタイル ─── */
  const bubbleStyle = (() => {
    if (metadata.type === 'letter') {
      return isRead
        ? 'bg-gray-800/60 border-gray-600/30 text-gray-400'
        : 'bg-gradient-to-br from-amber-900/70 to-yellow-800/50 border-amber-500/40 text-amber-100';
    }
    if (metadata.type === 'story_chapter') {
      return isRead
        ? 'bg-gray-800/60 border-gray-600/30 text-gray-400'
        : 'bg-gradient-to-br from-purple-900/70 to-violet-800/50 border-purple-500/40 text-purple-100';
    }
    // event_scenario
    return isRead
      ? 'bg-gray-800/60 border-gray-600/30 text-gray-400'
      : 'bg-gradient-to-br from-indigo-900/70 to-blue-800/50 border-indigo-500/40 text-indigo-100';
  })();

  const iconAndText = (() => {
    if (metadata.type === 'letter') {
      return {
        icon: '💌',
        text: characterName ? `${characterName}からの手紙が届きました` : '手紙が届きました',
        cta: '開封する →',
      };
    }
    if (metadata.type === 'story_chapter') {
      return {
        icon: '📖',
        text: '新しいストーリーが解放されました',
        cta: '読む →',
      };
    }
    return {
      icon: '✨',
      text: '限定イベント開催中！',
      cta: '参加する →',
    };
  })();

  const time = new Date(createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="flex justify-start items-end gap-2 msg-animate">
        {/* スペーサー（アバター幅合わせ） */}
        <div className="w-8 flex-shrink-0" />

        <div className="max-w-[78%] flex flex-col gap-0.5 items-start">
          <button
            onClick={handleTap}
            className={`px-4 py-3 rounded-2xl rounded-tl-sm border text-left transition-all active:scale-[0.97] select-none shadow-sm ${bubbleStyle}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl flex-shrink-0">{iconAndText.icon}</span>
              <div>
                <p className="text-[13px] font-medium leading-snug">{iconAndText.text}</p>
                <p className={`text-[11px] mt-0.5 font-semibold ${isRead ? 'text-gray-500' : 'opacity-80'}`}>
                  {iconAndText.cta}
                </p>
              </div>
            </div>
            {!isRead && (
              <span className="inline-block mt-2 w-2 h-2 rounded-full bg-current opacity-70 animate-pulse" />
            )}
          </button>
          <span className="text-[10px] text-gray-600 px-1">{time}</span>
        </div>
      </div>

      {/* 手紙モーダル */}
      {showModal && metadata.type === 'letter' && (
        <LetterModal
          letterId={metadata.referenceId}
          characterName={characterName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
