/**
 * character-loader.ts
 * キャラ定義ローダー — 優先度: DB → ファイル → ハードコード
 *
 * loadCharacterContext(slug, locale?) を呼び出すと
 * { systemPrompt, voiceConfig, boundaries, personality } を返す。
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from './prisma';
import { CHARACTER_DEFINITIONS } from './character-engine';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type CharacterLocaleConfigEntry, type SupportedLocale } from './types/i18n';

// ============================================================
// 返却型
// ============================================================

export interface CharacterContext {
  systemPrompt: string;
  voiceConfig: {
    voiceModelId?: string | null;
    toneNotes?: string;
    catchphrases?: string[];
  };
  boundaries: string[];
  personality: {
    traits: string[];
    ngFallback: string;
    name: string;
    nameEn: string;
  };
}

// ============================================================
// ファイル読み込みヘルパー
// ============================================================

/**
 * 指定スラッグのエージェントディレクトリ候補を返す
 * 優先度: 独立ワークスペース → プロジェクト内agents
 */
function resolveAgentDirs(slug: string): string[] {
  const dirs: string[] = [
    join('/home/openclaw/.openclaw/agents', slug),
    join(process.cwd(), '..', 'agents', slug),
  ];
  return dirs;
}

/**
 * ファイルが存在すれば内容を返す。なければ null
 */
function tryReadFile(filePath: string): string | null {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8').trim();
      return content || null;
    }
  } catch {
    // 読み込み失敗は無視
  }
  return null;
}

/**
 * スラッグに対応するSOUL.mdを読む（独立WS → プロジェクト内 の順）
 */
function loadSoulMd(slug: string): string | null {
  for (const dir of resolveAgentDirs(slug)) {
    const content = tryReadFile(join(dir, 'SOUL.md'));
    if (content) return content;
  }
  return null;
}

/**
 * スラッグに対応するVOICE.mdを読む
 * 返却: { voiceModelId?, toneNotes?, catchphrases? } を本文から抽出
 */
function loadVoiceMd(slug: string): { toneNotes?: string; catchphrases?: string[] } | null {
  for (const dir of resolveAgentDirs(slug)) {
    const content = tryReadFile(join(dir, 'VOICE.md'));
    if (!content) continue;

    // トーンノートは最初の段落として扱う
    const toneMatch = content.match(/##\s*トーン[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
    const toneNotes = toneMatch ? toneMatch[1].trim() : undefined;

    // 口癖リストを抽出（- 「...」 形式）
    const catchphrases: string[] = [];
    const cpSection = content.match(/##\s*(?:口癖|キャッチフレーズ)[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
    if (cpSection) {
      const matches = cpSection[1].matchAll(/[-*]\s*「(.+?)」/g);
      for (const m of matches) catchphrases.push(m[1]);
    }

    return {
      toneNotes: toneNotes || undefined,
      catchphrases: catchphrases.length > 0 ? catchphrases : undefined,
    };
  }
  return null;
}

/**
 * スラッグに対応するBOUNDARIES.mdを読む
 * 返却: 禁止事項の文字列配列
 */
function loadBoundariesMd(slug: string): string[] | null {
  for (const dir of resolveAgentDirs(slug)) {
    const content = tryReadFile(join(dir, 'BOUNDARIES.md'));
    if (!content) continue;

    const lines: string[] = [];
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // - / * で始まるリスト項目を収集
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        lines.push(trimmed.slice(2).trim());
      }
    }
    return lines.length > 0 ? lines : [content];
  }
  return null;
}

// ============================================================
// メインエクスポート
// ============================================================

/**
 * キャラクターコンテキストをロード
 * 優先度: DB → ファイル（SOUL.md/VOICE.md/BOUNDARIES.md） → ハードコード
 *
 * @param slug       キャラクタースラッグ（例: "luffy"）
 * @param locale     言語コード（デフォルト: "ja"）
 */
