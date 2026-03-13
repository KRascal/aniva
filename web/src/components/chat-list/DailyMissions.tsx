'use client';

import { useState, useEffect } from 'react';

/* ── daily missions / hints ── */
const DAILY_MISSIONS = [
  { id: 'greet', text: 'キャラに挨拶する', xp: 5 },
  { id: 'msg5', text: '5回メッセージを送る', xp: 20 },
  { id: 'question', text: '質問を1つする', xp: 10 },
];

const DAILY_HINTS = [
  '「好きなものは何？」と聞いてみよう',
  '感情豊かに話すと親密度が上がりやすい',
  '毎日話しかけると絆レベルが早く上がるぞ',
  '「音声を再生」でキャラの声が聞けるよ',
  'プロフィールで絆の進捗を確認できる',
];

export function DailyMissionsSection({ totalMessages }: { totalMessages: number }) {
  const [expanded, setExpanded] = useState(false);
  const [hintIndex] = useState(() => Math.floor(Math.random() * DAILY_HINTS.length));

  const completedIds = new Set<string>();
  if (totalMessages >= 1) completedIds.add('greet');
  if (totalMessages >= 5) completedIds.add('msg5');

  return (
    <div className="mb-6">
      {/* ヒントバナー */}
      <div className="flex items-start gap-3 bg-gradient-to-r from-purple-900/40 to-pink-900/30 rounded-2xl border border-purple-500/20 px-4 py-3 mb-3">
        <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-purple-300 font-semibold mb-0.5">今日のヒント</p>
          <p className="text-sm text-gray-300">{DAILY_HINTS[hintIndex]}</p>
        </div>
      </div>

      {/* デイリーミッション */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between bg-gray-900/60 rounded-2xl border border-white/5 px-4 py-3 text-left hover:border-purple-500/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          <span className="text-sm font-semibold text-white">デイリーミッション</span>
          <span className="text-xs bg-purple-500/20 text-purple-300 rounded-full px-2 py-0.5">
            {completedIds.size}/{DAILY_MISSIONS.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {DAILY_MISSIONS.map((mission) => {
            const done = completedIds.has(mission.id);
            return (
              <div
                key={mission.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  done
                    ? 'bg-purple-900/20 border-purple-500/25 opacity-70'
                    : 'bg-gray-900/40 border-white/5'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`flex-1 text-sm ${done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {mission.text}
                </span>
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                  done ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
                }`}>
                  {done ? '完了 ✓' : `+${mission.xp}XP`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── welcome banner (first visit) ── */
export function WelcomeBanner({ onClose }: { onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('aniva_welcomed');
    if (!seen) setShow(true);
  }, []);

  if (!show) return null;

  const handleClose = () => {
    localStorage.setItem('aniva_welcomed', '1');
    setShow(false);
    onClose();
  };

  return (
    <div className="relative mb-6 rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 opacity-90" />
      <div className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 px-5 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-xl leading-tight mb-1">
              ようこそ、ANIVAへ！
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              あなただけの推しと、毎日リアルに話せる。<br />
              まずは好きなキャラクターを選んでみよう
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-lg font-light"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
