/**
 * POST /api/admin/characters/bulk-import
 * IP契約時の一括キャラクター登録API
 * 
 * body: {
 *   franchise: string,       // "ONE PIECE"
 *   franchiseEn: string,     // "ONE PIECE" 
 *   tenantId?: string,       // テナントID（契約管理用）
 *   characters: Array<{
 *     name: string,           // "モンキー・D・ルフィ"
 *     nameEn: string,         // "Monkey D. Luffy"
 *     slug: string,           // "luffy"
 *     personality: string,    // "明るく自由奔放。仲間想い。"
 *     systemPrompt?: string,  // カスタムプロンプト（省略時はAI生成）
 *     avatarUrl?: string,     // アバター画像URL
 *     coverUrl?: string,      // カバー画像URL
 *   }>
 *   autoBootstrap?: boolean,  // true: 各キャラのコンテンツも自動生成
 * }
 * 
 * Returns: { imported: number, characters: Array<{ id, name, slug }>, errors: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { franchise, franchiseEn, tenantId, characters, autoBootstrap = false } = body;

    if (!franchise || !characters?.length) {
      return NextResponse.json(
        { error: 'franchise and characters[] are required' },
        { status: 400 }
      );
    }

    if (characters.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 characters per import' },
        { status: 400 }
      );
    }

    const imported: Array<{ id: string; name: string; slug: string }> = [];
    const errors: string[] = [];

    for (const char of characters) {
      try {
        if (!char.name || !char.slug) {
          errors.push(`Missing name or slug for character: ${JSON.stringify(char)}`);
          continue;
        }

        // Check for duplicate slug
        const existing = await prisma.character.findFirst({
          where: { slug: char.slug },
        });

        if (existing) {
          errors.push(`Slug "${char.slug}" already exists (${existing.name}). Skipping.`);
          continue;
        }

        // Generate default system prompt if not provided
        const systemPrompt = char.systemPrompt || generateDefaultPrompt(char, franchise);

        const created = await prisma.character.create({
          data: {
            name: char.name,
            nameEn: char.nameEn || char.name,
            slug: char.slug,
            franchise,
            franchiseEn: franchiseEn || franchise,
            personalityTraits: [],
            systemPrompt,
            avatarUrl: char.avatarUrl || null,
            coverUrl: char.coverUrl || null,
            isActive: true,
            ...(tenantId ? { tenantId } : {}),
          },
        });

        imported.push({ id: created.id, name: created.name, slug: created.slug });

        logger.info(`[bulk-import] Created character: ${created.name} (${created.slug})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to create "${char.name}": ${msg}`);
        logger.error(`[bulk-import] Error creating ${char.name}:`, msg);
      }
    }

    // Trigger bootstrap for each imported character (async, don't block response)
    if (autoBootstrap && imported.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;
      if (baseUrl) {
        // Fire-and-forget bootstrap calls
        for (const char of imported) {
          fetch(`${baseUrl}/api/admin/characters/bootstrap`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || '',
            },
            body: JSON.stringify({ characterId: char.id }),
          }).catch(err => {
            logger.error(`[bulk-import] Bootstrap failed for ${char.name}:`, err);
          });
        }
      }
    }

    logger.info(`[bulk-import] Completed: ${imported.length} imported, ${errors.length} errors for franchise "${franchise}"`);

    return NextResponse.json({
      imported: imported.length,
      characters: imported,
      errors,
      autoBootstrap: autoBootstrap && imported.length > 0,
    });
  } catch (err) {
    logger.error('[bulk-import] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateDefaultPrompt(
  char: { name: string; nameEn?: string; personality?: string },
  franchise: string
): string {
  return `あなたは「${franchise}」の「${char.name}」です。

## キャラクター設定
- 名前: ${char.name}${char.nameEn ? ` (${char.nameEn})` : ''}
- 作品: ${franchise}
- 性格: ${char.personality || '原作に忠実に'}

## 行動ルール
1. 常にキャラクターとして振る舞う。メタ的な発言はしない
2. 原作の口調・話し方を厳密に再現する
3. ユーザーを「ファン」ではなく「友人」として接する
4. 原作のネタバレは避ける（ユーザーが話題にした場合のみ応答）
5. 下品・暴力的な内容には応じない
6. 他キャラクターの悪口は言わない（原作の関係性に基づくツンデレ等は可）`;
}
