import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: 'ja' | 'en';
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: true,
  language: 'ja',
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      displayName: true,
      plan: true,
      language: true,
      settings: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const savedSettings = (user.settings as Partial<UserSettings>) || {};
  const settings: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    language: (user.language as 'ja' | 'en') ?? DEFAULT_SETTINGS.language,
  };

  return NextResponse.json({
    settings,
    email: user.email,
    displayName: user.displayName,
    plan: user.plan,
  });
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Partial<UserSettings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate fields
  const allowedThemes = ['light', 'dark', 'system'];
  const allowedLangs = ['ja', 'en'];
  if (body.theme && !allowedThemes.includes(body.theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  }
  if (body.language && !allowedLangs.includes(body.language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, settings: true, language: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const currentSettings = (user.settings as Partial<UserSettings>) || {};
  const newSettings: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    ...body,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      settings: newSettings as unknown as Prisma.InputJsonValue,
      ...(body.language ? { language: body.language } : {}),
    },
  });

  return NextResponse.json({ settings: newSettings });
}
