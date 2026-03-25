import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const FALLBACK_PACKAGES = [
  { id: 'trial', name: 'お試し', coinAmount: 500, priceWebJpy: 500, bonus: 0, popular: false, callMinutes: 8 },
  { id: 'standard', name: '通常', coinAmount: 1050, priceWebJpy: 1000, bonus: 5, popular: false, callMinutes: 17 },
  { id: 'value', name: 'お得', coinAmount: 3300, priceWebJpy: 3000, bonus: 10, popular: true, callMinutes: 55 },
  { id: 'bulk', name: '大量', coinAmount: 12000, priceWebJpy: 10000, bonus: 20, popular: false, callMinutes: 200 },
];

export async function GET() {
  try {
    const dbPackages = await prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        coinAmount: true,
        priceWebJpy: true,
      },
    });

    const packages = dbPackages.length > 0
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

    return NextResponse.json({ packages });
  } catch (error) {
    logger.error('Failed to fetch coin packages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
