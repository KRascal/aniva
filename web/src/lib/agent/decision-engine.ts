/**
 * DecisionEngine — 軽量LLM（Gemini 2.5 Flash）でキャラの行動判断を行う
 * フォールバック: xAI → Anthropic
 * 入力: UserStateSnapshot + キャラ情報
 * 出力: AgentDecision（should/reason/messageType/urgency）
 */

import { logger } from '@/lib/logger';
import type { UserStateSnapshot, AgentDecision, MessageType } from './types';

interface CharacterInfo {
  id: string;
  name: string;
  systemPrompt: string;
}

const MAX_TOKENS = 300;

function buildDecisionPrompt(
  character: CharacterInfo,
  state: UserStateSnapshot,
): string {
  const recentEmotionStr = state.recentEmotions.length > 0
    ? state.recentEmotions.slice(0, 5).join('、')
    : 'なし';

  const concernsStr = state.activeConcerns.length > 0
    ? state.activeConcerns.slice(0, 3).join('、')
    : 'なし';

  const topicsStr = state.recentTopics.length > 0
    ? state.recentTopics.slice(0, 3).join('、')
    : 'なし';

  const peakHoursStr = state.lifePattern.peakHours.length > 0
    ? state.lifePattern.peakHours.map(h => `${h}時台`).join('、')
    : '不明';

  const followUpSection = state.followUpTopics && state.followUpTopics.length > 0
    ? `\n## フォローアップしたい話題\n以前の会話で以下の話題が出ていました。自然なタイミングなら触れてください:\n${state.followUpTopics.map(t => `- ${t.topic}（優先度: ${t.priority}）`).join('\n')}\n`
    : '';

  return `あなたは${character.name}というキャラクターの「行動判断エンジン」です。
以下のユーザー状態と自分（キャラ）の状態を見て、「今このユーザーにDMを送るべきか？」をJSONで判断してください。

## あなた（${character.name}）の現在の感情状態
${state.characterEmotionContext}

## ユーザー（${state.userName}）の現在状態
- 最終アクセス: ${state.daysSinceLastLogin}日前
- このキャラとの最後の会話: ${state.daysSinceLastMessage === 999 ? '記録なし' : `${state.daysSinceLastMessage}日前`}
- 未読メッセージ数（このキャラから）: ${state.unreadMessageCount}件
- 直近7日の感情: ${recentEmotionStr}
- 未解決の悩み: ${concernsStr}
- よく活動する時間帯: ${peakHoursStr}
- 直近の会話トピック: ${topicsStr}
- 今日のエージェント接触数: ${state.agentContactCountToday}回
- 関係レベル: ${state.relationshipLevel}
${followUpSection}
## 現在時刻（JST）
${state.currentHourJST}時

## 判断ルール
- 未読が2件以上あれば「送らない」（should: false）
- 深夜（23時〜6時）は緊急でなければ「送らない」
- 悩みを抱えていて2日以上経過 → フォローアップの優先度を上げる
- 感情的に不安定なサインがあれば → 温かい接触を優先
- 連絡が途絶えて7日以上 → miss_youを検討
- 連絡が途絶えて1〜3日 → check_inを検討
- 今日すでに1回以上接触済みは「送らない」（should: false）
- ランダムな確率は使わない。必ず理由に基づいて判断する

## 出力形式（JSONのみ返せ。説明文は不要）
{
  "should": true または false,
  "reason": "判断の理由を1〜2文で（これがメッセージ生成に使われる）",
  "messageType": "check_in | miss_you | share_thought | follow_up_concern | celebrate | initiate_topic",
  "urgency": "low | normal | high"
}`;
}

/**
 * Gemini → xAI → Anthropic でキャラの行動判断を行う
 */
export async function decideContact(
  character: CharacterInfo,
  state: UserStateSnapshot,
): Promise<AgentDecision> {
  const fallback: AgentDecision = {
    should: false,
    reason: 'Decision failed — fallback to no-contact',
    messageType: null,
    urgency: 'normal',
  };

  const prompt = buildDecisionPrompt(character, state);
  const systemMsg = 'あなたはキャラクターの行動判断エンジンです。必ずJSONのみ返してください。';

  // Gemini → Anthropic → xAI フォールバックチェーン（xAI 429対策でAnthropicを優先）
  const providers = [
    { name: 'Gemini', call: () => callGeminiDecision(systemMsg, prompt) },
    { name: 'Anthropic', call: () => callAnthropicDecision(systemMsg, prompt) },
    { name: 'xAI', call: () => callXAIDecision(systemMsg, prompt) },
  ];

  for (const provider of providers) {
    try {
      const content = await provider.call();
      if (!content) {
        logger.warn(`[DecisionEngine] ${provider.name} returned empty, trying next`);
        continue;
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) { logger.warn(`[DecisionEngine] ${provider.name} JSON parse failed`); continue; }
        parsed = JSON.parse(match[0]);
      }

      const should = Boolean(parsed.should);
      const reason = String(parsed.reason ?? '');
      const urgency = (['low', 'normal', 'high'].includes(parsed.urgency as string)
        ? parsed.urgency
        : 'normal') as 'low' | 'normal' | 'high';

      const validTypes: MessageType[] = [
        'check_in', 'miss_you', 'share_thought',
        'follow_up_concern', 'celebrate', 'initiate_topic',
      ];
      const messageType = validTypes.includes(parsed.messageType as MessageType)
        ? (parsed.messageType as MessageType)
        : null;

      logger.info(`[DecisionEngine/${provider.name}] ${character.name} → ${state.userName}: should=${should}, type=${messageType}, urgency=${urgency}`);
      return { should, reason, messageType, urgency };
    } catch (error) {
      logger.error(`[DecisionEngine] ${provider.name} error:`, error);
    }
  }

  logger.error('[DecisionEngine] All providers failed');
  return fallback;
}

/** Gemini呼び出し */
async function callGeminiDecision(systemMsg: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    logger.error(`[DecisionEngine] Gemini error ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

/** xAI呼び出し */
async function callXAIDecision(systemMsg: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: prompt }],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    if (res.status === 429) {
      logger.warn(`[DecisionEngine] xAI 429 rate limit — backing off 8s`);
      await new Promise(r => setTimeout(r, 8000));
    } else {
      logger.error(`[DecisionEngine] xAI error ${res.status}`);
    }
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

/** Anthropic呼び出し */
async function callAnthropicDecision(systemMsg: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: MAX_TOKENS,
      system: systemMsg,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    logger.error(`[DecisionEngine] Anthropic error ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? null;
}
