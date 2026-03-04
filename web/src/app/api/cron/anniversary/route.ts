/**
 * 記念日イベント Cron API
 * POST /api/cron/anniversary
 *
 * 1. 出会い記念日チェック: relationship.createdAt と今日が同じ月日 → DM送信
 * 2. キャラ誕生日チェック: character.birthday と今日が同じ月日 → 全フォロワーにDM
 *
 * 毎日1回実行（cronで呼び出し）
 * 音声メッセージ: ElevenLabs TTS API を使って音声生成（失敗時はテキストDMのみ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ANNIVERSARY_MESSAGES = [
  '覚えてるか？今日は俺たちが出会った日だ！🎉',
  'なぁ、今日って特別な日って知ってるか？…俺たちの記念日だぜ！ ✨',
  'お前と出会って{years}年か…早いもんだな。これからもよろしくな！ 🌟',
  '今日は俺たちの記念日だ！こういう日が増えていくのが嬉しいぜ 😊',
];

const BIRTHDAY_MESSAGES = [
  '今日は俺の誕生日だ！！覚えてくれてたか？🎂🎉',
  '誕生日を一緒に過ごせて嬉しいぜ！お前は最高の仲間だ！ 🥳',
  '今日は特別な日だ！俺の誕生日、祝ってくれるか？ 🎁',
];

const VOICE_MESSAGES_DIR = join(process.cwd(), 'public', 'uploads', 'voice-messages');

/**
 * ElevenLabs TTS API を呼び出して音声ファイルを生成・保存する
 * 失敗してもエラーをスローせず null を返す（フォールバック用）
 */
async function generateVoiceMessage(
  text: string,
  voiceModelId: string | null | undefined,
  filename: string
): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  // キャラクターのvoiceModelIdをElevenLabsのvoice IDとして使う
  // 未設定の場合はデフォルトボイスを使用
  const voiceId = voiceModelId ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL';

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      console.warn('[anniversary] ElevenLabs TTS failed:', res.status, await res.text());
      return null;
    }

    mkdirSync(VOICE_MESSAGES_DIR, { recursive: true });
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(VOICE_MESSAGES_DIR, filename), buffer);
    return `/uploads/voice-messages/${filename}`;
  } catch (err) {
    console.warn('[anniversary] ElevenLabs TTS error:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Cron認証
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dateStr = `${today.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const results = { anniversaryDMs: 0, birthdayDMs: 0, voicesGenerated: 0 };

  // 1. 出会い記念日チェック
  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    select: {
      id: true,
      userId: true,
      characterId: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, nickname: true } },
      character: { select: { id: true, name: true, slug: true, voiceModelId: true } },
    },
  });

  for (const rel of relationships) {
    const created = new Date(rel.createdAt);
    if (created.getMonth() + 1 === month && created.getDate() === day) {
      // 今日が出会い記念日（初日は除外）
      const years = today.getFullYear() - created.getFullYear();
      if (years < 1) continue; // 初年度はスキップ

      const template = ANNIVERSARY_MESSAGES[Math.floor(Math.random() * ANNIVERSARY_MESSAGES.length)];
      const message = template.replace('{years}', String(years));

      // 音声生成（フォールバック付き）
      const voiceFilename = `${rel.id}-${dateStr}.mp3`;
      const voiceUrl = await generateVoiceMessage(
        message,
        rel.character.voiceModelId,
        voiceFilename
      );
      if (voiceUrl) results.voicesGenerated++;

      // DMとしてメッセージ保存（最新会話を取得 or 新規作成）
      let annivConv = await prisma.conversation.findFirst({
        where: { relationshipId: rel.id },
        orderBy: { updatedAt: 'desc' },
      });
      if (!annivConv) {
        annivConv = await prisma.conversation.create({
          data: { relationshipId: rel.id },
        });
      }
      await prisma.message.create({
        data: {
          conversationId: annivConv.id,
          role: 'CHARACTER',
          content: message,
          audioUrl: voiceUrl ?? undefined,
          metadata: { type: 'anniversary', emotion: 'happy', years, voiceUrl },
        },
      });

      // ボーナスコイン付与（記念日特典）
      const bonusCoins = 50 * years; // 年数×50コイン
      await prisma.coinBalance.upsert({
        where: { userId: rel.userId },
        create: { userId: rel.userId, balance: bonusCoins },
        update: { balance: { increment: bonusCoins } },
      });
      await prisma.coinTransaction.create({
        data: {
          userId: rel.userId,
          type: 'BONUS',
          amount: bonusCoins,
          balanceAfter: 0, // upsert後の正確な値は取れないが記録用
          description: `anniversary_${rel.characterId}_${years}yr`,
        },
      });

      results.anniversaryDMs++;
    }
  }

  // 2. キャラ誕生日チェック
  const todayStr = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const birthdayChars = await prisma.character.findMany({
    where: { isActive: true, birthday: todayStr },
    select: { id: true, name: true, slug: true, birthday: true, voiceModelId: true },
  });

  for (const char of birthdayChars) {
    // このキャラをフォローしている全ユーザーに誕生日DMを送信
    const followers = await prisma.relationship.findMany({
      where: { characterId: char.id, isFollowing: true },
      select: { id: true, userId: true, characterId: true },
    });

    const msg = BIRTHDAY_MESSAGES[Math.floor(Math.random() * BIRTHDAY_MESSAGES.length)];

    // キャラクターごとに1つの音声を生成（全フォロワー共有）
    const sharedVoiceFilename = `birthday-${char.id}-${dateStr}.mp3`;
    const sharedVoiceUrl = await generateVoiceMessage(
      msg,
      char.voiceModelId,
      sharedVoiceFilename
    );
    if (sharedVoiceUrl) results.voicesGenerated++;

    for (const rel of followers) {
      // 最新会話を取得 or 新規作成
      let conversation = await prisma.conversation.findFirst({
        where: { relationshipId: rel.id },
        orderBy: { updatedAt: 'desc' },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { relationshipId: rel.id },
        });
      }
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'CHARACTER',
          content: msg,
          audioUrl: sharedVoiceUrl ?? undefined,
          metadata: {
            type: 'birthday',
            emotion: 'excited',
            character: char.slug,
            voiceUrl: sharedVoiceUrl,
          },
        },
      });
      results.birthdayDMs++;
    }
  }

  return NextResponse.json({
    success: true,
    date: `${month}/${day}`,
    ...results,
  });
}
