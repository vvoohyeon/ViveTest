import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT} from './helpers/landing-fixture';
import {expectBufferToMatchLocalSnapshot} from './helpers/local-snapshot';

/**
 * lower-row 케이스의 피사체. **test 카드여야 한다.**
 *
 * 종전에 이 두 케이스는 `build-metrics` 를 썼는데 그것은 blog 카드다. 데스크톱 확장 셸은
 * test 카드만 갖고(`landing-grid-card.tsx` 의 `DesktopExpandedShell` 가 `isTestCard` 로 막혀
 * 있다) 카드는 `expanded` 를 보고하지 못하도록 명시적으로 강제되므로(`:969`), 두 케이스는
 * 첫 단언에서 영원히 멈춘다 — baseline 이 한 장도 없어 그 사실이 여태 보이지 않았다.
 * 데스크톱 wide 에서 row1 은 3 장이고 사용 가능한 test 카드 중 lower row 에 서는 것은 이것뿐이다.
 * 카탈로그 순서가 바뀌면 전제가 조용히 깨지므로 `expectCardInLowerRow` 가 먼저 단언한다.
 */
/**
 * 정착 상태를 찍는데도 CPU 가 붐비면 전이가 다 끝나지 않은 프레임이 잡힌다 — 게이트 전체를
 * 돌릴 때 이 스펙은 chromium 120 여 케이스와 같은 기계를 나눠 쓰고, 실측(2026-09-11)에서
 * 단독 실행 4/4 초록이던 스펙이 게이트 안에서 107px 짜리 차이로 한 장 붉었다.
 * `animations: 'disabled'` 는 CSS 전이·애니메이션을 **종료 상태로 고정**하고 찍는다 —
 * 기다림을 늘리는 대신 찍는 순간을 결정론으로 만든다(`toHaveScreenshot` 은 이것을 기본으로
 * 하지만 버퍼 비교 경로는 직접 넘겨야 한다).
 */
const FROZEN_CAPTURE = {animations: 'disabled'} as const;

const LOWER_ROW_AVAILABLE_TEST_VARIANT = 'egtt';

// Safari ghosting baselines are captured through helper wrappers that delegate to Playwright `toMatchSnapshot`.

const DESKTOP_VIEWPORT = {width: 1440, height: 980} as const;
const STAGE_SHADOW_BLEED_X_PX = 72;
const STAGE_SHADOW_BLEED_TOP_PX = 56;
const STAGE_SHADOW_BLEED_BOTTOM_PX = 192;
const STAGE_CAPTURE_BOTTOM_EXTRA_PX = 40;
const HOVER_OUT_REPEAT_COUNT = 20;
const SETTINGS_PANEL_EXTRA_TOP_PX = 12;
const SETTINGS_PANEL_EXTRA_RIGHT_PX = 15;
const SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX = 0.5;
const SETTINGS_PANEL_CAPTURE_SIDE_BLEED_PX = 24;
const SETTINGS_PANEL_CAPTURE_BOTTOM_BLEED_PX = 24;

function buildStageClip(box: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>) {
  return {
    x: Math.max(0, Math.floor(box.x - STAGE_SHADOW_BLEED_X_PX)),
    y: Math.max(0, Math.floor(box.y - STAGE_SHADOW_BLEED_TOP_PX)),
    width: Math.ceil(box.width + STAGE_SHADOW_BLEED_X_PX * 2),
    height: Math.ceil(
      box.height +
        STAGE_SHADOW_BLEED_TOP_PX +
        STAGE_SHADOW_BLEED_BOTTOM_PX +
        STAGE_CAPTURE_BOTTOM_EXTRA_PX
    )
  };
}

function buildSettingsPanelClip(box: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>) {
  return {
    x: Math.max(0, Math.floor(box.x - SETTINGS_PANEL_CAPTURE_SIDE_BLEED_PX)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.ceil(box.width + SETTINGS_PANEL_CAPTURE_SIDE_BLEED_PX * 2),
    height: Math.ceil(box.height + SETTINGS_PANEL_CAPTURE_BOTTOM_BLEED_PX)
  };
}

async function openDesktopSettingsPanel(page: Page) {
  const trigger = page.getByTestId('gnb-settings-trigger');
  const panel = page.getByTestId('gnb-settings-panel');

  await trigger.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('desktop-gnb-theme-controls')).toBeVisible();

  return {trigger, panel};
}

