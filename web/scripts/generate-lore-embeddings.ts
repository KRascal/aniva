#!/usr/bin/env tsx
/**
 * LoreEntry の embedding を一括生成するスクリプト
 * Usage: npx tsx scripts/generate-lore-embeddings.ts
 */

import { PrismaClient } from '@prisma/client';

// Prisma 7: DATABASE_URL must be set via env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://repeai:repeai_prod_2026@localhost:5432/aniva_staging';
}
const prisma = new PrismaClient();
const EMBEDDING_URL = process.env.EMBEDDING_SERVER_URL || 'http://localhost:3075/v1/embeddings';
const BATCH_SIZE = 10;
const DELAY_MS = 200; // embeddings APIへの負荷軽減

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, model: 'intfloat/multilingual-e5-small' }),
    });
    if (!res.ok) {
      console.error(`Embedding API error: ${res.status}`);
      return null;
    }
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error('Embedding fetch error:', e);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const entries = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; content: string }>>(
    `SELECT id, title, content FROM "LoreEntry" WHERE embedding IS NULL ORDER BY "createdAt" ASC`
  );

  console.log(`Generating embeddings for ${entries.length} LoreEntry records...`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const entry of batch) {
      const text = `${entry.title} ${entry.content}`.slice(0, 512);
      const embedding = await getEmbedding(text);

      if (embedding && embedding.length > 0) {
        const vecStr = `[${embedding.join(',')}]`;
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "LoreEntry" SET embedding = $1::vector WHERE id = $2`,
            vecStr,
            entry.id,
          );
          processed++;
        } catch (e) {
          console.error(`Failed to update ${entry.id}:`, e);
          failed++;
        }
      } else {
        failed++;
      }
    }

    console.log(`Progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} (failed: ${failed})`);
    await sleep(DELAY_MS);
  }

  console.log(`\nDone! Processed: ${processed}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
