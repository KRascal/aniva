'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { TabKey, CharacterMeta } from '@/components/admin/bible/types';
import { Toast } from '@/components/admin/bible/shared';
import { BibleSoulTab } from '@/components/admin/bible/BibleSoulTab';
import { BibleQuotesTab } from '@/components/admin/bible/BibleQuotesTab';
import { BibleBoundariesTab } from '@/components/admin/bible/BibleBoundariesTab';
import { BibleVoiceTab } from '@/components/admin/bible/BibleVoiceTab';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'soul', label: 'Soul' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'boundaries', label: 'Boundaries' },
  { key: 'voice', label: 'Voice' },
];

export default function BiblePage() {
  const params = useParams();
  const characterId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('soul');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [charMeta, setCharMeta] = useState<CharacterMeta | null>(null);

  useEffect(() => {
    fetch('/api/admin/characters')
      .then((r) => r.json())
      .then((chars: CharacterMeta[]) => {
        const found = chars.find((c) => c.id === characterId);
        if (found) setCharMeta(found);
      })
      .catch(() => {});
  }, [characterId]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/characters"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </a>
          <div>
            <h1 className="text-xl font-bold text-white">
              {charMeta ? `${charMeta.name} — Bible` : 'Character Bible'}
            </h1>
            {charMeta && (
              <p className="text-gray-500 text-xs mt-0.5">{charMeta.slug}</p>
            )}
          </div>
        </div>
        <a
          href={`/admin/characters/${characterId}/test-chat`}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-purple-400 hover:text-purple-300 rounded-xl text-sm font-medium transition-colors"
        >
          🧪 テストチャット
        </a>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-12">
        {activeTab === 'soul' && <BibleSoulTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'quotes' && <BibleQuotesTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'boundaries' && <BibleBoundariesTab characterId={characterId} onToast={showToast} />}
        {activeTab === 'voice' && <BibleVoiceTab characterId={characterId} onToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
