'use client';

import { useEffect, useState } from 'react';

interface LevelUpModalProps {
  newLevel: number;
  levelName: string;
  milestone?: { title: string; characterMessage: string; emoji: string };
  onClose: () => void;
}

export function LevelUpModal({ newLevel, levelName, milestone, onClose }: LevelUpModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // フェードイン
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={handleClose}
    >
      {/* Card */}
      <div
        className={`relative bg-gray-900 border-2 border-purple-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-purple-900/50 transition-all duration-300 ${
          visible ? 'scale-100' : 'scale-90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Stars decoration */}
        <div className="absolute -top-3 -left-3 text-2xl animate-bounce">✨</div>
        <div className="absolute -top-3 -right-3 text-2xl animate-bounce" style={{ animationDelay: '0.15s' }}>✨</div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>🎊</div>

        {/* Header */}
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-white mb-1">🎉 レベルアップ！</p>
          <p className="text-purple-300 text-sm">新しい絆が生まれた</p>
        </div>

        {/* Milestone badge */}
        {milestone && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl">{milestone.emoji}</span>
            <span className="text-xl font-bold text-yellow-400">{milestone.title}</span>
            <span className="text-3xl">{milestone.emoji}</span>
          </div>
        )}

        {/* Level display */}
        <div className="text-center mb-4">
          <div className="text-gray-400 text-sm mb-1">
            Level {newLevel - 1} → <span className="text-purple-400 font-bold text-lg">Level {newLevel}</span>
          </div>
          <div className="text-white font-semibold text-lg">「{levelName}」</div>
        </div>

        {/* Character message */}
        {milestone?.characterMessage && (
          <div className="bg-gray-800 rounded-xl p-4 mb-5 border border-purple-500/30">
            <div className="flex items-start gap-2">
              <span className="text-2xl flex-shrink-0">🏴‍☠️</span>
              <p className="text-gray-100 text-sm leading-relaxed italic">
                「{milestone.characterMessage}」
              </p>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-base hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95"
        >
          OK！
        </button>
      </div>
    </div>
  );
}
