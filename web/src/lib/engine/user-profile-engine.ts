// ============================================================
// User Profile Engine — ユーザー理解エンジン
// 会話からユーザーの人格モデルを構築し、キャラが「親友」のように理解する
// ============================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';
import { callLLM } from './llm';

// ── Types ────────────────────────────────────────────────────

/** basics JSON の型 */
interface UserBasics {
  name?: string;
  birthday?: string;        // "MM-DD" or "YYYY-MM-DD"
  age?: number | null;
  location?: string | null;
  occupation?: string | null;
  school?: string | null;
  hobbies?: string[];
  languages?: string[];
}

/** personality JSON の型 */
interface UserPersonality {
  communicationStyle?: string;  // "casual" | "polite" | "mixed"
  emojiUsage?: string;          // "none" | "rare" | "moderate" | "heavy"
  topicPreference?: string;     // "casual" | "mixed" | "deep"
  responseExpectation?: string; // "advice" | "empathy" | "humor" | "facts"
  talkativeLevel?: number;      // 0-1
}

/** interests JSON の型 */
interface UserInterest {
  topic: string;
  intensity: number;         // 0-1
  lastMentioned?: string;    // ISO date
}

/** currentState JSON の型 */
interface UserCurrentState {
  dominantMood?: string;
  stressLevel?: number;       // 0-1
  recentEmotion?: string;
  recentEmotionContext?: string;
  lastUpdated?: string;
}

/** topics JSON の型 (キャラ固有トピック情報) */
interface UserTopics {
  sharedTopics?: string[];
  sharedSecrets?: string[];
  concerns?: Array<{
    topic: string;
    detail: string;
    status: 'active' | 'resolved' | 'stale';
    firstMentioned?: string;
    lastMentioned?: string;
  }>;
}

/** LLMプロファイル抽出結果 */
interface ProfileExtraction {
  basics: Partial<UserBasics>;
  newInterests: Array<{ topic: string; intensity: number }>;
  concerns: {
    new: Array<{ topic: string; detail: string }>;
    resolved: string[];
  };
  currentEmotion: {
    emotion: string;
    intensity: number;
    context: string;
  };
  characterSpecific: {
    sharedTopics: string[];
    newSecret: string | null;
  };
}

// ── Core Functions ───────────────────────────────────────────

/**
 * ユーザープロファイルを取得。なければ新規作成して返す。
 * @param userId - ユーザーID
 * @param characterId - キャラクターID（nullでグローバルプロファイル）
 */
export async function getUserProfile(
  userId: string,
  characterId: string | null = null,
): Promise<{
  id: string;
  userId: string;
  characterId: string | null;
  basics: UserBasics;
  personality: UserPersonality;
  interests: UserInterest[];
  currentState: UserCurrentState;
  topics: UserTopics;
  updatedAt: Date;
  createdAt: Date;
}> {
  try {
    // @@unique([userId, characterId]) で検索
    const existing = await prisma.userProfile.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId: characterId ?? '',  // Prismaは null unique の扱いが特殊なので空文字で代替
        },
      },
    });

    if (existing) {
      return {
        ...existing,
        basics: (existing.basics as UserBasics) || {},
        personality: (existing.personality as UserPersonality) || {},
        interests: (existing.interests as UserInterest[]) || [],
        currentState: (existing.currentState as UserCurrentState) || {},
        topics: (existing.topics as UserTopics) || {},
      };
    }
  } catch {
    // findUnique with null characterId — Prisma handles nullable unique differently
    // Fall through to query approach
  }

  // Nullable characterId の場合は findFirst で検索
  const profile = await prisma.userProfile.findFirst({
    where: {
      userId,
      characterId: characterId ?? null,
    },
  });

  if (profile) {
    return {
      ...profile,
      basics: (profile.basics as UserBasics) || {},
      personality: (profile.personality as UserPersonality) || {},
      interests: (profile.interests as UserInterest[]) || [],
      currentState: (profile.currentState as UserCurrentState) || {},
      topics: (profile.topics as UserTopics) || {},
    };
  }

  // 新規作成
  const created = await prisma.userProfile.create({
    data: {
      userId,
      characterId: characterId ?? null,
      basics: {},
      personality: {},
      interests: [],
      currentState: {},
      topics: {},
    },
  });

  return {
    ...created,
    basics: {},
    personality: {},
    interests: [],
    currentState: {},
    topics: {},
  };
}

