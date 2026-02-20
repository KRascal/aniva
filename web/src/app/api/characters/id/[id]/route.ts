import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
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
  });

  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  return NextResponse.json({ character });
}
