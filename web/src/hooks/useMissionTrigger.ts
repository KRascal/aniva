/**
 * useMissionTrigger — ページ訪問時にミッションを自動完了させるフック
 *
 * 使い方:
 *   useMissionTrigger('explore_visit');
 *   useMissionTrigger('letter_check');
 *
 * - 認証済みの場合のみ発火
 * - fire-and-forget（エラーは無視）
 * - 1セッション1回のみ（sessionStorageで管理）
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useMissionTrigger(missionId: string) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    // 同一セッション内で既に送信済みならスキップ
    const key = `mission_triggered_${missionId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    // fire-and-forget
    fetch('/api/missions/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionId }),
    }).catch(() => {/* ignore */});
  }, [status, missionId]);
}
