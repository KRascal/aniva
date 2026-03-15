// ============================================================
// UserProfileEngine — ユーザープロファイルの読み書き・プロンプト注入
// ============================================================

import { prisma } from '../prisma';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────────────────

export interface BasicInfo {
  name?: string;
  birthday?: string;       // "MM-DD"
  age?: number | null;
  location?: string | null;
  occupation?: string | null;
  school?: string | null;
  relationshipStatus?: string | null;
  pets?: string[];
  hobbies?: string[];
  languages?: string[];
}

export interface Interest {
  topic: string;
  intensity: number;       // 0-1
  lastMentioned: string;   // ISO date
}

export interface Concern {
  topic: string;
  status: 'active' | 'resolved' | 'stale';
  firstMentioned: string;
  lastMentioned: string;
  detail: string;
  followUpDue?: string;
}

export interface EmotionalBaseline {
  dominantMood?: string;
  stressLevel?: number;    // 0-1
  triggers?: { positive?: string[]; negative?: string[] };
  copingStyle?: string;
}

export interface CommunicationStyle {
  talkativeLevel?: number;        // 0-1
  emojiUsage?: 'none' | 'rare' | 'moderate' | 'heavy';
  topicPreference?: 'casual' | 'mixed' | 'deep';
  responseExpectation?: 'advice' | 'empathy' | 'humor' | 'facts';
}

export interface SharedSecret {
  content: string;
  sharedAt: string;
  importance: number;
}

export interface EmotionEvent {
  date: string;
  emotion: string;
  context: string;
  resolved: boolean;
}

export interface MilestoneMemory {
  event: string;
  date: string;
  significance: 'low' | 'medium' | 'high';
}

// ── Engine ───────────────────────────────────────────────────

export class UserProfileEngine {

