import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

// LLM provider — same pattern as character-comments cron
async function generateText(systemMessage: string, userMessage: string): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 120,
        temperature: 0.9,
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 120,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key configured');
}

// Read SOUL.md for a character slug
function readSoulMd(slug: string): string {
  const soulPath = path.join(process.cwd(), 'characters', slug, 'SOUL.md');
  try {
    if (fs.existsSync(soulPath)) {
      return fs.readFileSync(soulPath, 'utf-8').slice(0, 2000); // cap at 2000 chars
    }
  } catch {
    // ignore
  }
  return '';
}

// Schedule a single character reply with a random delay
async function scheduleReply(opts: {
  characterId: string;
  characterName: string;
  characterSlug: string;
  systemPrompt: string;
  momentId: string;
  triggerCommentId: string;
  triggerContent: string;
  triggerUserName: string;
  delayMs: number;
}) {
  const {
    characterId,
    characterName,
    characterSlug,
    systemPrompt,
    momentId,
    triggerCommentId,
    triggerContent,
    triggerUserName,
    delayMs,
  } = opts;

  setTimeout(async () => {
    try {
      const soulMd = readSoulMd(characterSlug);
      const systemPromptCore = (systemPrompt || '').split(/\n##/)[0].trim();
      const soulSection = soulMd ? `\n\n[キャラ詳細]\n${soulMd.split(/\n##/)[0].trim()}` : '';

      const systemMessage =
        `${systemPromptCore}${soulSection}\n\n` +
        `重要: SNSの返信コメントとして自然な1〜2文のみを出力せよ。` +
        `返信したくない・無視する場合は空文字を返せ。説明文・口調ルール等は絶対に出力しない。`;

      const userMessage =
        `${triggerUserName}さんのコメント「${triggerContent.slice(0, 200)}」に対して、` +
        `${characterName}としてSNSで自然に返信せよ。短く（1〜2文）。` +
        `${characterName}らしくない返信や、キャラの性格に合わない場合は空文字を返せ。`;

      const rawContent = await generateText(systemMessage, userMessage);
      if (!rawContent) return; // キャラが無視した

      const content = rawContent
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
      if (!content) return;

      // Twitter方式: キャラ返信もトップレベルにフラット化（2階層以上のネスト防止）
      const triggerCommentData = await prisma.momentComment.findUnique({
        where: { id: triggerCommentId },
        select: { parentCommentId: true, user: { select: { displayName: true, nickname: true, name: true } }, character: { select: { name: true } } },
      });
      const flatParentId = triggerCommentData?.parentCommentId || triggerCommentId;
      // ネストされている場合は@メンション追加
      const mentionTarget = triggerCommentData?.parentCommentId
        ? (triggerCommentData.character?.name || triggerCommentData.user?.displayName || triggerCommentData.user?.nickname || triggerCommentData.user?.name)
        : null;
      const finalContent = mentionTarget ? `@${mentionTarget} ${content}`.slice(0, 200) : content;

      await prisma.momentComment.create({
        data: {
          momentId,
          characterId,
          userId: null,
          content: finalContent,
          parentCommentId: flatParentId,
        },
      });
    } catch (err) {
      console.error(`[comment-reply] reply failed for ${characterName}:`, err);
    }
  }, delayMs);
}

export async function POST(req: NextRequest) {
  // セキュリティ: 内部呼び出しのみ許可
  // 認証: 内部呼び出し専用。複数ヘッダーに対応
  const internalHeader = req.headers.get('x-internal-secret')
    || req.headers.get('x-cron-secret')
    || req.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;
  
  // CRON_SECRETが未設定の場合でも内部呼び出しを許可（Nginx経由で外部からはアクセス不可）
  if (cronSecret && internalHeader && internalHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    momentId?: string;
    triggerCommentId?: string;
    triggerContent?: string;
    triggerUserName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { momentId, triggerCommentId, triggerContent, triggerUserName } = body;
  if (!momentId || !triggerCommentId || !triggerContent) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const displayName = triggerUserName || 'ユーザー';

  try {
    // Moment + 投稿キャラ取得
    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: {
        id: true,
        characterId: true,
        character: { select: { id: true, name: true, slug: true, systemPrompt: true } },
      },
    });

    if (!moment) {
      return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
    }

    // トリガーコメントの親を取得 — キャラの返信に対する返信かチェック
    const triggerComment = await prisma.momentComment.findUnique({
      where: { id: triggerCommentId },
      select: { parentCommentId: true },
    });

    // 親コメントがキャラのものなら、そのキャラからも返信させる
    let repliedToChar: { id: string; name: string; slug: string; systemPrompt: string } | null = null;
    if (triggerComment?.parentCommentId) {
      const parentComment = await prisma.momentComment.findUnique({
        where: { id: triggerComment.parentCommentId },
        select: { characterId: true },
      });
      if (parentComment?.characterId && parentComment.characterId !== moment.characterId) {
        const char = await prisma.character.findUnique({
          where: { id: parentComment.characterId, isActive: true },
          select: { id: true, name: true, slug: true, systemPrompt: true },
        });
        if (char) repliedToChar = char;
      }
    }

    // このMomentに既にコメントしている他のキャラ（重複排除）
    const existingCharComments = await prisma.momentComment.findMany({
      where: {
        momentId,
        characterId: { not: null },
        id: { not: triggerCommentId },
      },
      select: { characterId: true },
      distinct: ['characterId'],
      take: 10,
    });

    const otherCharIds = existingCharComments
      .map((c) => c.characterId)
      .filter((id): id is string =>
        id !== null &&
        id !== moment.characterId &&
        id !== repliedToChar?.id // 直接返信キャラは別途処理
      );

    const otherChars = otherCharIds.length > 0
      ? await prisma.character.findMany({
          where: { id: { in: otherCharIds }, isActive: true },
          select: { id: true, name: true, slug: true, systemPrompt: true },
        })
      : [];

    const scheduled: string[] = [];

    // ① 直接返信先キャラ: 100%即返信（2〜5秒 — 会話感を演出）
    if (repliedToChar) {
      const delayMs = (2 + Math.floor(Math.random() * 3)) * 1000;
      await scheduleReply({
        characterId: repliedToChar.id,
        characterName: repliedToChar.name,
        characterSlug: repliedToChar.slug,
        systemPrompt: repliedToChar.systemPrompt,
        momentId,
        triggerCommentId,
        triggerContent,
        triggerUserName: displayName,
        delayMs,
      });
      scheduled.push(`${repliedToChar.name} (${Math.round(delayMs / 1000)}s, direct)`);
    }

    // ② 投稿キャラ: 100%即返信（3〜8秒）
    const momentChar = moment.character;
    // 直接返信先と投稿キャラが同じなら重複させない
    if (!repliedToChar || repliedToChar.id !== momentChar.id) {
      const delayMs = (3 + Math.floor(Math.random() * 5)) * 1000;
      await scheduleReply({
        characterId: momentChar.id,
        characterName: momentChar.name,
        characterSlug: momentChar.slug,
        systemPrompt: momentChar.systemPrompt,
        momentId,
        triggerCommentId,
        triggerContent,
        triggerUserName: displayName,
        delayMs,
      });
      scheduled.push(`${momentChar.name} (${Math.round(delayMs / 1000)}s)`);
    }

    // ③ 既存コメントキャラ: 各40%確率、10〜30秒ディレイ
    for (const char of otherChars) {
      if (Math.random() < 0.4) {
        const delayMs = (10 + Math.floor(Math.random() * 20)) * 1000;
        await scheduleReply({
          characterId: char.id,
          characterName: char.name,
          characterSlug: char.slug,
          systemPrompt: char.systemPrompt,
          momentId,
          triggerCommentId,
          triggerContent,
          triggerUserName: displayName,
          delayMs,
        });
        scheduled.push(`${char.name} (${Math.round(delayMs / 1000)}s)`);
      }
    }

    return NextResponse.json({
      success: true,
      scheduled: scheduled.length,
      characters: scheduled,
    });
  } catch (err) {
    console.error('[comment-reply] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
