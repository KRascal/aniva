'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type OwnedCard, getRarityStyle } from './cards-types';
import { HoloCardThumbnail } from './HoloCardThumbnail';
import { CardDetailModal } from './CardDetailModal';

export function CardCollectionTab() {
  const [cards, setCards] = useState<OwnedCard[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<OwnedCard | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gacha/cards')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        setCards(data.cards ?? []);
        setTotalCards(data.totalCards ?? 0);
      })
      .catch(() => { setCards([]); setTotalCards(0); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRarity ? cards.filter(c => c.card.rarity === filterRarity) : cards;
  const rarities = ['UR', 'SSR', 'SR', 'R', 'N'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{cards.length}<span className="text-white/40 text-sm font-normal">/{totalCards}</span></p>
            <p className="text-white/40 text-[10px]">コレクション</p>
          </div>
        </div>
        {/* Completion bar */}
        <div className="flex-1 max-w-[160px] ml-4">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${totalCards > 0 ? (cards.length / totalCards) * 100 : 0}%` }}
            />
          </div>
          <p className="text-white/30 text-xs text-right mt-0.5">{totalCards > 0 ? Math.round((cards.length / totalCards) * 100) : 0}% Complete</p>
        </div>
      </div>

      {/* Rarity Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setFilterRarity(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
            !filterRarity ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          ALL
        </button>
        {rarities.map(r => {
          const style = getRarityStyle(r);
          const count = cards.filter(c => c.card.rarity === r).length;
          return (
            <button
              key={r}
              onClick={() => setFilterRarity(filterRarity === r ? null : r)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                filterRarity === r ? `bg-gradient-to-r ${style.bg} text-white` : `bg-gray-800 ${style.text} hover:brightness-125`
              }`}
            >
              {r} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-4">
            <svg className="w-14 h-14 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3h10.5a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0117.25 21H6.75A2.25 2.25 0 014.5 18.75V5.25A2.25 2.25 0 016.75 3zm0 0V21m10.5-18V21M3 8.25h18M3 15.75h18" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">最初のカードを手に入れよう</p>
          <p className="text-white/30 text-xs mt-1">ガチャを引いてコレクションを始めよう！</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((oc) => (
            <HoloCardThumbnail
              key={oc.userCardId}
              oc={oc}
              onClick={() => setSelectedCard(oc)}
            />
          ))}
        </div>
      )}

      {/* Card Detail Modal — Portal */}
      {selectedCard && typeof document !== 'undefined' && createPortal(
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />,
        document.body
      )}
    </div>
  );
}
