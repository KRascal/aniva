// ============================================================
// GET /api/chat/group/available?characterId=xxx
// 指定キャラと掛け合い可能なキャラ一覧を返す
// ユーザー向けAPI — 禁止キャラは除外済みで返すので403は不要
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const selectedIds = req.nextUrl.searchParams.get('characterIds');
    
    // 全アクティブキャラ取得
    const allCharacters = await prisma.character.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        franchise: true,
        avatarUrl: true,
        allowedCrosstalkCharacterIds: true,
        bannedCrosstalkFranchises: true,
        emergencyStop: true,
      },
    });

    // 選択済みキャラがない場合は全キャラ返す（emergencyStop除外のみ）
    if (!selectedIds) {
      const available = allCharacters
        .filter(c => !c.emergencyStop)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          franchise: c.franchise,
          avatarUrl: c.avatarUrl,
        }));
      return NextResponse.json({ characters: available });
    }

    const selectedCharIds = selectedIds.split(',').filter(Boolean);
    const selectedChars = allCharacters.filter(c => selectedCharIds.includes(c.id));

    if (selectedChars.length === 0) {
      const available = allCharacters
        .filter(c => !c.emergencyStop)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          franchise: c.franchise,
          avatarUrl: c.avatarUrl,
        }));
      return NextResponse.json({ characters: available });
    }

    // 選択済みキャラ全員と掛け合い可能なキャラだけをフィルタ
    const available = allCharacters.filter(candidate => {
      // 自分自身は除外
      if (selectedCharIds.includes(candidate.id)) return false;
      // emergencyStop
      if (candidate.emergencyStop) return false;

      // 全ての選択済みキャラとペアチェック
      for (const selected of selectedChars) {
        if (!isPairAllowed(selected, candidate)) return false;
        if (!isPairAllowed(candidate, selected)) return false;
      }

      return true;
    }).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      franchise: c.franchise,
      avatarUrl: c.avatarUrl,
    }));

    return NextResponse.json({ characters: available });
  } catch (error) {
    console.error('[GroupAvailable] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function isPairAllowed(
  from: {
    id: string;
    franchise: string;
    allowedCrosstalkCharacterIds: unknown;
    bannedCrosstalkFranchises: string[];
  },
  to: {
    id: string;
    franchise: string;
  },
): boolean {
  // allowedCrosstalkCharacterIds チェック
  const allowed = from.allowedCrosstalkCharacterIds;
  if (allowed !== null && allowed !== undefined) {
    if (!Array.isArray(allowed)) return true; // 不正値は無視
    if ((allowed as string[]).length === 0) return false; // 全禁止
    if (!(allowed as string[]).includes(to.id)) return false; // 許可リストにない
  }

  // bannedCrosstalkFranchises チェック
  if (from.bannedCrosstalkFranchises.includes(to.franchise)) {
    return false;
  }

  return true;
}
