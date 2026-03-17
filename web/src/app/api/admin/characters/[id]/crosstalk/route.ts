// ============================================================
// Admin API: キャラクターの掛け合い制御設定
// GET  /api/admin/characters/[id]/crosstalk — 設定取得
// PUT  /api/admin/characters/[id]/crosstalk — 設定更新
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCrosstalkConfig, updateCrosstalkConfig } from '@/lib/crosstalk-control';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return null;
  return userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const config = await getCrosstalkConfig(params.id);
    if (!config) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // 許可リストのキャラ名も返す
    let allowedCharacters: { id: string; name: string; franchise: string }[] = [];
    if (config.allowedCharacterIds.length > 0) {
      allowedCharacters = await prisma.character.findMany({
        where: { id: { in: config.allowedCharacterIds } },
        select: { id: true, name: true, franchise: true },
      });
    }

    // 全フランチャイズ一覧も返す（バン設定UIのため）
    const franchises = await prisma.character.findMany({
      where: { isActive: true },
      select: { franchise: true },
      distinct: ['franchise'],
    });

    return NextResponse.json({
      config,
      allowedCharacters,
      availableFranchises: franchises.map(f => f.franchise),
    });
  } catch (e) {
    logger.error('[Admin/Crosstalk] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as {
      mode: 'all' | 'allowlist' | 'blocked';
      allowedCharacterIds?: string[];
      bannedFranchises?: string[];
    };

    const { mode, allowedCharacterIds = [], bannedFranchises = [] } = body;

    // mode → allowedCrosstalkCharacterIds の変換
    let allowedCrosstalkCharacterIds: string[] | null;
    if (mode === 'all') {
      allowedCrosstalkCharacterIds = null; // 制限なし
    } else if (mode === 'blocked') {
      allowedCrosstalkCharacterIds = []; // 全禁止
    } else {
      // allowlist
      if (!Array.isArray(allowedCharacterIds) || allowedCharacterIds.length === 0) {
        return NextResponse.json(
          { error: 'allowedCharacterIds must be a non-empty array when mode=allowlist' },
          { status: 400 },
        );
      }
      allowedCrosstalkCharacterIds = allowedCharacterIds;
    }

    await updateCrosstalkConfig(params.id, {
      allowedCrosstalkCharacterIds,
      bannedCrosstalkFranchises: bannedFranchises,
    });

    // 監査ログ
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: 'UPDATE_CROSSTALK_CONFIG',
        targetId: params.id,
        targetType: 'character',
        detail: JSON.stringify({ mode, allowedCharacterIds, bannedFranchises }),
      },
    }).catch(() => {}); // 監査ログ失敗は無視

    logger.info(`[Admin/Crosstalk] Updated config for ${params.id}: mode=${mode}`);

    return NextResponse.json({ success: true, mode });
  } catch (e) {
    logger.error('[Admin/Crosstalk] PUT error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
