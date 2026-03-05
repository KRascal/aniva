import { NextResponse } from 'next/server';
import { getCharacterPresence, getCharacterMood } from '@/lib/presence-system';
import { prisma } from '@/lib/prisma';
import { resolveCharacterId } from '@/lib/resolve-character';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const resolvedId = await resolveCharacterId(slug);

  const character = await prisma.character.findUnique({
    where: { id: resolvedId ?? slug },
    select: {
      slug: true,
      presenceManualMode: true,
      presenceStatus: true,
      presenceEmoji: true,
    },
  });

  if (!character) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // If manual mode is set, use manual values
  if (character.presenceManualMode && character.presenceStatus) {
    const mood = getCharacterMood(character.slug);
    return NextResponse.json({
      presence: {
        isAvailable: true,
        status: character.presenceStatus,
        statusEmoji: character.presenceEmoji ?? '🟢',
        responseDelay: 0,
        statusMessage: null,
      },
      mood: {
        mood: mood.mood,
        moodLabel: mood.moodLabel,
        moodEmoji: mood.moodEmoji,
      },
    });
  }

  // Otherwise use auto-generated presence
  const presence = getCharacterPresence(character.slug);
  const mood = getCharacterMood(character.slug);

  return NextResponse.json({
    presence: {
      isAvailable: presence.isAvailable,
      status: presence.status,
      statusEmoji: presence.statusEmoji,
      responseDelay: presence.responseDelay,
      statusMessage: presence.statusMessage ?? null,
    },
    mood: {
      mood: mood.mood,
      moodLabel: mood.moodLabel,
      moodEmoji: mood.moodEmoji,
    },
  });
}
