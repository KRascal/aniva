/**
 * vitest.e2e.config.ts
 * API統合テスト用 vitest 設定 (e2e フォルダ対象)
 * 実行: npx vitest run --config vitest.e2e.config.ts
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.spec.ts'],
    // Playwright spec は除外 (playwright の import を含むもの)
    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      // Playwright ベースの既存 spec は除外 (vitest 非対応)
      'tests/e2e/chat.spec.ts',
      'tests/e2e/landing.spec.ts',
      'tests/e2e/responsive.spec.ts',
      'tests/e2e/regression-guard.spec.ts',
      'tests/e2e/pricing.spec.ts',
      'tests/e2e/explore.spec.ts',
      'tests/e2e/auth.spec.ts',
      'tests/e2e/critical-path.spec.ts',
      'tests/e2e/smoke.spec.ts',
    ],
    env: {
      STRIPE_SECRET_KEY: 'sk_test_vitest_mock_key',
      DEMO_MODE: 'false',
      NEXTAUTH_URL: 'http://localhost:3000',
      CRON_SECRET: 'test-cron-secret',
      XAI_API_KEY: 'test-xai-key',
      ADMIN_EMAILS: 'admin@aniva.jp',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
