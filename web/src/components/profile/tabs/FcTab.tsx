'use client';

import { FcMembershipSection } from '@/components/FcMembershipSection';
import { MomentCard as SharedMomentCard, type Moment as SharedMoment } from '@/components/moments/MomentCard';
import type { Character, MomentItem, DlContent } from '../profileTypes';

interface FcTabProps {
  character: Character | null;
  characterId: string;
  isFanclub: boolean;
  moments: MomentItem[];
  userId: string | null;
  toSharedMoment: (m: MomentItem) => SharedMoment;
  onLike: (momentId: string) => Promise<void>;
  onJoinFC: () => Promise<void>;
  onSwitchToDl?: () => void;
  dlContents?: DlContent[];
}

export function FcTab({
  character,
  characterId,
  isFanclub,
  moments,
  userId,
  toSharedMoment,
  onLike,
  onJoinFC,
  dlContents,
}: FcTabProps) {
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
          onCancel={isFanclub ? onJoinFC : undefined}
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
          {/* FC限定DLコンテンツ */}
          {dlContents && dlContents.filter(d => !d.locked).length > 0 && (
            <>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest px-1 mt-4">限定ダウンロード</p>
              <div className="grid grid-cols-2 gap-3">
                {dlContents.filter(d => !d.locked).map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-gray-900/80"
                  >
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 flex items-center justify-center bg-gray-800/50">
                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5M12 3h.008v.008H12V3zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold truncate text-white">{item.title}</p>
                      {item.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-600 text-xs">{item.downloadCount.toLocaleString()}DL</span>
                        <a
                          href={`/api/content/${item.id}/download`}
                          className="inline-flex items-center gap-1 text-xs bg-purple-700/60 hover:bg-purple-700/80 text-purple-200 px-2.5 py-1 rounded-lg transition-colors border border-purple-600/30"
                        >
                          <span>↓</span>DL
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
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
