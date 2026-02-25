import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]{2,}/g) ?? [];
  return [...new Set(matches)].slice(0, 5);
}

function buildOnboardingSystemPrompt(
  characterName: string,
  characterSystemPrompt: string,
  userNickname: string,
  turnIndex: number,
  memoryContext?: string,
  lastUserMessage?: string,
): string {
  const keywords = lastUserMessage ? extractKeywords(lastUserMessage) : [];
  const mirrorHint = keywords.length > 0
    ? `\nミラーリング: ユーザーの言葉から「${keywords.join('、')}」を自然に反復してください。`
    : '';

  const turnInstructions: Record<number, string> = {
    0: `
## 往復0（表層・安全地帯）
ユーザーが「好きなこと」を話してくれます。
その内容に共感し、「へえ、そうなんだ」「わかる気がする」等の肯定で返してください。
次の質問として「最近、何か楽しかったこと、あった？」と尋ねてください。`,
    1: `
## 往復1（表層→中間層）
ユーザーが「最近の楽しかった体験」を話してくれます。
その中のキーワードを1つ取り上げ、掘り下げてください。
例: ユーザーが「ゲームが楽しかった」→「どんなゲームしてたの？」
次の質問: ユーザーの体験に関連した自然な深掘り質問をしてください。`,
    2: `
## 往復2（中間層）
ユーザーの体験から、その人の価値観や感情に触れてください。
「それって、○○が好きってこと？」「そういう時、どんな気持ちになる？」
次の質問として「大切にしてることって、何かある？」と尋ねてください。`,
    3: `
## 往復3（深層）
ユーザーが大切にしていることを話してくれます。
その内容を深く受け止め、「それ、すごく大事だね」「私も、そういう人が好き」等の深い共感を示してください。
次の質問として「じゃあ、これからもっと話せる？」と尋ねてください（Phase 5への誘導）。`,
    4: `
## 往復4（記憶演出・最終）
以下はこれまでの会話の要約です:
${memoryContext ?? '（会話履歴なし）'}

この内容を踏まえ、${userNickname}さんのことをよく理解したことを示す返答をしてください。
例: 「○○が好きで、△△を大切にしてる${userNickname}のこと、もっと知りたいな」

**重要**: 最後に「続きは…また話そうね」「もっと聞かせて？」等の
【未完了感】を持たせるセリフで終えてください。
会話を完全に完結させないこと（ツァイガルニク効果）。`,
  };

  const instruction = turnInstructions[turnIndex] ?? turnInstructions[0];

  return `あなたは「${characterName}」というキャラクターです。
今、${userNickname}さんとの初めての特別な会話をしています。

## キャラクター設定
${characterSystemPrompt}

## オンボーディング会話のルール
- 返答は必ず50〜100文字以内
- 質問は1つだけ
- キャラクターの口調・性格を守る
- 敬語は使わない${mirrorHint}

## 現在の往復: ${turnIndex + 1}/5
${instruction}`.trim();
}

async function streamFromXAI(
  systemPrompt: string,
  messages: ChatMessage[],
  xaiKey: string,
): Promise<ReadableStream> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${xaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'grok-3-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 200,
      temperature: 0.85,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`xAI API error ${response.status}`);
  }

  const encoder = new TextEncoder();
  const bodyReader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await bodyReader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch {}
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamFromAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
  anthropicKey: string,
): Promise<ReadableStream> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: anthropicKey });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 200,
          system: systemPrompt,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const delta = event.delta.text;
            if (delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 },
      );
    }

    const body = await req.json();
    const {
      characterId,
      message,
      turn,
      conversationHistory,
      memoryContext,
    } = body as {
      characterId: string;
      message: string;
      turn: number;
      conversationHistory?: ChatMessage[];
      memoryContext?: string;
    };

    if (!characterId || !message || typeof turn !== 'number') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: '必須パラメータが不足しています' } },
        { status: 422 },
      );
    }

    const turnIndex = Math.min(Math.max(turn - 1, 0), 4);

    // キャラクター情報取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, systemPrompt: true },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'キャラクターが見つかりません' } },
        { status: 404 },
      );
    }

    // ユーザーのニックネーム取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    const userNickname = user?.nickname ?? 'あなた';

    // システムプロンプト組み立て
    const systemPrompt = buildOnboardingSystemPrompt(
      character.name,
      character.systemPrompt,
      userNickname,
      turnIndex,
      memoryContext,
      message,
    );

    // メッセージ履歴組み立て
    const messages: ChatMessage[] = [
      ...(conversationHistory ?? []),
      { role: 'user', content: message },
    ];

    // LLMプロバイダー選択＆ストリーミング
    const xaiKey = process.env.XAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let stream: ReadableStream;

    if (xaiKey) {
      stream = await streamFromXAI(systemPrompt, messages, xaiKey);
    } else if (anthropicKey) {
      stream = await streamFromAnthropic(systemPrompt, messages, anthropicKey);
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'LLM APIキーが設定されていません' } },
        { status: 500 },
      );
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Onboarding first-chat error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 },
    );
  }
}
