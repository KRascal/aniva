'use client';

import { MomentCard as SharedMomentCard, type Moment as SharedMoment } from '@/components/moments/MomentCard';
import type { MomentItem, RelationshipData } from '@/app/profile/[characterId]/profile-data';

export interface ProfileMomentsProps {
  moments: MomentItem[];
  isFanclub: boolean;
  relationship: RelationshipData | null;
  level: number;
  characterId: string;
  toSharedMoment: (m: MomentItem) => SharedMoment;
  onLike: (momentId: string) => void;
  userId: string | null;
}

export function ProfileMoments({
  moments,
  isFanclub,
  relationship,
  level,
  characterId,
  toSharedMoment,
  onLike,
  userId,
}: ProfileMomentsProps) {
  const visibleMoments = moments.filter(m => m.visibility !== 'PREMIUM' || isFanclub || !m.isLocked);

  return (
    <div className="space-y-3 pt-2 pb-24">
      {visibleMoments.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex justify-center mb-3">
            <svg className="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
          </div>
          <p className="text-white/40 text-sm">まだ投稿がありません</p>
        </div>
      ) : (
        moments.map((moment) => (
          <SharedMomentCard key={moment.id} moment={toSharedMoment(moment)} onLike={onLike} currentUserId={userId} />
        ))
      )}

      {/* 🔒 親密度ゲート ティーザー */}
      {relationship && level < 5 && (
        <div className="mt-2 bg-gray-900/60 border border-white/8 rounded-2xl p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{level >= 3 ? '⭐' : '🔒'}</span>
            <p className="text-white/70 text-sm font-medium">
              {level < 3
                ? `Lv3で特別な投稿が解放されます`
                : `Lv5でFC限定投稿が全解放されます`}
            </p>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((level - 1) / 4) * 100)}%` }}
            />
          </div>
          <p className="text-white/30 text-xs">
            現在 Lv{level} — もっと話しかけて親密度を上げよう
          </p>
          <a
            href={`/chat/${characterId}`}
            className="inline-flex items-center gap-1.5 bg-purple-700/50 hover:bg-purple-700/70 text-purple-200 text-xs font-medium py-2 px-4 rounded-xl transition-colors border border-purple-600/30"
          >
            <span>💬</span>
            話しかける
          </a>
        </div>
      )}
    </div>
  );
}
