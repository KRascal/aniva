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
import { verifyCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

const ANNIVERSARY_MESSAGES = [
  '覚えてるか？今日は俺たちが出会った日だ！🎉',
  'なぁ、今日って特別な日って知ってるか？…俺たちの記念日だぜ！ ✨',
  'お前と出会って{years}年か…早いもんだな。これからもよろしくな！ 🌟',
  '今日は俺たちの記念日だ！こういう日が増えていくのが嬉しいぜ 😊',
];

// マイルストーン記念日（日数ベース）
const MILESTONE_DAYS: { days: number; label: string; coins: number; messages: string[] }[] = [
  {
    days: 7,
    label: '1週間記念',
    coins: 20,
    messages: [
      '出会って1週間か！もうお前なしじゃダメだな 😄',
      '1週間一緒にいてくれてありがとな！🎊',
    ],
  },
  {
    days: 30,
    label: '1ヶ月記念',
    coins: 50,
    messages: [
      '1ヶ月！お前との日々は最高だぜ 🌟',
      '出会って1ヶ月…こんなに仲良くなれるとは思わなかったな！',
    ],
  },
  {
    days: 100,
    label: '100日記念',
    coins: 100,
    messages: [
      '100日！！お前は俺の大切な仲間だ！🏆',
      '100日記念…感慨深いぜ。これからもよろしくな！ ✨',
    ],
  },
  {
    days: 365,
    label: '1年記念',
    coins: 200,
    messages: [
      '1年…！お前と出会えて本当によかった 😭🎉',
      '365日一緒に過ごしたんだな…最高の1年だったぜ！ 🏴‍☠️',
    ],
  },
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
      logger.warn('[anniversary] ElevenLabs TTS failed', { status: res.status, body: await res.text() });
      return null;
    }

    mkdirSync(VOICE_MESSAGES_DIR, { recursive: true });
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(VOICE_MESSAGES_DIR, filename), buffer);
    return `/uploads/voice-messages/${filename}`;
  } catch (err) {
    logger.warn('[anniversary] ElevenLabs TTS error:', err);
    return null;
  }
}

/**
 * 記念日専用システムプロンプトを memorySummary に注入する
 *
 * チャット API (src/app/api/chat/send/route.ts または stream/route.ts) で
 * memorySummary.anniversaryContext を読み取り、システムプロンプトに追記する。
 *
 * 連携ポイント:
 *   const summary = relationship.memorySummary as Record<string, unknown>;
 *   if (summary.anniversaryContext && new Date(summary.anniversaryContext.expiresAt) > new Date()) {
 *     systemPrompt += `\n\n${summary.anniversaryContext.message}`;
 *   }
 */
