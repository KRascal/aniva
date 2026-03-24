import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CoinsPageClient from './CoinsPageClient';

export const metadata: Metadata = {
  title: 'コイン | ANIVA',
  description: 'コインを購入してキャラクターとの体験を広げよう',
};

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
  const userId = session?.user?.id;
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
      ? (() => {
          // スターター（最安パック）の単価を基準に割引率を計算
          const basePricePerCoin = dbPackages[0] ? dbPackages[0].priceWebJpy / dbPackages[0].coinAmount : 2;
          return dbPackages.map((pkg, i) => {
            const pricePerCoin = pkg.priceWebJpy / pkg.coinAmount;
            const discount = Math.round((1 - pricePerCoin / basePricePerCoin) * 100);
            return {
              id: pkg.id,
              name: pkg.name,
              coinAmount: pkg.coinAmount,
              priceWebJpy: pkg.priceWebJpy,
              bonus: discount > 0 ? discount : 0,
              popular: i === 2,
              callMinutes: Math.floor(pkg.coinAmount / 60),
            };
          });
        })()
      : FALLBACK_PACKAGES;

  // 現在の残高（free/paid分離）
  const coinBalance = await prisma.coinBalance.findUnique({ where: { userId } });
  const freeBalance = coinBalance?.freeBalance ?? 0;
  const paidBalance = coinBalance?.paidBalance ?? 0;
  // 後方互換: freeBalance/paidBalance未移行の場合はlegacy balanceを利用
  const legacyBalance = coinBalance?.balance ?? 0;
  const currentBalance = (freeBalance + paidBalance > 0 || legacyBalance === 0)
    ? freeBalance + paidBalance
    : legacyBalance;

  return (
    <CoinsPageClient
      packages={packages}
      currentBalance={currentBalance}
      freeBalance={freeBalance}
      paidBalance={paidBalance}
      status={status}
    />
  );
}
