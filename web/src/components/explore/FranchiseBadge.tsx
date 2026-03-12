'use client';

import { FRANCHISE_META } from '@/app/explore/explore-data';

export function FranchiseBadge({ franchise }: { franchise: string }) {
  const meta = FRANCHISE_META[franchise];
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/70 border border-white/20">
        {franchise}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}>
      {franchise}
    </span>
  );
}
