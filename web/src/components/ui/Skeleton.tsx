'use client';

import React from 'react';

/**
 * 共通スケルトンローダー
 * Usage: <Skeleton className="w-full h-20 rounded-xl" />
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-800 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * チャットリスト用スケルトンカード
 * アバター円 + テキスト2行
 */
export function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
      {/* アバター */}
      <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
      {/* テキスト */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-24 bg-gray-800 rounded-full animate-pulse" />
          <div className="h-3 w-10 bg-gray-800/60 rounded-full animate-pulse" />
        </div>
        <div className="h-3 w-3/4 bg-gray-800/60 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Momentカード用スケルトン
 * ヘッダー + 画像エリア + アクションバー
 */
export function SkeletonMoment() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5" aria-hidden="true">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-20 bg-gray-800 rounded-full animate-pulse" />
          <div className="h-2.5 w-14 bg-gray-800/60 rounded-full animate-pulse" />
        </div>
      </div>
      {/* 画像エリア */}
      <div className="w-full h-48 bg-gray-800 animate-pulse" />
      {/* アクションバー */}
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="h-5 w-5 bg-gray-800/60 rounded animate-pulse" />
        <div className="h-5 w-5 bg-gray-800/60 rounded animate-pulse" />
        <div className="h-5 w-5 bg-gray-800/60 rounded animate-pulse" />
      </div>
    </div>
  );
}
