'use client';
import { useState, useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Locale } from '@/lib/i18n';

const LOCALES: { code: Locale; flag: string; label: string }[] = [
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="言語切替"
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
              onClick={() => { setLocale(code); setOpen(false); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
            >
              <span>{flag}</span>
              <span className={locale === code ? 'text-white font-semibold' : 'text-gray-400'}>
                {label}
              </span>
              {locale === code && (
                <span className="ml-auto text-purple-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
