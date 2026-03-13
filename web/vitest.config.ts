import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts', 'tests/api/**/*.test.ts'],
    env: {
      STRIPE_SECRET_KEY: 'sk_test_vitest_mock_key',
      DEMO_MODE: 'false',
      NEXTAUTH_URL: 'http://localhost:3000',
      CRON_SECRET: 'test-cron-secret',
      XAI_API_KEY: 'test-xai-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
