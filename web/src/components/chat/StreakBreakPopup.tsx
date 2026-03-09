'use client';

import { useState, useCallback } from 'react';

// キャラ別セリフ（ストリーク途切れ時）
const STREAK_BREAK_LINES: Record<string, { sad: string; encourage: string }> = {
  luffy: {
    sad: '炎が消えちまった…おれたちのやつが！',
    encourage: 'でも！諦めんのはおれのポリシーじゃねぇ！もう一回燃やすぞ！',
  },
  zoro: {
    sad: '…ふん。途切れたか。',
    encourage: '弱さを認めることが強さへの第一歩だ。次は負けるな。',
  },
  nami: {
    sad: 'もう！せっかくのストリークが！',
    encourage: 'まあ、50コインで復活できるんだけど？チャンスよ、これは！',
  },
  sanji: {
    sad: 'くそ…お前との大切な時間が途切れちまった…',
    encourage: '俺がいるから大丈夫だ。もう一度一緒に積み上げよう。',
  },
  ace: {
    sad: 'あちゃー…消えちまったな、炎。',
    encourage: 'でも消えた炎は、また灯せる。俺が保証する。',
  },
  chopper: {
    sad: 'え！？ストリーク途切れた！？そんな…！',
    encourage: 'でも大丈夫！チョッパーがいるから！復活できるよ！',
  },
  usopp: {
    sad: 'な、なんてこった…俺の8000連続記録が…！',
    encourage: 'ま、まあ！勇敢なる俺は挫けない！もう一度だ！',
  },
  nami_default: {
    sad: 'ストリークが途切れてしまいました…',
    encourage: '今ならコインで復活できます。もう一度始めましょう！',
  },
};

const DEFAULT_LINES = {
  sad: 'ストリークが途切れてしまいました…',
  encourage: '今ならコインで復活できます。もう一度始めましょう！',
};

interface StreakBreakPopupProps {
  /** キャラのslug (luffy, zoro, etc.) */
  characterSlug: string;
  /** キャラ名 */
  characterName: string;
  /** リレーションシップID（recoverAPIに渡す） */
  relationshipId: string;
  /** 途切れる前のストリーク日数 */
  previousStreak: number;
  /** ポップアップを閉じる */
  onClose: () => void;
  /** 復活成功時のコールバック */
  onRecovered?: (newStreak: number) => void;
}

export function StreakBreakPopup({
  characterSlug,
  characterName,
  relationshipId,
  previousStreak,
  onClose,
  onRecovered,
}: StreakBreakPopupProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [newStreakDays, setNewStreakDays] = useState<number | null>(null);

  const lines = STREAK_BREAK_LINES[characterSlug] ?? DEFAULT_LINES;

  const handleRecover = useCallback(async () => {
    if (isRecovering || recovered) return;
    setIsRecovering(true);
    setError(null);
    try {
      const res = await fetch('/api/streak/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationshipId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError('コインが足りません…（50コイン必要）');
        } else if (res.status === 400) {
          setError('ストリークはすでにアクティブです！');
        } else if (res.status === 401) {
          setError('セッションが切れました。ページを再読み込みしてください。');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setError(data.error ?? '復活に失敗しました。もう一度お試しください。');
        }
        return;
      }
      setRecovered(true);
      setNewStreakDays(data.newStreak ?? previousStreak);
      onRecovered?.(data.newStreak ?? previousStreak);
    } catch {
      setError('ネットワークエラーが発生しました。');
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering, recovered, relationshipId, previousStreak, onRecovered]);

  return (
    /* バックドロップ */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ポップアップカード */}
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 py-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgb(15,5,30) 0%, rgb(8,3,18) 100%)',
          border: '1px solid rgba(239,68,68,0.2)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* 背景グロー */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

        {recovered ? (
          /* 復活成功 */
          <div className="relative z-10 text-center">
            <div className="text-6xl mb-4 animate-bounce">🔥</div>
            <h2 className="text-white font-bold text-xl mb-2">炎が灯った！！</h2>
            <p className="text-orange-300 font-bold text-base mb-1">
              {newStreakDays}日連続の記録を守った！
            </p>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              50コインを使って{characterName}との絆を取り戻しました。
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-full text-white font-bold text-base"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
              }}
            >
              やったぜ！続けよう！
            </button>
          </div>
        ) : (
          /* ストリーク途切れUI */
          <div className="relative z-10">
            {/* キャラ悲しい顔 */}
            <div className="text-center mb-5">
              <div className="text-7xl mb-3">😢</div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs text-red-300 font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                🔥 {previousStreak}日連続が途切れた…
              </div>
            </div>

            {/* キャラセリフ */}
            <div
              className="rounded-2xl px-4 py-4 mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-white font-bold text-base mb-2 leading-relaxed">
                「{lines.sad}」
              </p>
              <p className="text-gray-400 text-sm leading-relaxed">
                「{lines.encourage}」
              </p>
              <p className="text-gray-600 text-xs mt-2 text-right">— {characterName}</p>
            </div>

            {/* エラー */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 mb-4 text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* CTA: 炎を灯し直す */}
            <button
              onClick={handleRecover}
              disabled={isRecovering}
              className="w-full py-4 rounded-2xl text-white font-black text-base mb-3 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                boxShadow: '0 4px 24px rgba(239,68,68,0.4)',
              }}
            >
              {isRecovering ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  復活中…
                </span>
              ) : (
                '🔥 炎を灯し直す（50コイン）'
              )}
            </button>

            {/* サブCTA: 閉じる */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-gray-400 font-medium text-sm transition-all hover:text-white hover:bg-white/5 active:scale-95"
            >
              次から気をつける
            </button>

            <p className="text-gray-600 text-xs text-center mt-3">
              ストリーク復活には50コインが必要です
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StreakBreakPopup;
