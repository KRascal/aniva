'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * LP埋め込みゲストチャットデモ
 * ログイン不要で推しと1-2往復会話できる「最初の5秒」体験
 * 
 * 200点の世界: 初めてサイトを開いた瞬間にキャラが話しかけてくる
 */
export function GuestChatDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [showSignupCTA, setShowSignupCTA] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // キャラが最初に話しかけてくる（自動）
  useEffect(() => {
    if (hasStarted) return;
    const timer = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{
          role: 'assistant',
          content: 'ねえ、初めまして。あなたのこと、もっと知りたいな。\n今日はどんな一日だった？',
        }]);
        setIsTyping(false);
      }, 1500);
    }, 2000); // ページロード2秒後にキャラが話しかける
    return () => clearTimeout(timer);
  }, [hasStarted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping || turnCount >= 2) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      // DBの最初のキャラを使う。なければデフォルト
      const res = await fetch('/api/onboarding/guest-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          characterSlug: 'default',
          turnCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        setTurnCount(prev => prev + 1);

        if (turnCount >= 1) {
          // 2回目の返事の後にCTA表示
          setTimeout(() => setShowSignupCTA(true), 2000);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '...ごめん、ちょっと調子悪いかも。また話しかけてくれる？',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '...ちょっと接続が不安定みたい。もう一回試してみて？',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* チャットエリア */}
      <div className="bg-[var(--color-surface)] border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/20">
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-sm">✨</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">ANIVA</p>
            <p className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              オンライン
            </p>
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div className="px-4 py-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-sm'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text)] rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* タイピングインジケーター */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-[var(--color-surface-2)] px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* 入力エリア or CTA */}
        {showSignupCTA ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-4 border-t border-white/5"
          >
            <p className="text-center text-[var(--color-muted)] text-xs mb-3">
              続きを話すには無料登録
            </p>
            <a
              href="/signup"
              className="block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center rounded-xl font-semibold
                         shadow-lg shadow-purple-900/30 active:scale-[0.97] transition-transform"
            >
              無料で始める
            </a>
          </motion.div>
        ) : (
          <div className="px-4 py-3 border-t border-white/5">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={messages.length === 0 ? '...' : '返事を書く...'}
                disabled={turnCount >= 2 || isTyping || messages.length === 0}
                className="flex-1 bg-[var(--color-surface-2)] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white 
                           placeholder-gray-500 outline-none focus:border-purple-500/50 transition-colors
                           disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isTyping || turnCount >= 2 || messages.length === 0}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium
                           disabled:opacity-30 active:scale-95 transition-transform"
              >
                送信
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
