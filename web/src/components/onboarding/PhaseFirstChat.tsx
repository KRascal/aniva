'use client';

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterData, ChatMessage } from '@/hooks/useOnboarding';
import { buildMemoryContext } from '@/lib/onboarding-utils';

interface PhaseFirstChatProps {
  character: CharacterData | null;
  nickname: string;
  onComplete: (history: ChatMessage[]) => void;
}

const TOTAL_TURNS = 5;

// キャラの初回メッセージ（キャラ別）
const CHARACTER_INITIAL_MESSAGES: Record<string, (nickname: string) => string> = {
  luffy: (n) => `おう${n}！お前、好きなもんとかあるか？俺は肉が好きだ！ししし！`,
  zoro: (n) => `…${n}か。何が好きなんだ？`,
  nami: (n) => `ねぇ${n}、好きなこととかある？教えてよ！`,
  chopper: (n) => `ね、ねぇ${n}！好きなこととかある？教えてほしいな！`,
  sanji: (n) => `よう${n}、何が好きなんだ？料理か？美味いもんの話なら任せとけ`,
  ace: (n) => `よぉ${n}！お前、何が好きなんだ？聞かせてくれよ！`,
};

function getInitialMessage(nickname: string, characterSlug?: string): string {
  const fn = CHARACTER_INITIAL_MESSAGES[characterSlug ?? ''];
  return fn ? fn(nickname) : `ねぇ${nickname}、好きなこととかある？`;
}

export default function PhaseFirstChat({ character, nickname, onComplete }: PhaseFirstChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [turnIndex, setTurnIndex] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial character message
  useEffect(() => {
    const initialMsg: ChatMessage = {
      role: 'assistant',
      content: getInitialMessage(nickname, character?.slug),
    };
    setMessages([initialMsg]);
    historyRef.current = [initialMsg];
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [nickname]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!character || isStreaming) return;

      const newHistory: ChatMessage[] = [
        ...historyRef.current,
        { role: 'user', content: userMessage },
      ];
      historyRef.current = newHistory;

      setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
      setInputValue('');
      setIsStreaming(true);
      setStreamingText('');
      setError('');

      const isLastTurn = turnIndex >= TOTAL_TURNS - 2;
      const memoryContext = isLastTurn ? buildMemoryContext(historyRef.current) : undefined;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('/api/onboarding/first-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            characterId: character.id,
            turn: turnIndex + 1,
            message: userMessage,
            conversationHistory: historyRef.current.slice(0, -1), // exclude the just-added user message
            ...(memoryContext && { memoryContext }),
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              // Handle both delta format and text format
              const delta = parsed.delta ?? parsed.text ?? parsed.content ?? '';
              if (delta) {
                assistantText += delta;
                setStreamingText(assistantText);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Streaming complete
        const assistantMsg: ChatMessage = { role: 'assistant', content: assistantText };
        historyRef.current = [...historyRef.current, assistantMsg];

        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText('');

        const nextTurn = turnIndex + 1;
        setTurnIndex(nextTurn);

        if (nextTurn >= TOTAL_TURNS) {
          // 5往復完了 → Phase 5へ
          setTimeout(() => onComplete(historyRef.current), 1200);
        } else {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        if (errMsg === 'AbortError' || errMsg.includes('abort')) {
          setError('通信が遅すぎるみたい…もう一度試してみて？');
        } else {
          // フォールバック定型文
          const fallback = '…少し混線してるみたい。続けよう？';
          const fallbackMsg: ChatMessage = { role: 'assistant', content: fallback };
          historyRef.current = [...historyRef.current, fallbackMsg];
          setMessages((prev) => [...prev, fallbackMsg]);
          setStreamingText('');
          const nextTurn = turnIndex + 1;
          setTurnIndex(nextTurn);
          if (nextTurn >= TOTAL_TURNS) {
            setTimeout(() => onComplete(historyRef.current), 1200);
          }
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [character, isStreaming, turnIndex, onComplete]
  );

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
  };

  const completedTurns = Math.min(turnIndex, TOTAL_TURNS);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #060612 0%, #0d0820 50%, #060612 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header: キャラアバター + 名前 */}
      <div className="flex-none flex items-center gap-3 px-4 pt-10 pb-3">
        {character?.avatarUrl ? (
          <motion.img
            src={character.avatarUrl}
            alt={character.name ?? ''}
            className="w-9 h-9 rounded-full object-cover flex-none"
            style={{ boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-none"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.5))' }}
          >
            ✨
          </div>
        )}
        <div>
          <p className="text-white text-sm font-medium leading-none">{character?.name}</p>
          <p className="text-white/30 text-xs mt-0.5">{character?.franchise}</p>
        </div>

        {/* Turn progress dots (right side) */}
        <div className="ml-auto flex gap-1.5">
          {Array.from({ length: TOTAL_TURNS }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: i < completedTurns
                  ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                  : 'rgba(255,255,255,0.15)',
              }}
              animate={i === completedTurns ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && character?.avatarUrl && (
                <img
                  src={character.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover mr-2 flex-none self-end mb-1"
                />
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-br-sm'
                    : 'bg-white/8 text-white/90 rounded-bl-sm border border-white/5'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              {character?.avatarUrl && (
                <img
                  src={character.avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover mr-2 flex-none self-end mb-1"
                />
              )}
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white/8 border border-white/5 text-white/90 text-sm leading-relaxed">
                {streamingText || (
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-white/40 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                )}
                {streamingText && (
                  <motion.span
                    className="inline-block w-0.5 h-3.5 bg-white/60 ml-0.5 align-middle"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            className="text-red-400/70 text-xs text-center py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex-none px-4 pb-8 pt-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming || turnIndex >= TOTAL_TURNS}
            placeholder={isStreaming ? '...' : '返事する'}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-base placeholder-white/25 focus:outline-none focus:border-purple-500/50 disabled:opacity-40 transition-colors"
            style={{ fontSize: '16px' }}
          />
          <motion.button
            type="submit"
            disabled={isStreaming || !inputValue.trim() || turnIndex >= TOTAL_TURNS}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-none bg-gradient-to-br from-purple-600 to-pink-600 disabled:opacity-30 transition-opacity"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isStreaming ? (
              <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
