'use client';
import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';

const LOCALES = [
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
] as const;

export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLocaleChange = (code: string) => {
    // Cookie で言語を永続化 → next-intl の getRequestConfig がpickup
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000;SameSite=Lax`;
    setOpen(false);
    startTransition(() => {
      // フルリロードで next-intl がcookieから新localeを読み込む
      window.location.reload();
    });
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Language"
      >
        🌐
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 min-w-[140px] rounded-xl overflow-hidden shadow-xl"
          style={{
            background: 'rgba(15,10,30,0.95)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {LOCALES.map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => handleLocaleChange(code)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
            >
              <span>{flag}</span>
              <span className={currentLocale === code ? 'text-white font-semibold' : 'text-gray-400'}>
                {label}
              </span>
              {currentLocale === code && (
                <span className="ml-auto text-purple-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
