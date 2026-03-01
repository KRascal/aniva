import { NextResponse } from 'next/server';
import { getCharacterPresence, getCharacterMood } from '@/lib/presence-system';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await params;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { slug: true },
  });

  if (!character) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const presence = getCharacterPresence(character.slug);
  const mood = getCharacterMood(character.slug);

  return NextResponse.json({
    presence: {
      isAvailable: presence.isAvailable,
      status: presence.status,
      statusEmoji: presence.statusEmoji,
      responseDelay: presence.responseDelay,
    },
    mood: {
      mood: mood.mood,
      moodLabel: mood.moodLabel,
      moodEmoji: mood.moodEmoji,
    },
  });
}
