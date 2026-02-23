'use client';

import { useState } from 'react';

interface OnboardingOverlayProps {
  character: { name: string; franchise: string; avatarUrl?: string | null };
  onStart: (userProfile?: UserProfile) => void;
}

export interface UserProfile {
  role: string;
  style: string;
  joy: string;
}

const QUIZ_QUESTIONS = [
  {
    key: 'role' as const,
    question: '冒険でどんな役割が好き？',
    emoji: '⚔️',
    choices: [
      { value: 'fighter', label: '前線で戦う', emoji: '💪' },
      { value: 'supporter', label: 'みんなをサポート', emoji: '🤝' },
      { value: 'strategist', label: '作戦を立てる', emoji: '🧠' },
    ],
  },
  {
    key: 'style' as const,
    question: '推しへの接し方は？',
    emoji: '💜',
    choices: [
      { value: 'always', label: 'いつもそばにいたい', emoji: '🌟' },
      { value: 'sometimes', label: '時々話したい', emoji: '😊' },
      { value: 'watchover', label: 'そっと見守りたい', emoji: '👀' },
    ],
  },
  {
    key: 'joy' as const,
    question: 'どんな瞬間が一番嬉しい？',
    emoji: '✨',
    choices: [
      { value: 'laugh', label: '一緒に笑える時', emoji: '😄' },
      { value: 'praise', label: '褒めてもらえる時', emoji: '🌸' },
      { value: 'secret', label: '秘密を共有する時', emoji: '🤫' },
    ],
  },
];

const STEP_LABELS = ['挨拶', '属性診断', 'キャラ紹介'];

