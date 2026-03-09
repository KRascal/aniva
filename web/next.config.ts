import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // パフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30日
    deviceSizes: [390, 768, 1080, 1920],
    imageSizes: [64, 128, 256, 512],
  },
  experimental: {
    optimizeCss: true,        // CSS最適化（未使用CSSを削除）
    optimizePackageImports: [
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'date-fns',
      'react-hot-toast',
    ],
  },
  headers: async () => [
    {
      // /_next/static/ は content hash 付きで永続キャッシュOK
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      // HTML・API・その他は no-store（デプロイ後の stale Server Action 対策）
      source: '/((?!_next/static).*)',
      headers: [
        { key: 'Cache-Control', value: 'no-store, must-revalidate' },
      ],
    },
  ],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Sentry設定
  org: process.env.SENTRY_ORG || '',
  project: process.env.SENTRY_PROJECT || '',
  silent: true, // ビルド時のログ抑制
  // Source maps（本番のみ）
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
});
