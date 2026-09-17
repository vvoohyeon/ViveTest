import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

import {expect, type Locator, type Page, type TestInfo} from '@playwright/test';

import {
  currentSnapshotEnvironment,
  snapshotEnvironmentNote,
  type SnapshotEnvironment
} from './snapshot-environment';

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

/**
 * **`document.fonts.ready` 는 일회성 장벽이 아니다.**
 *
 * `unicode-range` 로 쪼갠 폰트에서는 브라우저가 화면에 실제로 나온 문자를 덮는 조각만 받는다.
 * 그래서 로드 직후에 한 번 기다려도, 그 뒤에 카드를 펼치거나 시트를 열어 **새 글자가 나오면**
 * 그때 새 조각 요청이 시작되고 `fonts.ready` 는 다시 pending 이 된다. 정착 뒤에 다시 기다리지
 * 않으면 스냅샷이 스왑 중간을 찍는다 — 실측(2026-09-16, webkit): 전체 face 시절에 찍힌
 * baseline 과 글자 가장자리가 달라 `steady-row1-short-expanded-content-fit` 이 붉었다.
 *
 * 그래서 barrier 를 **캡처 직전**에 둔다. 촬영 지점이 한 곳이 아니므로 호출부마다 적지 않고
 * 여기서 한 번 건다.
 */
export async function waitForFontsSettled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/**
 * 재생성이 남긴 환경 기록을 읽고 쓰는 쪽. 판정 자체는 `snapshot-environment.ts` 가 갖는다.
 *
 * 경로는 설정 파일에서 유도한다. `import.meta.url` 은 쓸 수 없다 — 이 저장소는 `type: module` 이
 * 아니라 Playwright 가 스펙을 CJS 로 옮기고, 그러면 그 자리에서 `exports is not defined` 로 죽는다.
 */
function snapshotEnvironmentPath(testInfo: TestInfo): string {
  const root = testInfo.config.configFile
    ? path.dirname(testInfo.config.configFile)
    : testInfo.config.rootDir;

  return path.join(root, 'tests', 'e2e', 'snapshot-environment.json');
}

let environmentRecorded = false;

/** 승인된 재생성(`--update-snapshots`)만 환경을 남긴다 — 그 실행이 baseline 의 저자다. */
function recordSnapshotEnvironmentWhenUpdating(testInfo: TestInfo) {
  if (testInfo.config.updateSnapshots !== 'all' && testInfo.config.updateSnapshots !== 'changed') {
    return;
  }
  if (environmentRecorded) {
    return;
  }
  environmentRecorded = true;

  const target = snapshotEnvironmentPath(testInfo);
  mkdirSync(path.dirname(target), {recursive: true});
  writeFileSync(
    target,
    `${JSON.stringify(currentSnapshotEnvironment(testInfo.config.version), null, 2)}\n`,
    'utf8'
  );
}

async function withEnvironmentNote(testInfo: TestInfo, compare: () => Promise<void>): Promise<void> {
  try {
    await compare();
  } catch (error) {
    const recordedPath = snapshotEnvironmentPath(testInfo);
    const recorded = existsSync(recordedPath)
      ? (JSON.parse(readFileSync(recordedPath, 'utf8')) as SnapshotEnvironment)
      : null;
    const note = snapshotEnvironmentNote(recorded, currentSnapshotEnvironment(testInfo.config.version));

    if (error instanceof Error) {
      error.message += note;
      throw error;
    }
    throw new Error(`${String(error)}${note}`);
  }
}

export async function expectLocatorToMatchLocalSnapshot(
  locator: Locator,
  snapshotName: string,
  testInfo: TestInfo
) {
  assertBaselineExists(snapshotName, testInfo);
  recordSnapshotEnvironmentWhenUpdating(testInfo);
  await waitForFontsSettled(locator.page());
  await withEnvironmentNote(testInfo, async () => {
    await expect(locator).toHaveScreenshot(snapshotName);
  });
}

export async function expectBufferToMatchLocalSnapshot(
  actual: Buffer,
  snapshotName: string,
  testInfo: TestInfo
) {
  assertBaselineExists(snapshotName, testInfo);
  recordSnapshotEnvironmentWhenUpdating(testInfo);
  await withEnvironmentNote(testInfo, async () => {
    expect(actual).toMatchSnapshot(snapshotName);
  });
}

