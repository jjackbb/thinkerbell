import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'analytics.spec.ts', fullyParallel: false, workers: 1, retries: 0,
  timeout: 30_000, expect: { timeout: 7000 }, outputDir: '../validation-results/analytics/browser-results',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4186', browserName: 'chromium',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined,
    locale: 'ko-KR', timezoneId: 'Asia/Seoul', serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [ { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true } } ],
  webServer: { cwd: new URL('..', import.meta.url).pathname, command: 'node node_modules/vite/bin/vite.js --config tests/e2e/analytics-vite.config.ts', url: 'http://127.0.0.1:4186', reuseExistingServer: false, timeout: 30000 },
});
