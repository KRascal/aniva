/**
 * GET /api/cron/generate-secret-content?secret=xxx
 * 全キャラにFC限定SecretContentを生成（不足分のみ）
 * 各キャラ最低5件: conversation_topic x2, backstory x2, special_message x1
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';

const REQUIRED_PER_CHAR = 5;

const CONTENT_TEMPLATES = [
  { type: 'conversation_topic', unlockLevel: 3, prompt: '普段は話さない個人的な話題（トラウマ、秘密の趣味、恥ずかしい思い出など）。タイトルと本文を生成。' },
  { type: 'conversation_topic', unlockLevel: 3, prompt: '親しい人にだけ打ち明ける本音や弱さ。タイトルと本文を生成。' },
  { type: 'backstory', unlockLevel: 4, prompt: 'ファンだけが知れる裏設定・過去のエピソード。タイトルと本文を生成。' },
  { type: 'backstory', unlockLevel: 4, prompt: '作中では描かれなかった日常の一場面。タイトルと本文を生成。' },
  { type: 'special_message', unlockLevel: 5, prompt: 'FC会員だけへの特別メッセージ（感謝・親密・特別感）。タイトルと本文を生成。' },
];

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const geminiKey = process.env.GEMINI_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  if (!geminiKey && !xaiKey) {
    return NextResponse.json({ error: 'No LLM API key set (GEMINI/XAI)' }, { status: 500 });
  }

  try {
    const characters = await prisma.character.findMany({
      where: { isActive: true },
      select: { id: true, name: true, systemPrompt: true },
    });

    // 既存のSecretContent数をカウント
    const existingCounts = await prisma.secretContent.groupBy({
      by: ['characterId'],
      _count: { id: true },
    });
    const countMap = new Map(existingCounts.map(e => [e.characterId, e._count.id]));

    // 不足しているキャラだけ処理
    const needsContent = characters.filter(c => (countMap.get(c.id) ?? 0) < REQUIRED_PER_CHAR);

    let generated = 0;
    const errors: string[] = [];

    for (const char of needsContent) {
      const existing = countMap.get(char.id) ?? 0;
      const needed = REQUIRED_PER_CHAR - existing;
      const templates = CONTENT_TEMPLATES.slice(existing, existing + needed);

      for (const tmpl of templates) {
        try {
          const secretSystemPrompt = `あなたは${char.name}です。\n\n${char.systemPrompt.slice(0, 2000)}\n\n以下の形式でFC限定コンテンツを生成してください:\nTITLE: (タイトル、10文字以内)\nCONTENT: (本文、${char.name}の口調で200-400文字)`;
          let text = '';

          // 1st: Gemini 2.5 Flash
          if (geminiKey && !text) {
            try {
              const gRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: secretSystemPrompt }] },
                    contents: [{ parts: [{ text: tmpl.prompt }] }],
                    generationConfig: { maxOutputTokens: 600, temperature: 0.85 },
                  }),
                },
              );
              if (gRes.ok) {
                const gData = await gRes.json();
                text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              }
            } catch (e) {
              console.error(`[generate-secret-content] Gemini failed for ${char.name}:`, e);
            }
          }

          // 2nd: xAI fallback
          if (!text && xaiKey) {
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: process.env.LLM_MODEL || 'grok-3-mini',
                messages: [
                  { role: 'system', content: secretSystemPrompt },
                  { role: 'user', content: tmpl.prompt },
                ],
                max_tokens: 600,
                temperature: 0.9,
              }),
            });

            if (!res.ok) {
              errors.push(`${char.name}: API ${res.status}`);
              continue;
            }

            const data = await res.json();
            text = data.choices?.[0]?.message?.content?.trim() || '';
          }

          if (!text) {
            errors.push(`${char.name}: empty response from all LLMs`);
            continue;
          }

          // TITLE: と CONTENT: をパース
          const titleMatch = text.match(/TITLE:\s*(.+)/);
          const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/);

          const title = titleMatch?.[1]?.trim() || `${char.name}の秘密`;
          const content = contentMatch?.[1]?.trim() || text;

          await prisma.secretContent.create({
            data: {
              id: `sc-${char.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              characterId: char.id,
              type: tmpl.type,
              title,
              content,
              unlockLevel: tmpl.unlockLevel,
              order: existing + generated,
              updatedAt: new Date(),
            },
          });

          generated++;
        } catch (err) {
          errors.push(`${char.name}: ${(err as Error).message}`);
        }
      }
    }

    return NextResponse.json({
      message: 'Secret content generated',
      generated,
      processed: needsContent.length,
      total: characters.length,
      alreadySufficient: characters.length - needsContent.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[generate-secret-content] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
