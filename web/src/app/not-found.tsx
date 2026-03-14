import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/**
 * 404 page — server component, no framer-motion or client-side dependencies
 * to avoid chunk loading failures on stale cache
 */
export default async function NotFound() {
  let t: (key: string) => string;
  try {
    t = await getTranslations('errors');
  } catch {
    // Fallback if i18n fails
    t = (key: string) => ({
      'notFoundTitle': 'Page Not Found',
      'notFoundDesc': 'The page you are looking for does not exist or has been moved.',
      'backToHome': 'Back to Home',
    }[key] ?? key);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950 text-white text-center">
      <div className="relative mb-8">
        <span className="text-[120px] font-black tracking-tighter bg-gradient-to-b from-white/20 to-transparent bg-clip-text text-transparent select-none leading-none">
          404
        </span>
      </div>
      <h1 className="text-xl font-bold mb-2 tracking-tight">
        {t('notFoundTitle')}
      </h1>
      <p className="text-sm text-white/50 mb-8 max-w-xs leading-relaxed">
        {t('notFoundDesc')}
      </p>
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full px-7 py-3 text-sm font-bold hover:brightness-110 active:scale-95 transition-all"
      >
        {t('backToHome')}
      </Link>
    </div>
  );
}
