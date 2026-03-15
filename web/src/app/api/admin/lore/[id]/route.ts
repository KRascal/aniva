import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { updateLoreEntry, deleteLoreEntry } from '@/lib/lore-engine';
import { adminAudit, ADMIN_AUDIT_ACTIONS } from '@/lib/audit-log';

// PATCH /api/admin/lore/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  await updateLoreEntry(id, body);

  await adminAudit(ADMIN_AUDIT_ACTIONS.LORE_UPDATE, 'system', {
    loreEntryId: id,
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/lore/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await deleteLoreEntry(id);

  await adminAudit(ADMIN_AUDIT_ACTIONS.LORE_DELETE, 'system', {
    loreEntryId: id,
  });

  return NextResponse.json({ ok: true });
}
