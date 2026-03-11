// Re-export from engine/ to preserve existing import paths:
// import { CharacterEngine } from '@/lib/character-engine'
export { CharacterEngine, characterEngine, generateDailyEmotionForEngine } from './engine';
export type { CharacterDefinition } from './engine';
export { CHARACTER_DEFINITIONS } from './engine';
