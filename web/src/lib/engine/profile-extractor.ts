// ============================================================
// ProfileExtractor — LLMで会話からプロファイル情報を抽出
// ============================================================

import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

export interface ProfileExtraction {
  /** 基本情報の更新（存在するフィールドのみ更新） */
  basics: {
    name?: string;
    birthday?: string;
    age?: number | null;
    location?: string | null;
    occupation?: string | null;
    school?: string | null;
    hobbies?: string[];
  };

  /** 新しい関心事 */
  newInterests: { topic: string; intensity: number }[];

  /** 悩み・気がかりの更新 */
  concerns: {
    new: { topic: string; detail: string }[];
    resolved: string[];
  };

  /** 現在の感情状態 */
  currentEmotion: {
    emotion: string;
    intensity: number;
    context: string;
  };

  /** このキャラ固有の情報 */
  characterSpecific: {
    sharedTopics: string[];
    newSecret: string | null;
    milestoneEvent: string | null;
  };

  /** フォローアップが必要な事項 */
  followUpNeeded: {
    topic: string;
    reason: string;
    suggestedTiming: 'next_session' | '3_days' | '1_week';
  }[];
}

// ── Extraction prompt ────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `あなたは会話分析AIです。チャット履歴からユーザーの情報を構造化抽出してください。

## 抽出ルール
- 明示的に述べられた事実のみ抽出（推測禁止）
- 既存プロファイルと矛盾する情報がある場合は新しい方を採用
- 悩み・心配事は「解決済み」かどうかも判定
- 感情は文脈から判断（明示的な言及がなくても推定してよい）
- 抽出するものがない場合は空配列/null/空オブジェクトを返す

## 出力形式（JSON）
必ず以下の形式のJSONのみを出力。余計なテキストは付けないこと。
{
  "basics": {},
  "newInterests": [],
  "concerns": { "new": [], "resolved": [] },
  "currentEmotion": { "emotion": "neutral", "intensity": 0.5, "context": "" },
  "characterSpecific": { "sharedTopics": [], "newSecret": null, "milestoneEvent": null },
  "followUpNeeded": []
}`;

// ── Main function ────────────────────────────────────────────

/**
 * 会話からプロファイル情報をLLMで抽出する
 *
 * @param messages - 直近の会話メッセージ（最大10件推奨）
 * @param existingProfileSummary - 既存プロファイルの要約テキスト
 * @param characterName - 会話相手のキャラクター名
 * @returns ProfileExtraction or null if extraction fails
 */
export async function extractFromConversation(
  messages: { role: string; content: string }[],
  existingProfileSummary: string,
  characterName: string,
): Promise<ProfileExtraction | null> {
  try {
    // 直近10件に限定（コスト管理）
    const recentMessages = messages.slice(-10);

    const conversationText = recentMessages
      .map(m => `${m.role === 'USER' || m.role === 'user' ? 'ユーザー' : characterName || 'キャラ'}: ${m.content}`)
      .join('\n');

    const userPrompt = `## 既存プロファイル
${existingProfileSummary || '（まだ情報なし）'}

## 会話履歴（直近）
${conversationText}

上記の会話から、ユーザーの情報を抽出してJSON形式で出力してください。`;

    // 安価なモデルを使う（Gemini 2.5 Flash → xAI → Anthropic haiku）
    const result = await callExtractionLLM(userPrompt);
    if (!result) return null;

    // JSONパース
    const parsed = parseExtractionResult(result);
    return parsed;
  } catch (e) {
    logger.error('[ProfileExtractor] Extraction failed:', e);
    return null;
  }
}

// ── LLM call (安価なモデル使用) ──────────────────────────────

async function callExtractionLLM(userPrompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // 優先: Gemini 2.5 Flash（安価）
  if (geminiKey) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geminiKey}` },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? null;
      }
    } catch (e) {
      logger.warn('[ProfileExtractor] Gemini extraction failed:', e);
    }
  }

  // フォールバック①: xAI
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? null;
      }
    } catch (e) {
      logger.warn('[ProfileExtractor] xAI extraction failed:', e);
    }
  }

  // フォールバック: Anthropic haiku
  if (anthropicKey) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : null;
    } catch (e) {
      logger.warn('[ProfileExtractor] Anthropic extraction failed:', e);
    }
  }

  return null;
}

// ── JSON parsing with error recovery ─────────────────────────

function parseExtractionResult(raw: string): ProfileExtraction | null {
  try {
    // JSONブロックの抽出（```json ... ``` or raw JSON）
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // 最初の { から最後の } を抽出
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = raw.slice(start, end + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);

    // バリデーション + デフォルト値
    const result: ProfileExtraction = {
      basics: parsed.basics || {},
      newInterests: Array.isArray(parsed.newInterests) ? parsed.newInterests : [],
      concerns: {
        new: Array.isArray(parsed.concerns?.new) ? parsed.concerns.new : [],
        resolved: Array.isArray(parsed.concerns?.resolved) ? parsed.concerns.resolved : [],
      },
      currentEmotion: parsed.currentEmotion || { emotion: 'neutral', intensity: 0.5, context: '' },
      characterSpecific: {
        sharedTopics: Array.isArray(parsed.characterSpecific?.sharedTopics)
          ? parsed.characterSpecific.sharedTopics
          : [],
        newSecret: parsed.characterSpecific?.newSecret ?? null,
        milestoneEvent: parsed.characterSpecific?.milestoneEvent ?? null,
      },
      followUpNeeded: Array.isArray(parsed.followUpNeeded) ? parsed.followUpNeeded : [],
    };

    // intensity値のクランプ (0-1)
    for (const interest of result.newInterests) {
      interest.intensity = Math.max(0, Math.min(1, interest.intensity));
    }
    result.currentEmotion.intensity = Math.max(0, Math.min(1, result.currentEmotion.intensity));

    return result;
  } catch (e) {
    logger.warn('[ProfileExtractor] Failed to parse extraction result:', e);
    return null;
  }
}
