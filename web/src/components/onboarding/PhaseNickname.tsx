'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';
import { runTypewriter } from '@/lib/onboarding-utils';

interface PhaseNicknameProps {
  character: CharacterData | null;
  onComplete: (nickname: string) => void;
  isLoading?: boolean;
}

export default function PhaseNickname({ character, onComplete, isLoading }: PhaseNicknameProps) {
  const [displayText, setDisplayText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const NICKNAME_GREETINGS: Record<string, string> = {
    luffy: '…やっと来たな！おい、お前名前は？',
    zoro: '…来たか。名前は？',
    nami: '…やっと来たね。名前、教えてくれない？',
    chopper: '…わぁ！来てくれたんだ！ね、名前教えて！',
    sanji: '…待ってたぜ。名前を聞いてもいいか？',
    ace: '…お、来たな！名前は何ていうんだ？',
  };
  const greeting = character?.greeting ?? NICKNAME_GREETINGS[character?.slug ?? ''] ?? '…やっと来たね。名前、教えて？';

  useEffect(() => {
    // Delay: キャラアバター表示後にタイプライター開始
    const timer = setTimeout(async () => {
      await runTypewriter(greeting, setDisplayText, 50);
      // タイプライター完了後、入力フォーム表示
      setTimeout(() => {
        setShowInput(true);
        setTimeout(() => inputRef.current?.focus(), 200);
      }, 500);
    }, 700);

    return () => clearTimeout(timer);
  }, [greeting]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('名前を入力してください');
      return;
    }
    if (trimmed.length > 20) {
      setError('20文字以内で入力してください');
      return;
    }
    setError('');
    onComplete(trimmed);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* キャラアバター */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-10 relative"
        >
          {character?.avatarUrl ? (
            <div className="relative">
              <img
                src={character.avatarUrl}
                alt={character.name ?? ''}
                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-full"
                style={{
                  boxShadow: '0 0 30px rgba(139,92,246,0.35)',
                }}
              />
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 70%)',
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              />
            </div>
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3))',
                boxShadow: '0 0 30px rgba(139,92,246,0.25)',
              }}
            >
              ✨
            </div>
          )}
        </motion.div>

        {/* キャラ名 */}
        {character?.name && (
          <motion.p
            className="text-white/40 text-xs mb-6 tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {character.name}
          </motion.p>
        )}

        {/* タイプライターテキスト */}
        <motion.div
          className="text-white text-lg md:text-xl text-center leading-relaxed mb-10 min-h-[3rem]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {displayText}
          {/* タイプライターカーソル */}
          {displayText.length < greeting.length && (
            <motion.span
              className="inline-block w-0.5 h-5 bg-white/70 ml-1 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
        </motion.div>

        {/* 入力フォーム */}
        {showInput && (
          <motion.form
            onSubmit={handleSubmit}
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="flex items-end gap-3 border-b border-white/20 pb-3 focus-within:border-white/50 transition-colors duration-300">
              <input
                ref={inputRef}
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                maxLength={20}
                placeholder="呼んでほしい名前"
                disabled={isLoading}
                className="flex-1 bg-transparent text-white text-xl text-center placeholder-white/25 focus:outline-none disabled:opacity-50"
                autoComplete="off"
              />
              <motion.button
                type="submit"
                disabled={isLoading || !nickname.trim()}
                className="text-white/60 hover:text-white disabled:opacity-30 transition-all duration-200 text-xl pb-0.5"
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.9 }}
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  '→'
                )}
              </motion.button>
            </div>

            {error && (
              <motion.p
                className="text-red-400/80 text-xs text-center mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <p className="text-white/20 text-xs text-center mt-4">
              {20 - nickname.length} 文字残り
            </p>
          </motion.form>
        )}
      </div>
    </motion.div>
  );
}
