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
      // 이 스펙만 파일 안에서 직렬로 돈다. 여섯 케이스가 각각 실제 포인터를 20 회 움직이며
      // **스쳐 지나가는** 셸 위상(`closing` · `cleanup-pending`)을 읽는데, 같은 기계에서 여섯
      // webkit 컨텍스트가 동시에 그것을 하면 전이가 폴링 간격보다 빨리 지나가 버린다. 실측
      // (2026-09-11): 병렬로 세 번 돌려 4·3·4 통과(붉은 자리가 실행마다 달랐다), `--workers=1`
      // 로 세 번 돌려 6·6·6 통과. 제품 결함이 아니라 이 스펙이 CPU 를 나눠 쓸 수 없다는 뜻이다.
      fullyParallel: false,
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
