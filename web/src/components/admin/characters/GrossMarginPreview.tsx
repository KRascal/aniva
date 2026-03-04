'use client';

import React from 'react';

export function GrossMarginPreview({
  fcMonthlyPriceJpy,
  freeMessageLimit,
  fcIncludedCallMin,
}: {
  fcMonthlyPriceJpy: string;
  freeMessageLimit: string;
  fcIncludedCallMin: string;
}) {
  const price = parseInt(fcMonthlyPriceJpy, 10) || 0;
  const msgs = parseInt(freeMessageLimit, 10) || 0;
  const callMin = parseInt(fcIncludedCallMin, 10) || 0;

  const revenue = price * 0.96;
  const cost = msgs * 0.15 + callMin * 20;
  const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;

  const marginColor =
    margin >= 60 ? 'text-green-400' :
    margin >= 40 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="mt-3 p-3 bg-gray-900/60 rounded-lg border border-gray-700/60">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">📊 粗利率プレビュー</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-500">Web手取り</p>
          <p className="text-white font-medium">¥{Math.round(revenue).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">推定原価</p>
          <p className="text-white font-medium">¥{Math.round(cost).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">粗利率</p>
          <p className={`font-bold text-sm ${marginColor}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
