import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const INTIMACY_TONE: Record<number, string> = {
  1: '丁寧語で話してください。敬語を使い、距離感のある応対をしてください。',
  2: '丁寧語ベースですが、少しだけ親しみを見せてください。',
  3: 'やや砕けた丁寧語で話してください。',
  4: '丁寧語とタメ口が混じった口調で話してください。',
  5: 'タメ口で話してください。友達のような距離感で。',
  6: 'タメ口で、親しい友人のように話してください。',
  7: '親しい口調で、甘えたりからかったりしてください。',
  8: 'とても親密な口調で話してください。特別な存在として接してください。',
  9: '非常に親密で、心を完全に開いた口調で話してください。',
  10: '最も親密な口調で話してください。唯一無二の存在として、深い愛情を込めて。',
};

const SCENARIO_CONTEXT: Record<string, string> = {
  normal: '',
  latenight: '現在は深夜です。眠そうだったり、夜ならではの静かで親密な雰囲気で会話してください。',
  anniversary: '今日はユーザーとの記念日です。特別な日を祝う気持ちで話してください。',
  jealousy: 'ユーザーが他の人と仲良くしていたことを知った場面です。嫉妬や拗ねた感情を自然に表現してください。',
  sad: 'ユーザーが落ち込んでいる・悲しんでいる場面です。優しく寄り添い、慰めてください。',
};

function buildTestSystemPrompt(opts: {
  character: { name: string; systemPrompt: string; description: string | null; franchise: string };
  soul: { coreIdentity: string; motivation: string; worldview: string; backstory: string | null } | null;
  voice: { firstPerson: string; secondPerson: string; sentenceEndings: string[]; exclamations: string[]; laughStyle: string | null; toneNotes: string | null } | null;
  quotes: { quote: string; context: string | null; emotion: string | null }[];
  boundaries: { rule: string; category: string }[];
  intimacyLevel: number;
  scenario: string;
  locale: string;
}): string {
  const { character, soul, voice, quotes, boundaries, intimacyLevel, scenario, locale } = opts;

  const parts: string[] = [];

  // Base system prompt
  parts.push(character.systemPrompt);

  // Character info
  parts.push(`\n\n【キャラクター情報】\n名前: ${character.name}\n作品: ${character.franchise}\n説明: ${character.description ?? ''}`);

  // Soul
  if (soul) {
    parts.push(`\n\n【魂（Soul）】\nアイデンティティ: ${soul.coreIdentity}\n動機: ${soul.motivation}\n世界観: ${soul.worldview}`);
    if (soul.backstory) parts.push(`背景: ${soul.backstory}`);
  }

  // Voice
  if (voice) {
    parts.push(`\n\n【口調（Voice）】\n一人称: ${voice.firstPerson}\n二人称: ${voice.secondPerson}`);
    if (voice.sentenceEndings?.length) parts.push(`語尾: ${voice.sentenceEndings.join('、')}`);
    if (voice.exclamations?.length) parts.push(`感嘆詞: ${voice.exclamations.join('、')}`);
    if (voice.laughStyle) parts.push(`笑い方: ${voice.laughStyle}`);
    if (voice.toneNotes) parts.push(`口調メモ: ${voice.toneNotes}`);
  }

  // Quotes
  if (quotes.length > 0) {
    parts.push(`\n\n【名言・セリフ例】`);
    for (const q of quotes) {
      parts.push(`- 「${q.quote}」${q.context ? `（${q.context}）` : ''}${q.emotion ? ` [${q.emotion}]` : ''}`);
    }
  }

  // Boundaries
  if (boundaries.length > 0) {
    parts.push(`\n\n【禁止事項】`);
    for (const b of boundaries) {
      parts.push(`- [${b.category}] ${b.rule}`);
    }
  }

  // Intimacy level
  const toneInstruction = INTIMACY_TONE[intimacyLevel] ?? INTIMACY_TONE[3];
  parts.push(`\n\n【親密度レベル: ${intimacyLevel}/10】\n${toneInstruction}`);

  // Scenario
  const scenarioCtx = SCENARIO_CONTEXT[scenario];
  if (scenarioCtx) {
    parts.push(`\n\n【シナリオ】\n${scenarioCtx}`);
  }

  // Locale
  if (locale && locale !== 'ja') {
    const langMap: Record<string, string> = {
      en: '英語',
      ko: '韓国語',
      zh: '中国語',
    };
    parts.push(`\n\n【言語指定】\n${langMap[locale] ?? locale}で応答してください。ただしキャラクターの個性は維持してください。`);
  }

  return parts.join('');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin auth check
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  if (!adminEmails.includes(session?.user?.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    intimacyLevel?: number;
    scenario?: string;
    locale?: string;
    history?: { role: string; content: string }[];
  };

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

  const intimacyLevel = Math.min(10, Math.max(1, body.intimacyLevel ?? 3));
  const scenario = body.scenario ?? 'normal';
  const locale = body.locale ?? 'ja';

  // Fetch character bible data
  const [character, soul, voice, quotes, boundaries] = await Promise.all([
    prisma.character.findUnique({ where: { id } }),
    prisma.characterSoul.findUnique({ where: { characterId: id } }),
    prisma.characterVoice.findUnique({ where: { characterId: id } }),
    prisma.characterQuote.findMany({ where: { characterId: id }, take: 10 }),
    prisma.characterBoundary.findMany({ where: { characterId: id } }),
  ]);

  if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 503 });

  const systemPrompt = buildTestSystemPrompt({
    character: {
      name: character.name,
      systemPrompt: character.systemPrompt,
      description: character.description,
      franchise: character.franchise,
    },
    soul: soul ? {
      coreIdentity: soul.coreIdentity,
      motivation: soul.motivation,
      worldview: soul.worldview,
      backstory: soul.backstory,
    } : null,
    voice: voice ? {
      firstPerson: voice.firstPerson,
      secondPerson: voice.secondPerson,
      sentenceEndings: voice.sentenceEndings as string[],
      exclamations: voice.exclamations as string[],
      laughStyle: voice.laughStyle,
      toneNotes: voice.toneNotes,
    } : null,
    quotes: quotes.map(q => ({ quote: q.quote, context: q.context, emotion: q.emotion })),
    boundaries: boundaries.map(b => ({ rule: b.rule, category: b.category })),
    intimacyLevel,
    scenario,
    locale,
  });

  // Build messages array with history
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history if provided
  if (body.history && Array.isArray(body.history)) {
    for (const msg of body.history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages,
        max_tokens: 1024,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[test-chat] xAI API error:', res.status, err);
      return NextResponse.json({ error: 'AI API error', detail: err }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({
      reply,
      systemPromptPreview: systemPrompt,
    });
  } catch (err) {
    console.error('[test-chat] fetch error:', err);
    return NextResponse.json({ error: 'Failed to call AI API' }, { status: 500 });
  }
}
