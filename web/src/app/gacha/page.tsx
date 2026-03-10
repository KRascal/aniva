'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** /gacha は /explore/gacha に統一。リダイレクトのみ */
export default function GachaRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/explore/gacha'); }, [router]);
  return null;
}
