/**
 * POST /api/admin/onboarding/ip
 * IP契約オンボーディング — ワンクリックセットアップ
 * 
 * 1つのAPIコールで:
 * 1. テナント作成（or既存を使用）
 * 2. 契約レコード作成
 * 3. キャラクター一括登録
 * 4. 各キャラのコンテンツ自動生成（bootstrap）
 * 
 * body: {
 *   // テナント情報
 *   companyName: string,       // "集英社"
 *   contactEmail: string,      // "ip-license@shueisha.co.jp"
 *   
 *   // 契約情報
 *   ipName: string,            // "ONE PIECE"
 *   revenueShareIp: number,    // 70 (%)
 *   revenueShareAniva: number, // 30 (%)
 *   contractStart: string,     // "2026-04-01" ISO date
 *   contractEnd?: string,      // "2027-03-31"
 *   
 *   // キャラクター
 *   characters: Array<{
 *     name: string,
 *     nameEn: string,
 *     slug: string,
 *     personality: string,
 *     avatarUrl?: string,
 *     coverUrl?: string,
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      companyName, contactEmail,
      ipName, revenueShareIp = 70, revenueShareAniva = 30,
      contractStart, contractEnd,
      characters = [],
    } = body;

    if (!companyName || !ipName || !characters.length) {
      return NextResponse.json(
        { error: 'companyName, ipName, and characters[] are required' },
        { status: 400 }
      );
    }

    // 1. Create or find tenant
    let tenant = await prisma.tenant.findFirst({
      where: { name: companyName },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: companyName,
          contactEmail: contactEmail || '',
          status: 'ACTIVE',
        },
      });
      logger.info(`[ip-onboarding] Created tenant: ${tenant.name} (${tenant.id})`);
    }

    // 2. Create contract
    const contract = await prisma.contract.create({
      data: {
        tenantId: tenant.id,
        ipName,
        revenueShareIp,
        revenueShareAniva,
        startDate: contractStart ? new Date(contractStart) : new Date(),
        endDate: contractEnd ? new Date(contractEnd) : null,
        status: 'ACTIVE',
      },
    });
    logger.info(`[ip-onboarding] Created contract: ${ipName} (${contract.id})`);

    // 3. Bulk import characters
    const imported: Array<{ id: string; name: string; slug: string }> = [];
    const errors: string[] = [];

    for (const char of characters) {
      try {
        if (!char.name || !char.slug) {
          errors.push(`Missing name/slug: ${JSON.stringify(char)}`);
          continue;
        }

        const existing = await prisma.character.findFirst({
          where: { slug: char.slug },
        });

        if (existing) {
          errors.push(`Slug "${char.slug}" exists (${existing.name})`);
          continue;
        }

        const created = await prisma.character.create({
          data: {
            name: char.name,
            nameEn: char.nameEn || char.name,
            slug: char.slug,
            franchise: ipName,
            franchiseEn: ipName,
            personality: char.personality || '',
            systemPrompt: generatePrompt(char, ipName),
            avatarUrl: char.avatarUrl || null,
            coverUrl: char.coverUrl || null,
            isActive: true,
            tenantId: tenant.id,
          },
        });

        imported.push({ id: created.id, name: created.name, slug: created.slug });
      } catch (err) {
        errors.push(`Failed "${char.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Fire-and-forget bootstrap for each character
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (baseUrl && imported.length > 0) {
      for (const char of imported) {
        fetch(`${baseUrl}/api/admin/characters/bootstrap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.get('cookie') || '',
          },
          body: JSON.stringify({ characterId: char.id }),
        }).catch(err => {
          logger.error(`[ip-onboarding] Bootstrap error for ${char.name}:`, err);
        });
      }
    }

    logger.info(`[ip-onboarding] Complete: ${imported.length} characters for "${ipName}"`);

    return NextResponse.json({
      tenant: { id: tenant.id, name: tenant.name },
      contract: { id: contract.id, ipName, status: contract.status },
      characters: { imported: imported.length, list: imported, errors },
      bootstrapTriggered: imported.length > 0,
    });
  } catch (err) {
    logger.error('[ip-onboarding] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generatePrompt(
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
