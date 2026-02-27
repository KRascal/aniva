import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface NotificationSettings {
  momentNotifications: boolean;
  chatReplyNotifications: boolean;
  coinNotifications: boolean;
  weeklyDigest: boolean;
}

const defaultSettings: NotificationSettings = {
  momentNotifications: true,
  chatReplyNotifications: true,
  coinNotifications: true,
  weeklyDigest: false,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const settings = (user.settings as Record<string, unknown>) ?? {};
  const notifications: NotificationSettings = {
    ...defaultSettings,
    ...((settings.notifications as Partial<NotificationSettings>) ?? {}),
  };

  return NextResponse.json({ notifications });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const currentSettings = (user.settings as Record<string, unknown>) ?? {};
  const currentNotifications = (currentSettings.notifications as Partial<NotificationSettings>) ?? {};

  const updatedNotifications: NotificationSettings = {
    ...defaultSettings,
    ...currentNotifications,
    ...body,
  };

  const updatedSettings = {
    ...currentSettings,
    notifications: updatedNotifications,
  };

  await prisma.user.update({
    where: { email: session.user.email },
    data: { settings: updatedSettings },
  });

  return NextResponse.json({ notifications: updatedNotifications });
}
