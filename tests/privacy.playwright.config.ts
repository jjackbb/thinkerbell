import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';
export default defineConfig({
  ...base,
  testDir: './e2e',
  testMatch: '**/privacy.spec.ts',
  outputDir: '../validation-results/privacy/results',
  reporter: [['list']],
  webServer: { ...base.webServer, cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), command: 'node node_modules/vite/bin/vite.js --config tests/e2e/privacy-vite.config.ts' },
});