async function installDesktopShellPhaseObserver(page: Page, cardVariant: string) {
  await page.evaluate((observedCardId) => {
    const cardElement = document.querySelector<HTMLElement>(`[data-card-variant="${observedCardId}"]`);
    if (!cardElement) {
      throw new Error(`Missing card element for ${observedCardId}`);
    }

    const globalWindow = window as typeof window & {
      __desktopShellPhaseLog?: Record<string, string[]>;
      __desktopShellPhaseObserver?: Record<string, MutationObserver>;
    };
    const logs = (globalWindow.__desktopShellPhaseLog ??= {});
    const observers = (globalWindow.__desktopShellPhaseObserver ??= {});

    observers[observedCardId]?.disconnect();
    logs[observedCardId] = [cardElement.getAttribute('data-desktop-shell-phase') ?? ''];

    const observer = new MutationObserver(() => {
      const nextPhase = cardElement.getAttribute('data-desktop-shell-phase') ?? '';
      const currentLog = logs[observedCardId] ?? [];
      if (currentLog[currentLog.length - 1] !== nextPhase) {
        currentLog.push(nextPhase);
      }
      logs[observedCardId] = currentLog;
    });

    observer.observe(cardElement, {
      attributes: true,
      attributeFilter: ['data-desktop-shell-phase']
    });
    observers[observedCardId] = observer;
  }, cardVariant);
}

async function resetDesktopShellPhaseLog(page: Page, cardVariant: string) {
  await page.evaluate((observedCardId) => {
    const cardElement = document.querySelector<HTMLElement>(`[data-card-variant="${observedCardId}"]`);
    const globalWindow = window as typeof window & {
      __desktopShellPhaseLog?: Record<string, string[]>;
    };
    const logs = (globalWindow.__desktopShellPhaseLog ??= {});
    logs[observedCardId] = [cardElement?.getAttribute('data-desktop-shell-phase') ?? ''];
  }, cardVariant);
}

async function readDesktopShellPhaseLog(page: Page, cardVariant: string): Promise<string[]> {
  return page.evaluate((observedCardId) => {
    const globalWindow = window as typeof window & {
      __desktopShellPhaseLog?: Record<string, string[]>;
    };
    return [...(globalWindow.__desktopShellPhaseLog?.[observedCardId] ?? [])];
  }, cardVariant);
}

/** lower-row 케이스의 전제 — 피사체가 정말 첫 행 밖에 있는지 먼저 깨뜨린다(L16). */
async function expectCardInLowerRow(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
  await expect(card).toHaveAttribute('data-card-content-type', 'test');
  await expect(card).toHaveAttribute('data-card-attribute', 'available');

  const rowIndex = await card.evaluate((element) => {
    const row = element.closest('[data-testid^="landing-grid-row-"]');
    return Number.parseInt((row?.getAttribute('data-testid') ?? '').replace('landing-grid-row-', ''), 10);
  });

  expect(rowIndex, `${cardVariant} 가 첫 행에 있다 — lower-row 케이스의 전제가 깨졌다`).toBeGreaterThan(0);
}

async function settleDesktopExpandedCard(page: Page, card: Locator) {
  const initialBox = await card.boundingBox();
  if (!initialBox) {
    throw new Error('Missing bounding box for expanded card.');
  }

  await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await expect
    .poll(() => card.getAttribute('data-desktop-shell-phase'))
    .toMatch(/^(opening|steady)$/u);
  await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

  const settledBox = await card.boundingBox();
  if (!settledBox) {
    throw new Error('Missing settled bounding box for expanded card.');
  }

  return settledBox;
}

async function runHoverOutCollapseCycles(input: {
  page: Page;
  card: Locator;
  cardVariant: string;
  leavePointForBox: (box: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>) => {x: number; y: number};
}) {
  let settledBox: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>> | null = null;

  await installDesktopShellPhaseObserver(input.page, input.cardVariant);

  for (let iteration = 0; iteration < HOVER_OUT_REPEAT_COUNT; iteration += 1) {
    settledBox = await settleDesktopExpandedCard(input.page, input.card);
    await resetDesktopShellPhaseLog(input.page, input.cardVariant);
    const leavePoint = input.leavePointForBox(settledBox);
    await input.page.mouse.move(
      leavePoint.x,
      leavePoint.y
    );
    // 스쳐 지나가는 위상은 **관찰자에게** 묻는다. `toHaveAttribute('closing')` 은 살아 있는
    // 속성을 폴링하므로 전이가 폴링 간격보다 빠르면 놓치고, 놓친 것은 「일어나지 않았다」와
    // 구별되지 않는다 — 실측(2026-09-11, webkit)에서 실행마다 다른 케이스가 그 한 줄에서
    // 붉었고 로그에는 `closing` 이 매번 들어 있었다. 아래 `phaseLog` 는 MutationObserver 가
    // 모든 변경을 기록한 것이므로 같은 주장을 경주 없이 편다. 다만 **기다리는 일은 남는다**:
    // 단언을 그냥 지우면 정착 전에 로그를 읽게 되므로(그 판본은 더 나빴다), 기다림도
    // 관찰자 위에서 한다.
    await expect
      .poll(() => readDesktopShellPhaseLog(input.page, input.cardVariant))
      .toContain('closing');
    await expect(input.card).toHaveAttribute('data-desktop-shell-phase', 'idle');

    const phaseLog = await readDesktopShellPhaseLog(input.page, input.cardVariant);
    expect(phaseLog).toContain('closing');
    expect(phaseLog).toContain('cleanup-pending');
    expect(phaseLog.at(-1)).toBe('idle');
  }

  if (!settledBox) {
    throw new Error('Missing settled hover-out cycle box.');
  }

  return settledBox;
}

