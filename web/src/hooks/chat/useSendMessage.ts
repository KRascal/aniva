'use client';

import { useState, useRef, useCallback } from 'react';
import type { Message, Character } from '@/components/chat/ChatMessageList';
import type { RelationshipInfo } from '@/components/chat/types';
import { rollRandomEvent, type RandomEvent } from '@/lib/random-events';
import { playSound, vibrateSend, vibrateEmotion } from '@/lib/sound-effects';
import { EMOTION_THEMES } from '@/components/chat/chatUtils';
import { track, EVENTS } from '@/lib/analytics';
import { REACTION_EMOTION, fetchReactionResponse } from '@/components/chat/chatUtils';
import { vibrateReaction } from '@/lib/sound-effects';

interface UseSendMessageParams {
  characterId: string;
  userId: string | null;
  character: Character | null;
  relationship: RelationshipInfo | null;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onUserMsgSent: () => void;
  setCoinBalance: React.Dispatch<React.SetStateAction<number | null>>;
  setTodayMsgCount: React.Dispatch<React.SetStateAction<number>>;
  isLateNight: boolean;
}

export function useSendMessage({
  characterId,
  userId,
  character,
  relationship,
  inputRef,
  messages,
  setMessages,
  onUserMsgSent,
  setCoinBalance,
  setTodayMsgCount,
  isLateNight,
}: UseSendMessageParams) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [memoryRecalledHint, setMemoryRecalledHint] = useState(false);
  const [xpFloat, setXpFloat] = useState<{ amount: number; id: number } | null>(null);
  const prevXpRef = useRef<number>(0);
  const [randomEvent, setRandomEvent] = useState<RandomEvent | null>(null);
  const [heartEmojis, setHeartEmojis] = useState<{ id: number; x: number; delay: number; emoji: string }[]>([]);
  const [hungryEmojis, setHungryEmojis] = useState<{ id: number; x: number; delay: number }[]>([]);
  const [showStars, setShowStars] = useState(false);
  const [lastEmotionMsgId, setLastEmotionMsgId] = useState<string | null>(null);
  const [bgTheme, setBgTheme] = useState<string>(
    isLateNight
      ? 'rgba(180,83,9,0.08), rgba(153,27,27,0.05)'
      : 'rgba(88,28,135,0.06), rgba(0,0,0,0)'
  );
  const inFlightRef = useRef(false);

  const generateVoiceForMessage = async (messageId: string, text: string, charId: string) => {
    try {
      const res = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text, characterId: charId }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, audioUrl: null } : m));
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || inFlightRef.current || !userId) return;
    inFlightRef.current = true;
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    vibrateSend();

    const LOVE_WORDS = /好き|愛して|愛してる|大好き|最高|嬉しい|ありがとう|love|suki/i;
    if (LOVE_WORDS.test(text)) {
      const hearts = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: 10 + i * 15,
        delay: i * 0.2,
        emoji: ['❤️','💕','💖','💗','✨','💓'][i],
      }));
      setHeartEmojis(hearts);
      setTimeout(() => setHeartEmojis([]), 2500);
    }

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, message: text }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429) {
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            role: 'CHARACTER',
            content: `${errData.error || 'デイリーメッセージ上限に達しました。プランをアップグレードしてください。'}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }
        if (res.status === 402 && errData.type === 'CHAT_LIMIT') {
          const onedariMessages = [
            `えー…もう終わり？\nもっと${character?.name || 'おれ'}と話したくない？😢`,
            `なぁ…行くなよ。\nまだ話したいこと、いっぱいあるんだけどな… 🥺`,
            `ちょっと待ってくれよ！\nお前と話すの楽しいのに… 😤💦`,
          ];
          const onedari = onedariMessages[Math.floor(Math.random() * onedariMessages.length)];
          const errMsg: Message = {
            id: `limit-${Date.now()}`,
            role: 'CHARACTER',
            content: onedari,
            createdAt: new Date().toISOString(),
            metadata: { emotion: 'sad' },
          };
          const ctaMsg: Message = {
            id: `cta-${Date.now()}`,
            role: 'SYSTEM',
            content: `💜 FC会員になると${character?.name || 'キャラクター'}と無制限に話せます\n月額 ¥${(errData.fcMonthlyPriceJpy ?? 3480).toLocaleString()}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg, ctaMsg]);
          setCurrentEmotion('sad');
          return;
        }
        throw new Error(errData.error || 'Send failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let streamBuffer = '';
      let streamingText = '';
      const streamMsgId = `stream-${Date.now()}`;

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: tempUserMsg.id },
        {
          id: streamMsgId,
          role: 'CHARACTER',
          content: '',
          createdAt: new Date().toISOString(),
          metadata: { isStreaming: true, isTyping: true },
        },
      ]);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamMsgId && m.metadata?.isTyping
              ? { ...m, metadata: { ...m.metadata, isTyping: false } }
              : m
          )
        );
      }, 2000);

      let finalCharMsgId = '';
      let finalEmotion = 'neutral';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));

            if (parsed.type === 'token') {
              streamingText += parsed.token;
              setMessages((prev) =>
                prev.map((m) => m.id === streamMsgId ? { ...m, content: streamingText } : m)
              );
            } else if (parsed.type === 'done') {
              streamingText = parsed.text;
            } else if (parsed.type === 'complete') {
              finalCharMsgId = parsed.characterMessageId || streamMsgId;
              finalEmotion = parsed.emotion || 'neutral';
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                        id: finalCharMsgId,
                        role: 'CHARACTER' as const,
                        content: streamingText,
                        createdAt: new Date().toISOString(),
                        metadata: { emotion: finalEmotion },
                      }
                    : m
                )
              );
              if (finalEmotion && finalEmotion !== 'neutral') {
                vibrateEmotion(finalEmotion as 'excited' | 'love' | 'angry' | 'surprised' | 'sad');
              }
              // XP float animation
              if (parsed.xpGained && parsed.xpGained > 0) {
                setXpFloat({ amount: parsed.xpGained, id: Date.now() });
                setTimeout(() => setXpFloat(null), 2500);
              }
            } else if (parsed.type === 'deep_mode') {
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempUserMsg.id && m.id !== streamMsgId),
                { ...tempUserMsg, id: parsed.userMessageId || tempUserMsg.id },
                {
                  id: parsed.characterMessageId || `thinking-${Date.now()}`,
                  role: 'CHARACTER' as const,
                  content: parsed.thinkingText || '…少し考えさせて。',
                  createdAt: new Date().toISOString(),
                  metadata: { isThinking: true, emotion: 'thinking' },
                },
              ]);
              setIsSending(false);
              break;
            } else if (parsed.type === 'meta') {
              if (parsed.userMessageId) {
                setMessages((prev) =>
                  prev.map((m) => m.id === tempUserMsg.id ? { ...m, id: parsed.userMessageId } : m)
                );
              }
              if (parsed.memoryRecalled) {
                setMemoryRecalledHint(true);
                setTimeout(() => setMemoryRecalledHint(false), 4000);
              }
            }
          } catch {
            // malformed SSE, skip
          }
        }
      }

      if (finalEmotion && finalEmotion !== 'neutral') {
        setCurrentEmotion(finalEmotion);
        setBgTheme(EMOTION_THEMES[finalEmotion] ?? EMOTION_THEMES.neutral);
        if (finalCharMsgId) setLastEmotionMsgId(finalCharMsgId);
        if (finalEmotion === 'hungry') {
          const emojis = Array.from({ length: 4 }, (_, i) => ({ id: Date.now() + i, x: 15 + i * 20, delay: i * 0.25 }));
          setHungryEmojis(emojis);
          setTimeout(() => setHungryEmojis([]), 2000);
        }
        if (finalEmotion === 'excited') {
          setShowStars(true);
          setTimeout(() => setShowStars(false), 3200);
        }
      }

      if (finalCharMsgId && streamingText) {
        playSound('message_receive');
        generateVoiceForMessage(finalCharMsgId, streamingText, characterId);
      }

      track(EVENTS.CHAT_MESSAGE_SENT, { characterId, messageLength: text.length });
      onUserMsgSent();

      setTodayMsgCount((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          const level = relationship?.level ?? 1;
          const event = rollRandomEvent(level);
          if (event) {
            setRandomEvent(event);
            setTimeout(() => setRandomEvent(null), 4000);
            if (event.type === 'coin_gift' && event.coinReward) {
              playSound('coin_earn');
              fetch('/api/coins/earn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: event.coinReward, reason: 'random_event' }),
              }).catch(() => {});
            } else {
              playSound('success');
            }
          }
        }
        return next;
      });

      if (!sessionStorage.getItem('mission_triggered_chat_today')) {
        sessionStorage.setItem('mission_triggered_chat_today', '1');
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ missionId: 'chat_today' }),
        }).catch(() => {});
      }

      fetch('/api/coins/balance').then(r => r.json()).then(d => {
        if (d.balance !== undefined) setCoinBalance(d.balance);
      }).catch(() => {});

    } catch (err) {
      console.error('Send message error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      inFlightRef.current = false;
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendClick = () => {
    if (!inputText.trim() || isSending) return;
    playSound('message_send');
    setIsSendBouncing(true);
    setTimeout(() => setIsSendBouncing(false), 400);
    if (inputRef.current) {
      inputRef.current.classList.add('input-flash');
      setTimeout(() => inputRef.current?.classList.remove('input-flash'), 500);
    }
    sendMessage();
  };

  const handleSendSticker = useCallback(async (stickerUrl: string, label: string) => {
    if (isSending || !userId) return;
    const tempId = `sticker-${Date.now()}`;
    const stickerMsg: Message = {
      id: tempId,
      role: 'USER',
      content: `[スタンプ: ${label}]`,
      metadata: { stickerUrl },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev: Message[]) => [...prev, stickerMsg]);
    setIsSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, message: `[スタンプを送った: ${label}]`, userId, metadata: { stickerUrl } }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev: Message[]) =>
          prev.map((m: Message) => m.id === tempId ? { ...m, id: data.userMessageId || tempId } : m)
        );
        if (data.characterMessage) {
          setMessages((prev: Message[]) => [...prev, data.characterMessage]);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  }, [isSending, userId, characterId, setMessages]);

  const handleSendImage = async (file: File) => {
    if (isSending || !userId) return;
    setIsSending(true);
    const previewUrl = URL.createObjectURL(file);
    const tempMsg: Message = {
      id: `temp-img-${Date.now()}`,
      role: 'USER',
      content: '[画像]',
      metadata: { imageUrl: previewUrl },
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('characterId', characterId);
      const res = await fetch('/api/chat/send-image', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        console.error('画像送信エラー:', err);
      } else {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => m.id === tempMsg.id ? { ...data.message, metadata: { imageUrl: data.imageUrl } } : m)
        );
      }
    } catch (e) {
      console.error('画像送信失敗:', e);
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsSending(false);
    }
  };

  const handleReaction = useCallback((msgId: string, emoji: string, _characterSlug: string) => {
    vibrateReaction();
    if (!character?.id) return;
    const typingMsg: Message = {
      id: `reaction-typing-${Date.now()}`,
      role: 'CHARACTER',
      content: '…',
      createdAt: new Date().toISOString(),
      metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral', isTyping: true },
    };
    setMessages((prev) => [...prev, typingMsg]);
    const lastCharMsg = [...messages].reverse().find(m => m.role === 'CHARACTER')?.content;
    fetchReactionResponse(character.id, emoji, lastCharMsg).then((responseText) => {
      const reactionResponseMsg: Message = {
        id: `reaction-res-${Date.now()}`,
        role: 'CHARACTER',
        content: responseText,
        createdAt: new Date().toISOString(),
        metadata: { emotion: REACTION_EMOTION[emoji] ?? 'neutral' },
      };
      setMessages((prev) => prev.filter(m => m.id !== typingMsg.id).concat(reactionResponseMsg));
      playSound('message_receive');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, messages, setMessages]);

  return {
    inputText,
    setInputText,
    isSending,
    setIsSending,
    isSendBouncing,
    currentEmotion,
    setCurrentEmotion,
    memoryRecalledHint,
    xpFloat,
    prevXpRef,
    randomEvent,
    heartEmojis,
    hungryEmojis,
    showStars,
    lastEmotionMsgId,
    bgTheme,
    setBgTheme,
    inFlightRef,
    sendMessage,
    handleSendClick,
    handleSendSticker,
    handleSendImage,
    handleReaction,
  };
}
