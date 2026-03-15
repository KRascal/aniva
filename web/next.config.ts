import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
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
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.aniva-project.com' },
      { protocol: 'https', hostname: 'demo.aniva-project.com' },
      { protocol: 'https', hostname: 'aniva-project.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'http', hostname: '162.43.90.97' },
    ],
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
      // セキュリティヘッダー（全ルート）
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
