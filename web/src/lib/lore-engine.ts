/**
 * Lore Engine — ローアブック/World Info 検索エンジン
 * 
 * キャラクターの作品知識をLLMの訓練データに依存せず、
 * DBから動的に注入するハイブリッド検索システム。
 * 
 * 検索フロー:
 * 1. キーワードマッチ（PostgreSQL array overlap + ILIKE）
 * 2. セマンティック検索（pgvector cosine similarity）
 * 3. スコア統合 + 重要度ランキング
 */

import { prisma } from './prisma';
import { getEmbedding } from './semantic-memory';

// ============================================================
// Types
// ============================================================

interface LoreSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  importance: number;
  score: number;
  matchType: 'keyword' | 'semantic' | 'both';
}

interface LoreEntryRaw {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  importance: number;
  score: number;
  matchType: string;
}

// ============================================================
// Franchise lookup
// ============================================================

// キャラクターslug → フランチャイズ slug マッピング
const CHARACTER_FRANCHISE_MAP: Record<string, string> = {
  // ONE PIECE
  luffy: 'one-piece', zoro: 'one-piece', nami: 'one-piece', sanji: 'one-piece',
  chopper: 'one-piece', robin: 'one-piece', usopp: 'one-piece', franky: 'one-piece',
  brook: 'one-piece', jinbe: 'one-piece', law: 'one-piece', hancock: 'one-piece',
  shanks: 'one-piece', yamato: 'one-piece', vivi: 'one-piece', ace: 'one-piece',
  whitebeard: 'one-piece', blackbeard: 'one-piece', mihawk: 'one-piece',
  crocodile: 'one-piece', perona: 'one-piece', kaido: 'one-piece',
  // 鬼滅の刃
  tanjiro: 'kimetsu', nezuko: 'kimetsu', zenitsu: 'kimetsu',
  inosuke: 'kimetsu', giyu: 'kimetsu',
  // 呪術廻戦
  gojo: 'jujutsu-kaisen', itadori: 'jujutsu-kaisen', fushiguro: 'jujutsu-kaisen',
  nobara: 'jujutsu-kaisen', maki: 'jujutsu-kaisen',
  // アイシールド21
  sena: 'eyeshield21', monta: 'eyeshield21', hiruma: 'eyeshield21',
  mamori: 'eyeshield21', suzuna: 'eyeshield21', kurita: 'eyeshield21',
  agon: 'eyeshield21', shin: 'eyeshield21',
};

/**
 * キャラクターIDからフランチャイズIDを取得
 */
