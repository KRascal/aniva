'use client';

import { useState, useEffect, useRef } from 'react';
import { CharacterData } from './CharacterReveal';
import { GuestMessage } from '@/lib/onboarding-session';

interface OnboardingChatProps {
  character: CharacterData;
  guestSessionId: string;
  onComplete: (chatHistory: GuestMessage[]) => void;
}

interface ChatMessage {
  role: 'user' | 'character';
  content: string;
}

const FAREWELL_LINE = '…ねえ、もう行かなきゃいけないの。またここに来てくれる？約束して';

export default function OnboardingChat({
  character,
  guestSessionId,
  onComplete,
}: OnboardingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turnNumber, setTurnNumber] = useState(0); // 0 = initial, 1-3 = active turns
  const [isFading, setIsFading] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<GuestMessage[]>([]);

  // Load initial character message
  useEffect(() => {
    loadInitialMessage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadInitialMessage() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/onboarding/guest-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterSlug: character.slug,
          guestSessionId,
          userMessage: '',
          turnNumber: 0, // initial greeting
        }),
      });

      if (!res.ok) throw new Error('Failed to load initial message');
      const data = await res.json();

      const charMsg: ChatMessage = { role: 'character', content: data.characterMessage };
      setMessages([charMsg]);
      historyRef.current = [{
        role: 'character',
        content: data.characterMessage,
        createdAt: new Date().toISOString(),
      }];
      setTurnNumber(1);
    } catch {
      const fallback = character.catchphrases[0] ?? 'やっと会えた。最近どうしてた？';
      const charMsg: ChatMessage = { role: 'character', content: fallback };
      setMessages([charMsg]);
      historyRef.current = [{ role: 'character', content: fallback, createdAt: new Date().toISOString() }];
      setTurnNumber(1);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isLoading || turnNumber > 3) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    historyRef.current.push({ role: 'user', content: text, createdAt: new Date().toISOString() });
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/onboarding/guest-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterSlug: character.slug,
          guestSessionId,
          userMessage: text,
          turnNumber,
        }),
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const charMsg: ChatMessage = { role: 'character', content: data.characterMessage };
      setMessages((prev) => [...prev, charMsg]);
      historyRef.current.push({ role: 'character', content: data.characterMessage, createdAt: new Date().toISOString() });

      if (data.isLastTurn) {
        // Show farewell after the regular response
        setTimeout(() => {
          const farewellMsg: ChatMessage = { role: 'character', content: FAREWELL_LINE };
          setMessages((prev) => [...prev, farewellMsg]);
          historyRef.current.push({ role: 'character', content: FAREWELL_LINE, createdAt: new Date().toISOString() });
          setShowFarewell(true);

          // Start fade to black after 2 seconds
          setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
              onComplete(historyRef.current);
            }, 2500);
          }, 2000);
        }, 1200);
      } else {
        setTurnNumber((n) => n + 1);
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: 'character',
        content: '…ちょっと待って。もう一度言ってくれる？',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isInputDisabled = isLoading || turnNumber > 3 || showFarewell;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(168,85,247,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Character info header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-8 pb-4 border-b border-white/5">
        <div
          className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-white/60 text-sm"
          style={{ boxShadow: '0 0 12px rgba(168,85,247,0.3)' }}
        >
          {character.name[0]}
        </div>
        <div>
          <p className="text-white/90 text-sm font-medium">{character.name}</p>
          <p className="text-white/30 text-xs">{character.franchise}</p>
        </div>
        {/* Turn indicator */}
        {!showFarewell && (
          <div className="ml-auto flex gap-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: n < turnNumber ? 'rgba(168,85,247,0.8)' : n === turnNumber ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{
              opacity: 0,
              animation: `fadeInUp 0.4s ease forwards ${Math.min(i * 0.1, 0.5)}s`,
            }}
          >
            {msg.role === 'character' && (
              <div
                className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-white/60 text-xs mr-2 flex-shrink-0 mt-1"
                style={{ boxShadow: '0 0 8px rgba(168,85,247,0.3)' }}
              >
                {character.name[0]}
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white/90 rounded-br-sm'
                  : 'bg-purple-500/15 border border-purple-500/20 text-white/90 rounded-bl-sm'
              } ${msg.content === FAREWELL_LINE ? 'italic' : ''}`}
              style={
                msg.content === FAREWELL_LINE
                  ? { textShadow: '0 0 20px rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.1)' }
                  : {}
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-white/60 text-xs mr-2 flex-shrink-0"
              style={{ boxShadow: '0 0 8px rgba(168,85,247,0.3)' }}
            >
              {character.name[0]}
            </div>
            <div className="bg-purple-500/15 border border-purple-500/20 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-8 pt-3 border-t border-white/5">
        {!isInputDisabled ? (
          <div
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3"
            style={{ boxShadow: '0 0 20px rgba(168,85,247,0.05)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="返事する…"
              className="flex-1 bg-transparent text-white/90 placeholder-white/20 text-sm outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-8 h-8 rounded-full bg-purple-500/40 flex items-center justify-center disabled:opacity-30 transition-opacity hover:bg-purple-500/60"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        ) : showFarewell ? (
          <div className="text-center">
            <p className="text-white/20 text-xs tracking-widest animate-pulse">…</p>
          </div>
        ) : null}
      </div>

      {/* Fade to black overlay */}
      <div
        className="absolute inset-0 bg-black pointer-events-none z-20"
        style={{
          opacity: isFading ? 1 : 0,
          transition: 'opacity 2.5s ease-in',
        }}
      />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
