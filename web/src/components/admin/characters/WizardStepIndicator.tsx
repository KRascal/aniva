'use client';

import React from 'react';

export function WizardStepIndicator({ step, total }: { step: number; total: number }) {
  const labels = ['基本情報', 'キャラ設定', 'SOUL生成', '料金設定', '確認・作成', 'Moments'];
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: total }, (_, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  i + 1 === step
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : i + 1 < step
                    ? 'bg-purple-900/60 border-purple-500 text-purple-300'
                    : 'bg-gray-800 border-gray-600 text-gray-500'
                }`}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${i + 1 === step ? 'text-purple-300' : 'text-gray-600'}`}>
                {labels[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i + 1 < step ? 'bg-purple-500' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
