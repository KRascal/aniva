import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        coinAmount: true,
        priceWebJpy: true,
      },
    });
    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Failed to fetch coin packages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
