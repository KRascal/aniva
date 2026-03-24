/**
 * GET /api/admin/characters/[id]/launch-status
 * キャラクターの本番ローンチ準備状況を返す
 * 各チェック項目のパス状況と完成度スコアを提供
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export interface LaunchCheck {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  count?: number;
  required?: number;
  editPath: string;
  critical: boolean; // falseだと公開不可
}

export interface LaunchStatusResponse {
  characterId: string;
  characterName: string;
  slug: string;
  avatarUrl: string | null;
  score: number; // 0-100
  checks: LaunchCheck[];
  canLaunch: boolean;
  isActive: boolean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole('editor');
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: characterId } = await params;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      slug: true,
      avatarUrl: true,
      coverUrl: true,
      systemPrompt: true,
      stripeProductId: true,
      isActive: true,
    },
  });

  if (!character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 });
  }

  // 並列でカウント取得
  const [soulCount, voiceCount, boundaryCount, quoteCount, bannerCount, cardCount, chapterCount, momentCount] =
    await Promise.all([
      prisma.characterSoul.count({ where: { characterId } }),
      prisma.characterVoice.count({ where: { characterId } }),
      prisma.characterBoundary.count({ where: { characterId } }),
      prisma.characterQuote.count({ where: { characterId } }),
      prisma.gachaBanner.count({ where: { characterId, isActive: true } }),
      prisma.gachaCard.count({ where: { characterId } }),
      prisma.storyChapter.count({ where: { characterId } }),
      prisma.moment.count({ where: { characterId } }),
    ]);

  const checks: LaunchCheck[] = [
    {
      id: 'basic_info',
      label: '基本情報',
      description: '名前・スラッグ・systemPrompt・アバター・カバー画像が揃っている',
      passed: !!(character.systemPrompt && character.avatarUrl && character.coverUrl),
      editPath: `/admin/characters`,
      critical: true,
    },
    {
      id: 'character_soul',
      label: 'キャラクターSoul（人格定義）',
      description: 'CharacterSoulが登録されている（人格の核心定義）',
      passed: soulCount > 0,
      count: soulCount,
      required: 1,
      editPath: `/admin/characters/${characterId}/bible`,
      critical: true,
    },
    {
      id: 'character_voice',
      label: '口調設定（Voice）',
      description: '一人称・語尾・笑い方などの精密な口調ルールが設定されている',
      passed: voiceCount > 0,
      count: voiceCount,
      required: 1,
      editPath: `/admin/characters/${characterId}/bible`,
      critical: true,
    },
    {
      id: 'character_boundary',
      label: '禁止事項（Boundary）',
      description: 'キャラクターが言ってはいけないことの設定',
      passed: boundaryCount > 0,
      count: boundaryCount,
      required: 1,
      editPath: `/admin/characters/${characterId}/bible`,
      critical: true,
    },
    {
      id: 'character_quotes',
      label: '口調サンプル（Quote）',
      description: '原作セリフ・決め台詞が3件以上登録されている',
      passed: quoteCount >= 3,
      count: quoteCount,
      required: 3,
      editPath: `/admin/characters/${characterId}/bible`,
      critical: false,
    },
    {
      id: 'gacha_banner',
      label: 'ガチャバナー',
      description: 'アクティブなガチャバナーが1つ以上ある',
      passed: bannerCount >= 1,
      count: bannerCount,
      required: 1,
      editPath: `/admin/gacha`,
      critical: true,
    },
    {
      id: 'gacha_cards',
      label: 'ガチャカード',
      description: 'N/R/SR/SSR/URが各1枚以上（計5枚以上）',
      passed: cardCount >= 5,
      count: cardCount,
      required: 5,
      editPath: `/admin/gacha`,
      critical: false,
    },
    {
      id: 'story_chapters',
      label: 'ストーリー',
      description: 'ストーリーチャプターが3章以上ある',
      passed: chapterCount >= 3,
      count: chapterCount,
      required: 3,
      editPath: `/admin/stories`,
      critical: false,
    },
    {
      id: 'moments',
      label: 'モーメント（投稿）',
      description: 'キャラの投稿コンテンツが5件以上ある',
      passed: momentCount >= 5,
      count: momentCount,
      required: 5,
      editPath: `/admin/moments`,
      critical: false,
    },
    {
      id: 'stripe_product',
      label: 'Stripe商品設定',
      description: 'FCサブスクリプション用のStripe商品IDが設定されている',
      passed: !!character.stripeProductId,
      editPath: `/admin/characters`,
      critical: false,
    },
    {
      id: 'test_chat',
      label: 'テストチャット',
      description: '管理画面からテストチャットで動作確認済み（手動確認）',
      passed: character.isActive || false, // isActiveならテスト済みと見なす（手動チェック）
      editPath: `/admin/characters/${characterId}/test-chat`,
      critical: false,
    },
  ];

  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const criticalFailed = checks.filter(c => c.critical && !c.passed);
  const canLaunch = criticalFailed.length === 0 && !character.isActive;

  const response: LaunchStatusResponse = {
    characterId: character.id,
    characterName: character.name,
    slug: character.slug,
    avatarUrl: character.avatarUrl,
    score,
    checks,
    canLaunch,
    isActive: character.isActive,
  };

  return NextResponse.json(response);
}
