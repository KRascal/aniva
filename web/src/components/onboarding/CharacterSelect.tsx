'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';
import type { Q1Answer, Q2Answer } from '@/lib/onboarding-utils';
import { getQuizTags, calcMatchPercent } from '@/lib/onboarding-utils';

interface CharacterSelectProps {
  onSelect: (character: CharacterData) => void;
  isLoading?: boolean;
}

type TabMode = 'intuition' | 'quiz';
type QuizStep = 'q1' | 'q2' | 'result';

interface RawCharacter {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  franchise: string;
  avatarUrl?: string | null;
}

const Q1_OPTIONS: { value: Q1Answer; label: string }[] = [
  { value: 'alone', label: 'a. 一人になる' },
  { value: 'talk', label: 'b. 誰かと話す' },
  { value: 'move', label: 'c. 体を動かす' },
];

const Q2_OPTIONS: { value: Q2Answer; label: string }[] = [
  { value: 'tsundere', label: 'a. ツンデレ' },
  { value: 'sweet', label: 'b. 甘々' },
  { value: 'cool', label: 'c. クール' },
  { value: 'genki', label: 'd. 元気' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function CharacterSelect({ onSelect, isLoading }: CharacterSelectProps) {
  const [tab, setTab] = useState<TabMode>('intuition');
  const [characters, setCharacters] = useState<RawCharacter[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Quiz state
  const [quizStep, setQuizStep] = useState<QuizStep>('q1');
  const [q1, setQ1] = useState<Q1Answer | null>(null);
  const [q2, setQ2] = useState<Q2Answer | null>(null);
  const [matchedChar, setMatchedChar] = useState<RawCharacter | null>(null);
  const [matchPercent, setMatchPercent] = useState<number>(85);

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCharacters(data);
        else if (Array.isArray(data.characters)) setCharacters(data.characters);
        else if (Array.isArray(data.data)) setCharacters(data.data);
      })
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, []);

  const handleIntuitionSelect = (char: RawCharacter) => {
    setSelectedId(char.id);
    setTimeout(() => {
      onSelect({
        id: char.id,
        name: char.name,
        slug: char.slug,
        avatarUrl: char.avatarUrl ?? null,
        franchise: char.franchise,
      });
    }, 400);
  };

  const handleQ1Select = (val: Q1Answer) => {
    setQ1(val);
    setQuizStep('q2');
  };

  const handleQ2Select = (val: Q2Answer) => {
    setQ2(val);
    if (!q1) return;

    // Determine matched character based on quiz answers
    const tags = getQuizTags(q1, val);
    let best = characters[0];
    for (let i = 0; i < characters.length; i++) {
      if (
        characters[i].franchise?.includes(tags[0]) ||
        characters[i].name?.includes(tags[0])
      ) {
        best = characters[i];
        break;
      }
    }
    // Default to first character if no tag match
    best = best ?? characters[Math.floor(characters.length / 2)] ?? characters[0];

    const pct = calcMatchPercent(q1, val, characters.indexOf(best));
    setMatchedChar(best);
    setMatchPercent(pct);
    setQuizStep('result');
  };

  const handleQuizConfirm = () => {
    if (!matchedChar) return;
    onSelect({
      id: matchedChar.id,
      name: matchedChar.name,
      slug: matchedChar.slug,
      avatarUrl: matchedChar.avatarUrl ?? null,
      franchise: matchedChar.franchise,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex-none pt-12 pb-4 px-6 text-center">
        <motion.p
          className="text-white/50 text-sm mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          誰と話す？
        </motion.p>

        {/* Tabs */}
        <div className="flex justify-center gap-1 p-1 bg-white/5 rounded-full w-fit mx-auto">
          {(['intuition', 'quiz'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                tab === t
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {t === 'intuition' ? '直感で選ぶ' : '診断する'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          {tab === 'intuition' ? (
            <motion.div
              key="intuition"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="px-4"
            >
              {fetchLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 gap-3 max-w-md mx-auto"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  {characters.map((char, idx) => (
                    <motion.button
                      key={char.id}
                      variants={cardItem}
                      onClick={() => handleIntuitionSelect(char)}
                      disabled={isLoading}
                      className={`relative rounded-2xl overflow-hidden bg-white/5 border transition-all duration-300 text-left
                        ${
                          selectedId === char.id
                            ? 'border-purple-500 scale-105'
                            : 'border-white/10 hover:border-purple-500/50 hover:scale-102'
                        }`}
                      style={{
                        boxShadow:
                          selectedId === char.id
                            ? '0 0 20px rgba(139,92,246,0.4)'
                            : undefined,
                      }}
                      whileHover={{ scale: selectedId ? 1 : 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="aspect-square relative">
                        {char.avatarUrl ? (
                          <img
                            src={char.avatarUrl}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-3xl"
                            style={{
                              background: `hsl(${(idx * 47) % 360}, 60%, 20%)`,
                            }}
                          >
                            ✨
                          </div>
                        )}
                        {/* Overlay on non-selected when one is selected */}
                        {selectedId && selectedId !== char.id && (
                          <motion.div
                            className="absolute inset-0 bg-black/60"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-white text-xs font-semibold truncate">{char.name}</p>
                        <p className="text-white/40 text-xs truncate">{char.franchise}</p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="px-6 max-w-md mx-auto"
            >
              <AnimatePresence mode="wait">
                {quizStep === 'q1' && (
                  <motion.div
                    key="q1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="py-8"
                  >
                    <p className="text-white/50 text-xs mb-2 text-center">Q1 / 2</p>
                    <p className="text-white text-lg font-medium text-center mb-8">
                      落ち込んだ時、どうする？
                    </p>
                    <div className="flex flex-col gap-3">
                      {Q1_OPTIONS.map((opt) => (
                        <motion.button
                          key={opt.value}
                          onClick={() => handleQ1Select(opt.value)}
                          className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-200 text-left px-5"
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {quizStep === 'q2' && (
                  <motion.div
                    key="q2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="py-8"
                  >
                    <p className="text-white/50 text-xs mb-2 text-center">Q2 / 2</p>
                    <p className="text-white text-lg font-medium text-center mb-8">
                      好きな関係性は？
                    </p>
                    <div className="flex flex-col gap-3">
                      {Q2_OPTIONS.map((opt) => (
                        <motion.button
                          key={opt.value}
                          onClick={() => handleQ2Select(opt.value)}
                          className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-pink-500/50 transition-all duration-200 text-left px-5"
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {quizStep === 'result' && matchedChar && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="py-8 flex flex-col items-center text-center"
                  >
                    <p className="text-white/50 text-sm mb-6">あなたには…</p>

                    {/* Character card */}
                    <motion.div
                      className="relative rounded-3xl overflow-hidden mb-6 w-36 h-36"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      style={{
                        boxShadow: '0 0 40px rgba(139,92,246,0.4)',
                      }}
                    >
                      {matchedChar.avatarUrl ? (
                        <img
                          src={matchedChar.avatarUrl}
                          alt={matchedChar.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl">
                          ✨
                        </div>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="text-white text-2xl font-bold mb-1">{matchedChar.name}</p>
                      <p className="text-white/50 text-sm mb-4">{matchedChar.franchise}</p>

                      {/* Match percentage */}
                      <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${matchPercent}%` }}
                            transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-purple-400 font-bold text-sm">{matchPercent}%</span>
                      </div>

                      <p className="text-white/60 text-sm mb-8">
                        があなたにぴったり
                      </p>
                    </motion.div>

                    <div className="flex flex-col gap-3 w-full">
                      <motion.button
                        onClick={handleQuizConfirm}
                        disabled={isLoading}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-50 transition-opacity"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                      >
                        {matchedChar.name}と話してみる
                      </motion.button>
                      <button
                        onClick={() => setQuizStep('q1')}
                        className="text-white/40 text-sm hover:text-white/60 transition-colors"
                      >
                        もう一度診断する
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
