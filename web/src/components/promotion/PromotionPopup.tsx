'use client';

/**
 * PromotionPopup - 中毒設計ポップアップ
 * ユーザーの行動トリガーに基づき、適切なタイミングで表示
 * 1日3回上限 / 同種は24h非表示
 */

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type PopupType =
  | 'free_gacha'       // 無料ガチャ誘導
  | 'daily_mission'    // デイリーミッション
  | 'ranking_notice'   // ランキング通知
  | 'fc_invite';       // FC誘導

interface PopupConfig {
  type: PopupType;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: string;
  gradient: string;
}

const POPUP_CONFIGS: Record<PopupType, PopupConfig> = {
  free_gacha: {
    type: 'free_gacha',
    title: '無料ガチャが待ってる！',
    description: '今すぐ無料でガチャを1回引けます。限定カードをゲットしよう！',
    cta: 'ガチャを引く',
    href: '/explore/gacha',
    icon: '🎰',
    gradient: 'from-purple-600 to-pink-600',
  },
  daily_mission: {
    type: 'daily_mission',
    title: 'デイリーミッション',
    description: '今日のミッションをクリアしてコインをゲットしよう',
    cta: 'ミッションを見る',
    href: '/mypage#missions',
    icon: '🎯',
    gradient: 'from-amber-500 to-orange-600',
  },
  ranking_notice: {
    type: 'ranking_notice',
    title: 'あなたはランキング入り！',
    description: '今週のランキングに入っています。FCに参加してスコアを伸ばそう',
    cta: 'ランキングを見る',
    href: '/ranking',
    icon: '🏆',
    gradient: 'from-yellow-500 to-amber-600',
  },
  fc_invite: {
    type: 'fc_invite',
    title: 'FC会員限定特典',
    description: 'FC加入でランキング参加・限定コンテンツ・毎月コインが手に入ります',
    cta: 'FCに参加する',
    href: '/mypage#fc',
    icon: '👑',
    gradient: 'from-indigo-600 to-purple-700',
  },
};

const MAX_DAILY_POPUPS = 3;
const DAILY_KEY = 'popup_shown_date';
const DAILY_COUNT_KEY = 'popup_daily_count';

function canShowPopup(type: PopupType): boolean {
  if (typeof window === 'undefined') return false;

  // 同種は24h非表示
  const dismissedKey = `popup_dismissed_${type}`;
  const dismissed = sessionStorage.getItem(dismissedKey);
  if (dismissed) return false;

  // 1日3回上限
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(DAILY_KEY);
  const count = storedDate === today ? parseInt(localStorage.getItem(DAILY_COUNT_KEY) ?? '0', 10) : 0;
  return count < MAX_DAILY_POPUPS;
}

function recordShown(type: PopupType) {
  if (typeof window === 'undefined') return;
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(DAILY_KEY);
  const count = storedDate === today ? parseInt(localStorage.getItem(DAILY_COUNT_KEY) ?? '0', 10) : 0;
  localStorage.setItem(DAILY_KEY, today);
  localStorage.setItem(DAILY_COUNT_KEY, String(count + 1));
  sessionStorage.setItem(`popup_dismissed_${type}`, '1');
}

interface PromotionPopupProps {
  trigger: PopupType;
  delayMs?: number;
  onDismiss?: () => void;
}

export function PromotionPopup({ trigger, delayMs = 0, onDismiss }: PromotionPopupProps) {
  const [visible, setVisible] = useState(false);
  const config = POPUP_CONFIGS[trigger];

  useEffect(() => {
    if (!canShowPopup(trigger)) return;
    const timer = setTimeout(() => {
      setVisible(true);
      recordShown(trigger);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [trigger, delayMs]);

  const dismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      <div
        className="pointer-events-auto bg-gray-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-slide-up"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        {/* Gradient top bar */}
        <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-xl flex-shrink-0`}>
              {config.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">{config.title}</p>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{config.description}</p>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* CTA */}
          <Link
            href={config.href}
            onClick={dismiss}
            className={`mt-3 w-full flex items-center justify-center py-2 rounded-xl bg-gradient-to-r ${config.gradient} text-white text-sm font-bold transition-opacity hover:opacity-90`}
          >
            {config.cta} →
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * usePromotionTrigger - ルートごとのトリガー判定フック
 */
export function usePromotionTrigger(): PopupType | null {
  const pathname = usePathname();
  const [trigger, setTrigger] = useState<PopupType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // タイムラインで30秒滞在 → FC誘導
    if (pathname === '/moments') {
      const timer = setTimeout(() => {
        if (canShowPopup('fc_invite')) setTrigger('fc_invite');
      }, 30000);
      return () => clearTimeout(timer);
    }

    // ガチャページで無料ガチャ誘導
    if (pathname === '/explore/gacha') {
      const timer = setTimeout(() => {
        if (canShowPopup('free_gacha')) setTrigger('free_gacha');
      }, 5000);
      return () => clearTimeout(timer);
    }

    // ランキングページ通知
    if (pathname === '/ranking') {
      const timer = setTimeout(() => {
        if (canShowPopup('ranking_notice')) setTrigger('ranking_notice');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return trigger;
}
