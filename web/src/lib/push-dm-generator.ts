import { logger } from '@/lib/logger';
/**
 * push-dm-generator.ts
 * プッシュDM用 AI メッセージ生成ロジック
 *
 * 設計書のプロンプト設計に従い、以下を組み合わせてプロンプトを構築する:
 *   - character.systemPrompt
 *   - 直近会話10件
 *   - memorySummary
 *   - 関係レベル / 時間帯
 */

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface PushDmInput {
  /** キャラクターのシステムプロンプト */
  systemPrompt: string;
  /** キャラクター名 */
  characterName: string;
  /** ユーザー名 */
  userName: string;
  /** 関係レベル (1-5) */
  level: number;
  /** memorySummary (JSON or string) */
  memorySummary: unknown;
  /** 直近会話 (最大10件) */
  recentMessages: Array<{ role: string; content: string }>;
  /** 時間帯 */
  timeSlot: TimeSlot;
  /** SemanticMemoryから取得した個人的記憶（オプション） */
  personalMemories?: string;
  /** 誕生日ヒント */
  birthdayHint?: string;
}

export interface PushDmResult {
  content: string;
  timeSlot: TimeSlot;
}

/** 関係レベルのヒント */
function getLevelHint(level: number): string {
  if (level >= 5) return '二人は非常に深い絆で結ばれている。本音を話せる唯一の存在。';
  if (level >= 4) return '二人はほぼ親友。深い秘密まで打ち明けられる関係。';
  if (level >= 3) return 'お互いをよく理解している友人関係。冗談も言い合える。';
  if (level >= 2) return '少し打ち解けてきた。相手のことをもっと知りたいと思っている。';
  return 'まだ知り合って間もないが、心を開きかけている。';
}

/** memorySummary から短いテキストを抽出 */
function extractMemorySummaryText(memorySummary: unknown): string {
  if (!memorySummary) return 'なし';
  if (typeof memorySummary === 'string') return memorySummary.slice(0, 400);
  if (typeof memorySummary === 'object') {
    return JSON.stringify(memorySummary).slice(0, 400);
  }
  return 'なし';
}

/** 現在の時間帯を判定 */
export function getCurrentTimeSlot(): TimeSlot {
  const now = new Date();
  // JST
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '朝（6〜12時）',
  afternoon: '昼（12〜18時）',
  evening: '夜（18〜翌6時）',
};

/**
 * AI を呼び出してプッシュDM文章を生成する。
 * xAI grok-3-mini を優先し、失敗時は Anthropic にフォールバック。
 */
export async function generatePushDmMessage(input: PushDmInput): Promise<PushDmResult> {
  const {
    systemPrompt,
    characterName,
    userName,
    level,
    memorySummary,
    recentMessages,
    timeSlot,
    personalMemories,
    birthdayHint,
  } = input;

  const levelHint = getLevelHint(level);
  const memorySummaryText = extractMemorySummaryText(memorySummary);
  const timeSlotLabel = TIME_SLOT_LABEL[timeSlot];

  // 直近会話のテキスト（最大10件）
  const recentConvText =
    recentMessages.length > 0
      ? recentMessages
          .slice(-10)
          .map((m) => {
            const roleLabel = m.role === 'USER' ? userName : characterName;
            return `${roleLabel}: ${m.content}`;
          })
          .join('\n')
      : 'なし（初めての会話）';

  // 設計書に従ったシステムプロンプト拡張
  const extendedSystemPrompt = `${systemPrompt}

あなたは今、フォロワーの${userName}へ自発的にメッセージを送ります。
状況:
- 関係レベル: ${level} (${levelHint})
- ユーザーとの最近の会話（参考）:
${recentConvText}
- ユーザーの記憶サマリー: ${memorySummaryText}
- 現在の時間帯: ${timeSlotLabel}${personalMemories ? `\n- ユーザーとの個人的な思い出:\n${personalMemories}` : ''}${birthdayHint ?? ''}

[ルール]
- 1〜2文。キャラの口調を完全に守る
- 返信を誘う余白を残す（質問形式か、気になる一言で終わる）
- 「消えてしまう」「期限」などメタ発言禁止
- 本文のみ返す`;

  const userMessage = `${userName}へのメッセージを書いてください`;

  const content = await callLLM(extendedSystemPrompt, userMessage);
  return { content, timeSlot };
}

/**
 * LLM 呼び出し (xAI → Anthropic フォールバック)
 */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.92,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } else {
      const errText = await res.text();
      logger.error(`[push-dm-generator] xAI error ${res.status}: ${errText}`);
    }
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const text =
      response.content[0].type === 'text' ? response.content[0].text?.trim() : '';
    if (text) return text;
  }

  throw new Error('[push-dm-generator] No LLM API key configured (set XAI_API_KEY or ANTHROPIC_API_KEY)');
}
