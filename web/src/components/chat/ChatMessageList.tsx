'use client';

import React from 'react';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

/* ─────────────── 型定義（page.tsxから移動・export） ─────────────── */
export interface Message {
  id: string;
  role: 'USER' | 'CHARACTER' | 'SYSTEM';
  content: string;
  metadata?: { emotion?: string; isSystemHint?: boolean; isFarewell?: boolean; isCliffhanger?: boolean };
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

/* ─────────────── 感情ユーティリティ ─────────────── */
const EMOTION_EMOJI: Record<string, string> = {
  excited: '🔥',
  happy: '😄',
  angry: '😤',
  sad: '😢',
  hungry: '🍖',
  neutral: '',
  surprised: '😲',
};

const EMOTION_BUBBLE_STYLE: Record<string, string> = {
  excited:   'bg-gradient-to-br from-orange-800/80 to-red-800/70 border border-orange-600/40 text-orange-50',
  happy:     'bg-gradient-to-br from-yellow-800/80 to-amber-800/70 border border-yellow-600/40 text-yellow-50',
  angry:     'bg-gradient-to-br from-red-900/80 to-rose-800/70 border border-red-600/40 text-red-50',
  sad:       'bg-gradient-to-br from-blue-900/80 to-indigo-900/70 border border-blue-600/40 text-blue-50',
  hungry:    'bg-gradient-to-br from-orange-900/80 to-yellow-800/70 border border-orange-500/40 text-orange-50',
  surprised: 'bg-gradient-to-br from-cyan-900/80 to-teal-800/70 border border-cyan-600/40 text-cyan-50',
  neutral:   'bg-gray-800/90 text-gray-100 border border-gray-600/30 shadow-md',
};

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
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onAudioToggle: (messageId: string, audioUrl: string) => void;
  onMsgLongPressStart: (msgId: string, content: string) => void;
  onMsgLongPressEnd: () => void;
  onCtxMenu: (msgId: string, content: string) => void;
  onFcClick: () => void;
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
  onMsgLongPressStart,
  onMsgLongPressEnd,
  onCtxMenu,
  onFcClick,
}: ChatMessageListProps) {
  return (
    <>
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
          const emotionEmoji = getEmotionEmoji(emotion);
          // 記憶参照タグ検出・除去
          const hasMemoryRef = !isUser && msg.content.includes('【MEMORY_REF】');
          const displayContent = hasMemoryRef ? msg.content.replace(/【MEMORY_REF】/g, '').trim() : msg.content;
          // 連続メッセージの最後にだけアバター表示
          const nextMsg = messages[idx + 1];
          const showAvatar = !isUser && (nextMsg?.role !== 'CHARACTER' || nextMsg == null);

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
                className={`msg-animate msg-bubble-in flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
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
                  {!isUser && showAvatar && (
                    <span className="text-xs text-gray-500 px-1 ml-0.5">
                      {character?.name ?? 'キャラクター'}
                    </span>
                  )}

                  {/* 💭 記憶参照バッジ */}
                  {hasMemoryRef && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5 ml-0.5 select-none"
                      style={{
                        background: 'rgba(168,85,247,0.18)',
                        color: '#d8b4fe',
                        border: '1px solid rgba(168,85,247,0.35)',
                        boxShadow: '0 0 8px 2px rgba(168,85,247,0.25)',
                      }}
                    >
                      💭 覚えてるよ
                    </span>
                  )}

                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-colors duration-500 select-none ${
                      isUser
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-sm shadow-purple-900/30'
                        : `rounded-2xl rounded-tl-sm ${getCharacterBubbleStyle(emotion)} ${
                        msg.id === lastEmotionMsgId && emotion === 'angry'   ? 'bubble-angry'   :
                        msg.id === lastEmotionMsgId && emotion === 'excited' ? 'bubble-excited' : ''
                      }`
                    }`}
                    style={hasMemoryRef ? { boxShadow: '0 0 12px 3px rgba(168,85,247,0.35)' } : undefined}
                    onTouchStart={!isUser ? () => onMsgLongPressStart(msg.id, displayContent) : undefined}
                    onTouchEnd={!isUser ? onMsgLongPressEnd : undefined}
                    onTouchMove={!isUser ? onMsgLongPressEnd : undefined}
                    onMouseDown={!isUser ? () => onMsgLongPressStart(msg.id, displayContent) : undefined}
                    onMouseUp={!isUser ? onMsgLongPressEnd : undefined}
                    onMouseLeave={!isUser ? onMsgLongPressEnd : undefined}
                    onContextMenu={!isUser ? (e) => { e.preventDefault(); onCtxMenu(msg.id, displayContent); } : undefined}
                  >
                    <span className="whitespace-pre-wrap break-words">{displayContent}</span>
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

                  {/* タイムスタンプ + 既読 */}
                  <span className="text-[10px] text-gray-600 px-1 flex items-center gap-1">
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