async function expectSteadyExpandedShadowSnapshot(input: {
  page: Page;
  card: Locator;
  snapshotName: string;
  testInfo: TestInfo;
}) {
  const settledBox = await settleDesktopExpandedCard(input.page, input.card);
  const screenshot = await input.page.screenshot({
    clip: buildStageClip(settledBox),
    ...FROZEN_CAPTURE
  });
  await expectBufferToMatchLocalSnapshot(screenshot, input.snapshotName, input.testInfo);
}

async function readDesktopExpandedOverlayMetrics(card: Locator) {
  return card.evaluate((element) => {
    const shell = element.querySelector<HTMLElement>('[data-slot="expandedShell"]');
    const surface = element.querySelector<HTMLElement>('[data-slot="expandedSurface"]');
    if (!shell || !surface) {
      throw new Error('Expected expanded shell and surface to be present for overlay metrics.');
    }

    const parseBackgroundAlpha = (value: string): number => {
      if (value === 'transparent') {
        return 0;
      }

      const rgbaMatch = value.match(/rgba?\((.*)\)/u);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',');
        if (parts.length === 4) {
          return Number.parseFloat(parts[3]);
        }

        return 1;
      }

      const slashMatch = value.match(/\/\s*([0-9.]+)\s*\)$/u);
      if (slashMatch) {
        return Number.parseFloat(slashMatch[1]);
      }

      return 1;
    };

    const rootRect = element.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const rootStyle = getComputedStyle(element);
    const shellStyle = getComputedStyle(shell);
    const surfaceStyle = getComputedStyle(surface);

    return {
      rootHeight: rootRect.height,
      rootBottom: rootRect.bottom,
      rootBackgroundAlpha: parseBackgroundAlpha(rootStyle.backgroundColor),
      surfaceHeight: surfaceRect.height,
      surfaceBottom: surfaceRect.bottom,
      shellMinHeight: shellStyle.minHeight,
      surfaceMinHeight: surfaceStyle.minHeight
    };
  });
}

