'use client';

export type ProfileTabId = 'posts' | 'fc' | 'dl' | 'profile' | 'diary';

export interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
}

const TABS: { id: ProfileTabId; label: string }[] = [
  { id: 'posts', label: '投稿' },
  { id: 'fc', label: 'FC限定' },
  { id: 'dl', label: 'DL' },
  { id: 'profile', label: '関係値' },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 bg-gray-950 border-b border-white/5">
      <div className="flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center border-b-2 ${
              activeTab === tab.id
                ? 'border-purple-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