export async function getFranchiseIdByCharacter(characterId: string): Promise<string | null> {
  // まずCharacterテーブルからslugを取得
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { slug: true },
  });
  if (!character) return null;

  const franchiseName = CHARACTER_FRANCHISE_MAP[character.slug];
  if (!franchiseName) return null;

  // LoreFranchise をname(slug的に使用)で検索
  const franchise = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "LoreFranchise" WHERE name = ${franchiseName} OR id = ${franchiseName} LIMIT 1
  `;
  return franchise[0]?.id ?? null;
}

// ============================================================
// Keyword extraction
// ============================================================

/**
 * テキストからキーワードを抽出（簡易版）
 * カタカナ2文字以上、漢字2文字以上、英単語を抽出
 */
function extractKeywords(text: string): string[] {
  const patterns = [
    /[ァ-ヶー]{2,}/g,   // カタカナ
    /[一-龥]{2,}/g,      // 漢字
    /[A-Z][a-zA-Z]{2,}/g, // 英語固有名詞
  ];
  const keywords: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) keywords.push(...matches);
  }
  return [...new Set(keywords)];
}

// ============================================================
// Hybrid Search
// ============================================================

/**
 * ローアブック検索（ハイブリッド: キーワード + セマンティック）
 */
export async function getRelevantLore(
  franchiseId: string,
  userMessage: string,
  limit: number = 5,
): Promise<LoreSearchResult[]> {
  const keywords = extractKeywords(userMessage);

  // Phase 1: キーワードマッチ
  let keywordResults: LoreEntryRaw[] = [];
  if (keywords.length > 0) {
    try {
      keywordResults = await prisma.$queryRawUnsafe<LoreEntryRaw[]>(`
        SELECT id, title, content, category, keywords, importance,
               1.0::float as score, 'keyword' as "matchType"
        FROM "LoreEntry"
        WHERE "franchiseId" = $1
          AND (
            keywords && $2::text[]
            OR title ILIKE ANY(ARRAY(SELECT '%' || unnest($2::text[]) || '%'))
            OR content ILIKE ANY(ARRAY(SELECT '%' || unnest($2::text[]) || '%'))
          )
        ORDER BY importance DESC
        LIMIT $3
      `, franchiseId, keywords, limit * 2);
    } catch (e) {
      console.warn('[LoreEngine] Keyword search failed:', e);
    }
  }

  // Phase 2: セマンティック検索
  let semanticResults: LoreEntryRaw[] = [];
  try {
    const embedding = await getEmbedding(userMessage);
    if (embedding && embedding.length > 0) {
      semanticResults = await prisma.$queryRawUnsafe<LoreEntryRaw[]>(`
        SELECT id, title, content, category, keywords, importance,
               (1 - (embedding <=> $1::vector))::float as score,
               'semantic' as "matchType"
        FROM "LoreEntry"
        WHERE "franchiseId" = $2
          AND embedding IS NOT NULL
          AND (1 - (embedding <=> $1::vector)) > 0.60
        ORDER BY score DESC
        LIMIT $3
      `, `[${embedding.join(',')}]`, franchiseId, limit * 2);
    }
  } catch (e) {
    console.warn('[LoreEngine] Semantic search failed (falling back to keyword only):', e);
  }

  // Phase 3: マージ + ランキング
  return mergeAndRank(keywordResults, semanticResults, limit);
}

/**
 * キーワード結果とセマンティック結果を統合してランキング
 */
function mergeAndRank(
  keywordResults: LoreEntryRaw[],
  semanticResults: LoreEntryRaw[],
  limit: number,
): LoreSearchResult[] {
  const resultMap = new Map<string, LoreSearchResult>();

  // キーワード結果を追加
  for (const r of keywordResults) {
    resultMap.set(r.id, {
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      keywords: r.keywords || [],
      importance: r.importance,
      score: 0.7 + (r.importance / 10) * 0.3, // importance加味
      matchType: 'keyword',
    });
  }

  // セマンティック結果を追加/マージ
  for (const r of semanticResults) {
    const existing = resultMap.get(r.id);
    if (existing) {
      // 両方にヒット → スコアブースト
      existing.score = Math.min(1.0, existing.score * 1.3);
      existing.matchType = 'both';
    } else {
      resultMap.set(r.id, {
        id: r.id,
        title: r.title,
        content: r.content,
        category: r.category,
        keywords: r.keywords || [],
        importance: r.importance,
        score: r.score * 0.8 + (r.importance / 10) * 0.2,
        matchType: 'semantic',
      });
    }
  }

  // スコア降順でソート、上位limit件を返す
  return Array.from(resultMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================================
// Context formatting
// ============================================================

/**
 * ローアエントリをプロンプト注入用テキストに整形
 */
export function formatLoreContext(entries: LoreSearchResult[]): string {
  if (entries.length === 0) return '';

  const lines = entries.map(e => {
    const categoryLabel = getCategoryLabel(e.category);
    return `【${categoryLabel}】${e.title}\n${e.content}`;
  });

  return `\n=== 作品知識（会話に自然に織り込んでください）===\n${lines.join('\n\n')}\n`;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    event: '出来事',
    character: 'キャラクター',
    location: '場所',
    ability: '能力・技',
    item: 'アイテム',
    relationship: '関係性',
    timeline: '時系列',
  };
  return labels[category] || category;
}

// ============================================================
// Admin API helpers
// ============================================================

/**
 * フランチャイズ一覧取得
 */
export async function listFranchises() {
  return prisma.$queryRaw<{ id: string; name: string; nameEn: string | null; entryCount: number }[]>`
    SELECT f.id, f.name, f."nameEn",
           (SELECT COUNT(*) FROM "LoreEntry" e WHERE e."franchiseId" = f.id)::int as "entryCount"
    FROM "LoreFranchise" f
    ORDER BY f.name
  `;
}

/**
 * フランチャイズのエントリ一覧取得
 */
export async function listLoreEntries(franchiseId: string, category?: string) {
  if (category) {
    return prisma.$queryRaw<LoreEntryRaw[]>`
      SELECT id, title, content, category, keywords, importance, "spoilerLevel", "createdAt"
      FROM "LoreEntry"
      WHERE "franchiseId" = ${franchiseId} AND category = ${category}
      ORDER BY importance DESC, title
    `;
  }
  return prisma.$queryRaw<LoreEntryRaw[]>`
    SELECT id, title, content, category, keywords, importance, "spoilerLevel", "createdAt"
    FROM "LoreEntry"
    WHERE "franchiseId" = ${franchiseId}
    ORDER BY importance DESC, title
  `;
}

/**
 * ローアエントリ作成
 */
export async function createLoreEntry(data: {
  franchiseId: string;
  title: string;
  content: string;
  category?: string;
  keywords?: string[];
  importance?: number;
  spoilerLevel?: number;
}) {
  const id = crypto.randomUUID();
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "LoreEntry" (id, "franchiseId", title, content, category, keywords, importance, "spoilerLevel", "createdAt", "updatedAt")
    VALUES (${id}, ${data.franchiseId}, ${data.title}, ${data.content}, 
            ${data.category || 'event'}, ${data.keywords || []}::text[], 
            ${data.importance || 5}, ${data.spoilerLevel || 0}, ${now}, ${now})
  `;

  // 非同期でembedding生成
  generateEmbedding(id, data.content).catch(e => 
    console.warn('[LoreEngine] Embedding generation failed:', e)
  );

  return { id };
}

