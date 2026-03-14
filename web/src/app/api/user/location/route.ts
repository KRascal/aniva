import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedUserId } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

/**
 * POST /api/user/location
 * ブラウザGeolocation APIから取得したlat/lonを保存
 */
export async function POST(req: Request) {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { latitude, longitude, city } = await req.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // 緯度経度の範囲チェック
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 });
    }

    // UserProfile.basicsにlat/lon/cityを保存
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { basics: true },
    });

    const currentBasics = (profile?.basics ?? {}) as Record<string, unknown>;
    const updatedBasics = {
      ...currentBasics,
      latitude,
      longitude,
      location: city || currentBasics.location || null,
      locationUpdatedAt: new Date().toISOString(),
    };

    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        basics: updatedBasics,
      },
      update: {
        basics: updatedBasics,
      },
    });

    logger.info(`[UserLocation] Updated location for user ${userId}: ${latitude},${longitude} (${city || 'unknown'})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[UserLocation] Failed to update location:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/user/location
 * 保存済みの位置情報を取得
 */
export async function GET() {
  const userId = await getVerifiedUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { basics: true },
  });

  const basics = (profile?.basics ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    latitude: basics.latitude ?? null,
    longitude: basics.longitude ?? null,
    location: basics.location ?? null,
    locationUpdatedAt: basics.locationUpdatedAt ?? null,
  });
}
