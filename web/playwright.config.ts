import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3050',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile: use chromium with iPhone viewport emulation (webkit not installed in CI)
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