/**
 * プロファイルをシステムプロンプト用テキストに変換する。
 * キャラがユーザーを理解しているかのように自然に参照できる形式。
 */
export function buildUserProfilePrompt(profile: {
  basics: UserBasics;
  personality: UserPersonality;
  interests: UserInterest[];
  currentState: UserCurrentState;
  topics: UserTopics;
}): string {
  const parts: string[] = [];

  // 基本情報
  const b = profile.basics;
  if (b.name) parts.push(`相手の名前: ${b.name}`);
  if (b.occupation) parts.push(`職業: ${b.occupation}`);
  if (b.school) parts.push(`学校: ${b.school}`);
  if (b.location) parts.push(`住んでいる場所: ${b.location}`);
  if (b.hobbies?.length) parts.push(`趣味: ${b.hobbies.join('、')}`);
  if (b.birthday) parts.push(`誕生日: ${b.birthday}`);

  // 関心事（intensity順、上位5件）
  const activeInterests = (profile.interests || [])
    .filter(i => i.intensity > 0.4)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5);
  if (activeInterests.length) {
    parts.push(`関心が高いテーマ: ${activeInterests.map(i => i.topic).join('、')}`);
  }

  // 悩み・気がかり
  const concerns = profile.topics?.concerns?.filter(c => c.status === 'active') || [];
  if (concerns.length) {
    parts.push('現在の悩み/気がかり:');
    for (const c of concerns.slice(0, 3)) {
      parts.push(`  - ${c.detail}（${c.lastMentioned || c.firstMentioned || ''}最終言及）`);
    }
  }

  // キャラ固有の共有トピック
  const sharedTopics = profile.topics?.sharedTopics || [];
  if (sharedTopics.length) {
    parts.push(`あなたとよく話すテーマ: ${sharedTopics.join('、')}`);
  }

  // 秘密
  const secrets = profile.topics?.sharedSecrets || [];
  if (secrets.length) {
    parts.push('あなただけに話してくれたこと:');
    for (const s of secrets.slice(0, 3)) {
      parts.push(`  - ${s}`);
    }
  }

  // 感情状態
  const state = profile.currentState;
  if (state.stressLevel && state.stressLevel > 0.7) {
    parts.push('⚠️ 最近ストレスが高い傾向 → 無理させないこと');
  }
  if (state.recentEmotion && ['sad', 'stressed', 'anxious', 'depressed'].includes(state.recentEmotion)) {
    parts.push(`⚠️ 最近つらそうだった（${state.recentEmotionContext || state.recentEmotion}）→ 寄り添いを意識すること`);
  }

  // コミュニケーションスタイル
  const p = profile.personality;
  if (p.responseExpectation === 'empathy') {
    parts.push('コミュニケーション傾向: 共感を求めるタイプ → アドバイスより寄り添いを優先');
  } else if (p.responseExpectation === 'humor') {
    parts.push('コミュニケーション傾向: ユーモアを好む → 軽い冗談を交えてOK');
  }

  if (parts.length === 0) return '';

  return `## ユーザーについての理解\n${parts.join('\n')}`;
}

/**
 * 会話からユーザー情報を抽出し、プロファイルを非同期で更新する。
 * レスポンスをブロックしないよう fire-and-forget で呼ぶこと。
 *
 * @param userId - ユーザーID
 * @param characterId - キャラクターID
 * @param messages - 直近の会話メッセージ（最大10件推奨）
 * @param currentProfile - 現在のプロファイル
 */
