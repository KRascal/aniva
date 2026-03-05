'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, translations } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ja',
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ja');

  useEffect(() => {
    // 1. localStorage に保存済みなら使う
    const saved = localStorage.getItem('aniva-locale') as Locale | null;
    if (saved && ['ja', 'en', 'ko', 'zh'].includes(saved)) {
      setLocaleState(saved);
      // クッキーにも同期（next-intlサーバーサイド用）
      if (!document.cookie.includes(`NEXT_LOCALE=${saved}`)) {
        document.cookie = `NEXT_LOCALE=${saved};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
      }
      return;
    }
    // 2. ブラウザ言語から判定
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ko')) setLocaleState('ko');
    else if (browserLang.startsWith('zh')) setLocaleState('zh');
    else if (browserLang.startsWith('en')) setLocaleState('en');
    else setLocaleState('ja');
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('aniva-locale', l);
    // next-intl用にクッキーも設定（サーバーサイドレンダリングで反映される）
    document.cookie = `NEXT_LOCALE=${l};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    // ページリロードでサーバー側のnext-intlに反映
    window.location.reload();
  };

  const translate = (key: string): string => {
    return translations[locale]?.[key] ?? translations['ja']?.[key] ?? key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
