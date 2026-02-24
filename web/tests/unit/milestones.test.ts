import { describe, it, expect } from 'vitest';
import { LUFFY_MILESTONES, type Milestone } from '../../src/lib/milestones';

/**
 * Unit tests for milestones.ts
 * Pure data validation - no DB or server required
 */

describe('LUFFY_MILESTONES', () => {
  it('マイルストーンが存在する', () => {
    expect(LUFFY_MILESTONES).toBeDefined();
    expect(Array.isArray(LUFFY_MILESTONES)).toBe(true);
    expect(LUFFY_MILESTONES.length).toBeGreaterThan(0);
  });

  it('各マイルストーンが必須フィールドを持つ', () => {
    for (const milestone of LUFFY_MILESTONES) {
      expect(milestone.id).toBeTruthy();
      expect(typeof milestone.level).toBe('number');
      expect(milestone.title).toBeTruthy();
      expect(milestone.description).toBeTruthy();
      expect(milestone.characterMessage).toBeTruthy();
      expect(milestone.emoji).toBeTruthy();
    }
  });

  it('レベルが昇順に並んでいる', () => {
    for (let i = 1; i < LUFFY_MILESTONES.length; i++) {
      expect(LUFFY_MILESTONES[i].level).toBeGreaterThan(LUFFY_MILESTONES[i - 1].level);
    }
  });

  it('IDが一意である', () => {
    const ids = LUFFY_MILESTONES.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('level 2 以上のマイルストーンが存在する', () => {
    const hasLevel2 = LUFFY_MILESTONES.some((m) => m.level >= 2);
    expect(hasLevel2).toBe(true);
  });

  it('characterMessage が空でない', () => {
    for (const milestone of LUFFY_MILESTONES) {
      expect(milestone.characterMessage.trim()).not.toBe('');
    }
  });
});

describe('Milestone 型', () => {
  it('Milestone インターフェースに準拠したオブジェクトを作成できる', () => {
    const m: Milestone = {
      id: 'test-milestone',
      level: 1,
      title: 'テスト',
      description: 'テスト説明',
      characterMessage: 'テストメッセージ',
      emoji: '🎉',
    };
    expect(m.id).toBe('test-milestone');
    expect(m.level).toBe(1);
  });
});