export async function extractAndUpdateProfile(
  userId: string,
  characterId: string,
  messages: Array<{ role: string; content: string }>,
  currentProfile: {
    basics: UserBasics;
    personality: UserPersonality;
    interests: UserInterest[];
    currentState: UserCurrentState;
    topics: UserTopics;
  },
): Promise<void> {
  try {
    // 直近のメッセージだけ使う（コスト管理）
    const recentMessages = messages.slice(-10);
    if (recentMessages.length < 2) return; // 会話が短すぎる場合はスキップ

    const existingProfileSummary = formatProfileForExtraction(currentProfile);

    const extractionPrompt = `あなたは会話分析AIです。以下のチャット履歴からユーザーの情報を構造化抽出してください。

## 既存プロファイル
${existingProfileSummary}

## 会話履歴（直近）
${recentMessages.map(m => `${m.role === 'user' || m.role === 'USER' ? 'ユーザー' : 'キャラ'}: ${m.content}`).join('\n')}

## 抽出ルール
- 明示的に述べられた事実のみ抽出（推測禁止）
- 既存プロファイルと矛盾する情報がある場合は新しい方を採用
- 悩み・心配事は「解決済み」かどうかも判定
- 感情は文脈から判断（明示的な言及がなくても推定してよい）
- 変更がない場合は空オブジェクト/空配列を返す

## 出力形式（JSONのみ、他の文字列は含めない）
{
  "basics": {},
  "newInterests": [],
  "concerns": { "new": [], "resolved": [] },
  "currentEmotion": { "emotion": "neutral", "intensity": 0.5, "context": "" },
  "characterSpecific": { "sharedTopics": [], "newSecret": null }
}`;

    const result = await callLLM(
      extractionPrompt,
      [{ role: 'user', content: '上記の会話を分析し、JSONのみ出力してください。' }],
    );

    // JSONパース
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('[UserProfileEngine] Failed to extract JSON from LLM response');
      return;
    }

    let extraction: ProfileExtraction;
    try {
      extraction = JSON.parse(jsonMatch[0]);
    } catch {
      logger.warn('[UserProfileEngine] Failed to parse extraction JSON');
      return;
    }

    // プロファイル更新
    await applyExtraction(userId, characterId, extraction, currentProfile);

    logger.info('[UserProfileEngine] Profile updated', { userId, characterId });
  } catch (error) {
    logger.error('[UserProfileEngine] extractAndUpdateProfile failed', { error, userId });
  }
}

// ── Internal Helpers ─────────────────────────────────────────

