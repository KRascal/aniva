import { NextRequest, NextResponse } from 'next/server';
import { imageEngine } from '@/lib/image-engine';

export async function POST(req: NextRequest) {
  try {
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
