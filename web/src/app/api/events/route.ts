/**
 * イベント API
 * GET /api/events
 * - 今日の記念日リスト
 * - 誕生日キャラクター
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayEvents } from '@/lib/today-events';

export async function GET() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const birthdayKey = `${month}-${day}`;

  // 今日の記念日
  const todayEvents = getTodayEvents(today);

  // 誕生日キャラクター
  let birthdayCharacters: { id: string; name: string; slug: string; avatarUrl: string | null; franchise: string }[] = [];
  try {
    birthdayCharacters = await prisma.character.findMany({
      where: { birthday: birthdayKey, isActive: true },
      select: { id: true, name: true, slug: true, avatarUrl: true, franchise: true },
    });
  } catch {
    // DB not available
  }

  // 来週までの誕生日キャラ（次のお楽しみ）
  const upcomingBirthdays: {
    id: string; name: string; slug: string; avatarUrl: string | null;
    birthday: string | null; daysUntil: number;
  }[] = [];

  try {
    const allChars = await prisma.character.findMany({
      where: { isActive: true, birthday: { not: null } },
      select: { id: true, name: true, slug: true, avatarUrl: true, birthday: true },
    });

    for (const char of allChars) {
      if (!char.birthday) continue;
      const [bm, bd] = char.birthday.split('-').map(Number);
      const thisYear = new Date(today.getFullYear(), bm - 1, bd);
      const nextYear = new Date(today.getFullYear() + 1, bm - 1, bd);
      const target = thisYear >= today ? thisYear : nextYear;
      const diffMs = target.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 7) {
        upcomingBirthdays.push({ ...char, daysUntil });
      }
    }
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  } catch {
    // ignore
  }

  return NextResponse.json({
    date: today.toISOString().split('T')[0],
    todayEvents,
    birthdayCharacters,
    upcomingBirthdays,
  });
}