function formatProfileForExtraction(profile: {
  basics: UserBasics;
  personality: UserPersonality;
  interests: UserInterest[];
  currentState: UserCurrentState;
  topics: UserTopics;
}): string {
  const parts: string[] = [];
  const b = profile.basics;
  if (b.name) parts.push(`名前: ${b.name}`);
  if (b.occupation) parts.push(`職業: ${b.occupation}`);
  if (b.hobbies?.length) parts.push(`趣味: ${b.hobbies.join(', ')}`);

  const interests = (profile.interests || []).slice(0, 5);
  if (interests.length) {
    parts.push(`関心: ${interests.map(i => `${i.topic}(${i.intensity})`).join(', ')}`);
  }

  const concerns = profile.topics?.concerns?.filter(c => c.status === 'active') || [];
  if (concerns.length) {
    parts.push(`悩み: ${concerns.map(c => c.topic).join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'まだ情報なし';
}

async function applyExtraction(
  userId: string,
  characterId: string,
  extraction: ProfileExtraction,
  current: {
    basics: UserBasics;
    personality: UserPersonality;
    interests: UserInterest[];
    currentState: UserCurrentState;
    topics: UserTopics;
  },
): Promise<void> {
  const now = new Date().toISOString();

  // --- グローバルプロファイル更新 ---
  const updatedBasics = { ...current.basics, ...extraction.basics };

  // interests マージ（既存 + 新規、topic名で重複排除）
  const existingInterests = [...(current.interests || [])];
  for (const ni of extraction.newInterests || []) {
    const idx = existingInterests.findIndex(
      e => e.topic.toLowerCase() === ni.topic.toLowerCase(),
    );
    if (idx >= 0) {
      existingInterests[idx] = { ...existingInterests[idx], intensity: ni.intensity, lastMentioned: now };
    } else {
      existingInterests.push({ topic: ni.topic, intensity: ni.intensity, lastMentioned: now });
    }
  }
  // 古い低intensity項目を切り捨て（最大20件）
  const sortedInterests = existingInterests
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 20);

  // concerns マージ
  const existingConcerns = [...(current.topics?.concerns || [])];
  for (const resolved of extraction.concerns?.resolved || []) {
    const idx = existingConcerns.findIndex(
      c => c.topic.toLowerCase() === resolved.toLowerCase(),
    );
    if (idx >= 0) {
      existingConcerns[idx].status = 'resolved';
    }
  }
  for (const newC of extraction.concerns?.new || []) {
    const existing = existingConcerns.find(
      c => c.topic.toLowerCase() === newC.topic.toLowerCase(),
    );
    if (!existing) {
      existingConcerns.push({
        topic: newC.topic,
        detail: newC.detail,
        status: 'active',
        firstMentioned: now,
        lastMentioned: now,
      });
    } else {
      existing.detail = newC.detail;
      existing.lastMentioned = now;
      existing.status = 'active';
    }
  }

  // currentState 更新
  const updatedState: UserCurrentState = {
    ...current.currentState,
    lastUpdated: now,
  };
  if (extraction.currentEmotion?.emotion) {
    updatedState.recentEmotion = extraction.currentEmotion.emotion;
    updatedState.recentEmotionContext = extraction.currentEmotion.context;
    if (extraction.currentEmotion.intensity > 0.6) {
      updatedState.stressLevel = ['stressed', 'anxious', 'sad', 'angry', 'depressed'].includes(
        extraction.currentEmotion.emotion,
      )
        ? Math.max(updatedState.stressLevel || 0, extraction.currentEmotion.intensity)
        : Math.min(updatedState.stressLevel || 0.5, 1 - extraction.currentEmotion.intensity);
    }
  }

  // topics 更新（キャラ固有）
  const updatedTopics: UserTopics = {
    ...current.topics,
    concerns: existingConcerns,
  };
  if (extraction.characterSpecific?.sharedTopics?.length) {
    const existing = new Set(updatedTopics.sharedTopics || []);
    for (const t of extraction.characterSpecific.sharedTopics) {
      existing.add(t);
    }
    updatedTopics.sharedTopics = Array.from(existing).slice(0, 20);
  }
  if (extraction.characterSpecific?.newSecret) {
    const secrets = updatedTopics.sharedSecrets || [];
    if (!secrets.includes(extraction.characterSpecific.newSecret)) {
      secrets.push(extraction.characterSpecific.newSecret);
      updatedTopics.sharedSecrets = secrets.slice(-10); // 最新10件
    }
  }

  // --- グローバルプロファイル upsert ---
  await prisma.userProfile.upsert({
    where: {
      userId_characterId: {
        userId,
        characterId: '',
      },
    },
    update: {
      basics: updatedBasics as Record<string, unknown>,
      interests: sortedInterests as unknown as Record<string, unknown>[],
      currentState: updatedState as Record<string, unknown>,
    },
    create: {
      userId,
      characterId: null,
      basics: updatedBasics as Record<string, unknown>,
      interests: sortedInterests as unknown as Record<string, unknown>[],
      currentState: updatedState as Record<string, unknown>,
      personality: {},
      topics: {},
    },
  }).catch(() => {
    // グローバルプロファイルの upsert が失敗してもキャラ別は進める
  });

  // --- キャラ別プロファイル upsert ---
  if (characterId) {
    await prisma.userProfile.upsert({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
      update: {
        basics: updatedBasics as Record<string, unknown>,
        interests: sortedInterests as unknown as Record<string, unknown>[],
        currentState: updatedState as Record<string, unknown>,
        topics: updatedTopics as Record<string, unknown>,
      },
      create: {
        userId,
        characterId,
        basics: updatedBasics as Record<string, unknown>,
        personality: current.personality as Record<string, unknown>,
        interests: sortedInterests as unknown as Record<string, unknown>[],
        currentState: updatedState as Record<string, unknown>,
        topics: updatedTopics as Record<string, unknown>,
      },
    });
  }
}
