/**
 * Semantic Memory Engine
 * pgvector + OpenAI embeddings で長期記憶を実現
 * 
 * 世界最高峰の問い: Character.AIもReplika も実装できていない
 * 「3ヶ月前の会話を自然に思い出す」体験を実現する
 */

import { prisma } from './prisma';

// Voyage voyage-3-lite = 512dim (primary provider)
// DB column: vector(512) — matched to Voyage output
const EMBEDDING_DIM = 512;
const MAX_MEMORIES_PER_QUERY = 5;
const MIN_SIMILARITY = 0.72; // cosine similarity threshold
const LOCAL_EMBEDDING_URL = process.env.EMBEDDING_SERVER_URL || 'http://localhost:3075/v1/embeddings';

// ─── Embedding生成 ────────────────────────────────────────────
// 優先順位: ローカルサーバー > OpenAI API
async function getEmbedding(text: string): Promise<number[]> {
  // ① ローカルembeddingサーバー（コストゼロ、レイテンシ最小）
  try {
    const res = await fetch(LOCAL_EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(3000), // 3秒タイムアウト
    });
    if (res.ok) {
      const data = await res.json();
      const emb = data.data?.[0]?.embedding;
      if (emb && emb.length > 0) return emb;
    }
  } catch {
    // ローカルサーバーが起動していない場合はフォールバック
  }

  // ② Anthropic Voyage AI（推奨embeddingプロバイダー）
  const voyageKey = process.env.VOYAGE_API_KEY;
  if (voyageKey) {
    try {
      const res = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${voyageKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voyage-3-lite',
          input: text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const emb = data.data?.[0]?.embedding;
        if (emb && emb.length > 0) return emb;
      }
    } catch {
      // フォールバック
    }
  }

  // ③ OpenAI API（フォールバック）
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: EMBEDDING_DIM,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.[0]?.embedding || [];
      }
    } catch {
      // ignore
    }
  }

  console.warn('[SemanticMemory] No embedding provider available — set VOYAGE_API_KEY or OPENAI_API_KEY');
  return [];
}

// ─── 記憶の保存 ──────────────────────────────────────────────
interface MemoryInput {
  userId: string;
  characterId: string;
  content: string;
  summary?: string;
  importance?: number;
  emotionalValence?: number;
  category?: 'conversation' | 'preference' | 'event' | 'emotion' | 'shared_experience';
  messageId?: string;
}

export async function storeMemory(input: MemoryInput): Promise<string | null> {
  try {
    const embedding = await getEmbedding(input.content);
    if (embedding.length === 0) return null;

    const vecStr = `[${embedding.join(',')}]`;

    const result = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `INSERT INTO "SemanticMemory" (id, "userId", "characterId", content, summary, embedding, importance, "emotionalValence", category, "messageId")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::vector, $6, $7, $8, $9)
       RETURNING id`,
      input.userId,
      input.characterId,
      input.content,
      input.summary || null,
      vecStr,
      input.importance ?? 0.5,
      input.emotionalValence ?? 0.0,
      input.category || 'conversation',
      input.messageId || null,
    );

    return result[0]?.id || null;
  } catch (err) {
    console.error('storeMemory error:', err);
    return null;
  }
}

// ─── 記憶の検索（セマンティック） ─────────────────────────────
interface MemoryResult {
  id: string;
  content: string;
  summary: string | null;
  importance: number;
  emotionalValence: number;
  category: string;
  similarity: number;
  createdAt: Date;
}

export async function searchMemories(
  userId: string,
  characterId: string,
  query: string,
  limit: number = MAX_MEMORIES_PER_QUERY,
): Promise<MemoryResult[]> {
  try {
    const embedding = await getEmbedding(query);
    if (embedding.length === 0) return [];

    const vecStr = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<MemoryResult[]>(
      `SELECT id, content, summary, importance, "emotionalValence", category, "createdAt",
              1 - (embedding <=> $1::vector) as similarity
       FROM "SemanticMemory"
       WHERE "userId" = $2 AND "characterId" = $3
         AND 1 - (embedding <=> $1::vector) > $4
       ORDER BY similarity DESC, importance DESC
       LIMIT $5`,
      vecStr,
      userId,
      characterId,
      MIN_SIMILARITY,
      limit,
    );

    return results;
  } catch (err) {
    console.error('searchMemories error:', err);
    return [];
  }
}

// ─── 会話ターンから自動的に記憶を抽出 ─────────────────────────
export async function extractAndStoreMemories(
  userId: string,
  characterId: string,
  userMessage: string,
  characterResponse: string,
  messageId?: string,
): Promise<void> {
  // 短すぎるメッセージはスキップ
  if (userMessage.length < 10 && characterResponse.length < 20) return;

  // 重要度判定（シンプルなヒューリスティック）
  const importanceSignals = [
    /好き|嫌い|愛|大切|大好き/i,     // 感情表現
    /誕生日|記念日|初めて|約束/i,     // イベント
    /仕事|学校|趣味|家族|友達/i,     // 個人情報
    /夢|目標|将来|悩み|辛い/i,       // 深い話題
    /覚えて|忘れない|大事/i,          // 明示的な記憶要求
  ];

  let importance = 0.3; // base
  let category: MemoryInput['category'] = 'conversation';

  for (const signal of importanceSignals) {
    if (signal.test(userMessage) || signal.test(characterResponse)) {
      importance += 0.15;
    }
  }

  // カテゴリ判定
  if (/好き|嫌い|趣味|推し/.test(userMessage)) category = 'preference';
  if (/誕生日|記念日|イベント/.test(userMessage)) category = 'event';
  if (/嬉しい|悲しい|辛い|楽しい|怖い/.test(userMessage)) category = 'emotion';
  if (/一緒に|二人で|デート/.test(userMessage)) category = 'shared_experience';

  // 明示的な記憶要求は最高重要度
  if (/覚えて|忘れないで/.test(userMessage)) importance = 1.0;

  importance = Math.min(importance, 1.0);

  // 感情バランス
  const positiveWords = (userMessage + characterResponse).match(/嬉しい|楽しい|好き|最高|幸せ|ありがとう/g)?.length || 0;
  const negativeWords = (userMessage + characterResponse).match(/悲しい|辛い|嫌|怖い|寂しい|苦しい/g)?.length || 0;
  const emotionalValence = (positiveWords - negativeWords) / Math.max(positiveWords + negativeWords, 1);

  // 会話サマリーを生成（簡易版 — LLMは使わない、コスト節約）
  const summary = `${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''} → ${characterResponse.slice(0, 50)}${characterResponse.length > 50 ? '...' : ''}`;

  // 記憶として保存
  const content = `ユーザー: ${userMessage}\nキャラ: ${characterResponse}`;

  await storeMemory({
    userId,
    characterId,
    content,
    summary,
    importance,
    emotionalValence,
    category,
    messageId,
  });
}

// ─── チャットコンテキスト用の記憶取得 ──────────────────────────
export async function getRelevantMemories(
  userId: string,
  characterId: string,
  currentMessage: string,
): Promise<string> {
  const memories = await searchMemories(userId, characterId, currentMessage, 3);
  if (memories.length === 0) return '';

  const lines = memories.map((m) => {
    const ago = getTimeAgo(m.createdAt);
    const summary = m.summary || m.content.slice(0, 80);
    return `[${ago}] ${summary}`;
  });

  return `\n【過去の記憶】\n${lines.join('\n')}\n`;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
}
