/**
 * i18n.ts — ANIVA 多言語化 型定義
 *
 * Phase 1: DB基盤 + APIのlocale対応
 */

/** サポート言語一覧 */
export type SupportedLocale = 'ja' | 'en' | 'ko' | 'zh';

/** サポート言語の配列（ランタイムでの検証用） */
export const SUPPORTED_LOCALES: SupportedLocale[] = ['ja', 'en', 'ko', 'zh'];

/** デフォルトlocale */
export const DEFAULT_LOCALE: SupportedLocale = 'ja';

/**
 * Character.localeConfig の各locale設定
 * DBではJsonフィールドだが、コード側で型安全に扱う
 */
export interface CharacterLocaleConfigEntry {
  /** AIシステムプロンプト（この言語版） */
  systemPrompt?: string;
  /** ElevenLabs voice ID（この言語の声優） */
  voiceModelId?: string;
  /** キャラの名前（この言語圏向け） */
  name?: string;
  /** キャラクター説明（この言語圏向け） */
  bio?: string;
  /** オンボーディング第一声（この言語版） */
  greeting?: string;
  /** クイックリプライ候補 */
  quickReplies?: string[];
  /** キャッチフレーズ配列 */
  catchphrases?: string[];
  /** 口調・トーンのメモ（プロンプト補足） */
  toneNotes?: string;
  /** SOUL.md相当（性格定義 この言語版） */
  soulContent?: string;
  /** VOICE.md相当（話し方定義 この言語版） */
  voiceContent?: string;
  /** BOUNDARIES.md相当（禁止事項 この言語版） */
  boundariesContent?: string;
  /** オンボーディング第一声（3パターン） */
  onboardingGreetings?: string[];
}

/**
 * Character.localeConfig 全体型
 * { "en": { ... }, "ko": { ... } } の形式
 */
export interface CharacterLocaleConfig {
  [locale: string]: CharacterLocaleConfigEntry;
}

/** CharacterLocaleConfig の Partial版（SupportedLocale キーのみ） */
export type LocaleConfigMap = Partial<Record<SupportedLocale, CharacterLocaleConfigEntry>>;
