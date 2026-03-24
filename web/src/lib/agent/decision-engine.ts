/**
 * DecisionEngine — 軽量LLM（grok-3-mini-fast）でキャラの行動判断を行う
 * 入力: UserStateSnapshot + キャラ情報
 * 出力: AgentDecision（should/reason/messageType/urgency）
 */

import { logger } from '@/lib/logger';
import type { UserStateSnapshot, AgentDecision, MessageType } from './types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CharacterInfo {
  id: string;
  name: string;
  slug?: string;
  systemPrompt: string;
}

/**
 * キャラ固有のAGENTS.mdを読み込む（存在しなければnull）
 */
function loadCharacterAgentsMd(slug: string | undefined): string | null {
  if (!slug) return null;
  const candidates = [
    join(process.cwd(), '..', 'characters', slug, 'AGENTS.md'),
    join(process.cwd(), 'characters', slug, 'AGENTS.md'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try { return readFileSync(p, 'utf-8'); } catch { /* ignore */ }
    }
  }
  return null;
}

const DECISION_MODEL = 'grok-3-mini';
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

  // キャラ固有の行動原則を読み込み
  const agentsMd = loadCharacterAgentsMd(character.slug);
  const characterRulesSection = agentsMd
    ? `\n## ${character.name}固有の行動原則\n${agentsMd}\n`
    : '';

  return `あなたは${character.name}というキャラクターの「行動判断エンジン」です。
${characterRulesSection}
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
 * grok-3-mini-fast を使って「今連絡すべきか」を判断する
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

  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    logger.warn('[DecisionEngine] XAI_API_KEY not set, skipping decision');
    return fallback;
  }

  const prompt = buildDecisionPrompt(character, state);

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DECISION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたはキャラクターの行動判断エンジンです。必ずJSONのみ返してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`[DecisionEngine] xAI API error ${res.status}: ${errText}`);
      return fallback;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      logger.warn('[DecisionEngine] Empty response from xAI');
      return fallback;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      logger.warn('[DecisionEngine] JSON parse failed:', content);
      return fallback;
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

    logger.info(`[DecisionEngine] ${character.name} → ${state.userName}: should=${should}, type=${messageType}, urgency=${urgency}`);

    return { should, reason, messageType, urgency };
  } catch (error) {
    logger.error('[DecisionEngine] Unexpected error:', error);
    return fallback;
  }
}
