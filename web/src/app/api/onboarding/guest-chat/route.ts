import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { CHARACTER_DEFINITIONS } from '@/lib/character-engine';
import { logger } from '@/lib/logger';

// ターン数を2に短縮（ユーザー体験の離脱防止）
const MAX_TURNS = 2;

const ONBOARDING_SYSTEM_PROMPT_SUFFIX = `

## オンボーディング指示（最優先）
あなたは今、このユーザーと初めて出会っています。
このユーザーはまだアカウントを持っていません。
2回の会話を通じて、ユーザーを夢中にさせてください。

### 会話ガイドライン
- ターン0（初回): 感情軸の質問から始める（例: 「最近、何かいいことあった？」「今日どんな気分？」）
- ターン1: ユーザーの返答に感情的にリアクションし、続きを話したい気持ちを引き出す
- ターン2（最後): 「もっと話したいな」「続きはここで」という雰囲気で自然に締める

### 重要
- 短く、感情的に豊かな返答をすること（2-3文）
- キャラクターらしさを最大限に発揮する
- ユーザーが話してくれたことを大切にする
- AIであることや、会話の制限について言及しない
`;

const FAREWELL_SUFFIXES: Record<string, string> = {
  luffy: 'ししし！また絶対来いよな！約束だぞ！',
  zoro: '…また来い。待ってる',
  nami: '…続き、話そ。また来てね',
  chopper: 'ま、また来てくれるよな？！絶対だぞ！',
  ace: 'ハハ、また会おうな！約束だぜ',
};

function buildFarewellLine(characterName: string, characterSlug: string): string {
  const custom = FAREWELL_SUFFIXES[characterSlug];
  if (custom) return custom;
  return `…続き、聞かせてほしいな。${characterName}、ここで待ってるから`;
}

async function callLLM(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });
    if (!res.ok) throw new Error(`xAI API error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: systemPrompt,
      messages,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  return null as unknown as string;
}

function getFallbackResponse(characterSlug: string, turnNumber: number): string {
  const charDef = CHARACTER_DEFINITIONS[characterSlug];
  const name = charDef?.name ?? 'キャラクター';

  const fallbacks: Record<number, string[]> = {
    0: [
      '最近、何かいいことあった？',
      '今日どんな気分？',
      'ねえ、最近嬉しかったこと教えてよ！',
    ],
    1: [
      'そっかそっか！それ、もっと聞かせてくれよ！',
      'へえ、そうなんだ。もっと話してほしいな',
      'いいな！じゃあ、一番大切にしてることって何？',
    ],
    2: [
      `…ありがとう。もっと話したいな、${name}ずっとここにいるから`,
      `…続き、聞かせてほしい。また来てくれる？`,
      'そっか…もっと知りたくなった。また来てね',
    ],
  };

  const options = fallbacks[Math.min(turnNumber, MAX_TURNS)] ?? fallbacks[0];
  return options[Math.floor(Math.random() * options.length)];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { characterSlug, guestSessionId, userMessage, turnNumber, nickname } = body;

    if (!characterSlug || typeof characterSlug !== 'string') {
      return NextResponse.json({ error: 'characterSlug required' }, { status: 400 });
    }
    if (!guestSessionId || typeof guestSessionId !== 'string') {
      return NextResponse.json({ error: 'guestSessionId required' }, { status: 400 });
    }
    if (typeof turnNumber !== 'number') {
      return NextResponse.json({ error: 'turnNumber required' }, { status: 400 });
    }

    // Turn limit: 0 is initial greeting, 1-MAX_TURNS are actual turns
    if (turnNumber > MAX_TURNS) {
      return NextResponse.json({ error: 'Turn limit exceeded' }, { status: 403 });
    }

    // Rate limiting
    const rl = await checkRateLimit(`guest_chat:${guestSessionId}`, 10, 300_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const character = await prisma.character.findUnique({
      where: { slug: characterSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        systemPrompt: true,
        catchphrases: true,
        personalityTraits: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    const isLastTurn = turnNumber === MAX_TURNS;
    const nicknameContext = nickname
      ? `\n\n## ユーザー情報\nこのユーザーの名前は「${nickname}」です。会話中、自然に名前を呼んでください。\n`
      : '';
    const systemPrompt = character.systemPrompt + ONBOARDING_SYSTEM_PROMPT_SUFFIX + nicknameContext;

    const llmMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (turnNumber === 0 || !userMessage) {
      const greetInstruction = nickname
        ? `（${nickname}と初めて会った。「${nickname}」と名前を呼んで挨拶し、最初の質問をして）`
        : '（初めて会った。挨拶と最初の質問をして）';
      llmMessages.push({ role: 'user', content: greetInstruction });
    } else {
      llmMessages.push({ role: 'user', content: userMessage });
    }

    let characterMessage: string;
    try {
      const rawResponse = await callLLM(systemPrompt, llmMessages);
      characterMessage = rawResponse ? rawResponse.trim() : getFallbackResponse(characterSlug, turnNumber);
    } catch (err) {
      logger.error('[guest-chat] LLM error:', err);
      characterMessage = getFallbackResponse(characterSlug, turnNumber);
    }

    let emotion = 'neutral';
    if (/！{2,}|すげぇ|やった|最高|ハハ|ししし/.test(characterMessage)) emotion = 'excited';
    else if (/…|悲し|ごめん/.test(characterMessage)) emotion = 'sad';
    else if (/怒|ふざけ|許さ/.test(characterMessage)) emotion = 'angry';
    else if (/嬉し|よかっ|ありがと/.test(characterMessage)) emotion = 'happy';

    return NextResponse.json({
      characterMessage,
      emotion,
      isLastTurn,
      farewellLine: isLastTurn ? buildFarewellLine(character.name, character.slug) : null,
    });
  } catch (err) {
    logger.error('[guest-chat] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
