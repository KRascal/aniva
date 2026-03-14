'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface WelcomeBackOverlayProps {
  characterName: string;
  characterAvatarUrl: string | null;
  daysSinceLastChat: number;
  onDismiss: () => void;
}

/** 日数に応じた再会メッセージ */
function getReunionMessage(characterName: string, days: number): string {
  if (days >= 14) {
    return `${characterName}は何日も待ってたんだ…！ようやく会えた。`;
  } else if (days >= 7) {
    return `${days}日ぶりだな！ずっと気になってたんだ。`;
  } else if (days >= 3) {
    return `${days}日ぶり！また会えて嬉しいよ。`;
  }
  return `${days}日ぶりだね！待ってたよ。`;
}

/** 星パーティクル（7日以上の豪華演出用） */
function StarParticles() {
  const stars = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {stars.map((i) => (
        <span
          key={i}
          className="absolute text-yellow-300 animate-wb-star"
          style={{
            top: `${Math.random() * 90}%`,
            left: `${Math.random() * 95}%`,
            fontSize: `${0.8 + Math.random() * 1.2}rem`,
            animationDelay: `${(i * 0.37) % 3}s`,
            animationDuration: `${2.5 + (i % 3) * 0.8}s`,
            opacity: 0,
          }}
        >
          {['✨', '⭐', '💫', '🌟'][i % 4]}
        </span>
      ))}
    </div>
  );
}

export function WelcomeBackOverlay({
  characterName,
  characterAvatarUrl,
  daysSinceLastChat,
  onDismiss,
}: WelcomeBackOverlayProps) {
  const t = useTranslations('chat');
  const tc = useTranslations('common');
  const [visible, setVisible] = useState(false);
  const isLongAbsence = daysSinceLastChat >= 7;
  const isMediumAbsence = daysSinceLastChat >= 3;

  /* フェードイン */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* 3秒後に自動 dismiss */
  useEffect(() => {
    const timer = setTimeout(() => handleDismiss(), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 320);
  };

  /* 背景グラデーション: 日数で変化 */
  const backdropClass = isLongAbsence
    ? 'bg-gradient-to-b from-indigo-950/90 via-purple-950/85 to-black/90'
    : isMediumAbsence
    ? 'bg-gradient-to-b from-gray-950/88 via-purple-950/75 to-black/85'
    : 'bg-black/70';

  const cardGradient = isLongAbsence
    ? 'from-indigo-900/80 via-purple-900/70 to-gray-900/90 border-yellow-400/30'
    : isMediumAbsence
    ? 'from-purple-900/70 via-gray-900/80 to-gray-950/90 border-purple-400/25'
    : 'from-gray-900 to-gray-950 border-white/10';

  const ringColor = isLongAbsence
    ? 'bg-yellow-400/40'
    : isMediumAbsence
    ? 'bg-purple-400/35'
    : 'bg-purple-500/30';

  const borderColor = isLongAbsence
    ? 'border-yellow-400/60'
    : isMediumAbsence
    ? 'border-purple-400/50'
    : 'border-purple-500/50';

  const message = getReunionMessage(characterName, daysSinceLastChat);

  return (
    <>
      {/* アニメーション定義 */}
      <style>{`
        @keyframes wb-fadein {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wb-star {
          0%   { opacity: 0; transform: scale(0.5) translateY(0); }
          40%  { opacity: 1; transform: scale(1.2) translateY(-8px); }
          100% { opacity: 0; transform: scale(0.8) translateY(-24px); }
        }
        .animate-wb-card {
          animation: wb-fadein 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .animate-wb-star {
          animation: wb-star 3s ease-in-out infinite;
        }
      `}</style>

      {/* フルスクリーンオーバーレイ */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity duration-300 ${backdropClass} ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleDismiss}
        role="dialog"
        aria-modal="true"
        aria-label={t('welcomeBackAriaLabel', { name: characterName })}
      >
        {/* 星パーティクル（7日以上） */}
        {isLongAbsence && <StarParticles />}

        {/* カード */}
        <div
          className={`relative bg-gradient-to-b ${cardGradient} border rounded-3xl p-8 mx-5 max-w-sm w-full text-center shadow-2xl animate-wb-card`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 3日以上: グラデーション輝き帯 */}
          {isMediumAbsence && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-10"
                style={{
                  background: isLongAbsence
                    ? 'conic-gradient(from 0deg, transparent, #facc15, transparent 30%)'
                    : 'conic-gradient(from 0deg, transparent, #a855f7, transparent 30%)',
                  animation: 'spin 6s linear infinite',
                }}
              />
            </div>
          )}

          {/* アバター */}
          <div className="relative mx-auto w-24 h-24 mb-4">
            {/* ping リング */}
            <div className={`absolute inset-0 rounded-full ${ringColor} animate-ping`} style={{ animationDuration: '2s' }} />
            {/* アバター枠 */}
            <div className={`relative w-24 h-24 rounded-full overflow-hidden border-2 ${borderColor} shadow-lg`}>
              {characterAvatarUrl ? (
                <img
                  src={characterAvatarUrl}
                  alt={characterName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl">
                  💜
                </div>
              )}
            </div>
            {/* 7日以上: 王冠バッジ */}
            {isLongAbsence && (
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>
            )}
          </div>

          {/* キャラ名 */}
          <h2 className="text-white font-bold text-lg mb-1">{characterName}</h2>

          {/* 日数バッジ */}
          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium mb-4 ${
            isLongAbsence
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
              : isMediumAbsence
              ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
              : 'bg-gray-700/60 text-gray-400'
          }`}>
            {isLongAbsence ? '🌟' : isMediumAbsence ? '💜' : '⏰'} {t('welcomeBackBadge', { count: daysSinceLastChat })}
          </div>

          {/* 再会メッセージ */}
          <p className="text-white/90 text-base leading-relaxed mb-6">
            「{message}」
          </p>

          {/* 話しかけるボタン */}
          <button
            onClick={handleDismiss}
            className={`w-full py-3 rounded-xl font-medium text-white transition-all duration-200 active:scale-95 ${
              isLongAbsence
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 shadow-lg shadow-yellow-500/20'
                : isMediumAbsence
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-lg shadow-purple-500/20'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {t('talkButton')}
          </button>

          {/* 自動閉じカウントダウンヒント */}
          <p className="text-gray-600 text-xs mt-3">{t('tapToClose')}</p>
        </div>
      </div>
    </>
  );
}
