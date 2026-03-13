import { NextRequest, NextResponse } from 'next/server';
import { listFranchises, listLoreEntries, createLoreEntry } from '@/lib/lore-engine';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

// GET /api/admin/lore?franchiseId=xxx&category=yyy
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const franchiseId = searchParams.get('franchiseId');

  if (!franchiseId) {
    // フランチャイズ一覧
    const franchises = await listFranchises();
    return NextResponse.json({ franchises });
  }

  // エントリ一覧
  const category = searchParams.get('category') || undefined;
  const entries = await listLoreEntries(franchiseId, category);
  return NextResponse.json({ entries });
}

// POST /api/admin/lore
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { franchiseId, title, content, category, keywords, importance, spoilerLevel } = body;

  if (!franchiseId || !title || !content) {
    return NextResponse.json({ error: 'franchiseId, title, content required' }, { status: 400 });
  }

  const result = await createLoreEntry({
    franchiseId,
    title,
    content,
    category,
    keywords,
    importance,
    spoilerLevel,
  });

  await adminAudit(ADMIN_AUDIT_ACTIONS.LORE_CREATE, 'system', {
    franchiseId, title,
  });

  return NextResponse.json(result, { status: 201 });
}