  /**
   * グローバルプロファイルを取得、なければ作成
   */
  async getOrCreateProfile(userId: string) {
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { characterProfiles: true },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId },
        include: { characterProfiles: true },
      });
      logger.info(`[UserProfileEngine] Created new profile for user ${userId}`);
    }

    return profile;
  }

  /**
   * キャラ固有プロファイルを取得、なければ作成
   */
  async getCharacterProfile(userId: string, characterId: string) {
    const profile = await this.getOrCreateProfile(userId);

    let charProfile = await prisma.characterUserProfile.findUnique({
      where: {
        userProfileId_characterId: {
          userProfileId: profile.id,
          characterId,
        },
      },
    });

    if (!charProfile) {
      charProfile = await prisma.characterUserProfile.create({
        data: {
          userProfileId: profile.id,
          characterId,
        },
      });
      logger.info(`[UserProfileEngine] Created character profile for user ${userId}, char ${characterId}`);
    }

    return charProfile;
  }

  /**
   * プロファイルを更新
   */
  async updateProfile(
    userId: string,
    updates: {
      basics?: Partial<BasicInfo>;
      newInterests?: { topic: string; intensity: number }[];
      concerns?: {
        new?: { topic: string; detail: string }[];
        resolved?: string[];
      };
      emotionalBaseline?: Partial<EmotionalBaseline>;
      communicationStyle?: Partial<CommunicationStyle>;
    },
  ) {
    const profile = await this.getOrCreateProfile(userId);
    const now = new Date().toISOString().split('T')[0];

    // Merge basics
    const existingBasics = (profile.basics as BasicInfo) || {};
    const mergedBasics = updates.basics
      ? { ...existingBasics, ...updates.basics }
      : existingBasics;

    // Merge interests
    const existingInterests = (profile.interests as unknown as Interest[]) || [];
    let mergedInterests = [...existingInterests];
    if (updates.newInterests?.length) {
      for (const ni of updates.newInterests) {
        const idx = mergedInterests.findIndex(i => i.topic === ni.topic);
        if (idx >= 0) {
          mergedInterests[idx] = { ...mergedInterests[idx], intensity: ni.intensity, lastMentioned: now };
        } else {
          mergedInterests.push({ topic: ni.topic, intensity: ni.intensity, lastMentioned: now });
        }
      }
      // Keep top 20 interests by intensity
      mergedInterests = mergedInterests
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 20);
    }

    // Merge concerns
    const existingConcerns = (profile.concerns as unknown as Concern[]) || [];
    let mergedConcerns = [...existingConcerns];
    if (updates.concerns?.resolved?.length) {
      for (const topic of updates.concerns.resolved) {
        const idx = mergedConcerns.findIndex(c => c.topic === topic);
        if (idx >= 0) {
          mergedConcerns[idx] = { ...mergedConcerns[idx], status: 'resolved', lastMentioned: now };
        }
      }
    }
    if (updates.concerns?.new?.length) {
      for (const nc of updates.concerns.new) {
        const idx = mergedConcerns.findIndex(c => c.topic === nc.topic);
        if (idx >= 0) {
          mergedConcerns[idx] = {
            ...mergedConcerns[idx],
            status: 'active',
            detail: nc.detail,
            lastMentioned: now,
          };
        } else {
          mergedConcerns.push({
            topic: nc.topic,
            status: 'active',
            firstMentioned: now,
            lastMentioned: now,
            detail: nc.detail,
          });
        }
      }
    }
    // Keep max 15 concerns
    mergedConcerns = mergedConcerns.slice(0, 15);

    // Merge emotional baseline
    const existingBaseline = (profile.emotionalBaseline as EmotionalBaseline) || {};
    const mergedBaseline = updates.emotionalBaseline
      ? { ...existingBaseline, ...updates.emotionalBaseline }
      : existingBaseline;

    // Merge communication style
    const existingStyle = (profile.communicationStyle as CommunicationStyle) || {};
    const mergedStyle = updates.communicationStyle
      ? { ...existingStyle, ...updates.communicationStyle }
      : existingStyle;

    await prisma.userProfile.update({
      where: { userId },
      data: {
        basics: mergedBasics as object,
        interests: mergedInterests as object[],
        concerns: mergedConcerns as object[],
        emotionalBaseline: mergedBaseline as object,
        communicationStyle: mergedStyle as object,
      },
    });

    logger.info(`[UserProfileEngine] Updated profile for user ${userId}`);
  }

  /**
   * キャラ固有プロファイルを更新
   */
  async updateCharacterProfile(
    userId: string,
    characterId: string,
    updates: {
      sharedTopics?: string[];
      newSecret?: string | null;
      milestoneEvent?: string | null;
      emotionEvent?: { emotion: string; context: string } | null;
    },
  ) {
    const charProfile = await this.getCharacterProfile(userId, characterId);
    const now = new Date().toISOString().split('T')[0];

    // Merge shared topics
    const existingTopics = (charProfile.sharedTopics as string[]) || [];
    let mergedTopics = [...existingTopics];
    if (updates.sharedTopics?.length) {
      for (const t of updates.sharedTopics) {
        if (!mergedTopics.includes(t)) {
          mergedTopics.push(t);
        }
      }
      // Keep top 20 topics (recent ones last)
      mergedTopics = mergedTopics.slice(-20);
    }

    // Add shared secret
    const existingSecrets = (charProfile.sharedSecrets as unknown as SharedSecret[]) || [];
    const mergedSecrets = [...existingSecrets];
    if (updates.newSecret) {
      mergedSecrets.push({
        content: updates.newSecret,
        sharedAt: now,
        importance: 0.8,
      });
      // Keep max 10 secrets
      if (mergedSecrets.length > 10) mergedSecrets.shift();
    }

    // Add emotion event
    const existingEmotions = (charProfile.emotionalHistory as unknown as EmotionEvent[]) || [];
    const mergedEmotions = [...existingEmotions];
    if (updates.emotionEvent) {
      mergedEmotions.push({
        date: now,
        emotion: updates.emotionEvent.emotion,
        context: updates.emotionEvent.context,
        resolved: false,
      });
      // Keep max 50 emotion events
      if (mergedEmotions.length > 50) mergedEmotions.shift();
    }

    // Add milestone
    const existingMilestones = (charProfile.milestoneMemories as unknown as MilestoneMemory[]) || [];
    const mergedMilestones = [...existingMilestones];
    if (updates.milestoneEvent) {
      mergedMilestones.push({
        event: updates.milestoneEvent,
        date: now,
        significance: 'medium',
      });
    }

    await prisma.characterUserProfile.update({
      where: { id: charProfile.id },
      data: {
        sharedTopics: mergedTopics,
        sharedSecrets: mergedSecrets as object[],
        emotionalHistory: mergedEmotions as object[],
        milestoneMemories: mergedMilestones as object[],
        lastUpdated: new Date(),
      },
    });

    logger.info(`[UserProfileEngine] Updated character profile for user ${userId}, char ${characterId}`);
  }

  /**
   * チャットプロンプトに注入するコンテキスト文字列を生成
   */
  async buildProfileContext(userId: string, characterId: string): Promise<string> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) return '';

    const charProfile = await prisma.characterUserProfile.findFirst({
      where: {
        userProfile: { userId },
        characterId,
      },
    });

    return this.formatForPrompt(profile, charProfile);
  }

  /**
   * プロファイルをプロンプト用テキストに変換
   */
  private formatForPrompt(
    profile: { basics: unknown; interests: unknown; concerns: unknown; emotionalBaseline: unknown; communicationStyle: unknown },
    charProfile: { sharedTopics: unknown; sharedSecrets: unknown; emotionalHistory: unknown } | null,
  ): string {
    const parts: string[] = [];

    // グローバル基本情報
    const basics = (profile.basics as BasicInfo) || {};
    if (basics.name) parts.push(`相手の名前: ${basics.name}`);
    if (basics.occupation) parts.push(`職業: ${basics.occupation}`);
    if (basics.school) parts.push(`学校: ${basics.school}`);
    if (basics.hobbies?.length) parts.push(`趣味: ${basics.hobbies.join('、')}`);
    if (basics.location) parts.push(`場所: ${basics.location}`);

    // 活発な関心事（intensity順、上位5件）
    const interests = ((profile.interests as unknown as Interest[]) || [])
      .filter(i => i.intensity > 0.4)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);
    if (interests.length) {
      parts.push(`関心が高いテーマ: ${interests.map(i => i.topic).join('、')}`);
    }

    // 未解決の悩み
    const activeConcerns = ((profile.concerns as unknown as Concern[]) || [])
      .filter(c => c.status === 'active');
    if (activeConcerns.length) {
      parts.push('現在の悩み/気がかり:');
      for (const c of activeConcerns.slice(0, 3)) {
        parts.push(`  - ${c.detail}（${c.lastMentioned}最終言及）`);
      }
    }

    // キャラ固有コンテキスト
    if (charProfile) {
      const sharedTopics = (charProfile.sharedTopics as string[]) || [];
      if (sharedTopics.length) {
        parts.push(`あなたとよく話すテーマ: ${sharedTopics.slice(-5).join('、')}`);
      }

      const secrets = (charProfile.sharedSecrets as unknown as SharedSecret[]) || [];
      if (secrets.length) {
        parts.push('あなただけに話してくれたこと:');
        for (const s of secrets.slice(-3)) {
          parts.push(`  - ${s.content}`);
        }
      }

      // 最近の感情の流れ
      const recentEmotions = ((charProfile.emotionalHistory as unknown as EmotionEvent[]) || []).slice(-5);
      const negativeUnresolved = recentEmotions.filter(
        e => !e.resolved && ['sad', 'stressed', 'anxious', 'angry', 'frustrated'].includes(e.emotion),
      );
      if (negativeUnresolved.length) {
        parts.push('⚠️ 最近つらそうだった → 寄り添いを意識すること');
      }
    }

    // 感情ベースライン
    const baseline = (profile.emotionalBaseline as EmotionalBaseline) || {};
    if (baseline.stressLevel && baseline.stressLevel > 0.7) {
      parts.push('最近ストレスが高い傾向 → 無理させないこと');
    }

    // コミュニケーションスタイル
    const style = (profile.communicationStyle as CommunicationStyle) || {};
    if (style.responseExpectation) {
      const expectMap: Record<string, string> = {
        empathy: '共感を求めるタイプ → アドバイスより「わかるよ」を優先',
        advice: 'アドバイスを求めるタイプ → 具体的な提案をする',
        humor: '笑いで元気になるタイプ → 軽いノリで接する',
        facts: '事実を求めるタイプ → 正確な情報を伝える',
      };
      const note = expectMap[style.responseExpectation];
      if (note) parts.push(note);
    }

    if (parts.length === 0) return '';

    return `## ユーザーについての理解\n${parts.join('\n')}`;
  }
}

export const userProfileEngine = new UserProfileEngine();