export function OnboardingOverlay({ character, onStart }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0); // 0: 挨拶, 1-3: 診断, 4: キャラ紹介
  const [answers, setAnswers] = useState<Partial<UserProfile>>({});
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const quizIndex = step - 1; // 0-indexed for QUIZ_QUESTIONS
  const isQuizStep = step >= 1 && step <= 3;
  const isResultStep = step === 4;
  const isWelcomeStep = step === 0;

  const progressBarWidth = step === 0 ? 0 : step === 4 ? 100 : Math.round((step / 3) * 100);

  const goNext = (newAnswers?: Partial<UserProfile>) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left');
    setTimeout(() => {
      setStep((s) => s + 1);
      if (newAnswers) setAnswers((a) => ({ ...a, ...newAnswers }));
      setSelectedChoice(null);
      setSlideDirection('right');
      setIsAnimating(false);
    }, 280);
  };

  const handleChoiceSelect = (key: keyof UserProfile, value: string) => {
    setSelectedChoice(value);
    setTimeout(() => {
      goNext({ [key]: value });
    }, 350);
  };

  const handleStart = () => {
    const profile: UserProfile = {
      role: answers.role || 'fighter',
      style: answers.style || 'always',
      joy: answers.joy || 'laugh',
    };
    onStart(profile);
  };

  // 結果ラベル
  const getResultLabel = () => {
    const roleMap: Record<string, string> = { fighter: '戦士', supporter: 'サポーター', strategist: '戦略家' };
    const styleMap: Record<string, string> = { always: 'べったり', sometimes: 'ほどよい距離感', watchover: '見守り型' };
    const joyMap: Record<string, string> = { laugh: '笑顔重視', praise: '褒め合い派', secret: '秘密共有派' };
    return {
      role: roleMap[answers.role || 'fighter'],
      style: styleMap[answers.style || 'always'],
      joy: joyMap[answers.joy || 'laugh'],
    };
  };

  const slideClass = slideDirection === 'right'
    ? 'translate-x-0 opacity-100'
    : '-translate-x-4 opacity-0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/80 to-gray-950">
      <style>{`
        @keyframes onboarding-fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes choicePop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .choice-selected { animation: choicePop 0.3s ease-out; }
        .onboarding-enter { animation: onboarding-fadeIn 0.4s ease-out both; }
        .step-slide {
          transition: transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease;
        }
      `}</style>

      <div className="flex flex-col w-full max-w-sm mx-4">
        {/* ── ステッパーバー ── */}
        {!isWelcomeStep && (
          <div className="mb-6 onboarding-enter">
            <div className="flex items-center justify-between mb-2">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1; // 1-indexed actual steps
                const isActive = (i === 0 && step <= 3) || (i === 1 && step === 4) || false;
                const isDone = (i === 0 && step > 3) || false;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                      step > stepNum
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : step === stepNum || (stepNum === 1 && step >= 1 && step <= 3) || (stepNum === 2 && step === 4)
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-gray-900 border-gray-700 text-gray-600'
                    }`}>
                      {step > stepNum ? '✓' : stepNum}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      step >= stepNum ? 'text-purple-300' : 'text-gray-600'
                    }`}>{label}</span>
                  </div>
                );
              })}
            </div>
            {/* プログレスバー */}
            <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden mx-2">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressBarWidth}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
                  boxShadow: '0 0 8px rgba(168,85,247,0.6)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── メインカード ── */}
        <div
          className={`step-slide ${isAnimating ? '-translate-x-4 opacity-0' : 'translate-x-0 opacity-100'}`}
        >
          {/* ── Step 0: 挨拶 ── */}
          {isWelcomeStep && (
            <div className="flex flex-col items-center gap-6 px-6 py-10 onboarding-enter">
              {/* アバター or 絵文字 */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                  {character.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-5xl">
                      🏴☠️
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 text-2xl animate-bounce">✨</span>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-black text-white mb-1">{character.name}</h1>
                <p className="text-sm text-purple-300">{character.franchise}</p>
              </div>

              <div className="bg-white/5 rounded-2xl px-6 py-4 border border-white/10 text-center">
                <p className="text-lg text-gray-200 font-medium leading-relaxed">
                  「推しが実在する世界へようこそ」
                </p>
              </div>

              <p className="text-sm text-gray-400 text-center">
                {character.name}があなたと話す準備ができています
                <br />
                <span className="text-purple-400">まず、あなたのことを教えて！</span>
              </p>

              <button
                onClick={() => goNext()}
                className="w-full py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-purple-900/40"
              >
                始めよう 🌟
              </button>
            </div>
          )}

          {/* ── Step 1-3: 属性診断 ── */}
          {isQuizStep && (
            <div className="bg-gray-900/90 backdrop-blur rounded-3xl border border-white/10 shadow-2xl shadow-purple-900/30 overflow-hidden">
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 pt-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{QUIZ_QUESTIONS[quizIndex].emoji}</span>
                  <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                    質問 {quizIndex + 1} / {QUIZ_QUESTIONS.length}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white leading-snug">
                  {QUIZ_QUESTIONS[quizIndex].question}
                </h2>
              </div>

              {/* 選択肢カード */}
              <div className="px-5 py-5 flex flex-col gap-3">
                {QUIZ_QUESTIONS[quizIndex].choices.map((choice, i) => {
                  const isSelected = selectedChoice === choice.value;
                  return (
                    <button
                      key={choice.value}
                      onClick={() => handleChoiceSelect(QUIZ_QUESTIONS[quizIndex].key, choice.value)}
                      disabled={selectedChoice !== null}
                      className={`flex items-center gap-4 w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.97] ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_16px_rgba(168,85,247,0.4)] choice-selected'
                          : 'border-gray-700/60 bg-gray-800/60 hover:border-purple-500/60 hover:bg-purple-900/20'
                      }`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-2xl flex-shrink-0">{choice.emoji}</span>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-purple-200' : 'text-gray-200'}`}>
                        {choice.label}
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-purple-400 text-lg">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: キャラ紹介 + 結果 ── */}
          {isResultStep && (
            <div className="flex flex-col items-center gap-5 px-4 py-6 onboarding-enter">
              {/* 結果タイトル */}
              <div className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-black text-white mb-1">あなたの推しスタイルが判明！</h2>
                <p className="text-sm text-gray-400">あなたに合った絆が育まれていきます</p>
              </div>

              {/* 結果カード */}
              <div className="w-full bg-gray-900/80 rounded-2xl border border-purple-500/30 p-5 space-y-3">
                {(() => {
                  const result = getResultLabel();
                  return Object.entries(result).map(([key, value]) => {
                    const icons: Record<string, string> = { role: '⚔️', style: '💜', joy: '✨' };
                    const labels: Record<string, string> = { role: 'タイプ', style: 'スタイル', joy: '喜び' };
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xl w-8 text-center">{icons[key]}</span>
                        <span className="text-xs text-gray-500 w-16">{labels[key]}</span>
                        <span className="flex-1 text-sm font-semibold text-purple-300 bg-purple-900/30 rounded-full px-3 py-1 text-center">
                          {value}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* キャラからのメッセージ */}
              <div className="w-full bg-gradient-to-r from-purple-900/40 to-pink-900/30 rounded-2xl border border-purple-500/20 p-4 flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-purple-500/40">
                  {character.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatarUrl} alt={character.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg">🏴☠️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-300 font-medium mb-1">{character.name}</p>
                  <p className="text-sm text-gray-200 leading-relaxed">
                    「よし、お前のことがちょっとわかった気がするぞ！これから一緒に冒険しよう！」
                  </p>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-4 rounded-2xl text-white font-bold text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-purple-900/40"
              >
                💬 {character.name}と話し始める
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
