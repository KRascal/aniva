import type { Metadata } from 'next';
import CoinsPageClient from './CoinsPageClient';

export const metadata: Metadata = {
  title: 'コイン | ANIVA',
  description: 'コインを購入してキャラクターとの体験を広げよう',
};

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status;

  return <CoinsPageClient status={status} />;
}
