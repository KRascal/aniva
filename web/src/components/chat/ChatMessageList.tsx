'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

/* ─────────────── 型定義（page.tsxから移動・export） ─────────────── */
export interface Message {
  id: string;
  role: 'USER' | 'CHARACTER' | 'SYSTEM';
  content: string;
  metadata?: { emotion?: string; isSystemHint?: boolean; isFarewell?: boolean; isCliffhanger?: boolean; imageUrl?: string; stickerUrl?: string; isStreaming?: boolean };
  createdAt: string;
  audioUrl?: string | null;
}

export interface Character {
  id: string;
  name: string;
  nameEn: string;
  franchise: string;
  avatarUrl: string | null;
  slug?: string;
  voiceModelId?: string | null;
  fcMonthlyPriceJpy?: number;
  fcIncludedCallMin?: number;
  fcMonthlyCoins?: number;
}

/* ─────────────── リアクション設定 ─────────────── */
const REACTION_EMOJIS = ['❤️', '😂', '😢', '🔥', '👏'] as const;
type ReactionEmoji = typeof REACTION_EMOJIS[number];

/* ─────────────── 感情ユーティリティ ─────────────── */
const EMOTION_EMOJI: Record<string, string> = {
  excited: '🔥',
  happy: '😄',
  angry: '😤',
  sad: '😢',
  hungry: '🍖',
  neutral: '',
  surprised: '😲',
  love: '💕',
  shy: '😳',
  proud: '✨',
  teasing: '😏',
  lonely: '🌙',
  anxious: '💦',
  motivated: '🔥',
};

const EMOTION_BUBBLE_STYLE: Record<string, string> = {
  excited:   'bg-gradient-to-br from-orange-800/80 to-red-800/70 border border-orange-500/30 text-orange-50',
  happy:     'bg-gradient-to-br from-yellow-800/80 to-amber-800/70 border border-yellow-500/20 text-yellow-50',
  angry:     'bg-gradient-to-br from-red-900/80 to-rose-800/70 border border-red-500/30 text-red-50',
  sad:       'bg-gradient-to-br from-blue-900/80 to-indigo-900/70 border border-blue-500/20 text-blue-50',
  hungry:    'bg-gradient-to-br from-orange-900/80 to-yellow-800/70 border border-orange-500/40 text-orange-50',
  surprised: 'bg-gradient-to-br from-cyan-900/80 to-teal-800/70 border border-cyan-600/40 text-cyan-50',
  love:      'bg-gradient-to-br from-pink-800/80 to-rose-700/70 border border-pink-500/30 text-pink-50',
  shy:       'bg-gradient-to-br from-rose-900/80 to-pink-800/70 border border-pink-500/30 text-rose-50',
  proud:     'bg-gradient-to-br from-amber-800/80 to-yellow-700/70 border border-amber-500/40 text-amber-50',
  teasing:   'bg-gradient-to-br from-violet-800/80 to-purple-800/70 border border-violet-500/40 text-violet-50',
  lonely:    'bg-gradient-to-br from-purple-900/80 to-indigo-800/70 border border-purple-500/30 text-purple-50',
  anxious:   'bg-gradient-to-br from-gray-700/80 to-slate-700/70 border border-gray-500/30 text-gray-100',
  motivated: 'bg-gradient-to-br from-orange-800/80 to-amber-700/70 border border-orange-500/30 text-orange-50',
  neutral:   'bg-gray-800/90 text-gray-100 border border-gray-600/30 shadow-md',
};

/* 感情ステータスバー設定 */
const EMOTION_STATUS_BAR: Record<string, { emoji: string; text: string; gradient: string; textColor: string }> = {
  angry:     { emoji: '🔥', text: '怒ってる…',      gradient: 'from-red-800/50 to-red-600/30',      textColor: 'text-red-300' },
  shy:       { emoji: '💕', text: '照れてる…',       gradient: 'from-pink-800/50 to-pink-600/30',    textColor: 'text-pink-300' },
  sad:       { emoji: '💧', text: '悲しんでる…',     gradient: 'from-blue-800/50 to-blue-600/30',    textColor: 'text-blue-300' },
  excited:   { emoji: '⚡', text: 'テンション高い！', gradient: 'from-orange-800/50 to-orange-600/30', textColor: 'text-orange-300' },
  happy:     { emoji: '✨', text: '嬉しそう！',       gradient: 'from-yellow-800/50 to-yellow-600/30', textColor: 'text-yellow-300' },
  lonely:    { emoji: '🌙', text: '寂しそう…',       gradient: 'from-purple-800/50 to-purple-600/30', textColor: 'text-purple-300' },
  anxious:   { emoji: '💦', text: '焦ってる…',       gradient: 'from-gray-700/50 to-gray-500/30',    textColor: 'text-gray-300' },
  motivated: { emoji: '🔥', text: 'やる気満々！',    gradient: 'from-orange-800/50 to-amber-600/30', textColor: 'text-amber-300' },
  love:      { emoji: '💕', text: 'ときめいてる…',   gradient: 'from-pink-800/50 to-rose-600/30',    textColor: 'text-pink-300' },
  proud:     { emoji: '✨', text: '誇らしそう！',     gradient: 'from-amber-800/50 to-yellow-600/30', textColor: 'text-amber-300' },
};