test.describe('Safari hover-out ghosting regression', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/en');
    // Pretendard 는 `swap` 이고 preload 하지 않는다 — 폰트가 도착하기 전에 찍으면 같은 화면이
    // fallback 으로 렌더돼 글자 가장자리가 달라진다. theme-matrix 가 같은 이유로 같은 것을
    // 기다린다(실측: 이 스펙에서도 107px 짜리 서브픽셀 차이가 실행마다 났다).
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  });

  test('@smoke @gate row1 same-card hover-out collapse keeps cleanup-pending bounded to the desktop stage', async ({page}, testInfo) => {
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const firstCardBox = await runHoverOutCollapseCycles({
      page,
      card: firstCard,
      cardVariant: PRIMARY_AVAILABLE_TEST_VARIANT,
      leavePointForBox: (box) => ({
        x: box.x + box.width / 2,
        y: Math.max(12, box.y - 48)
      })
    });

    const screenshot = await page.screenshot({
      clip: buildStageClip(firstCardBox),
      ...FROZEN_CAPTURE
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'hover-out-row1-settled.png', testInfo);
  });

  test('@smoke @gate lower-row same-card hover-out collapse keeps cleanup-pending bounded to the desktop stage', async ({page}, testInfo) => {
    await expectCardInLowerRow(page, LOWER_ROW_AVAILABLE_TEST_VARIANT);
    const lowerRowCard = page.locator(`[data-card-variant="${LOWER_ROW_AVAILABLE_TEST_VARIANT}"]`);
    const lowerRowCardBox = await runHoverOutCollapseCycles({
      page,
      card: lowerRowCard,
      cardVariant: LOWER_ROW_AVAILABLE_TEST_VARIANT,
      leavePointForBox: (box) => ({
        x: box.x + box.width / 2,
        y: Math.min(DESKTOP_VIEWPORT.height - 16, box.y + box.height + STAGE_SHADOW_BLEED_BOTTOM_PX + 48)
      })
    });

    const screenshot = await page.screenshot({
      clip: buildStageClip(lowerRowCardBox),
      ...FROZEN_CAPTURE
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'hover-out-lower-row-settled.png', testInfo);
  });

  test('@smoke @gate row1 handoff source skips close and cleanup phases', async ({page}) => {
    const firstCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const secondCard = page.locator('[data-card-variant="rhythm-b"]');

    await settleDesktopExpandedCard(page, firstCard);
    await secondCard.hover();

    await expect(firstCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-source');
    await expect(firstCard).not.toHaveAttribute('data-desktop-shell-phase', 'closing');
    await expect(firstCard).not.toHaveAttribute('data-desktop-shell-phase', 'cleanup-pending');
    await expect(secondCard).toHaveAttribute('data-desktop-shell-phase', 'handoff-target');
    await expect(secondCard).toHaveAttribute('data-card-state', 'expanded');
  });

  test('@smoke @gate row1 steady expanded short card stays content-fit without leaking the in-flow shell', async ({page}, testInfo) => {
    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    await settleDesktopExpandedCard(page, card);
    const overlayMetrics = await readDesktopExpandedOverlayMetrics(card);

    expect(overlayMetrics.rootBackgroundAlpha).toBeLessThanOrEqual(0.05);
    expect(overlayMetrics.shellMinHeight).toBe('0px');
    expect(overlayMetrics.surfaceMinHeight).toBe('0px');

    await expectSteadyExpandedShadowSnapshot({
      page,
      card,
      snapshotName: 'steady-row1-short-expanded-content-fit.png',
      testInfo
    });
  });

  test('@smoke @gate lower-row steady expanded shadow keeps a full envelope', async ({page}, testInfo) => {
    await expectCardInLowerRow(page, LOWER_ROW_AVAILABLE_TEST_VARIANT);
    await expectSteadyExpandedShadowSnapshot({
      page,
      card: page.locator(`[data-card-variant="${LOWER_ROW_AVAILABLE_TEST_VARIANT}"]`),
      snapshotName: 'steady-lower-row-expanded-shadow.png',
      testInfo
    });
  });

  test('@smoke @gate desktop settings panel removes the top seam without shifting the current theme button', async ({
    page
  }, testInfo) => {
    const {trigger, panel} = await openDesktopSettingsPanel(page);
    const currentButton = page.getByTestId('desktop-gnb-theme-controls').locator('button[disabled]');

    const [triggerBox, panelBox, currentButtonBox] = await Promise.all([
      trigger.boundingBox(),
      panel.boundingBox(),
      currentButton.boundingBox()
    ]);

    expect(triggerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(currentButtonBox).not.toBeNull();

    expect(Math.abs((currentButtonBox?.x ?? 0) - (triggerBox?.x ?? 0))).toBeLessThanOrEqual(
      SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX
    );
    expect(Math.abs((currentButtonBox?.y ?? 0) - (triggerBox?.y ?? 0))).toBeLessThanOrEqual(
      SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX
    );
    expect(Math.abs((currentButtonBox?.width ?? 0) - (triggerBox?.width ?? 0))).toBeLessThanOrEqual(
      SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX
    );
    expect(Math.abs((currentButtonBox?.height ?? 0) - (triggerBox?.height ?? 0))).toBeLessThanOrEqual(
      SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX
    );
    expect(
      Math.abs((currentButtonBox?.y ?? 0) - (panelBox?.y ?? 0) - SETTINGS_PANEL_EXTRA_TOP_PX)
    ).toBeLessThanOrEqual(SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX);
    expect(
      Math.abs(
        (panelBox?.x ?? 0) +
          (panelBox?.width ?? 0) -
          ((currentButtonBox?.x ?? 0) + (currentButtonBox?.width ?? 0) + SETTINGS_PANEL_EXTRA_RIGHT_PX)
      )
    ).toBeLessThanOrEqual(SETTINGS_PANEL_GEOMETRY_TOLERANCE_PX);

    const screenshot = await page.screenshot({
      clip: buildSettingsPanelClip(panelBox!),
      ...FROZEN_CAPTURE
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'settings-panel-top-seam-free.png', testInfo);
  });
});
