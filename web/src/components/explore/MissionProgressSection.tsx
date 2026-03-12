'use client';

import { useRouter } from 'next/navigation';
import { FadeSection } from './FadeSection';

export interface MissionProgressSectionProps {
  completed: number;
  total: number;
}

export function MissionProgressSection({
  completed,
  total,
}: MissionProgressSectionProps) {
  const router = useRouter();
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0;
  const remaining = total - completed;
  const isAllDone = completed >= total && total > 0;
  const isNearDone = pct >= 80 && !isAllDone;

  return (
    <FadeSection delay={13}>
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            📋 今日のミッション
          </h3>
          <button
            onClick={() => { router.push('/mypage'); setTimeout(() => { const el = document.getElementById('daily-missions'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 500); }}
            className="text-xs font-semibold"
            style={{ color: 'rgba(167,139,250,0.85)' }}
          >
            一覧 →
          </button>
        </div>

        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: isAllDone
              ? 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))'
              : isNearDone
              ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))'
              : 'rgba(255,255,255,0.04)',
            border: isAllDone
              ? '1px solid rgba(16,185,129,0.35)'
              : isNearDone
              ? '1px solid rgba(245,158,11,0.35)'
              : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* 花火エフェクト（全完了時） */}
          {isAllDone && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(14)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    left: `${8 + i * 6.5}%`,
                    top: '60%',
                    background: ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i % 6],
                    animation: `missionFw${i % 4 + 1} 1.4s ease-out ${i * 0.07}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* ステータス行 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-sm ${
                  isAllDone ? 'text-emerald-300' : isNearDone ? 'text-yellow-300' : 'text-white'
                }`}
              >
                {isAllDone
                  ? '全ミッションクリア'
                  : isNearDone
                  ? `あと${remaining}個で達成`
                  : `${completed} / ${total} ミッション完了`}
              </p>
              {!isAllDone && (
                <p className="text-white/45 text-xs mt-0.5">
                  {isNearDone
                    ? '今日中にクリアしてボーナスを獲得'
                    : 'ミッション達成でコインを獲得'}
                </p>
              )}
              {isAllDone && (
                <p className="text-emerald-400/70 text-xs mt-0.5">
                  今日のボーナスコインを全て獲得しました
                </p>
              )}
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${
                isAllDone
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : isNearDone
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {Math.round(pct)}%
            </span>
          </div>

          {/* プログレスバー */}
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isAllDone
                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : isNearDone
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                boxShadow: isAllDone
                  ? '0 0 10px rgba(16,185,129,0.6)'
                  : isNearDone
                  ? '0 0 10px rgba(245,158,11,0.6)'
                  : '0 0 8px rgba(139,92,246,0.5)',
              }}
            />
          </div>

          {/* ミッションドット（6個以下の場合） */}
          {total > 0 && total <= 6 && (
            <div className="flex gap-2 mt-3 justify-center">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{
                    background:
                      i < completed
                        ? isAllDone
                          ? '#10b981'
                          : isNearDone
                          ? '#f59e0b'
                          : '#8b5cf6'
                        : 'rgba(255,255,255,0.15)',
                    transform: i < completed ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: i < completed
                      ? isNearDone
                        ? '0 0 4px rgba(245,158,11,0.6)'
                        : '0 0 4px rgba(139,92,246,0.5)'
                      : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </FadeSection>
  );
}
