/**
 * locale-detector.ts — ユーザーlocale自動検出
 *
 * 判定順: User.locale（DB） → Cookie（NEXT_LOCALE） → Accept-Language → GeoIP → 'ja'
 *
 * Phase 1実装
 */

import { prisma } from './prisma';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from './types/i18n';
import { logger } from '@/lib/logger';

/**
 * Accept-Languageヘッダーをパースして優先順にロケールを返す
 * 例: "ja,en-US;q=0.9,en;q=0.8" → ["ja", "en", "en"]
 */
function parseAcceptLanguage(acceptLanguage: string): string[] {
  return acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang.trim().split('-')[0].toLowerCase(), q: parseFloat(q ?? '1') };
    })
    .sort((a, b) => b.q - a.q)
    .map((item) => item.lang);
}

/**
 * 文字列がSupportedLocaleかどうかを検証
 */
function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}

/**
 * GeoIPによるlocale推定
 * Cloudflare CF-IPCountry ヘッダーを利用
 *
 * 主要マッピング（国コード → locale）
 */
const COUNTRY_TO_LOCALE: Record<string, SupportedLocale> = {
  JP: 'ja',
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  NZ: 'en',
  KR: 'ko',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  SG: 'zh',
};

/**
 * リクエストからユーザーlocaleを検出する
 *
 * @param request - Next.js App Router の Request オブジェクト
 * @param userId  - 認証済みユーザーID（任意）。指定時はDB.User.localeを優先
 * @returns 検出されたSupportedLocale
 */
export async function detectUserLocale(
  request: Request,
  userId?: string | null,
): Promise<SupportedLocale> {
  // --- 1. User.locale（DB） ---
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { locale: true },
      });
      if (user?.locale && isSupportedLocale(user.locale)) {
        return user.locale;
      }
    } catch {
      // DB失敗はサイレントにフォールバック
    }
  }

  // --- 2. Cookie（NEXT_LOCALE） ---
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  if (cookieMatch) {
    const cookieLocale = decodeURIComponent(cookieMatch[1]).toLowerCase();
    if (isSupportedLocale(cookieLocale)) {
      return cookieLocale;
    }
  }

  // --- 3. Accept-Language ヘッダー ---
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const langs = parseAcceptLanguage(acceptLanguage);
    for (const lang of langs) {
      if (isSupportedLocale(lang)) {
        return lang;
      }
    }
  }

  // --- 4. GeoIP（Cloudflare CF-IPCountry） ---
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry in COUNTRY_TO_LOCALE) {
    return COUNTRY_TO_LOCALE[cfCountry];
  }

  // --- 5. デフォルト ---
  return DEFAULT_LOCALE;
}

/**
 * ログイン時にUser.localeをDBに保存する
 *
 * @param userId  - 更新対象ユーザーID
 * @param locale  - 新しいlocale
 */
export async function updateUserLocale(
  userId: string,
  locale: SupportedLocale,
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { locale },
    });
  } catch (err) {
    logger.error('[locale-detector] Failed to update user locale:', err);
  }
}
