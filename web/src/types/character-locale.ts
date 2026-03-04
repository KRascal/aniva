// Character locale configuration types
// Used for Character.localeConfig (Json field in Prisma)

export const SUPPORTED_LOCALES = ['ja', 'en', 'ko', 'zh'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
};

export interface CharacterLocaleConfig {
  /** ElevenLabs voice ID for this locale */
  voiceModelId?: string;
  /** AI system prompt for this locale */
  systemPrompt?: string;
  /** Character name localized */
  name?: string;
  /** Character bio/description localized */
  bio?: string;
  /** Greeting message for this locale */
  greeting?: string;
  /** Catchphrases array */
  catchphrases?: string[];
  /** Tone/style notes for prompt supplement */
  toneNotes?: string;
}

export type LocaleConfigMap = Partial<Record<SupportedLocale, CharacterLocaleConfig>>;
