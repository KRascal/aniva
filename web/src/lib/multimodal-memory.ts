/**
 * multimodal-memory.ts
 * マルチモーダル記憶システム
 * 
 * テキストだけでなく、画像・音声の記憶もキャラが保持する。
 * 「あの時送ってくれた写真、覚えてるよ」をキャラが自然に言える。
 */

import { prisma } from './prisma';

// ============================================
// 画像記憶の保存
// ============================================

interface ImageMemory {
  userId: string;
  characterId: string;
  imageUrl: string;
  imageAnalysis: string; // 画像分析結果のテキスト
  userContext: string; // ユーザーが画像と一緒に送ったテキスト
  characterReaction: string; // キャラの反応テキスト
  timestamp: Date;
  tags: string[]; // 自動タグ（food, nature, selfie, pet, etc.）
}

/**
 * 画像記憶の自動タグ付け
 */
export function extractImageTags(analysis: string): string[] {
  const tags: string[] = [];
  const lowerAnalysis = analysis.toLowerCase();
  
  const tagRules: Array<{ keywords: string[]; tag: string }> = [
    { keywords: ['food', '料理', 'ラーメン', '肉', 'パスタ', 'スイーツ', 'ケーキ', 'カレー', '寿司', '食べ物'], tag: 'food' },
    { keywords: ['cat', '猫', 'ネコ', 'dog', '犬', 'pet', 'ペット', '動物', 'animal'], tag: 'pet' },
    { keywords: ['selfie', '自撮り', '顔', 'face', 'portrait'], tag: 'selfie' },
    { keywords: ['nature', '自然', '花', '桜', '海', '山', '空', 'sky', 'flower', 'sunset'], tag: 'nature' },
    { keywords: ['city', '街', '建物', 'building', '東京', '渋谷'], tag: 'city' },
    { keywords: ['game', 'ゲーム', 'anime', 'アニメ', 'manga', '漫画'], tag: 'otaku' },
    { keywords: ['workout', '筋トレ', 'gym', 'ジム', 'running', 'スポーツ'], tag: 'fitness' },
    { keywords: ['study', '勉強', 'book', '本', 'ノート', 'notebook'], tag: 'study' },
    { keywords: ['travel', '旅行', '観光', 'trip', '飛行機', '駅'], tag: 'travel' },
  ];
  
  for (const rule of tagRules) {
    if (rule.keywords.some(kw => lowerAnalysis.includes(kw) || analysis.includes(kw))) {
      tags.push(rule.tag);
    }
  }
  
  if (tags.length === 0) tags.push('other');
  return tags;
}

/**
 * 画像記憶をDBに保存（Message.metadataのJSON拡張）
 */
export async function storeImageMemory(
  conversationId: string,
  userId: string,
  characterId: string,
  imageUrl: string,
  imageAnalysis: string,
  userMessage: string,
  characterResponse: string,
): Promise<void> {
  const tags = extractImageTags(imageAnalysis);
  
  // Relationshipのmemoryに画像記憶を追加
  const relationship = await prisma.relationship.findFirst({
    where: { userId, characterId },
    select: { id: true, memorySummary: true },
  });
  
  if (!relationship) return;
  
  const summary = (relationship.memorySummary as Record<string, unknown>) || {};
  const imageMemories = (summary.imageMemories as ImageMemory[] | undefined) || [];
  
  // 最新30件まで保持
  imageMemories.unshift({
    userId,
    characterId,
    imageUrl,
    imageAnalysis: imageAnalysis.slice(0, 500),
    userContext: userMessage.slice(0, 200),
    characterReaction: characterResponse.slice(0, 200),
    timestamp: new Date(),
    tags,
  });
  
  if (imageMemories.length > 30) imageMemories.length = 30;
  
  await prisma.relationship.update({
    where: { id: relationship.id },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memorySummary: {
        ...summary,
        imageMemories: JSON.parse(JSON.stringify(imageMemories)),
      } as any,
    },
  });
}

/**
 * 画像記憶からプロンプトコンテキストを構築
 * 「前に送ってくれた〇〇の写真」を参照できるようにする
 */
export function buildImageMemoryContext(
  memorySummary: Record<string, unknown> | null,
): string {
  if (!memorySummary) return '';
  
  const imageMemories = (memorySummary.imageMemories as ImageMemory[] | undefined) || [];
  if (imageMemories.length === 0) return '';
  
  const recentImages = imageMemories.slice(0, 10);
  const lines = recentImages.map((mem, i) => {
    const ago = getTimeAgo(new Date(mem.timestamp));
    return `- ${ago}: ${mem.imageAnalysis.slice(0, 100)}${mem.userContext ? `（「${mem.userContext.slice(0, 50)}」と一緒に）` : ''}`;
  });
  
  return `\n## ユーザーが過去に送ってくれた画像の記憶
${lines.join('\n')}
- 会話の流れで自然に「あの時の〇〇の写真」と言及していい（3-5回に1回程度）
- 無理に言及しない。話題が合う時だけ`;
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return 'さっき';
  if (hours < 24) return `${Math.floor(hours)}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}