/**
 * ローアエントリ更新
 */
export async function updateLoreEntry(id: string, data: Partial<{
  title: string;
  content: string;
  category: string;
  keywords: string[];
  importance: number;
  spoilerLevel: number;
}>) {
  const now = new Date();
  const sets: string[] = [`"updatedAt" = '${now.toISOString()}'`];
  if (data.title !== undefined) sets.push(`title = '${data.title.replace(/'/g, "''")}'`);
  if (data.content !== undefined) sets.push(`content = '${data.content.replace(/'/g, "''")}'`);
  if (data.category !== undefined) sets.push(`category = '${data.category}'`);
  if (data.importance !== undefined) sets.push(`importance = ${data.importance}`);
  if (data.spoilerLevel !== undefined) sets.push(`"spoilerLevel" = ${data.spoilerLevel}`);

  await prisma.$executeRawUnsafe(`
    UPDATE "LoreEntry" SET ${sets.join(', ')} WHERE id = '${id}'
  `);

  // contentが更新されたらembeddingも再生成
  if (data.content) {
    generateEmbedding(id, data.content).catch(e =>
      console.warn('[LoreEngine] Embedding re-generation failed:', e)
    );
  }
}

/**
 * ローアエントリ削除
 */
export async function deleteLoreEntry(id: string) {
  await prisma.$executeRaw`DELETE FROM "LoreEntry" WHERE id = ${id}`;
}

// ============================================================
// Embedding generation
// ============================================================

async function generateEmbedding(entryId: string, content: string) {
  try {
    const embedding = await getEmbedding(content);
    if (embedding && embedding.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE "LoreEntry" SET embedding = '[${embedding.join(',')}]'::vector WHERE id = '${entryId}'
      `);
    }
  } catch (e) {
    console.warn('[LoreEngine] generateEmbedding error:', e);
  }
}
