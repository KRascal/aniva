'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ナビゲーション時にサーバーのBUILD_IDと比較し、
 * 不一致（デプロイ後の古いキャッシュ）ならハードリロードする。
 */
export function BuildIdChecker() {
  const pathname = usePathname();
  const initialBuildId = useRef<string | null>(null);
  const hasChecked = useRef(false);

  // 初回マウント時にBUILD_IDを取得
  useEffect(() => {
    fetch('/api/build-id', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.buildId && data.buildId !== 'unknown') {
          initialBuildId.current = data.buildId;
        }
      })
      .catch(() => {});
  }, []);

  // ナビゲーション時にBUILD_IDを再チェック
  useEffect(() => {
    // 初回パスは既にフルロードなのでスキップ
    if (!hasChecked.current) {
      hasChecked.current = true;
      return;
    }

    if (!initialBuildId.current) return;

    fetch('/api/build-id', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.buildId && data.buildId !== 'unknown' && data.buildId !== initialBuildId.current) {
          // ビルドIDが変わった → デプロイが入った → ハードリロード
          console.log('[ANIVA] Build ID mismatch, reloading...', {
            client: initialBuildId.current,
            server: data.buildId,
          });
          window.location.reload();
        }
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}
