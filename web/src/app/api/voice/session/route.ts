import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/voice/session
 * Grok Voice Agent APIのephemeral tokenを取得し、キャラのsystem instructionsと共に返す
 * → フロントエンドがWebSocketでwss://api.x.ai/v1/realtimeに直接接続
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId } = await req.json();
    if (!characterId) {
      return NextResponse.json({ error: 'Missing characterId' }, { status: 400 });
    }

    const XAI_API_KEY = process.env.XAI_API_KEY;
    if (!XAI_API_KEY) {
      return NextResponse.json({ error: 'Voice API not configured' }, { status: 503 });
    }

    // キャラクター情報取得
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, slug: true, franchise: true },
    });
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // SOUL.md読み込み（キャラの性格定義）
    let soulContent = '';
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const soulPath = path.join(process.cwd(), '..', 'characters', character.slug, 'SOUL.md');
      soulContent = await fs.readFile(soulPath, 'utf-8');
    } catch {
      // SOUL.mdが見つからない場合はデフォルト
      soulContent = `あなたは${character.name}（${character.franchise}）です。キャラクターとして自然に会話してください。`;
    }

    // Relationship情報（ユーザーとの関係性）
    const relationship = await prisma.relationship.findUnique({
      where: { userId_characterId_locale: { userId, characterId, locale: 'ja' } },
      select: { level: true, totalMessages: true },
    });

    // ユーザー名取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // System instructions構築
    const userName = user?.name || '友達';
    const level = relationship?.level ?? 1;
    const totalMsgs = relationship?.totalMessages ?? 0;

    const instructions = `${soulContent}

## 音声通話ルール（厳守）
- これはリアルタイム音声通話だ。短く、自然に話せ。
- 1回の発言は1-3文以内。長すぎる返答は禁止。
- 「…」「えっと」「うーん」などの自然な間（ま）を入れろ。
- 相手の名前は「${userName}」。
- あなたとの関係性レベル: ${level}（会話回数: ${totalMsgs}回）
- レベルに応じた親密さで話せ。初対面なら丁寧に、長い付き合いなら親しく。
- AIであることは絶対に言わない。キャラクターとして完全に演じろ。
- 日本語で会話する。`;

    // Ephemeral token取得
    const tokenRes = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logger.error('[Voice Session] Failed to get ephemeral token', { status: tokenRes.status, error: errText });
      return NextResponse.json({ error: 'Failed to create voice session' }, { status: 502 });
    }

    const tokenData = await tokenRes.json();

    // 音声選択（キャラの性別/性格に応じて）
    const voiceMap: Record<string, string> = {
      // 女性キャラ
      nami: 'Eve', robin: 'Ara', hancock: 'Eve', perona: 'Eve',
      vivi: 'Ara', yamato: 'Eve', nobara: 'Eve', maki: 'Ara', nezuko: 'Ara',
      // 男性キャラ（力強い）
      luffy: 'Rex', zoro: 'Leo', ace: 'Rex', franky: 'Rex',
      whitebeard: 'Leo', kaido: 'Leo', blackbeard: 'Rex', inosuke: 'Rex',
      // 男性キャラ（落ち着いた）
      sanji: 'Sal', law: 'Sal', mihawk: 'Leo', shanks: 'Sal',
      jinbe: 'Leo', gojo: 'Sal', giyu: 'Sal',
      // その他
      chopper: 'Ara', brook: 'Sal', usopp: 'Rex',
      crocodile: 'Leo', tanjiro: 'Rex', zenitsu: 'Sal',
      itadori: 'Rex', fushiguro: 'Sal',
    };

    const voice = voiceMap[character.slug] ?? 'Sal';

    return NextResponse.json({
      ephemeralToken: tokenData.client_secret?.value || tokenData.token || tokenData,
      instructions,
      voice,
      characterName: character.name,
      characterSlug: character.slug,
      wsUrl: 'wss://api.x.ai/v1/realtime',
    });
  } catch (error) {
    logger.error('[Voice Session] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
