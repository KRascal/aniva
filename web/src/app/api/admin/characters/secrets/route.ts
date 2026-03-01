import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { CHARACTER_SECRETS } from '@/lib/secret-content';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json([], { status: 200 });

  const secrets = CHARACTER_SECRETS[slug] ?? [];
  const result = secrets.map((s: { unlockLevel: number; title: string; type: string }) => ({
    unlockLevel: s.unlockLevel,
    title: s.title,
    type: s.type,
  }));

  return NextResponse.json(result);
}
