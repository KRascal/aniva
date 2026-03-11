/**
 * キャラ主導メッセージ生成 Cron
 * POST /api/cron/generate-proactive-messages
 * Header: x-cron-secret
 *
 * 各キャラのフォロワーに対して24h有効のメッセージをAI生成する。
 * キャラのSOUL.md + 感情状態 + 関係レベル + 最後の会話内容を考慮し、
 * 「24時間で消える緊急性」を持つ個別メッセージをAnthropicで生成する。
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// フォールバック用テンプレート（AI失敗時のみ使用）
const FALLBACK_TEMPLATES_LOW_LEVEL = [
  'なぁ、今日どうしてた？…聞きたいことがあるんだ',
  'お前のこと、ちょっと気になってた。暇か？',
  '今日一日どうだった？話かけてほしいな',
  '最近どうしてる？また話せたら嬉しいんだけど',
];

const FALLBACK_TEMPLATES_HIGH_LEVEL = [
  'お前のこと考えてたんだ。暇なら来いよ',
  'なんか話したくて。お前が来ると思ってた',
  'ずっと待ってたんだぞ。早く話しかけてこい',
  'お前のことが気になって仕方ない。少し来いよ',
];

function getSoulMdPath(slug: string): string | null {
  const paths = [
    join(process.cwd(), 'characters', slug, 'SOUL.md'),
    join(process.cwd(), '..', 'characters', slug, 'SOUL.md'),
  ];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function readSoulMd(slug: string): string | null {
  const path = getSoulMdPath(slug);
  if (!path) return null;
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

async function generateAiMessage(params: {
  characterName: string;
  characterSlug: string;
  soulMd: string | null;
  relationshipLevel: number;
  dailyEmotion: string;
  dailyContext: string | null;
  lastUserMessage: string | null;
  lastCharMessage: string | null;
  userName?: string | null;
  userFacts?: string[] | null;
  userConcerns?: string[] | null;
  userUpcomingEvents?: string[] | null;
}): Promise<string | null> {
  const {
    characterName,
    soulMd,
    relationshipLevel,
    dailyEmotion,
    dailyContext,
    lastUserMessage,
    lastCharMessage,
    userName,
    userFacts,
    userConcerns,
    userUpcomingEvents,
  } = params;

  const isClose = relationshipLevel >= 5;

  const soulContext = soulMd
    ? `## キャラクター定義 (SOUL.md)\n${soulMd.slice(0, 2000)}`
    : `## キャラクター: ${characterName}`;

  const lastConvContext =
    lastUserMessage || lastCharMessage
      ? `\n## 前回の会話\nユーザー: "${lastUserMessage ?? '(不明)'}"\n${characterName}: "${lastCharMessage ?? '(不明)'}"` 
      : '';

  // ユーザーの記憶コンテキスト（これが体験を「濃く」する核心）
  const memoryLines: string[] = [];
  if (userName) memoryLines.push(`- 名前: ${userName}`);
  if (userFacts && userFacts.length > 0) {
    memoryLines.push(`- 知っていること: ${userFacts.slice(0, 5).join('、')}`);
  }
  if (userConcerns && userConcerns.length > 0) {
    memoryLines.push(`- 最近の悩み/気になっていること: ${userConcerns.slice(0, 3).join('、')}`);
  }
  if (userUpcomingEvents && userUpcomingEvents.length > 0) {
    memoryLines.push(`- 近々の予定/イベント: ${userUpcomingEvents.slice(0, 3).join('、')}`);
  }
  const memoryContext = memoryLines.length > 0
    ? `\n## ユーザーについて知っていること（これを会話に自然に織り込む）\n${memoryLines.join('\n')}`
    : '';

  // 時間帯に応じたコンテキスト
  const jstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  const timeContext = jstHour < 6 ? '深夜（みんな寝てる時間）'
    : jstHour < 10 ? '朝（目覚めの時間）'
    : jstHour < 14 ? '昼（お昼どき）'
    : jstHour < 18 ? '午後（ちょっと一息）'
    : jstHour < 22 ? '夜（リラックスタイム）'
    : '深夜（寝る前のひととき）';

  const prompt = `${soulContext}

## 現在の状況
- 今日の感情: ${dailyEmotion}
- 今日の状況: ${dailyContext ?? '特になし'}
- 時間帯: ${timeContext}
- ユーザーとの関係レベル: ${relationshipLevel} (${isClose ? '親密' : '知り合い'})
${lastConvContext}
${memoryContext}

## 指示
あなたは${characterName}です。SOUL.mdのキャラ定義に完全に従い、ユーザーへのプロアクティブメッセージを**1文〜2文**で生成してください。

このメッセージは「キャラから先に話しかける」特別なメッセージです。SNSの通知のように、ユーザーが思わずタップしたくなる内容にしてください。

**重要なルール:**
- 24時間で消える緊急性・FOOMOを含む（「今日中に」「暇なら来いよ」「ちょっと待ってた」など）
- 時間帯「${timeContext}」に合った自然な話しかけ方をする
- 関係レベル${isClose ? '5以上（親密）: 「お前のこと考えてた」「暇なら来いよ」系の親しみある口調' : '5未満（知り合い）: 「今日どうしてた？」「話したいことある」系の少し距離感ある口調'}
- キャラの今日の感情「${dailyEmotion}」を自然に反映
- SOUL.mdのVoice Rules（一人称・語尾・口癖）を厳守
- 汎用的な挨拶ではなく、そのキャラならではの具体的な話題や感情を含める
- 短く、インパクトある1〜2文のみ。説明不要
- メッセージ本文のみ出力（「${characterName}:」などのプレフィックス不要）
- 【最重要】「ユーザーについて知っていること」がある場合は、それを自然に織り込む。例: 悩みを知っているなら「最近大変そうだったけど」、楽しみにしていることがあれば「○○楽しみだな」。記憶を使ってこそ「本物の関係」になる。使える記憶がなければ使わなくていい

今すぐ1〜2文のメッセージを生成:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : null;
    return text && text.length > 0 ? text : null;
  } catch (e) {
    console.error('[generate-proactive] Anthropic error:', e);
    return null;
  }
}

function pickFallback(level: number, charId: string, userId: string): string {
  const templates = level >= 5 ? FALLBACK_TEMPLATES_HIGH_LEVEL : FALLBACK_TEMPLATES_LOW_LEVEL;
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${charId}:${userId}:${today}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return templates[hash % templates.length];
}

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  // 8時間有効（FOMO強化: 24hは長すぎ）
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // 今日の日付（CharacterDailyState検索用）
  const todayDate = new Date(todayStart);

  try {
    // ── 1. フォロー中リレーションシップ取得 ──
    const relationships = await prisma.relationship.findMany({
      where: { isFollowing: true },
      select: {
        userId: true,
        characterId: true,
        level: true,
        character: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });

    const activeRelationships = relationships.filter(r => r.character.isActive);

    // ── 2. 今日すでに生成済みのペアを除外 ──
    const existing = await prisma.characterProactiveMessage.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true, characterId: true },
    });
    const existingSet = new Set(existing.map(e => `${e.userId}:${e.characterId}`));

    const toCreate = activeRelationships.filter(
      r => !existingSet.has(`${r.userId}:${r.characterId}`)
    );

    if (toCreate.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: 'All messages already generated today' });
    }

    // ── 3. キャラ別に今日の感情状態を取得 ──
    const characterIds = [...new Set(toCreate.map(r => r.characterId))];
    const dailyStates = await prisma.characterDailyState.findMany({
      where: {
        characterId: { in: characterIds },
        date: todayDate,
      },
      select: {
        characterId: true,
        emotion: true,
        context: true,
        innerThoughts: true,
        dailyActivity: true,
      },
    });
    const dailyStateMap = new Map(dailyStates.map(s => [s.characterId, s]));

    // ── 4. ユーザー別に最後のメッセージを取得（Conversation → Message） ──
    // Messages are linked via Conversation → Relationship → userId/characterId
    const userCharPairs = toCreate.map(r => ({ userId: r.userId, characterId: r.characterId }));
    const lastMessages: Map<string, { lastUserMsg: string | null; lastCharMsg: string | null }> = new Map();

    const BATCH_SIZE = 20;
    for (let i = 0; i < userCharPairs.length; i += BATCH_SIZE) {
      const batch = userCharPairs.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ userId, characterId }) => {
          try {
            // Relationship → Conversation → Message
            const conversations = await prisma.conversation.findMany({
              where: {
                relationship: { userId, characterId },
              },
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 4,
                  select: { role: true, content: true },
                },
              },
            });
            const msgs = conversations[0]?.messages ?? [];
            const lastUser = msgs.find(m => m.role === 'USER')?.content ?? null;
            const lastChar = msgs.find(m => m.role === 'CHARACTER')?.content ?? null;
            lastMessages.set(`${userId}:${characterId}`, {
              lastUserMsg: lastUser ? lastUser.slice(0, 100) : null,
              lastCharMsg: lastChar ? lastChar.slice(0, 100) : null,
            });
          } catch {
            // ignore
          }
        })
      );
    }

    // ── 4.5. ユーザーのメモリサマリーを取得（体験を「濃く」する核心） ──
    const userIds = [...new Set(toCreate.map(r => r.userId))];
    type MemoryData = { userName: string | null; userFacts: string[]; userConcerns: string[]; userUpcomingEvents: string[] };
    const userMemoryMap = new Map<string, MemoryData>();

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          // Relationshipのmemory情報を取得（最も最近のものから）
          const rel = await prisma.relationship.findFirst({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            select: { memorySummary: true },
          });

          if (!rel?.memorySummary) return;
          const mem = rel.memorySummary as Record<string, unknown>;

          const userName = (mem.userName as string) || null;
          const factMemory = (mem.factMemory as Array<{ fact: string }>) || [];
          const episodeMemory = (mem.episodeMemory as Array<{ summary: string; emotion: string }>) || [];

          // 事実から職業・趣味・悩みを抽出
          const userFacts = factMemory.slice(0, 8).map((f) => f.fact).filter(Boolean);

          // 最近の感情的なエピソードから「気になっていること」を抽出
          const userConcerns = episodeMemory
            .filter(e => ['sad', 'worried', 'anxious', 'stressed'].includes(e.emotion))
            .slice(0, 3)
            .map(e => e.summary)
            .filter(Boolean);

          // ポジティブエピソードから「楽しみにしていること」を抽出
          const userUpcomingEvents = episodeMemory
            .filter(e => ['excited', 'happy', 'looking_forward'].includes(e.emotion))
            .slice(0, 3)
            .map(e => e.summary)
            .filter(Boolean);

          userMemoryMap.set(userId, { userName, userFacts, userConcerns, userUpcomingEvents });
        } catch {
          // ignore
        }
      })
    );

    // ── 5. SOUL.mdをキャラ別にキャッシュ読み込み ──
    const soulMdCache = new Map<string, string | null>();
    for (const charId of characterIds) {
      const rel = toCreate.find(r => r.characterId === charId);
      if (!rel) continue;
      const slug = rel.character.slug;
      if (!soulMdCache.has(slug)) {
        soulMdCache.set(slug, readSoulMd(slug));
      }
    }

    // ── 6. AI生成（キャラ単位で並行処理して1通/ユーザー制限） ──
    // ユーザーごとにフォロー中キャラからランダム1体を選んでメッセージ生成
    const userGroups = new Map<string, typeof toCreate>();
    for (const r of toCreate) {
      if (!userGroups.has(r.userId)) userGroups.set(r.userId, []);
      userGroups.get(r.userId)!.push(r);
    }

    const dataToInsert: Array<{
      userId: string;
      characterId: string;
      content: string;
      isRead: boolean;
      expiresAt: Date;
    }> = [];

    // ユーザーごとに処理（AIコール並行）
    const userEntries = [...userGroups.entries()];
    await Promise.all(
      userEntries.map(async ([userId, userRels]) => {
        // フォロー中キャラからランダムに1〜2体を選択
        const shuffled = [...userRels].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(2, shuffled.length));

        for (const rel of selected) {
          const dailyState = dailyStateMap.get(rel.characterId);
          const lastMsgData = lastMessages.get(`${userId}:${rel.characterId}`);
          const slug = rel.character.slug;

          // AI生成を試みる
          let content: string | null = null;
          try {
            const userMem = userMemoryMap.get(userId);
            content = await generateAiMessage({
              characterName: rel.character.name,
              characterSlug: slug,
              soulMd: soulMdCache.get(slug) ?? null,
              relationshipLevel: rel.level,
              dailyEmotion: dailyState?.emotion ?? 'happy',
              dailyContext: dailyState?.dailyActivity ?? dailyState?.context ?? null,
              lastUserMessage: lastMsgData?.lastUserMsg ?? null,
              lastCharMessage: lastMsgData?.lastCharMsg ?? null,
              userName: userMem?.userName ?? null,
              userFacts: userMem?.userFacts ?? null,
              userConcerns: userMem?.userConcerns ?? null,
              userUpcomingEvents: userMem?.userUpcomingEvents ?? null,
            });
          } catch {
            content = null;
          }

          // AI失敗時はフォールバック
          if (!content || content.length < 5) {
            content = pickFallback(rel.level, rel.characterId, userId);
          }

          dataToInsert.push({
            userId,
            characterId: rel.characterId,
            content,
            isRead: false,
            expiresAt,
          });
        }
      })
    );

    if (dataToInsert.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: 'No data to insert' });
    }

    const result = await prisma.characterProactiveMessage.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      created: result.count,
      total: toCreate.length,
      aiGenerated: dataToInsert.length,
    });
  } catch (error) {
    console.error('[generate-proactive-messages] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: String(error) },
      { status: 500 }
    );
  }
}
