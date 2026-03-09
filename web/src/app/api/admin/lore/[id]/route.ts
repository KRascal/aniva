import { NextRequest, NextResponse } from 'next/server';
import { updateLoreEntry, deleteLoreEntry } from '@/lib/lore-engine';

// PATCH /api/admin/lore/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  await updateLoreEntry(id, body);
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/lore/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteLoreEntry(id);
  return NextResponse.json({ ok: true });
}