/* 感情変化トランジションクラス */
function getEmotionTransitionClass(prevEmotion: string | undefined, currEmotion: string | undefined): string {
  if (!currEmotion || currEmotion === 'neutral' || prevEmotion === currEmotion) return '';
  if (currEmotion === 'angry') return 'emotion-transition-angry';
  if (currEmotion === 'shy' || currEmotion === 'love') return 'emotion-transition-shy';
  if (currEmotion === 'sad' || currEmotion === 'lonely') return 'emotion-transition-sad';
  return '';
}

function getCharacterBubbleStyle(emotion?: string): string {
  if (!emotion) return EMOTION_BUBBLE_STYLE.neutral;
  return EMOTION_BUBBLE_STYLE[emotion] || EMOTION_BUBBLE_STYLE.neutral;
}

function getEmotionEmoji(emotion?: string): string {
  if (!emotion) return '';
  return EMOTION_EMOJI[emotion] || '';
}

/* ─────────────── ミニ音声プレーヤー ─────────────── */
const WAVE_HEIGHTS = [40, 70, 55, 85, 45, 60, 80, 50, 65, 35];

function MiniAudioPlayer({ audioUrl, messageId, playingId, onToggle }: {
  audioUrl: string;
  messageId: string;
  playingId: string | null;
  onToggle: (id: string, url: string) => void;
}) {
  const isPlaying = playingId === messageId;
  return (
    <button
      onClick={() => onToggle(messageId, audioUrl)}
      className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium transition-all select-none ${
        isPlaying
          ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50'
          : 'bg-white/10 text-gray-300 border border-white/15 hover:bg-white/15 hover:text-white'
      }`}
      aria-label={isPlaying ? '停止' : '音声を再生'}
    >
      {isPlaying ? (
        <>
          <svg className="w-3.5 h-3.5 fill-current text-purple-400 flex-shrink-0" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          <span className="flex items-center gap-0.5 h-4">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="wave-bar bg-gradient-to-t from-purple-500 to-pink-400"
                style={{
                  height: `${h}%`,
                  maxHeight: 14,
                  minHeight: 3,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </span>
          <span className="text-purple-300">停止</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span className="flex items-center gap-0.5 h-4 opacity-50">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="inline-block w-[3px] rounded-full bg-gray-400"
                style={{ height: `${Math.max(h * 0.5, 20)}%`, maxHeight: 14, minHeight: 2 }}
              />
            ))}
          </span>
          <span>音声を再生</span>
        </>
      )}
    </button>
  );
}

/* ─────────────── Props ─────────────── */
export interface ChatMessageListProps {
  messages: Message[];
  character: Character | null;
  isSending: boolean;
  lastEmotionMsgId: string | null;
  playingAudioId: string | null;
  hungryEmojis: { id: number; x: number; delay: number }[];
  showStars: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onAudioToggle: (messageId: string, audioUrl: string) => void;
  onMsgLongPressStart: (msgId: string, content: string) => void;
  onMsgLongPressEnd: () => void;
  onCtxMenu: (msgId: string, content: string) => void;
  onFcClick: () => void;
  /** リアクション送信コールバック（キャラ反応生成のため） */
  onReaction: (msgId: string, emoji: string, characterSlug: string) => void;
}

/* ─────────────── ChatMessageList コンポーネント ─────────────── */
export function ChatMessageList({
  messages,
  character,
  isSending,
  lastEmotionMsgId,
  playingAudioId,
  hungryEmojis,
  showStars,
  messagesEndRef,
  onAudioToggle,
  onMsgLongPressStart: _onMsgLongPressStart,
  onMsgLongPressEnd: _onMsgLongPressEnd,
  onCtxMenu,
  onFcClick,
  onReaction,
}: ChatMessageListProps) {
  /* ── リアクション内部 state ── */
  const [reactions, setReactions] = useState<Record<string, ReactionEmoji>>({});
  const [paletteTarget, setPaletteTarget] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* ── 画像フルスクリーンモーダル state ── */
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  /* ── パレット外タップで閉じる ── */
  useEffect(() => {
    if (!paletteTarget) return;
    const handle = () => setPaletteTarget(null);
    // delay adding listener so the opening touch doesn't immediately close it
    const tid = setTimeout(() => {
      document.addEventListener('click', handle, { once: true });
      document.addEventListener('touchend', handle, { once: true });
    }, 10);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('click', handle);
      document.removeEventListener('touchend', handle);
    };
  }, [paletteTarget]);

  /* ── 長押しハンドラ（内部） ── */
  const handleLongPressStart = useCallback((msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setPaletteTarget(msgId);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /* ── 絵文字選択 ── */
  const handleEmojiSelect = useCallback(
    (msgId: string, emoji: ReactionEmoji, currentReactions: Record<string, ReactionEmoji>) => {
      const isRemoving = currentReactions[msgId] === emoji;
      setReactions((prev) => {
        if (prev[msgId] === emoji) {
          const next = { ...prev };
          delete next[msgId];
          return next;
        }
        return { ...prev, [msgId]: emoji };
      });
      // 追加の場合だけキャラ反応トリガー
      if (!isRemoving) {
        onReaction(msgId, emoji, character?.slug ?? '');
      }
      setPaletteTarget(null);
    },
    [onReaction, character?.slug],
  );

  return (
    <>
      {/* 画像フルスクリーンモーダル */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setFullscreenImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage}
            alt="画像"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
            onClick={() => setFullscreenImage(null)}
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* リアクション & 感情アニメーション */}
      <style>{`
        @keyframes reactionPaletteIn {
          from { opacity: 0; transform: translateY(8px) scale(0.88); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes reactionBadgeIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes emotionStatusIn {
          from { opacity: 0; }
          to   { opacity: 0.8; }
        }
        @keyframes emotionFlashRed {
          0%   { box-shadow: 0 0 0 0px rgba(239,68,68,0.55); }
          35%  { box-shadow: 0 0 0 5px rgba(239,68,68,0.25); }
          100% { box-shadow: 0 0 0 0px rgba(239,68,68,0); }
        }
        @keyframes emotionRipplePink {
          0%   { box-shadow: 0 0 0 0px rgba(236,72,153,0.45); }
          50%  { box-shadow: 0 0 0 7px rgba(236,72,153,0.15); }
          100% { box-shadow: 0 0 0 0px rgba(236,72,153,0); }
        }
        @keyframes emotionFadeSad {
          0%   { box-shadow: 0 0 0 0px rgba(59,130,246,0.4); }
          50%  { box-shadow: 0 0 0 5px rgba(59,130,246,0.15); }
          100% { box-shadow: 0 0 0 0px rgba(59,130,246,0); }
        }
        .emotion-transition-angry { animation: emotionFlashRed  0.65s ease-out; }
        .emotion-transition-shy   { animation: emotionRipplePink 0.7s ease-out; }
        .emotion-transition-sad   { animation: emotionFadeSad   0.7s ease-out; }
        .emotion-status-bar { animation: emotionStatusIn 0.3s ease-out forwards; }
      `}</style>

      {/* 🍖 ハングリーエフェクト：浮かぶ肉絵文字 */}
      {hungryEmojis.map((e) => (
        <div
          key={e.id}
          className="absolute bottom-24 z-20 pointer-events-none float-meat text-3xl select-none"
          style={{ left: `${e.x}%`, animationDelay: `${e.delay}s` }}
        >
          🍖
        </div>
      ))}

      {/* ✨ 興奮エフェクト：星が舞う */}
      {showStars && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-xl star-twinkle select-none"
              style={{
                left: `${8 + i * 9}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.18}s`,
                animationDuration: `${0.9 + (i % 3) * 0.35}s`,
              }}
            >
              {i % 3 === 0 ? '⭐' : i % 3 === 1 ? '✨' : '🌟'}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ メッセージリスト ══════════════ */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3">
        {messages.length === 0 && !isSending && (
          <div className="text-center text-gray-500 py-16">
            <div className="text-5xl mb-4 opacity-60">💬</div>
            <p className="text-sm font-medium text-gray-400">最初のメッセージを送ろう！</p>
            <p className="text-xs text-gray-600 mt-1">{character?.name ?? 'キャラクター'}が待ってるぞ</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          // 日付セパレーター計算
          const msgDate = new Date(msg.createdAt);
          const prevMsg = messages[idx - 1];
          const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
          const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          let dateLabelText = '';
          if (showDateSeparator) {
            if (msgDate.toDateString() === today.toDateString()) {
              dateLabelText = '今日';
            } else if (msgDate.toDateString() === yesterday.toDateString()) {
              dateLabelText = '昨日';
            } else {
              dateLabelText = `${msgDate.getMonth() + 1}月${msgDate.getDate()}日`;
            }
          }

          // SYSTEM メッセージ（CTA等）は専用UI
          if (msg.role === 'SYSTEM') {
            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex items-center gap-3 my-4 px-2">
                    <div className="flex-1 h-px bg-gray-800" />
                    <span className="text-[11px] text-gray-600 font-medium px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800">{dateLabelText}</span>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>
                )}
                <div className="msg-animate flex justify-center my-2" style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}>
                  <button
                    onClick={onFcClick}
                    className="block max-w-[85%] bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-2xl px-5 py-3 text-center backdrop-blur-sm hover:border-purple-400/50 transition-all"
                  >
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                    <span className="inline-block mt-2 text-xs font-bold text-purple-300 bg-purple-500/20 px-4 py-1.5 rounded-full">
                      FC会員になる →
                    </span>
                  </button>
                </div>
              </div>
            );
          }

          const isUser = msg.role === 'USER';
          const emotion = msg.metadata?.emotion;
          const prevCharEmotion = !isUser ? messages.slice(0, idx).reverse().find(m => m.role === 'CHARACTER')?.metadata?.emotion : undefined;
          const emotionEmoji = getEmotionEmoji(emotion);
          const emotionTransitionClass = !isUser ? getEmotionTransitionClass(prevCharEmotion, emotion) : '';
          // 記憶参照タグ検出・除去
          const hasMemoryRef = !isUser && msg.content.includes('【MEMORY_REF】');
          const displayContent = hasMemoryRef ? msg.content.replace(/【MEMORY_REF】/g, '').trim() : msg.content;
          // 連続メッセージの最後にだけアバター表示
          const nextMsg = messages[idx + 1];
          const showAvatar = !isUser && (nextMsg?.role !== 'CHARACTER' || nextMsg == null);
          // 感情ステータスバー（名前ラベル行に表示）
          const statusBar = !isUser && emotion && emotion !== 'neutral' ? EMOTION_STATUS_BAR[emotion] : null;

          // リアクション情報
          const msgReaction = reactions[msg.id];
          const showPalette = paletteTarget === msg.id;

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4 px-2">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[11px] text-gray-600 font-medium px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800">{dateLabelText}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}
              <div
                className={`msg-animate ${isUser ? 'aniva-msg-send' : 'aniva-msg-recv'} flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
                style={{ animationDelay: `${Math.min(idx * 30, 120)}ms` }}
              >
                {/* キャラクターアバター */}
                {!isUser && (
                  <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    {character?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                        🏴‍☠️
                      </div>
                    )}
                  </div>
                )}

                <div className={`max-w-[78%] flex flex-col gap-0.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  {!isUser && (showAvatar || statusBar) && (
                    <div className="flex items-center gap-1.5 px-1 ml-0.5">
                      {showAvatar && (
                        <span className="text-xs text-gray-500">{character?.name ?? 'キャラクター'}</span>
                      )}
                      {statusBar && (
                        <span
                          className={`emotion-status-bar inline-flex items-center gap-0.5 text-[10px] ${statusBar.textColor} px-1.5 py-0.5 rounded-full bg-gradient-to-r ${statusBar.gradient}`}
                        >
                          {statusBar.emoji} {statusBar.text}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 記憶参照: バッジは不要（Keisuke指示: ちゃんと覚えてることが大事。演出より実質）。MEMORY_REFタグはcontentから除去済み */}

                  {/* ── 吹き出しラッパー (relative: パレット・バッジの基点) ── */}
                  <div className="relative">
                    {/* ✨ リアクションパレット（長押しで表示） */}
                    {!isUser && showPalette && (
                      <div
                        className="absolute bottom-full mb-2 left-0 z-30"
                        style={{ animation: 'reactionPaletteIn 0.2s ease-out' }}
                        onClick={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                      >
                        <div
                          className="flex items-center gap-1 px-3 py-2"
                          style={{
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            borderRadius: 16,
                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                          }}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiSelect(msg.id, emoji, reactions)}
                              className="w-10 h-10 flex items-center justify-center text-2xl rounded-xl transition-transform active:scale-90 hover:scale-110"
                              style={
                                msgReaction === emoji
                                  ? { background: 'rgba(255,255,255,0.18)', transform: 'scale(1.1)' }
                                  : {}
                              }
                              aria-label={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 吹き出し本体 */}
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors duration-500 select-none ${
                        isUser
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-sm shadow-purple-900/30'
                          : `rounded-2xl rounded-tl-sm ${getCharacterBubbleStyle(emotion)} ${
                          msg.id === lastEmotionMsgId && emotion === 'angry'   ? 'bubble-angry'   :
                          msg.id === lastEmotionMsgId && emotion === 'excited' ? 'bubble-excited' : ''
                        } ${emotionTransitionClass}`
                      } ${msgReaction ? 'mb-2' : ''}`}
                      style={hasMemoryRef ? { boxShadow: '0 0 12px 3px rgba(168,85,247,0.35)' } : undefined}
                      onTouchStart={!isUser ? () => handleLongPressStart(msg.id) : undefined}
                      onTouchEnd={!isUser ? handleLongPressEnd : undefined}
                      onTouchMove={!isUser ? handleLongPressEnd : undefined}
                      onMouseDown={!isUser ? () => handleLongPressStart(msg.id) : undefined}
                      onMouseUp={!isUser ? handleLongPressEnd : undefined}
                      onMouseLeave={!isUser ? handleLongPressEnd : undefined}
                      onContextMenu={!isUser ? (e) => { e.preventDefault(); onCtxMenu(msg.id, displayContent); } : undefined}
                    >
                      {/* スタンプ表示 */}
                      {msg.metadata?.stickerUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={msg.metadata.stickerUrl}
                          alt="スタンプ"
                          className="rounded-xl"
                          style={{ width: 120, height: 120, objectFit: 'contain' }}
                        />
                      ) : /* 画像メッセージ表示 */
                      msg.metadata?.imageUrl ? (
                        <button
                          className="block focus:outline-none"
                          onClick={() => setFullscreenImage(msg.metadata!.imageUrl!)}
                          aria-label="画像を拡大表示"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.metadata.imageUrl}
                            alt="送信した画像"
                            className="rounded-xl object-cover"
                            style={{ maxWidth: 250, maxHeight: 300 }}
                          />
                        </button>
                      ) : (
                        <span className="whitespace-pre-wrap break-words">{displayContent}</span>
                      )}
                      {emotionEmoji && (
                        <span className="ml-1.5 text-base">{emotionEmoji}</span>
                      )}

                      {/* ミニ音声プレーヤー */}
                      {!isUser && msg.audioUrl && (
                        <MiniAudioPlayer
                          audioUrl={msg.audioUrl}
                          messageId={msg.id}
                          playingId={playingAudioId}
                          onToggle={onAudioToggle}
                        />
                      )}

                      {/* 音声生成中スピナー */}
                      {!isUser && msg.audioUrl === undefined && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="w-3 h-3 rounded-full border border-gray-500 border-t-transparent animate-spin inline-block" />
                          <span>音声生成中...</span>
                        </div>
                      )}
                    </div>

                    {/* 💜 リアクションバッジ（吹き出し下端に絵文字×1表示） */}
                    {!isUser && msgReaction && (
                      <div
                        className="absolute -bottom-3 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-md"
                        style={{
                          background: 'rgba(30,30,42,0.92)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          animation: 'reactionBadgeIn 0.2s ease-out',
                          zIndex: 10,
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{msgReaction}</span>
                        <span className="text-gray-400" style={{ fontSize: 10, lineHeight: 1 }}>×1</span>
                      </div>
                    )}
                  </div>

                  {/* タイムスタンプ + 既読 */}
                  <span className={`text-[10px] text-gray-600 px-1 flex items-center gap-1 ${msgReaction ? 'mt-1' : ''}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    {isUser && idx === messages.length - 1 && (
                      (() => {
                        const hasCharReply = messages.slice(idx + 1).some((m: Message) => m.role === 'CHARACTER');
                        return hasCharReply ? (
                          <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M1 12l5 5L17 6M7 12l5 5L23 6" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
                          </svg>
                        );
                      })()
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* タイピングインジケーター */}
        {isSending && (
          <div className="flex justify-start items-end gap-2 msg-animate">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
              {character?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatarUrl} alt={character?.name ?? ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm">
                  🏴‍☠️
                </div>
              )}
            </div>
            <TypingIndicator characterName={character?.name} avatarUrl={character?.avatarUrl} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}
