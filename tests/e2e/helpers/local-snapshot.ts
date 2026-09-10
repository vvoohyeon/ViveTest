import {existsSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

import {expect, type Locator, type TestInfo} from '@playwright/test';

/**
 * 이 헬퍼는 종전에 **baseline 이 없으면 그것을 써 놓고 통과**시켰다. Playwright 자신은 없는
 * baseline 을 만나면 파일을 쓰고 **실패**시키는데, 그보다 한 단계 더 조용했던 것이다.
 *
 * `tests/e2e/*-snapshots/` 는 `.gitignore` 대상이라 그렇게 생긴 파일은 어떤 게이트에도
 * 나타나지 않는다. 결과는 2026-05-10 에 `expanded-focus-shell` 에서 실제로 일어났다 —
 * 그 기계에만 남은 캡처가 넉 달 뒤까지 비교 대상으로 남아 붉었고, 같은 검사가 새 clone 에서는
 * 스스로 baseline 을 만들어 **통과**했다. 초록이 「결함 없음」이 아니라 「비교한 적 없음」이었다.
 *
 * 그래서 기본값은 **엄격**이다: baseline 이 없으면 실패한다. 없는 baseline 을 만드는 것은
 * `--update-snapshots` 로 하는 명시적·승인된 행위이지 검사의 부작용이 아니다.
 *
 * `allowMissingBaseline` 은 그 예외를 **눈에 보이게** 남기기 위한 것이다. `BQ-07` 이 baseline
 * 생성을 이연해 둔 스펙(theme-matrix · safari ghosting)만 이것을 쓰며, 이연이 풀리면 옵션을
 * 지우는 것으로 끝난다. 새로 쓰는 호출부는 아무것도 적지 않으면 안전한 쪽을 받는다.
 */
export interface LocalSnapshotOptions {
  /** 이연 사유를 문자열로 남긴다 — 왜 이 스펙이 생성-후-통과를 유지하는지. */
  allowMissingBaseline?: {reason: string};
}

async function ensureSnapshotDirectory(snapshotPath: string) {
  await mkdir(dirname(snapshotPath), {recursive: true});
}

export async function expectLocatorToMatchLocalSnapshot(
  locator: Locator,
  snapshotName: string,
  testInfo: TestInfo,
  options?: LocalSnapshotOptions
) {
  if (!options?.allowMissingBaseline) {
    // Playwright 기본 의미론: 없으면 실제 이미지를 남기고 실패한다.
    await expect(locator).toHaveScreenshot(snapshotName);
    return;
  }

  const snapshotPath = testInfo.snapshotPath(snapshotName, {kind: 'screenshot'});
  if (existsSync(snapshotPath)) {
    await expect(locator).toHaveScreenshot(snapshotName);
    return;
  }

  await ensureSnapshotDirectory(snapshotPath);
  await locator.screenshot({path: snapshotPath});
}

export async function expectBufferToMatchLocalSnapshot(
  actual: Buffer,
  snapshotName: string,
  testInfo: TestInfo,
  options?: LocalSnapshotOptions
) {
  if (!options?.allowMissingBaseline) {
    expect(actual).toMatchSnapshot(snapshotName);
    return;
  }

  const snapshotPath = testInfo.snapshotPath(snapshotName, {kind: 'screenshot'});
  if (existsSync(snapshotPath)) {
    expect(actual).toMatchSnapshot(snapshotName);
    return;
  }

  await ensureSnapshotDirectory(snapshotPath);
  await writeFile(snapshotPath, actual);
}
