import {existsSync} from 'node:fs';

import {defineConfig} from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE ?? 'dev';
const previewLogPath = '.next/qa/preview-smoke.log';
const previewStartCommand = existsSync('.next/BUILD_ID')
  ? 'npm run start -- --port 4173'
  : 'npm run build && npm run start -- --port 4173';
const previewCommand = `sh -c 'mkdir -p .next/qa && rm -f ${previewLogPath} && (${previewStartCommand}) > ${previewLogPath} 2>&1'`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      threshold: 0.01,
      maxDiffPixels: 20
    }
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /safari-hover-ghosting\.spec\.ts/,
      use: {
        browserName: 'chromium'
      }
    },
    {
      name: 'webkit-ghosting',
      testMatch: /safari-hover-ghosting\.spec\.ts/,
      use: {
        browserName: 'webkit'
      }
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: serverMode === 'preview' ? previewCommand : 'npm run dev -- --port 4173',
        url: baseURL,
        timeout: 120_000,
        // 원인 미확인: NO_COLOR/FORCE_COLOR env override 후에도 Playwright workers 경고가 유지되어 env 블록은 두지 않는다.
        reuseExistingServer: serverMode === 'preview' ? false : !process.env.CI
      }
});
