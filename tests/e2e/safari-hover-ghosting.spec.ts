import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test';

import {seedTelemetryConsent} from './helpers/consent';
import {PRIMARY_AVAILABLE_TEST_VARIANT} from './helpers/landing-fixture';
import {expectBufferToMatchLocalSnapshot} from './helpers/local-snapshot';

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
    await expect(input.card).toHaveAttribute('data-desktop-shell-phase', 'closing');
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
    clip: buildStageClip(settledBox)
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
  });

  test('@smoke row1 same-card hover-out collapse keeps cleanup-pending bounded to the desktop stage', async ({page}, testInfo) => {
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
      clip: buildStageClip(firstCardBox)
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'hover-out-row1-settled.png', testInfo);
  });

  test('@smoke lower-row same-card hover-out collapse keeps cleanup-pending bounded to the desktop stage', async ({page}, testInfo) => {
    const lowerRowCard = page.locator('[data-card-variant="build-metrics"]');
    const lowerRowCardBox = await runHoverOutCollapseCycles({
      page,
      card: lowerRowCard,
      cardVariant: 'build-metrics',
      leavePointForBox: (box) => ({
        x: box.x + box.width / 2,
        y: Math.min(DESKTOP_VIEWPORT.height - 16, box.y + box.height + STAGE_SHADOW_BLEED_BOTTOM_PX + 48)
      })
    });

    const screenshot = await page.screenshot({
      clip: buildStageClip(lowerRowCardBox)
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'hover-out-lower-row-settled.png', testInfo);
  });

  test('@smoke row1 handoff source skips close and cleanup phases', async ({page}) => {
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

  test('@smoke row1 steady expanded short card stays content-fit without leaking the in-flow shell', async ({page}, testInfo) => {
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

  test('@smoke lower-row steady expanded shadow keeps a full envelope', async ({page}, testInfo) => {
    await expectSteadyExpandedShadowSnapshot({
      page,
      card: page.locator('[data-card-variant="build-metrics"]'),
      snapshotName: 'steady-lower-row-expanded-shadow.png',
      testInfo
    });
  });

  test('@smoke desktop settings panel removes the top seam without shifting the current theme button', async ({
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
      clip: buildSettingsPanelClip(panelBox!)
    });
    await expectBufferToMatchLocalSnapshot(screenshot, 'settings-panel-top-seam-free.png', testInfo);
  });
});
