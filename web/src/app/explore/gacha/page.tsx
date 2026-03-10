'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /explore/gacha → /gacha にリダイレクト
 * マイページ版(/gacha)が高品質なので統一
 */
export default function ExploreGachaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/gacha');
  }, [router]);
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
