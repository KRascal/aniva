import { NextRequest, NextResponse } from 'next/server';
import { imageEngine } from '@/lib/image-engine';
import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate Limit: 3req/min per user
    const rl = checkRateLimit(`image:${userId}`, 3, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }

    const { characterSlug, type, context, emotion } = await req.json();
    
    if (!characterSlug) {
      return NextResponse.json({ error: 'characterSlug required' }, { status: 400 });
    }
    
    let imageUrl: string | null = null;
    
    switch (type) {
      case 'selfie':
        imageUrl = await imageEngine.generateSelfie(characterSlug, context);
        break;
      case 'daily':
        imageUrl = await imageEngine.generateDailyImage(characterSlug, context || 'relaxing');
        break;
      default:
        imageUrl = await imageEngine.generateImage({
          characterSlug,
          prompt: context || '',
          emotion,
        });
    }
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }
    
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image generation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
