import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ja', 'en', 'ko', 'zh', 'es', 'fr'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed', // ja has no prefix, others get prefix
});
