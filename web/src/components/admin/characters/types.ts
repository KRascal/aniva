'use client';

import { LocaleConfigMap } from '@/types/character-locale';

export interface Character {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  franchise: string;
  franchiseEn: string | null;
  description: string | null;
  systemPrompt: string;
  voiceModelId: string | null;
  catchphrases: string[];
  personalityTraits: unknown;
  avatarUrl: string | null;
  coverUrl: string | null;
  isActive: boolean;
  fcMonthlyPriceJpy: number;
  fcIncludedCallMin: number;
  callCoinPerMin: number;
  fcOverageCallCoinPerMin: number;
  freeMessageLimit: number;
  freeCallMinutes: number;
  messageCount: number;
  uniqueUsers: number;
  fcMonthlyCoins?: number;
  chatCoinPerMessage?: number;
  localeConfig?: LocaleConfigMap | null;
  _count?: { relationships: number };
}

export type CharacterFormData = {
  id: string;
  name: string;
  nameEn: string;
  slug: string;
  franchise: string;
  franchiseEn: string;
  description: string;
  systemPrompt: string;
  voiceModelId: string;
  catchphrases: string;
  personalityTraits: string;
  avatarUrl: string;
  coverUrl: string;
  isActive: boolean;
  fcMonthlyPriceJpy: string;
  fcIncludedCallMin: string;
  callCoinPerMin: string;
  fcOverageCallCoinPerMin: string;
  freeMessageLimit: string;
  freeCallMinutes: string;
  fcMonthlyCoins: string;
  chatCoinPerMessage: string;
};

export const EMPTY_FORM: CharacterFormData = {
  id: '',
  name: '',
  nameEn: '',
  slug: '',
  franchise: '',
  franchiseEn: '',
  description: '',
  systemPrompt: '',
  voiceModelId: '',
  catchphrases: '',
  personalityTraits: '[]',
  avatarUrl: '',
  coverUrl: '',
  isActive: true,
  fcMonthlyPriceJpy: '3480',
  fcIncludedCallMin: '30',
  callCoinPerMin: '200',
  fcOverageCallCoinPerMin: '100',
  freeMessageLimit: '10',
  freeCallMinutes: '5',
  fcMonthlyCoins: '500',
  chatCoinPerMessage: '10',
};
