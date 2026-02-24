import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CoinsPageClient from './CoinsPageClient';

export const dynamic = 'force-dynamic';

const FALLBACK_PACKAGES = [
  {
    id: 'trial',
    name: 'お試し',
    coinAmount: 500,
    priceWebJpy: 500,
    bonus: 0,
    popular: false,
    callMinutes: 8,
  },
  {
    id: 'standard',
    name: '通常',
    coinAmount: 1050,
    priceWebJpy: 1000,
    bonus: 5,
    popular: false,
    callMinutes: 17,
  },
  {
    id: 'value',
    name: 'お得',
    coinAmount: 3300,
    priceWebJpy: 3000,
    bonus: 10,
    popular: true,
    callMinutes: 55,
  },
  {
    id: 'bulk',
    name: '大量',
    coinAmount: 12000,
    priceWebJpy: 10000,
    bonus: 20,
    popular: false,
    callMinutes: 200,
  },
];

export type PackageDisplayItem = {
  id: string;
  name: string;
  coinAmount: number;
  priceWebJpy: number;
  bonus: number;
  popular: boolean;
  callMinutes: number;
};

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) redirect('/login');

  const params = await searchParams;
  const status = params.status;

  // DBからコインパック取得
  const dbPackages = await prisma.coinPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  // DBにデータがあればそれを使用、なければフォールバック
  const packages: PackageDisplayItem[] =
    dbPackages.length > 0
      ? dbPackages.map((pkg, i) => ({
          id: pkg.id,
          name: pkg.name,
          coinAmount: pkg.coinAmount,
          priceWebJpy: pkg.priceWebJpy,
          bonus: i === 0 ? 0 : i === 1 ? 5 : i === 2 ? 10 : 20,
          popular: i === 2,
          callMinutes: Math.floor(pkg.coinAmount / 60),
        }))
      : FALLBACK_PACKAGES;

  // 現在の残高
  const coinBalance = await prisma.coinBalance.findUnique({ where: { userId } });
  const currentBalance = coinBalance?.balance ?? 0;

  return (
    <CoinsPageClient
      packages={packages}
      currentBalance={currentBalance}
      status={status}
    />
  );
}
