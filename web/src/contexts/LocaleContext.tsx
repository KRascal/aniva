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
