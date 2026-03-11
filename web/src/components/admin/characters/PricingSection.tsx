'use client';

import React from 'react';
import { GrossMarginPreview } from '@/components/admin/characters/GrossMarginPreview';
import { CharacterFormData } from '@/components/admin/characters/types';

interface PricingSectionProps {
  form: CharacterFormData;
  onChange: (key: keyof CharacterFormData, value: string) => void;
}

export function PricingSection({ form, onChange }: PricingSectionProps) {
  return (
    <div className="mt-6 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
      <h3 className="text-white font-semibold text-sm mb-4">💰 料金設定</h3>

      {/* 通常（非FC） */}
      <div className="mb-4">
        <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-3">🪙 通常（非FC会員）</p>
        <p className="text-gray-500 text-xs mb-3">FC未加入ユーザーのコイン消費設定</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">チャット / 1通</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.chatCoinPerMessage}
                onChange={(e) => onChange('chatCoinPerMessage', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                min={1}
                max={100}
              />
              <span className="text-gray-400 text-sm shrink-0">コイン</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">デフォルト: 10コイン</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">通話 / 1分</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="200"
                value={form.callCoinPerMin}
                onChange={(e) => onChange('callCoinPerMin', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-400 text-sm shrink-0">コイン</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">最低 200コイン</p>
          </div>
        </div>
      </div>

      {/* FCメンバーシップ */}
      <div className="pt-4 border-t border-gray-700/60">
        <p className="text-purple-400 text-xs font-semibold uppercase tracking-widest mb-3">👑 FCメンバーシップ</p>
        <p className="text-gray-500 text-xs mb-3">FC加入者はチャット無制限 + 通話時間インクルード</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">FC月額</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="3480"
                value={form.fcMonthlyPriceJpy}
                onChange={(e) => onChange('fcMonthlyPriceJpy', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-400 text-sm shrink-0">円</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">最低 ¥3,480</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">月額無料コイン付与</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={form.fcMonthlyCoins}
                onChange={(e) => onChange('fcMonthlyCoins', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                min={0}
                max={10000}
              />
              <span className="text-gray-400 text-sm shrink-0">コイン</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">毎月FC加入者に付与（デフォルト: 500）</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">込み通話時間</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={form.fcIncludedCallMin}
                onChange={(e) => onChange('fcIncludedCallMin', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-400 text-sm shrink-0">分/月</span>
            </div>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">超過通話料金</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="100"
                value={form.fcOverageCallCoinPerMin}
                onChange={(e) => onChange('fcOverageCallCoinPerMin', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-400 text-sm shrink-0">コイン/分</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">最低 100コイン</p>
          </div>
        </div>
      </div>

      {/* 粗利率プレビュー */}
      <GrossMarginPreview
        fcMonthlyPriceJpy={form.fcMonthlyPriceJpy}
        freeMessageLimit={'0'}
        fcIncludedCallMin={form.fcIncludedCallMin}
      />
    </div>
  );
}
