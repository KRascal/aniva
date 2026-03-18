// ============================================================
// LLMベースのメモリ抽出モジュール
// Gemini 2.5 Flash (最安) を使用してユーザー情報をJSON構造化抽出
// ============================================================

import type { FactEntry, EpisodeEntry } from './types';
import { generateText } from '@/lib/llm';
import { logger } from '@/lib/logger';

export interface ExtractedMemory {
  facts: Array<{
    category: 'name' | 'job' | 'hobby' | 'like' | 'dislike' | 'age' | 'location' | 'family' | 'other';
    fact: string;
    confidence: number;
  }>;
  episodes: Array<{
    summary: string;
    emotion: string;
    importance: number;
    date: string;
  }>;
}

const SYSTEM_PROMPT = `あなたはユーザーの会話から個人情報を抽出するアシスタントです。
ユーザーのメッセージとAIの応答から、「ユーザーについて新しく分かった事実」を全て抽出してください。

必ず以下のJSON形式のみで返してください（前後に余分なテキスト不要）:
{
  "facts": [
    {
      "category": "name|job|hobby|like|dislike|age|location|family|other",
      "fact": "事実の説明（日本語）",
      "confidence": 0.0〜1.0の数値
    }
  ],
  "episodes": [
    {
      "summary": "会話のエピソード要約（1文）",
      "emotion": "ユーザーの感情（例: 嬉しい、悲しい、neutral）",
      "importance": 1〜5の重要度,
      "date": "ISO 8601形式の日時"
    }
  ]
}

抽出ルール:
- 明示的に述べられた情報のみ抽出（推測しない）
- 新しい情報がない場合は空配列を返す
- confidenceは確信度（明示的=0.9〜1.0、文脈から=0.7〜0.8）
- episodesは会話に印象的なエピソードがある場合のみ含める（なければ空配列）
- カテゴリの意味: name=名前, job=仕事/職業, hobby=趣味, like=好き, dislike=嫌い/苦手, age=年齢, location=住所/出身, family=家族, other=その他`;

/**
 * LLMを使ってユーザーメッセージとAI応答からメモリを抽出する
 */
export async function extractMemoryFromMessage(
  userMessage: string,
  aiResponse: string,
  existingFacts: FactEntry[],
): Promise<{ facts: FactEntry[]; episodes: EpisodeEntry[] }> {
  const existingFactsSummary = existingFacts.length > 0
    ? `既存の知識:\n${existingFacts.slice(0, 10).map(f => `- ${f.fact}`).join('\n')}`
    : '既存の知識: なし';

  const userContent = `${existingFactsSummary}

ユーザーのメッセージ:
${userMessage}

AIの応答:
${aiResponse}

上記の会話から、ユーザーについて新しく分かった事実を抽出してください。`;

  let parsed: ExtractedMemory = { facts: [], episodes: [] };

  try {
    const raw = await generateText(SYSTEM_PROMPT, userContent, {
      maxTokens: 500,
      temperature: 0.1,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('[MemoryExtractor] No JSON found in LLM response, using empty result');
      return { facts: [], episodes: [] };
    }

    parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory;
  } catch (err) {
    logger.error('[MemoryExtractor] LLM extraction failed:', err);
    throw err; // caller handles fallback
  }

  const now = new Date().toISOString();

  // facts を FactEntry 形式に変換
  const factEntries: FactEntry[] = (parsed.facts ?? [])
    .filter(f => f.fact && typeof f.confidence === 'number')
    .map(f => ({
      fact: f.fact,
      source: 'LLM抽出',
      confidence: Math.min(1.0, Math.max(0.0, f.confidence)),
      updatedAt: now,
    }));

  // episodes を EpisodeEntry 形式に変換
  const episodeEntries: EpisodeEntry[] = (parsed.episodes ?? [])
    .filter(e => e.summary)
    .map(e => ({
      summary: e.summary,
      date: e.date || now,
      emotion: e.emotion || 'neutral',
      importance: typeof e.importance === 'number' ? Math.min(5, Math.max(1, e.importance)) : 3,
    }));

  return { facts: factEntries, episodes: episodeEntries };
}

/**
 * LLM抽出結果を既存のfactMemoryにマージする（重複排除）
 * 同じカテゴリで類似のfactがある場合はconfidenceが高い方を残す
 */
export function mergeFacts(existingFacts: FactEntry[], newFacts: FactEntry[]): FactEntry[] {
  if (newFacts.length === 0) return existingFacts;

  const result = [...existingFacts];

  for (const newFact of newFacts) {
    // 完全一致チェック
    const exactIndex = result.findIndex(f => f.fact === newFact.fact);
    if (exactIndex >= 0) {
      // 同じfactが既存にある場合はconfidenceが高い方で更新
      if (newFact.confidence > result[exactIndex].confidence) {
        result[exactIndex] = { ...result[exactIndex], ...newFact };
      }
      continue;
    }

    // カテゴリ別の重複チェック（正規表現パターンに基づく）
    const categoryPattern = getCategoryPattern(newFact.fact);
    if (categoryPattern) {
      const categoryIndex = result.findIndex(f => categoryPattern.test(f.fact));
      if (categoryIndex >= 0) {
        // 同じカテゴリで類似のfactがある場合はconfidence比較して更新
        if (newFact.confidence >= result[categoryIndex].confidence) {
          result[categoryIndex] = newFact;
        }
        continue;
      }
    }

    // 重複なし → 追加
    result.push(newFact);
  }

  return result;
}

/**
 * factの内容から重複判定パターンを返す
 */
function getCategoryPattern(fact: string): RegExp | null {
  if (/^名前は/.test(fact)) return /^名前は/;
  if (/^\d+歳$/.test(fact)) return /^\d+歳$/;
  if (/^仕事は/.test(fact)) return /^仕事は/;
  if (/^趣味:/.test(fact)) return /^趣味:/;
  if (/^出身\/居住:/.test(fact)) return /^出身\/居住:/;
  if (/^誕生日:/.test(fact)) return /^誕生日:/;
  if (/^通学先:/.test(fact)) return /^通学先:/;
  if (/^悩み:/.test(fact)) return /^悩み:/;
  if (/^頑張っていること:/.test(fact)) return /^頑張っていること:/;
  if (/恋人|シングル/.test(fact)) return /恋人|シングル/;
  return null;
}
