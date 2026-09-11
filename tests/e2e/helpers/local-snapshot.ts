import {existsSync} from 'node:fs';

import {expect, type Locator, type TestInfo} from '@playwright/test';

/**
 * 없는 baseline 은 **만들지 않고 실패한다.**
 *
 * 이 헬퍼는 종전에 baseline 이 없으면 그것을 써 놓고 **통과**시켰다. `BQ-07` 이 생성을
 * 이연해 둔 두 스펙(theme-matrix · safari ghosting)이 그 예외를 명시적으로 받았고, 2026-09-11
 * 에 이연이 풀리면서 호출부가 하나도 남지 않아 예외 인자를 지웠다. 예외를 되살리지 말 것 —
 * 되살리는 순간 그 스펙의 초록은 「결함 없음」과 「비교한 적 없음」을 구별하지 못한다.
 *
 * 그렇다고 Playwright 기본 의미론에 그대로 맡기지도 않는다. `toHaveScreenshot` 은 없는
 * baseline 을 만나면 **그 파일을 디스크에 쓰고** 그 실행만 실패시키므로, 같은 작업공간의
 * **두 번째 실행은 몇 분 전 자기 빌드가 만든 이미지와 비교해 통과한다**(L11: 2026-09-07 에
 * 108 장이 그렇게 생겼다). `tests/e2e/*-snapshots/` 는 `.gitignore` 대상이라 그 파일들은
 * `git status` 에도 어떤 게이트에도 나타나지 않는다. 그래서 비교 전에 먼저 파일 존재를 보고,
 * 없으면 **쓰기 전에** 멈춘다 — 붉음이 한 번으로 끝나지 않고 계속 붉게 남는다.
 */
function assertBaselineExists(snapshotName: string, testInfo: TestInfo) {
  // `--update-snapshots` 는 baseline 을 **만드는** 승인된 실행이다 — 그 실행에서 「없다」는
  // 실패 사유가 아니라 할 일이므로 비켜선다. 목록을 뒤집어 `!== 'none'` 으로 쓰면 안 된다:
  // Playwright 의 **기본값이 `'missing'`** 이고, 그 기본값이야말로 이 가드가 막으려는
  // 「없으면 써 놓고 다음 실행에 통과」 그 자체다(L11).
  if (testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed') {
    return;
  }

  const snapshotPath = testInfo.snapshotPath(snapshotName, {kind: 'screenshot'});

  if (existsSync(snapshotPath)) {
    return;
  }

  throw new Error(
    `baseline 이 없다: ${snapshotPath}\n` +
      '없는 baseline 은 생성-후-통과가 아니라 실패다. 만드는 것은 승인된 `--update-snapshots` 뿐이며, ' +
      '여기서 만들면 다음 실행이 자기 이미지와 비교해 거짓 초록이 된다.'
  );
}

export async function expectLocatorToMatchLocalSnapshot(
  locator: Locator,
  snapshotName: string,
  testInfo: TestInfo
) {
  assertBaselineExists(snapshotName, testInfo);
  await expect(locator).toHaveScreenshot(snapshotName);
}

export async function expectBufferToMatchLocalSnapshot(
  actual: Buffer,
  snapshotName: string,
  testInfo: TestInfo
) {
  assertBaselineExists(snapshotName, testInfo);
  expect(actual).toMatchSnapshot(snapshotName);
}
