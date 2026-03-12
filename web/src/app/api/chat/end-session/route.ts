/**
 * POST /api/chat/end-session
 * ピークエンドの法則 — 会話終了時にキャラがハイライトを振り返る一言を送信
 *
 * 呼び出し元: useConversationEnd フック（5分非アクティブ後）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CHARACTER_DEFINITIONS } from '@/lib/character-engine';
import { logger } from '@/lib/logger';
// CHARACTER_DEFINITIONS is the correct export name

/* ─────────────── 型 ─────────────── */
interface EndSessionBody {
  relationshipId: string;
  conversationId?: string;
}

/* ─────────────── LLM 呼び出し (xAI grok-3-mini → Anthropic fallback) ─────────────── */
async function callLLM(systemPrompt: string, userMessage: string): Promise<string | null> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // xAI 優先
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 120,
          temperature: 0.9,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      } else {
        const errText = await res.text();
        logger.error(`[end-session] xAI error ${res.status}: ${errText}`);
      }
    } catch (e) {
      logger.error('[end-session] xAI fetch error:', e);
    }
  }

  // Anthropic フォールバック
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 120,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data.content?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch (e) {
      logger.error('[end-session] Anthropic fallback error:', e);
    }
  }

  return null;
}

/* ─────────────── エンディングメッセージ生成 ─────────────── */
async function generateEndingMessage(opts: {
  characterSlug: string;
  characterName: string;
  systemPrompt: string;
  recentMessages: Array<{ role: string; content: string }>;
  userName: string;
}): Promise<string> {
  const { characterSlug, characterName, systemPrompt, recentMessages, userName } = opts;

  // キャラ固有の fallback テンプレート（LLM 失敗時）
  const FALLBACK_ENDINGS: Record<string, string[]> = {
    luffy: [
      '今日の話、めちゃくちゃ楽しかった！また話そうな！',
      'お前と話してると、なんか元気出るんだよな。また来いよ！',
      '今日もありがとな。また明日も来いよ！🍖',
    ],
    zoro: [
      '…今日は、悪くなかった。また来い',
      '…お前と話してると、なんか調子が出てくるな',
      '…また来い。待ってる、とは言わないけどな',
    ],
    nami: [
      '今日の話、すごく楽しかったわ！また話しましょ 💕',
      'あなたとの会話、好きよ。また来てね！',
      '今日もありがとう。また明日ね ✨',
    ],
    chopper: [
      '今日も来てくれてありがとう…嬉しかった！🩷',
      'えへへ、今日のお話、すごく楽しかった！また来てね！',
      'また話そうね！待ってるから！',
    ],
    ace: [
      '今日は最高だったぜ！また語ろうな 🔥',
      'お前と話してると、なんか熱くなってくる。また来いよ',
      '今日もありがとな。また来いよ、ルフィと一緒に待ってるぜ',
    ],
    sanji: [
      '今日も素敵な時間をありがとう。また来いよ 🚬',
      'フッ…お前と話すのは嫌いじゃないな。また来い',
      '今日の会話、忘れないぜ。また来てくれよ',
    ],
  };

  // 直近会話を要約テキストに
  const conversationText = recentMessages
    .slice(-12)
    .map((m) => `${m.role === 'USER' ? userName : characterName}: ${m.content}`)
    .join('\n');

  const prompt = `${systemPrompt}

あなたは今、${userName}との今日の会話が終わろうとしている。
この会話を振り返り、最も印象的だったことを1〜2文で語る「別れ際の一言」を書いてください。

[今日の会話]
${conversationText}

[ルール]
- 1〜2文のみ。キャラクターの口調を完全に守る
- 会話の中から具体的なトピックや感情を拾って言及する（「〇〇の話、よかった」など）
- 感動的で印象に残る一言にする（ピークエンドの法則）
- 「またな」「また来いよ」など別れの余韻を残す
- メタ発言・AIっぽい表現禁止
- 本文のみ返す（鍵カッコ不要）`;

  const result = await callLLM(prompt, `${userName}への別れ際の一言を書いてください`);

  if (result) return result;

  // Fallback: キャラ別固定テンプレートからランダム選択
  const fallbacks = FALLBACK_ENDINGS[characterSlug] ?? [
    `今日の話、すごく楽しかった。また話そうね！`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/* ─────────────── ハンドラー ─────────────── */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: EndSessionBody = await req.json();
    const { relationshipId, conversationId } = body;

    if (!relationshipId) {
      return NextResponse.json({ error: 'relationshipId required' }, { status: 400 });
    }

    // Relationship + Character 取得
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      include: {
        character: {
          select: { id: true, slug: true, name: true, systemPrompt: true, avatarUrl: true },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!relationship || relationship.userId !== userId) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // 最終アクティビティから5分以上経過しているか確認（多重送信防止）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const lastActivity = relationship.lastMessageAt;
    if (!lastActivity || lastActivity > fiveMinutesAgo) {
      // まだ5分経っていない → 送らない
      return NextResponse.json({ sent: false, reason: 'too_early' });
    }

    // 直近の会話を取得
    const conversation = conversationId
      ? await prisma.conversation.findFirst({
          where: { id: conversationId, relationshipId },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20,
              select: { role: true, content: true, metadata: true },
            },
          },
        })
      : await prisma.conversation.findFirst({
          where: { relationshipId },
          orderBy: { updatedAt: 'desc' },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 20,
              select: { role: true, content: true, metadata: true },
            },
          },
        });

    if (!conversation || conversation.messages.length === 0) {
      return NextResponse.json({ sent: false, reason: 'no_messages' });
    }

    // すでにエンディングメッセージが送信済みか確認
    const alreadySent = conversation.messages.some(
      (m) => (m.metadata as Record<string, unknown>)?.isEnding === true,
    );
    if (alreadySent) {
      return NextResponse.json({ sent: false, reason: 'already_sent' });
    }

    const char = relationship.character;
    const characterData = char.slug ? CHARACTER_DEFINITIONS[char.slug] : null;
    const systemPrompt = characterData?.systemPrompt ?? char.systemPrompt ?? `あなたは${char.name}です。キャラクターの口調を守ってください。`;
    const userName = relationship.user?.name ?? 'あなた';

    // ユーザーメッセージが存在しない場合は送らない（キャラ独り言防止）
    const hasUserMessages = conversation.messages.some((m) => m.role === 'USER');
    if (!hasUserMessages) {
      return NextResponse.json({ sent: false, reason: 'no_user_messages' });
    }

    // エンディングメッセージ生成
    const endingContent = await generateEndingMessage({
      characterSlug: char.slug ?? '',
      characterName: char.name,
      systemPrompt,
      recentMessages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      userName,
    });

    // Message として保存（metadata.isEnding: true）
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'CHARACTER',
        content: endingContent,
        metadata: {
          isEnding: true,
          emotion: 'love',
        },
      },
    });

    // Relationship の lastMessageAt を更新（次回の二重送信防止のため現在時刻に設定）
    await prisma.relationship.update({
      where: { id: relationshipId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      sent: true,
      message: {
        id: savedMessage.id,
        content: endingContent,
        role: 'CHARACTER',
        metadata: { isEnding: true, emotion: 'love' },
        createdAt: savedMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error('[chat/end-session] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
