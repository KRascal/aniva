/**
 * POST /api/cron/character-initiate-chat
 * チャットしたことがあるキャラが定期的に新しいチャットで話しかけてくる
 * 
 * - フォロー中 or 過去に会話したキャラが対象
 * - 最後の会話から3時間以上経過したキャラのみ
 * - 1回のcronで最大5キャラ分生成
 * - SOUL.md + 感情状態を使ってAI生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function readSoulMd(slug: string): string {
  const paths = [
    join(process.cwd(), 'characters', slug, 'SOUL.md'),
  ];
  for (const p of paths) {
    try {
      if (existsSync(p)) return readFileSync(p, 'utf-8').slice(0, 1500);
    } catch { /* ignore */ }
  }
  return '';
}

async function generateMessage(systemPrompt: string, soulMd: string, characterName: string, userName: string): Promise<string> {
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const system = `${(systemPrompt || '').split(/\n##/)[0].trim()}
${soulMd ? `\n[キャラ詳細]\n${soulMd.split(/\n##/)[0].trim()}` : ''}

重要ルール:
- ${characterName}として、${userName}に新しい話題で話しかける最初のメッセージを1つだけ生成せよ
- 自然なSNSのDMのように短く（1〜3文）
- 「今日あった面白いこと」「最近考えてること」「ふと思い出した話」など日常的な話題
- キャラの性格・口調を完全に反映
- 説明文やメタ情報は絶対に出力しない`;

  const userMsg = `${characterName}が${userName}に、久しぶりに（または日常的に）DMで話しかける最初のメッセージを生成せよ。短く自然に。`;

  if (xaiKey) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${xaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'grok-3-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 150,
        temperature: 0.95,
      }),
    });
    if (!res.ok) throw new Error(`xAI error ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  if (anthropicKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: anthropicKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || '';
  }

  throw new Error('No LLM API key');
}

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // フォロー中 or 過去に会話があるrelationships
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { isFollowing: true },
          { totalMessages: { gt: 0 } },
        ],
      },
      include: {
        character: {
          select: { id: true, name: true, slug: true, systemPrompt: true, isActive: true },
        },
        user: {
          select: { id: true, name: true, displayName: true, nickname: true, email: true },
        },
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { updatedAt: true },
        },
      },
    });

    // フィルタ: 最後の会話から3時間以上経過
    const eligible = relationships.filter(rel => {
      if (!rel.character.isActive) return false;
      const lastConv = rel.conversations[0];
      if (!lastConv) return rel.totalMessages > 0; // 会話履歴あるが最新なし → 対象
      return lastConv.updatedAt < threeHoursAgo;
    });

    // ランダムに最大5件選択
    const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 5);

    const results: string[] = [];

    for (const rel of shuffled) {
      try {
        const userName = rel.user.nickname || rel.user.displayName || rel.user.name || (rel.user.email ?? '').split('@')[0] || 'ユーザー';
        const soulMd = readSoulMd(rel.character.slug);

        const content = await generateMessage(
          rel.character.systemPrompt,
          soulMd,
          rel.character.name,
          userName,
        );

        if (!content) continue;

        // 新しいConversationを作成 + キャラからの最初のメッセージ
        const conversation = await prisma.conversation.create({
          data: {
            relationshipId: rel.id,
            messages: {
              create: {
                role: 'CHARACTER',
                content: content.slice(0, 500),
              },
            },
          },
        });

        // Relationship の lastMessageAt を更新
        await prisma.relationship.update({
          where: { id: rel.id },
          data: {
            lastMessageAt: new Date(),
          },
        });

        results.push(`${rel.character.name} → ${userName} (conv: ${conversation.id})`);
      } catch (err) {
        console.error(`[character-initiate-chat] Failed for ${rel.character.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      generated: results.length,
      eligible: eligible.length,
      details: results,
    });
  } catch (error) {
    console.error('[character-initiate-chat] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
