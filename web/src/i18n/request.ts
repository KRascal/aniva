import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const SUPPORTED_LOCALES = ['ja', 'en'] as const;
const DEFAULT_LOCALE = 'ja';

export default getRequestConfig(async () => {
  // 1. Check cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as typeof SUPPORTED_LOCALES[number])) {
    return {
      locale: cookieLocale,
      messages: (await import(`../../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Check Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') ?? '';
  for (const locale of SUPPORTED_LOCALES) {
    if (acceptLang.includes(locale)) {
      return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
      };
    }
  }

  // 3. Default
  return {
    locale: DEFAULT_LOCALE,
    messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
  };
});
