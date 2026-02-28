import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const SUPPORTED_LOCALES = ['ja', 'en', 'ko', 'zh', 'es', 'fr'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ja';

// 言語コードの正規化マップ（Accept-Language対応）
const LOCALE_MAP: Record<string, SupportedLocale> = {
  ja: 'ja', 'ja-JP': 'ja',
  en: 'en', 'en-US': 'en', 'en-GB': 'en',
  ko: 'ko', 'ko-KR': 'ko',
  zh: 'zh', 'zh-CN': 'zh', 'zh-TW': 'zh', 'zh-HK': 'zh',
  es: 'es', 'es-ES': 'es', 'es-MX': 'es', 'es-419': 'es',
  fr: 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr',
};

export function detectLocaleFromHeader(acceptLang: string): SupportedLocale {
  // "ja,en-US;q=0.9,en;q=0.8" 形式をパース
  const parts = acceptLang.split(',').map(p => {
    const [lang, q] = p.trim().split(';q=');
    return { lang: lang.trim(), q: q ? parseFloat(q) : 1.0 };
  });
  parts.sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    if (LOCALE_MAP[lang]) return LOCALE_MAP[lang];
    const base = lang.split('-')[0];
    if (LOCALE_MAP[base]) return LOCALE_MAP[base];
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  // 1. Cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as SupportedLocale | undefined;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') ?? '';
  const detected = detectLocaleFromHeader(acceptLang);

  return {
    locale: detected,
    messages: (await import(`../../messages/${detected}.json`)).default,
  };
});
