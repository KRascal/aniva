'use client';

import { FcMembershipSection } from '@/components/FcMembershipSection';
import { MomentCard as SharedMomentCard, type Moment as SharedMoment } from '@/components/moments/MomentCard';
import type { Character, MomentItem } from '@/app/profile/[characterId]/profile-data';

export interface ProfileFCTabProps {
  character: Character | null;
  characterId: string;
  isFanclub: boolean;
  onJoinFC: () => void;
  onCancelFC?: () => void;
  moments: MomentItem[];
  toSharedMoment: (m: MomentItem) => SharedMoment;
  onLike: (momentId: string) => void;
  userId: string | null;
}

export function ProfileFCTab({
  character,
  characterId,
  isFanclub,
  onJoinFC,
  onCancelFC,
  moments,
  toSharedMoment,
  onLike,
  userId,
}: ProfileFCTabProps) {
  return (
    <div className="space-y-4 pt-2 pb-24">
      {character && (
        <FcMembershipSection
          characterId={characterId}
          characterName={character.name}
          isFanclub={isFanclub}
          fcMonthlyPriceJpy={character.fcMonthlyPriceJpy}
          fcIncludedCallMin={character.fcIncludedCallMin}
          fcOverageCallCoinPerMin={character.fcOverageCallCoinPerMin}
          onJoinFC={onJoinFC}
          onCancel={onCancelFC}
        />
      )}
      {isFanclub ? (
        <>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1">FC限定コンテンツ</p>
          {moments.filter(m => m.visibility === 'PREMIUM' || m.visibility === 'STANDARD').length === 0 ? (
            <div className="text-center py-10">
              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <p className="text-white/40 text-sm">FC限定コンテンツは準備中です</p>
            </div>
          ) : (
            moments.filter(m => m.visibility === 'PREMIUM' || m.visibility === 'STANDARD').map((moment) => (
              <SharedMomentCard key={moment.id} moment={toSharedMoment(moment)} onLike={onLike} currentUserId={userId} />
            ))
          )}
        </>
      ) : (
        <div className="bg-gray-900/70 rounded-2xl p-5 border border-purple-900/30 text-center">
          <div className="flex justify-center mb-2">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-white font-bold text-sm mb-1">FC限定コンテンツ</p>
          <p className="text-white/40 text-xs">ファンクラブに加入するとここに限定投稿が表示されます</p>
        </div>
      )}
    </div>
  );
}
