import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const characters = await prisma.character.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      franchise: true,
      franchiseEn: true,
      description: true,
      avatarUrl: true,
      coverUrl: true,
      catchphrases: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ characters });
}
