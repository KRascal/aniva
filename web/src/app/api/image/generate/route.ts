import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';

/**
 * POST /api/image/generate
 * キャラクターがAI生成画像を送信する
 * xAI grok-imagine-image を使用
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, characterName, context } = (await req.json()) as {
      messageId: string;
      characterName: string;
      context: string; // 会話の文脈（何の画像を生成すべきか）
    };

    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return NextResponse.json({ error: 'Image generation not available' }, { status: 503 });
    }

    // xAI grok-imagine-image で画像生成
    const prompt = `Anime style illustration. ${characterName} from One Piece. ${context}. High quality, vibrant colors, expressive character art.`;
    
    const res = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-imagine-image',
        prompt,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('[ImageGenerate] xAI error', { status: res.status, error: errText });
      return NextResponse.json({ imageUrl: null, reason: 'generation_failed' });
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ imageUrl: null, reason: 'no_image_data' });
    }

    // 画像を保存
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ai-images');
    await mkdir(uploadDir, { recursive: true });
    
    const filename = `${messageId}-${Date.now()}.png`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, Buffer.from(b64, 'base64'));

    const imageUrl = `/uploads/ai-images/${filename}`;

    // メッセージのmetadataにimageUrlを追加
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg) {
      const existingMeta = (msg.metadata ?? {}) as Record<string, unknown>;
      await prisma.message.update({
        where: { id: messageId },
        data: {
          metadata: { ...existingMeta, imageUrl },
        },
      });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    logger.error('[ImageGenerate] error:', error);
    return NextResponse.json({ imageUrl: null, reason: 'internal_error' });
  }
}
