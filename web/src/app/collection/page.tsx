'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** /collection は /cards に統一。リダイレクトのみ */
export default function CollectionRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/cards'); }, [router]);
  return null;
}
