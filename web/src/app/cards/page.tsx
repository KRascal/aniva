'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GachaContent } from '@/app/explore/gacha/page';
import { TabErrorBoundary } from '@/components/cards/TabErrorBoundary';
import { CardCollectionTab } from '@/components/cards/CardCollectionTab';

export default function CardsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'collection' | 'gacha'>('collection');
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 150 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx < 0 && activeTab === 'collection') setActiveTab('gacha');
      if (dx > 0 && activeTab === 'gacha') setActiveTab('collection');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
            カード
          </h1>
        </div>

        {/* Tab switcher */}
        <div className="max-w-lg mx-auto px-4 pb-2">
          <div className="relative flex bg-gray-800/60 rounded-xl p-1">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ease-out"
              style={{
                left: activeTab === 'collection' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
            />
            <button
              onClick={() => setActiveTab('collection')}
              className={`relative z-10 flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors ${
                activeTab === 'collection' ? 'text-white' : 'text-gray-400'
              }`}
            >
              コレクション
            </button>
            <button
              onClick={() => setActiveTab('gacha')}
              className="relative z-10 flex-1 py-2 text-sm font-bold text-center rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              ガチャ
            </button>
          </div>
        </div>
      </header>

      {/* Content with swipe */}
      <div
        className="max-w-lg mx-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'collection' ? (
          <div className="min-h-[60vh]">
            <TabErrorBoundary><CardCollectionTab /></TabErrorBoundary>
          </div>
        ) : (
          <div className="min-h-[60vh]">
            <TabErrorBoundary key="gacha"><GachaContent embedded /></TabErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