export async function loadCharacterContext(
  slug: string,
  locale: string = 'ja',
): Promise<CharacterContext> {
  // 未対応localeはデフォルトにフォールバック
  const safeLocale: SupportedLocale = (SUPPORTED_LOCALES as string[]).includes(locale)
    ? (locale as SupportedLocale)
    : DEFAULT_LOCALE;
  // --- ハードコードのフォールバック定義を先に取得 ---
  const hardcoded = CHARACTER_DEFINITIONS[slug];

  // ------ 1. DB から取得 ------
  let dbSystemPrompt: string | null = null;
  let dbVoiceModelId: string | null = null;
  let dbToneNotes: string | undefined;
  let dbCatchphrases: string[] | undefined;
  let dbTraits: string[] = [];

  try {
    const dbChar = await prisma.character.findUnique({
      where: { slug },
      select: {
        systemPrompt: true,
        voiceModelId: true,
        localeConfig: true,
        catchphrases: true,
        personalityTraits: true,
      },
    });

    if (dbChar) {
      dbSystemPrompt = dbChar.systemPrompt || null;
      dbVoiceModelId = dbChar.voiceModelId ?? null;
      dbCatchphrases = dbChar.catchphrases?.length ? dbChar.catchphrases : undefined;
      dbTraits = Array.isArray(dbChar.personalityTraits)
        ? (dbChar.personalityTraits as string[])
        : [];

      // ロケール別上書き
      // フォールバック順: localeConfig[safeLocale] → localeConfig['ja'] → デフォルト
      const localeConf = dbChar.localeConfig as Record<string, CharacterLocaleConfigEntry> | null;
      if (localeConf) {
        const localeOverride: CharacterLocaleConfigEntry | undefined =
          localeConf[safeLocale] ?? (safeLocale !== 'ja' ? localeConf['ja'] : undefined);
        if (localeOverride) {
          if (localeOverride.systemPrompt) dbSystemPrompt = localeOverride.systemPrompt;
          if (localeOverride.voiceModelId) dbVoiceModelId = localeOverride.voiceModelId;
          if (localeOverride.toneNotes) dbToneNotes = localeOverride.toneNotes;
          if (localeOverride.catchphrases?.length) dbCatchphrases = localeOverride.catchphrases;
        }
      }
    }
  } catch {
    // DB 接続失敗はサイレントにフォールバック
  }

  // ------ 2. ファイルから取得 ------
  const fileSoul = loadSoulMd(slug);
  const fileVoice = loadVoiceMd(slug);
  const fileBoundaries = loadBoundariesMd(slug);

  // ------ 3. systemPrompt の優先度合成 ------
  // DB > ファイル(SOUL.md) > ハードコード
  const systemPrompt = dbSystemPrompt
    || fileSoul
    || hardcoded?.systemPrompt
    || `あなたは${slug}です。`;

  // ------ 4. voiceConfig の優先度合成 ------
  const voiceConfig = {
    voiceModelId: dbVoiceModelId,
    toneNotes: dbToneNotes || fileVoice?.toneNotes,
    catchphrases: dbCatchphrases || fileVoice?.catchphrases || hardcoded?.catchphrases,
  };

  // ------ 5. boundaries の優先度合成 ------
  // ファイル優先 → ハードコードから抽出（禁止事項セクション）
  let boundaries: string[] = fileBoundaries ?? [];
  if (boundaries.length === 0 && hardcoded?.systemPrompt) {
    // ハードコードsystemPromptの「## 禁止事項」セクションから抽出
    const m = hardcoded.systemPrompt.match(/## 禁止事項[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
    if (m) {
      boundaries = m[1]
        .split('\n')
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => l.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
  }

  // ------ 6. personality の優先度合成 ------
  const personality = {
    traits: dbTraits.length > 0 ? dbTraits : (hardcoded?.personalityTraits ?? []),
    ngFallback: hardcoded?.ngFallback ?? '今はうまく答えられないぞ…',
    name: hardcoded?.name ?? slug,
    nameEn: hardcoded?.nameEn ?? slug,
  };

  return { systemPrompt, voiceConfig, boundaries, personality };
}

/**
 * 直近24時間にこのキャラクターと会話したユニークユーザー数を取得
 */
export async function getDailyFanCount(characterId: string): Promise<number> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.relationship.count({
      where: {
        characterId,
        lastMessageAt: { gte: since },
      },
    });
    return count;
  } catch {
    return 0;
  }
}
