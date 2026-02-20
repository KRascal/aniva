export interface CharacterResponse {
  text: string;
  emotion: Emotion;
  shouldGenerateImage: boolean;
  shouldGenerateVoice: boolean;
  leveledUp?: boolean;
  newLevel?: number;
}

export type Emotion = 'neutral' | 'happy' | 'excited' | 'angry' | 'sad' | 'hungry' | 'surprised';

export interface MemoryContext {
  userName: string;
  level: number;
  preferences: Record<string, any>;
  importantFacts: string[];
  recentTopics: string[];
}

export interface RelationshipLevel {
  level: number;
  name: string;
  nameEn: string;
  xpRequired: number;
  description: string;
}

export const RELATIONSHIP_LEVELS: RelationshipLevel[] = [
  { level: 1, name: '出会い', nameEn: 'First Meet', xpRequired: 0, description: '初対面の距離感' },
  { level: 2, name: '知り合い', nameEn: 'Acquaintance', xpRequired: 50, description: '名前を覚えた' },
  { level: 3, name: '仲間', nameEn: 'Companion', xpRequired: 200, description: '打ち解けた関係' },
  { level: 4, name: '親友', nameEn: 'Best Friend', xpRequired: 500, description: '何でも話せる' },
  { level: 5, name: '特別', nameEn: 'Special', xpRequired: 1000, description: '最も深い絆' },
];