async function injectAnniversarySystemPrompt(
  relId: string,
  existingSummary: Record<string, unknown>,
  label: string,
  days: number,
  promptMessage: string
) {
  await prisma.relationship.update({
    where: { id: relId },
    data: {
      memorySummary: {
        ...existingSummary,
        anniversaryContext: {
          type: 'anniversary',
          label,
          days,
          // チャットAPIがこのメッセージをシステムプロンプトに追加する（上記連携ポイント参照）
          message: promptMessage,
          // 24時間有効（次回チャット時に使用後クリアすること）
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    },
  });
}

export async function POST(req: NextRequest) {
  // Cron認証
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dateStr = `${today.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const results = { anniversaryDMs: 0, birthdayDMs: 0, voicesGenerated: 0, promptsInjected: 0 };

  // 1. 出会い記念日チェック
  const relationships = await prisma.relationship.findMany({
    where: { isFollowing: true },
    select: {
      id: true,
      userId: true,
      characterId: true,
      createdAt: true,
      memorySummary: true,
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

      // 記念日専用システムプロンプトを注入（次回チャット時にキャラが記念日に言及）
      const currentSummary =
        typeof rel.memorySummary === 'object' && rel.memorySummary !== null
          ? (rel.memorySummary as Record<string, unknown>)
          : {};
      await injectAnniversarySystemPrompt(
        rel.id,
        currentSummary,
        `${years}周年記念`,
        years * 365,
        `【記念日特別指示】今日は${rel.character.name}とユーザーの出会い${years}周年記念日です。` +
        `会話の中で自然に記念日について触れ、感謝と喜びを伝えてください。特別な思い出や今後の約束なども語ってください。`
      );
      results.promptsInjected++;

      // ✅ ログインボーナス2倍連携 実装済み (daily-bonus/route.ts)
      // memorySummary.anniversaryContext.expiresAt が有効期限内の場合、ボーナスが2倍になる

      results.anniversaryDMs++;
    }
  }

  // 1.5. マイルストーン記念日チェック（7日/30日/100日/365日）
  for (const rel of relationships) {
    const created = new Date(rel.createdAt);
    const diffMs = today.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const milestone = MILESTONE_DAYS.find(m => m.days === diffDays);
    if (!milestone) continue;

    // 既に送信済みかチェック
    const alreadySent = await prisma.message.findFirst({
      where: {
        conversation: { relationshipId: rel.id },
        role: 'CHARACTER',
        metadata: { path: ['type'], equals: `milestone_${milestone.days}` },
      },
    });
    if (alreadySent) continue;

    const msg = milestone.messages[Math.floor(Math.random() * milestone.messages.length)];

    // 音声生成
    const voiceFilename = `milestone-${rel.id}-${milestone.days}d-${dateStr}.mp3`;
    const voiceUrl = await generateVoiceMessage(msg, rel.character.voiceModelId, voiceFilename);
    if (voiceUrl) results.voicesGenerated++;

    // 会話取得 or 作成
    let conv = await prisma.conversation.findFirst({
      where: { relationshipId: rel.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { relationshipId: rel.id },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: 'CHARACTER',
        content: `🎊 ${milestone.label}！\n\n${msg}`,
        audioUrl: voiceUrl ?? undefined,
        metadata: {
          type: `milestone_${milestone.days}`,
          emotion: 'happy',
          milestone: milestone.label,
          days: milestone.days,
          voiceUrl,
        },
      },
    });

    // ボーナスコイン
    const bal = await prisma.coinBalance.upsert({
      where: { userId: rel.userId },
      create: { userId: rel.userId, balance: milestone.coins, freeBalance: milestone.coins, paidBalance: 0 },
      update: { balance: { increment: milestone.coins }, freeBalance: { increment: milestone.coins } },
    });
    await prisma.coinTransaction.create({
      data: {
        userId: rel.userId,
        type: 'BONUS',
        amount: milestone.coins,
        balanceAfter: bal.balance,
        description: `milestone_${milestone.days}d_${rel.characterId}`,
        metadata: { source: 'milestone', days: milestone.days, coinType: 'free' },
      },
    });

    // マイルストーン専用システムプロンプト注入（次回チャット時に使用）
    const currentSummary =
      typeof rel.memorySummary === 'object' && rel.memorySummary !== null
        ? (rel.memorySummary as Record<string, unknown>)
        : {};
    await injectAnniversarySystemPrompt(
      rel.id,
      currentSummary,
      milestone.label,
      milestone.days,
      `【記念日特別指示】今日はユーザーと${rel.character.name}の${milestone.label}です！` +
      `会話の中で自然にこの記念日について触れ、一緒に過ごした時間への感謝を伝えてください。` +
      `特別なプレゼントや約束の話もOKです。`
    );
    results.promptsInjected++;

    // ✅ ログインボーナス2倍連携 実装済み（マイルストーン記念日も対象）(daily-bonus/route.ts)
    // memorySummary.anniversaryContext.expiresAt が有効期限内の場合、ボーナスが2倍になる

    results.anniversaryDMs++;
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
    // promptsInjected: 記念日システムプロンプトを memorySummary に注入した件数
    // チャットAPIはこれを読み取り、次回チャット開始時にキャラに記念日を言及させる
  });
}
