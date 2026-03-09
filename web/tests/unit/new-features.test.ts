/**
 * 新機能テスト (N1-N7)
 */

import { describe, test, expect } from 'vitest';

// ── N1: Push通知パーソナライズ ──
describe('anniversary-system', () => {
  test('AnniversaryEvent型が定義されている', async () => {
    const { getAnniversaryEvents } = await import('@/lib/anniversary-system');
    expect(typeof getAnniversaryEvents).toBe('function');
  });

  test('getAnniversaryPromptHintが日数タイプに対してヒントを返す', async () => {
    const { getAnniversaryPromptHint } = await import('@/lib/anniversary-system');
    const hint = getAnniversaryPromptHint({
      type: 'days',
      milestone: 100,
      characterId: 'test-char',
      characterName: 'テストキャラ',
      userId: 'test-user',
      daysSinceFirstMeeting: 100,
    });
    expect(hint).toContain('100');
    expect(hint.length).toBeGreaterThan(10);
  });

  test('getAnniversaryPromptHintがメッセージ数タイプに対してヒントを返す', async () => {
    const { getAnniversaryPromptHint } = await import('@/lib/anniversary-system');
    const hint = getAnniversaryPromptHint({
      type: 'messages',
      milestone: 500,
      characterId: 'test-char',
      characterName: 'テストキャラ',
      userId: 'test-user',
      daysSinceFirstMeeting: 30,
    });
    expect(hint).toContain('500');
  });
});

// ── N3: 画像解析 ──
describe('image-analysis', () => {
  test('analyzeImage関数が存在する', async () => {
    const { analyzeImage, imageAnalysisToPromptHint } = await import('@/lib/image-analysis');
    expect(typeof analyzeImage).toBe('function');
    expect(typeof imageAnalysisToPromptHint).toBe('function');
  });

  test('imageAnalysisToPromptHintが正しいフォーマットを返す', async () => {
    const { imageAnalysisToPromptHint } = await import('@/lib/image-analysis');
    const hint = imageAnalysisToPromptHint({
      description: 'テスト画像',
      objects: ['猫', '犬'],
      mood: '楽しい',
      suggestedReaction: 'かわいい！',
    });
    expect(hint).toContain('テスト画像');
    expect(hint).toContain('猫');
    expect(hint).toContain('楽しい');
    expect(hint).toContain('かわいい！');
  });
});

// ── N4: 感情連動アバター ──
describe('emotion-avatar', () => {
  test('getEmotionAvatarUrlが正しいパスを返す', async () => {
    const { getEmotionAvatarUrl } = await import('@/lib/emotion-avatar');
    const url = getEmotionAvatarUrl('luffy', 'happy', '/characters/luffy/avatar.webp');
    expect(url).toBe('/characters/luffy/emotions/happy.webp');
  });

  test('未知の感情はneutralにフォールバック', async () => {
    const { getEmotionAvatarUrl } = await import('@/lib/emotion-avatar');
    const url = getEmotionAvatarUrl('luffy', 'unknown_emotion', '/characters/luffy/avatar.webp');
    expect(url).toBe('/characters/luffy/emotions/neutral.webp');
  });

  test('getEmotionAvatarPropsがsrcとfallbackを返す', async () => {
    const { getEmotionAvatarProps } = await import('@/lib/emotion-avatar');
    const props = getEmotionAvatarProps('luffy', 'excited', '/characters/luffy/avatar.webp');
    expect(props.src).toContain('/emotions/');
    expect(props.fallback).toBe('/characters/luffy/avatar.webp');
  });

  test('感情マッピング: fired-up → excited', async () => {
    const { getEmotionAvatarUrl } = await import('@/lib/emotion-avatar');
    const url = getEmotionAvatarUrl('luffy', 'fired-up', null);
    expect(url).toContain('excited');
  });

  test('感情マッピング: whisper → love', async () => {
    const { getEmotionAvatarUrl } = await import('@/lib/emotion-avatar');
    const url = getEmotionAvatarUrl('luffy', 'whisper', null);
    expect(url).toContain('love');
  });
});

// ── N5: 音声ストリーミング ──
describe('voice-stream', () => {
  test('playVoiceStream関数が存在する', async () => {
    const { playVoiceStream } = await import('@/lib/voice-stream');
    expect(typeof playVoiceStream).toBe('function');
  });
});
