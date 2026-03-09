'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { CharacterData } from '@/hooks/useOnboarding';
import { runTypewriter } from '@/lib/onboarding-utils';

interface PhaseBirthdayProps {
  character: CharacterData | null;
  nickname: string;
  onComplete: (birthday: string) => void;
}

const BIRTHDAY_PROMPTS: Record<string, string> = {
  luffy: 'お前の誕生日っていつだ？教えろよ！',
  zoro: '…誕生日、聞いておいてもいいか。',
  nami: 'ねぇ、誕生日はいつ？ちゃんと覚えておきたいの。',
  chopper: 'ねぇねぇ！誕生日いつ？お祝いしたい！',
  sanji: 'レディの誕生日…聞いてもいいかな？',
  ace: '誕生日、教えてくれよ。忘れないからさ。',
  hancock: '…あなたの誕生日を、わらわに教えなさい。',
  robin: '誕生日を教えてくれる？覚えておきたいから。',
  inosuke: 'お前の誕生日いつだ！言え！',
  fushiguro: '…誕生日。一応聞いておく。',
};

export default function PhaseBirthday({ character, nickname, onComplete }: PhaseBirthdayProps) {
  const [displayText, setDisplayText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const monthRef = useRef<HTMLSelectElement>(null);
  const dayRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLSelectElement>(null);

  const prompt = BIRTHDAY_PROMPTS[character?.slug ?? ''] ?? `${nickname}の誕生日を教えて？`;

  useEffect(() => {
    const timer = setTimeout(async () => {
      await runTypewriter(prompt, setDisplayText, 50);
      setTimeout(() => {
        setShowInput(true);
        setTimeout(() => monthRef.current?.focus(), 200);
      }, 500);
    }, 500);
    return () => clearTimeout(timer);
  }, [prompt]);

  const handleSubmit = () => {
    if (!year || !month || !day) return;
    const birthday = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // 年齢チェック（13歳以上）
    const birthDate = new Date(birthday);
    const now = new Date();
    const age = now.getFullYear() - birthDate.getFullYear();
    if (age < 13) return;

    onComplete(birthday);
  };

  const handleSkip = () => {
    onComplete(''); // スキップも許可
  };

  // 年選択肢を生成
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - 13 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[80vh] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* キャラアバター */}
      {character?.avatarUrl && (
        <motion.div
          className="w-24 h-24 rounded-full overflow-hidden mb-6 ring-2 ring-purple-500/30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
        </motion.div>
      )}

      {/* キャラ名 */}
      {character?.name && (
        <p className="text-gray-500 text-sm mb-4">{character.name}</p>
      )}

      {/* タイプライター */}
      <p className="text-white text-xl font-medium text-center mb-8 min-h-[2em]">
        {displayText}
      </p>

      {/* 生年月日入力 */}
      {showInput && (
        <motion.div
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 justify-center">
            {/* 年 */}
            <select
              ref={yearRef}
              value={year}
              onChange={e => setYear(e.target.value)}
              className="bg-transparent border-b border-gray-600 text-white text-center py-2 px-1 text-lg focus:outline-none focus:border-purple-500 transition-colors appearance-none w-24"
            >
              <option value="" disabled className="bg-gray-900">年</option>
              {years.map(y => (
                <option key={y} value={y.toString()} className="bg-gray-900">{y}</option>
              ))}
            </select>
            <span className="text-gray-500 text-lg">/</span>

            {/* 月 */}
            <select
              ref={monthRef}
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent border-b border-gray-600 text-white text-center py-2 px-1 text-lg focus:outline-none focus:border-purple-500 transition-colors appearance-none w-16"
            >
              <option value="" disabled className="bg-gray-900">月</option>
              {months.map(m => (
                <option key={m} value={m.toString()} className="bg-gray-900">{m}</option>
              ))}
            </select>
            <span className="text-gray-500 text-lg">/</span>

            {/* 日 */}
            <select
              ref={dayRef}
              value={day}
              onChange={e => setDay(e.target.value)}
              className="bg-transparent border-b border-gray-600 text-white text-center py-2 px-1 text-lg focus:outline-none focus:border-purple-500 transition-colors appearance-none w-16"
            >
              <option value="" disabled className="bg-gray-900">日</option>
              {days.map(d => (
                <option key={d} value={d.toString()} className="bg-gray-900">{d}</option>
              ))}
            </select>
          </div>

          {/* 確定ボタン */}
          {year && month && day && (
            <motion.button
              onClick={handleSubmit}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-semibold text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              次へ
            </motion.button>
          )}

          {/* スキップ */}
          <button
            onClick={handleSkip}
            className="w-full text-center text-gray-600 text-xs hover:text-gray-400 transition-colors py-2"
          >
            スキップ
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
