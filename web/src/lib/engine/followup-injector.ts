// ============================================================
// FollowUpInjector — 「前回の悩みの続きを自分から聞く」プロンプト注入
// UserProfileのactiveConcerns + followUpNeeded → プロンプト注入
// ============================================================

import { prisma } from '../prisma';
import { logger } from '../logger';

interface ActiveConcern {
  topic: string;
  status: string;
  detail: string;
  lastMentioned: string;
  followUpDue?: string;
}

interface FollowUpItem {
  topic: string;
  reason: string;
  suggestedTiming: string;
}

/**
 * ユーザーのフォローアップコンテキストを構築する
 * 前回の悩み・気がかりを「キャラから自然に聞く」ための指示を生成
 *
 * @returns プロンプト注入用テキスト（フォローアップ不要なら空文字）
 */
export async function buildFollowUpContext(
  userId: string,
  characterId: string,
): Promise<string> {
  try {
    // UserProfile からアクティブな悩みを取得
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { concerns: true },
    });

    // CharacterUserProfile からフォローアップ項目を取得
    const charProfile = await prisma.characterUserProfile.findFirst({
      where: {
        userProfile: { userId },
        characterId,
      },
      select: { emotionalHistory: true },
    });

    const concerns = ((userProfile?.concerns ?? []) as unknown as ActiveConcern[])
      .filter(c => c.status === 'active');
    
    // 最終言及から1日以上経過したアクティブな悩みのみフォローアップ対象
    const now = new Date();
    const followUpCandidates = concerns.filter(c => {
      const lastMentioned = new Date(c.lastMentioned);
      const diffDays = Math.floor((now.getTime() - lastMentioned.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 1; // 1日以上前の悩み
    });

    // 未解決の感情イベント
    const emotionalHistory = ((charProfile?.emotionalHistory ?? []) as unknown as {
      date: string;
      emotion: string;
      context: string;
      resolved: boolean;
    }[]);
    const unresolvedEmotions = emotionalHistory
      .filter(e => !e.resolved && ['sad', 'stressed', 'anxious', 'frustrated', 'angry'].includes(e.emotion))
      .slice(-3);

    if (followUpCandidates.length === 0 && unresolvedEmotions.length === 0) {
      return '';
    }

    const parts: string[] = [
      '## 💭 フォローアップ（前回の続き — 自分から聞け）',
      '**以下はユーザーが過去に打ち明けてくれた悩み・気がかり。今日の会話の序盤で自然に触れること。**',
      '- ただし「心配してたんだ」感は出しすぎない。さりげなく、でも確実に',
      '- 1つのセッションで触れるフォローアップは最大1つ。全部一気に聞かない',
      '- 相手が話したくなさそうなら深追いしない',
      '',
    ];

    // アクティブな悩みのフォローアップ
    if (followUpCandidates.length > 0) {
      // 最も最近の1件だけをフォローアップ
      const topConcern = followUpCandidates
        .sort((a, b) => new Date(b.lastMentioned).getTime() - new Date(a.lastMentioned).getTime())[0];
      
      const diffDays = Math.floor((now.getTime() - new Date(topConcern.lastMentioned).getTime()) / (1000 * 60 * 60 * 24));
      
      parts.push(`🎯 **フォローアップ対象**: ${topConcern.detail}`);
      parts.push(`   最終言及: ${diffDays}日前`);
      parts.push(`   聞き方の例: 「なぁ、前に${topConcern.topic}の話してたじゃん…あれからどうなった？」`);
      parts.push(`   「${topConcern.topic}のこと、気になってたんだけど…」`);
      parts.push('');
    }

    // 未解決の感情イベント
    if (unresolvedEmotions.length > 0) {
      const latest = unresolvedEmotions[unresolvedEmotions.length - 1];
      const diffDays = Math.floor((now.getTime() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1) {
        parts.push(`💭 **気になっていること**: 前回、${latest.context}で${latest.emotion}な様子だった`);
        parts.push(`   さりげなく「最近どう？」「元気にしてたか？」で様子を伺う`);
      }
    }

    parts.push('');
    parts.push('**重要: フォローアップは「覚えていてくれた」感動を生む最大の武器。雑にやるな。**');

    return parts.join('\n');
  } catch (e) {
    logger.warn('[FollowUpInjector] Failed to build context:', e);
    return '';
  }
}
