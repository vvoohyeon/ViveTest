import {expect, test, type Locator, type Page} from '@playwright/test';

import {locales} from '../../src/config/site';
import {resolveLandingCatalog} from '../../src/features/variant-registry';
import {expectPageToBeAxeClean} from './helpers/axe';
import {clearTelemetryConsent, seedTelemetryConsent} from './helpers/consent';
import {
  buildLocalizedBlogDetailRoute,
  buildLocalizedBlogIndexRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_BLOG_VARIANT,
  SECONDARY_BLOG_VARIANT
} from './helpers/landing-fixture';
import {setHoverCapableViewport, setTouchViewport} from './helpers/touch-context';
import {expectSurfaceToMeetTouchTargetMinimum} from './helpers/touch-target';

const TRANSITION_OVERLAY_READY_DELAY_MS = 900;
const W12_MOBILE_VIEWPORTS = [360, 390, 767] as const;

async function delayDestinationReadyRaf(page: Page, delayMs = 180) {
  await page.addInitScript((timeoutMs) => {
    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    const scheduledFrames = new Map<number, number>();
    let syntheticHandle = 1_000;

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const handle = syntheticHandle;
      syntheticHandle += 1;
      const timeoutHandle = window.setTimeout(() => {
        scheduledFrames.delete(handle);
        nativeRequestAnimationFrame(callback);
      }, timeoutMs);
      scheduledFrames.set(handle, timeoutHandle);
      return handle;
    };

    window.cancelAnimationFrame = (handle: number) => {
      const timeoutHandle = scheduledFrames.get(handle);
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
        scheduledFrames.delete(handle);
        return;
      }

      nativeCancelAnimationFrame(handle);
    };
  }, delayMs);
}

/**
 * 설정 패널을 **키보드로** 연다.
 *
 * 종전에는 「첫 `Tab` → 첫 카드 → `Shift+Tab` → 설정 트리거」로 도달했다. 그 경로는 탭 순서를
 * 상태로 바꾸던 계약에 기대고 있었고, skip link 로 교체되면서 성립하지 않는다. 도달 방법은
 * 이 헬퍼의 관심사가 아니므로 **문서 순서대로 트리거까지 `Tab`** 한다 — 이 헬퍼를 쓰는
 * 케이스들이 재는 것은 패널이 열린 뒤의 포커스 링과 axe 청결이다.
 */
async function focusDesktopSettingsByKeyboard(page: Page) {
  const settingsTrigger = page.getByTestId('gnb-settings-trigger');

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await settingsTrigger.evaluate((element) => element === document.activeElement).catch(() => false)) {
      break;
    }
  }

  await expect(settingsTrigger).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
}

/**
 * 포커스 링의 **안쪽 층이 요소의 실제 지면과 같은가**를 픽셀로 잰다.
 *
 * 계산 스타일만 보면 이 결함을 잡지 못한다 — 종전 구현은 `--focus-ring-inner: var(--canvas)`
 * 를 읽어 값이 있었고, 그 값이 *페이지* 지면이지 *요소의* 지면이 아니라는 것이 결함이었다.
 *
 * 한 점이 아니라 **띠**로 잰다. 요소 가장자리가 소수 좌표라 링 안쪽 2px 띠의 양 끝이
 * 안티에일리어싱으로 섞이고, 점 하나를 찍으면 그 섞인 픽셀에 걸린다(실측: 틈이
 * `251,250,247` 인데 바로 옆 경계 픽셀이 `243,245,241`). 그래서 「안쪽 띠 어딘가에 바깥
 * 지면과 **정확히 같은** 픽셀이 있는가」를 묻는다 — 안쪽 층이 색이면 그런 픽셀은 하나도
 * 없고, 진짜 틈이면 반드시 있다.
 *
 * PNG 디코딩은 브라우저에게 시킨다 — 스크린샷을 data URL 로 되돌려 캔버스에 그리면 새
 * 의존성 없이 `getImageData` 로 읽을 수 있다.
 */
async function readFocusRingGroundBand(page: Page, target: Locator) {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Expected a bounding box for the focus-ring target.');
  }

  const geometry = await target.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      outlineWidthPx: Math.round(parseFloat(style.outlineWidth)),
      outlineOffsetPx: Math.round(parseFloat(style.outlineOffset)),
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow
    };
  });

  const edgeX = Math.round(box.x + box.width);
  const clip = {
    x: edgeX,
    y: Math.round(box.y + box.height / 2) - 1,
    // 옆 칩까지 넘어가지 않도록 링 바로 바깥 2px 만 더 본다.
    width: geometry.outlineOffsetPx + geometry.outlineWidthPx + 2,
    height: 3
  };

  const screenshot = await page.screenshot({clip});
  const dataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;

  const band = await page.evaluate(
    async ({url, clipRect, outlineColor}) => {
      const image = new Image();
      image.src = url;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Expected a 2d canvas context to decode the focus-ring screenshot.');
      }

      context.drawImage(image, 0, 0);
      // 스크린샷은 CSS 픽셀로 잘라 왔지만 이미지는 DPR 배율이므로 되돌린다.
      const scale = image.naturalWidth / clipRect.width;
      const midRowY = Math.round(scale);
      const row: string[] = [];
      for (let offset = 0; offset < clipRect.width; offset += 1) {
        const pixel = context.getImageData(Math.round(offset * scale), midRowY, 1, 1).data;
        row.push(`${pixel[0]},${pixel[1]},${pixel[2]}`);
      }

      const outlineRgb = outlineColor.replace(/^rgba?\(|\)$/gu, '').split(',').slice(0, 3);
      const outlineKey = outlineRgb.map((part) => Math.round(parseFloat(part))).join(',');
      const outlineStartIndex = row.indexOf(outlineKey);
      const outlineEndIndex = row.lastIndexOf(outlineKey);

      return {
        row,
        outlineKey,
        outlineFound: outlineStartIndex !== -1,
        innerBand: outlineStartIndex === -1 ? [] : row.slice(0, outlineStartIndex),
        ground: outlineEndIndex === -1 ? row[row.length - 1] : row[row.length - 1],
        groundOutsideRing: row[row.length - 1]
      };
    },
    {url: dataUrl, clipRect: clip, outlineColor: geometry.outlineColor}
  );

  return {...geometry, ...band};
}

async function focusDesktopDestinationSettingsByKeyboard(page: Page) {
  await page.locator('body').click({position: {x: 1, y: 1}});
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-ci-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-desktop-links a').nth(0)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.gnb-desktop .gnb-desktop-links a').nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('gnb-settings-trigger')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
}

/** 모바일 드로어를 **키보드로** 연다. 도달 경로는 관심사가 아니므로 문서 순서대로 `Tab` 한다. */
async function focusMobileMenuByKeyboard(page: Page) {
  const menuTrigger = page.getByTestId('gnb-mobile-menu-trigger');

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await menuTrigger.evaluate((element) => element === document.activeElement).catch(() => false)) {
      break;
    }
  }

  await expect(menuTrigger).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
}

async function installHoverCapability(page: Page, matches: boolean) {
  await page.addInitScript((hoverMatches) => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => {
      if (query === '(hover: hover) and (pointer: fine)') {
        return {
          media: query,
          matches: hoverMatches,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          addListener: () => {},
          removeListener: () => {}
        } as MediaQueryList;
      }

      return originalMatchMedia(query);
    };
  }, matches);
}

async function expectSourceGnbOverlay(page: Page, destinationContext: 'blog' | 'test' | 'history') {
  const overlay = page.getByTestId('landing-transition-source-gnb');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.gnb-shell')).toHaveAttribute('data-gnb-context', 'landing');
  await expect(page.locator('.page-shell > .gnb-shell')).toHaveAttribute('data-gnb-context', destinationContext);
}

async function tabUntilCardFocused(page: Page, cardVariant: string): Promise<void> {
  for (let attempts = 0; attempts < 50; attempts += 1) {
    await page.keyboard.press('Tab');
    const activeCardVariant = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        return null;
      }

      return activeElement.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-variant') ?? null;
    });

    if (activeCardVariant === cardVariant) {
      return;
    }
  }

  throw new Error(`Failed to focus card via Tab within budget: ${cardVariant}`);
}

test.describe('Canonical accessibility smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
  });

  test('@smoke assertion:B5-axe-canonical landing canonical states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:W11-keyboard LI-01 Test Enter and Space remain idempotent non-entry commands', async ({
    page
  }) => {
    await installHoverCapability(page, false);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    const initialUrl = page.url();

    await trigger.focus();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');

    await expect(trigger).toBeFocused();
    await expect(card).toHaveAttribute('data-card-state', 'expanded');
    await expect(page).toHaveURL(initialUrl);
    await expect(page.getByTestId('landing-transition-source-gnb')).toHaveCount(0);
    await expect(card.locator('[data-slot="answerChoiceA"]:focus')).toHaveCount(0);
    await expect(card.locator('[data-slot="answerChoiceB"]:focus')).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        Object.keys(window.sessionStorage).filter((key) => key.startsWith('vivetest-landing-ingress:'))
      )
    ).toEqual([]);
  });

  test('@smoke assertion:W11-keyboard LI-02 Escape is a no-op for Blog and unavailable cards', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const shell = page.getByTestId('landing-grid-shell');
    const blogCard = page.locator('[data-card-variant="ops-handbook"]');
    const blogTrigger = blogCard.getByTestId('landing-grid-card-trigger');
    await blogTrigger.focus();
    const blogState = await shell.getAttribute('data-interaction-expanded-card-variant');
    await page.keyboard.press('Escape');
    await expect(blogTrigger).toBeFocused();
    await expect(blogCard).not.toHaveAttribute('data-card-state', 'expanded');
    await expect(shell).toHaveAttribute('data-interaction-expanded-card-variant', blogState ?? '');

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const unavailableTrigger = unavailableCard.getByTestId('landing-grid-card-trigger');
    const status = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await unavailableTrigger.focus();
    await page.keyboard.press('Escape');
    await expect(unavailableTrigger).toBeFocused();
    await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
    await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');
    await expect(status).toBeVisible();
  });

  test('@smoke assertion:W11-keyboard LI-03 Test accessible name is byte-stable across disclosure in all 12 locales', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const locale of locales) {
      const catalog = resolveLandingCatalog(locale);
      const testCard = catalog.find((card) => card.variant === PRIMARY_AVAILABLE_TEST_VARIANT);
      const blogCard = catalog.find((card) => card.variant === 'ops-handbook');
      const unavailableCard = catalog.find((card) => card.variant === 'creativity-profile');
      if (!testCard || !blogCard || !unavailableCard) {
        throw new Error(`Missing Wave 11 catalog fixtures for ${locale}`);
      }

      await page.goto(`/${locale}`);
      const testRoot = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const testTrigger = testRoot.getByTestId('landing-grid-card-trigger');
      const stage = testRoot.locator('[data-slot="desktopStage"]');

      await testRoot.evaluate((element) => {
        const trigger = element.querySelector<HTMLElement>('[data-testid="landing-grid-card-trigger"]');
        const stageElement = element.querySelector<HTMLElement>('[data-slot="desktopStage"]');
        if (!trigger || !stageElement) {
          throw new Error('Missing Test trigger or desktop stage');
        }
        const state = window as Window & {
          __w11NameLog?: Array<{
            phase: string;
            label: string | null;
            expanded: string | null;
            stageHidden: string | null;
          }>;
          __w11NameObserver?: MutationObserver;
        };
        const log = () => {
          state.__w11NameLog ??= [];
          state.__w11NameLog.push({
            phase: element.getAttribute('data-desktop-shell-phase') ?? '',
            label: trigger.getAttribute('aria-label'),
            expanded: trigger.getAttribute('aria-expanded'),
            stageHidden: stageElement.getAttribute('aria-hidden')
          });
        };
        log();
        const observer = new MutationObserver(log);
        observer.observe(element, {
          attributes: true,
          subtree: true,
          attributeFilter: ['data-desktop-shell-phase', 'aria-label', 'aria-expanded', 'aria-hidden']
        });
        state.__w11NameObserver = observer;
      });

      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
      await testTrigger.focus();
      await expect(testRoot).toHaveAttribute('data-desktop-shell-phase', 'steady');
      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'true');
      await expect(stage).not.toHaveAttribute('aria-hidden', 'true');
      await page.keyboard.press('Escape');
      await expect(testRoot).toHaveAttribute('data-desktop-shell-phase', 'idle');
      await expect(testTrigger).toHaveAccessibleName(testCard.title);
      await expect(testTrigger).toHaveAttribute('aria-expanded', 'false');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');

      const nameLog = await page.evaluate(() => {
        const state = window as Window & {
          __w11NameLog?: Array<{
            phase: string;
            label: string | null;
            expanded: string | null;
            stageHidden: string | null;
          }>;
          __w11NameObserver?: MutationObserver;
        };
        state.__w11NameObserver?.disconnect();
        return state.__w11NameLog ?? [];
      });
      expect(new Set(nameLog.map((entry) => entry.label))).toEqual(new Set([testCard.title]));
      for (const entry of nameLog) {
        const logicallyExpanded = ['opening', 'steady', 'handoff-target'].includes(entry.phase);
        expect(entry.expanded).toBe(logicallyExpanded ? 'true' : 'false');
        expect(entry.stageHidden).toBe(logicallyExpanded ? null : 'true');
      }

      const blogTrigger = page
        .locator('[data-card-variant="ops-handbook"]')
        .getByTestId('landing-grid-card-trigger');
      await expect(blogTrigger).toHaveAccessibleName(blogCard.title);
      await expect(blogTrigger).not.toHaveAttribute('aria-expanded');
      await expect(blogTrigger).not.toHaveAttribute('aria-controls');

      const unavailableRoot = page.locator('[data-card-variant="creativity-profile"]');
      const unavailableTrigger = unavailableRoot.getByTestId('landing-grid-card-trigger');
      const status = unavailableRoot.locator('[data-slot="comingSoonTag"]');
      await expect(unavailableTrigger).toHaveAccessibleName(unavailableCard.title);
      await expect(unavailableTrigger).toHaveAccessibleDescription((await status.textContent()) ?? '');
      await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
      await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');
      await expect(unavailableRoot).not.toHaveAttribute('aria-disabled');
      await expect(unavailableRoot.locator('[data-slot="tags"]')).not.toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="landing-grid-shell"] [aria-live]')).toHaveCount(0);
    }
  });

  test('@smoke assertion:W11-keyboard LI-03 expanded question and choices are AT-exposed and axe-clean', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
    const trigger = card.getByTestId('landing-grid-card-trigger');
    await expectPageToBeAxeClean(page);
    await trigger.focus();
    await expect(card).toHaveAttribute('data-desktop-shell-phase', 'steady');

    for (const slot of ['previewQuestion', 'answerChoiceA', 'answerChoiceB']) {
      const locator = card.locator(`[data-slot="${slot}"]`);
      await expect(locator).toBeVisible();
      expect(
        await locator.evaluate((element) =>
          Boolean(element.closest('[aria-hidden="true"], [inert]'))
        )
      ).toBe(false);
    }
    await expectPageToBeAxeClean(page);
  });

  test('@smoke unavailable card is removed from the keyboard tab order yet stays AT-perceivable', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});

    // D1/BQ-26: the unavailable card is skipped by Tab in every state. Sweep the grid and confirm
    // focus never lands on the unavailable trigger, while the first enterable card stays reachable.
    const focusedVariants = new Set<string>();
    for (let attempts = 0; attempts < 18; attempts += 1) {
      await page.keyboard.press('Tab');
      const variant = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) {
          return null;
        }
        return active.closest('[data-testid="landing-grid-card"]')?.getAttribute('data-card-variant') ?? null;
      });
      if (variant) {
        focusedVariants.add(variant);
      }
    }

    expect(focusedVariants.has(PRIMARY_AVAILABLE_TEST_VARIANT)).toBe(true);
    expect(focusedVariants.has('creativity-profile')).toBe(false);

    // The trigger stays a semantic <button aria-disabled> removed from the tab order — kept in the
    // a11y/reading tree (not native `disabled`), so AT can still perceive it as "coming soon".
    const unavailableTrigger = page
      .locator('[data-card-variant="creativity-profile"]')
      .getByTestId('landing-grid-card-trigger');
    await expect(unavailableTrigger).toHaveJSProperty('tagName', 'BUTTON');
    await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
    await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');

    // Focus remains valid/readable when reached programmatically (not a keyboard path).
    await unavailableTrigger.focus();
    await expectPageToBeAxeClean(page);
  });

  test('@smoke gnb focus ring shows the real ground in its inner layer and the two-layer tokens are retired', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await focusDesktopSettingsByKeyboard(page);

    /**
     * 설정 패널의 로케일 칩을 고른다. GNB 막대 위에서는 이 결함이 **보이지 않는다** —
     * 실측(2026-09-10): 그 자리의 지면은 `--gnb-surface`(88% canvas)가 canvas 색 페이지 위에
     * 얹혀 `251,250,247` 로 합성되고, 그것이 종전 `--focus-ring-inner`(= `--canvas`)와 같은
     * 값이다. 패널 칩의 지면은 `--canvas-elevated`(`255,255,255`)라 둘이 갈린다. 「안쪽 층은
     * 페이지 지면이 아니라 요소의 지면을 취해야 한다」는 주장은 여기서만 반증 가능하다.
     */
    const localeChip = page.locator('[data-testid="gnb-settings-panel"] .gnb-chip-row .gnb-chip').nth(1);
    await localeChip.focus();
    await expect(localeChip).toBeFocused();

    const ring = await readFocusRingGroundBand(page, localeChip);

    // 링 자체는 실재해야 한다 — L10 의 `outline-none` 함정에 다시 걸리면 두께가 0 이 된다.
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidthPx).toBe(2);
    expect(ring.outlineOffsetPx).toBe(2);

    // 전제 단언: 링을 화면에서 실제로 찾지 못하면 아래 띠 검사는 아무것도 재현하지 못한다.
    expect(ring.outlineFound, `outline colour ${ring.outlineKey} not found in ${ring.row.join(' | ')}`).toBe(true);
    expect(ring.innerBand.length).toBeGreaterThan(0);

    // 이 검사의 본체. 안쪽 띠에 바깥 지면과 같은 픽셀이 있어야 「색이 아니라 틈」이다.
    expect(ring.innerBand, `inner band ${ring.innerBand.join(' | ')}`).toContain(ring.groundOutsideRing);

    // 포커스가 덧그리는 층은 outline 하나뿐이어야 한다 — box-shadow 로 된 두 층 링은 없다.
    expect(ring.boxShadow).toBe('none');

    // 원인 쪽. 토큰이 남아 있으면 다음 호출부가 다시 *페이지* 지면을 요소의 지면으로 읽는다.
    const retiredTokens = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);

      return {
        inner: rootStyle.getPropertyValue('--focus-ring-inner').trim(),
        outer: rootStyle.getPropertyValue('--focus-ring-outer').trim(),
        ring: rootStyle.getPropertyValue('--focus-ring').trim()
      };
    });

    expect(retiredTokens.inner).toBe('');
    expect(retiredTokens.outer).toBe('');
    expect(retiredTokens.ring).not.toBe('');
  });

  test('@smoke assertion:B7-axe-canonical gnb canonical open states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');
    await focusDesktopSettingsByKeyboard(page);
    await expectPageToBeAxeClean(page);

    for (const route of [buildLocalizedBlogIndexRoute('en'), buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT), '/en/history']) {
      await page.setViewportSize({width: 1440, height: 980});
      await page.goto(route);
      await focusDesktopDestinationSettingsByKeyboard(page);
      await expectPageToBeAxeClean(page);
    }

    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await focusMobileMenuByKeyboard(page);
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:B5-axe-canonical mobile expanded and destination shells remain axe-clean', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);

    for (const route of [buildLocalizedBlogIndexRoute('en'), buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT), '/en/history', buildLocalizedPrimaryTestRoute('en')]) {
      await page.goto(route);
      await expectPageToBeAxeClean(page);
    }
  });

  test('@smoke assertion:B5-axe-canonical transition overlay representative state remains axe-clean', async ({page}) => {
    await delayDestinationReadyRaf(page, TRANSITION_OVERLAY_READY_DELAY_MS);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    await blogCard.getByTestId('landing-grid-card-trigger').click();

    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
    await expectSourceGnbOverlay(page, 'blog');
    await expect(page).toHaveTitle(/Build Metrics That Actually Matter/u);
    await expectPageToBeAxeClean(page);
  });

  test('@smoke blog card trigger is a semantic link with native keyboard activation', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const blogCard = page.locator('[data-card-variant="build-metrics"]');
    const trigger = blogCard.getByTestId('landing-grid-card-trigger');

    await expect(trigger).toHaveAttribute('href', buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT));
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/\/en$/u);
    await expect(blogCard).not.toHaveAttribute('data-card-state', 'expanded');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/en/blog/${SECONDARY_BLOG_VARIANT}$`, 'u'));
  });

  test('@smoke hidden tag suffix stays out of the tree while CTA and coming-soon status keep priority', async ({
    page
  }) => {
    await page.setViewportSize({width: 900, height: 980});
    await page.goto('/id');
    await page.getByTestId('landing-grid-container').evaluate((element) => {
      (element as HTMLElement).style.width = '540px';
    });

    const testCard = page.locator('[data-card-variant="rhythm-b"]');
    const publicTags = testCard.locator('[data-slot="tags"]');
    const probe = testCard.locator('[data-slot="tagMeasurementProbe"]');
    await expect
      .poll(async () => Number(await publicTags.getAttribute('data-visible-tag-count')))
      .toBeLessThan(Number(await publicTags.getAttribute('data-tag-count')));
    const visibleCount = Number(await publicTags.getAttribute('data-visible-tag-count'));
    await expect(publicTags.locator('.landing-grid-card-tag-item')).toHaveCount(visibleCount);
    await expect(probe).toHaveAttribute('aria-hidden', 'true');
    await expect(probe).toHaveAttribute('inert', '');
    await expect(probe.locator('[data-inline-probe-tag]')).toHaveCount(3);

    const blogCard = page.locator(`[data-card-variant="${SECONDARY_BLOG_VARIANT}"]`);
    const readMore = blogCard.locator('[data-slot="blogReadMore"]');
    await blogCard.getByTestId('landing-grid-card-trigger').hover();
    await expect(readMore).toHaveCSS('visibility', 'visible');
    await expect(readMore).toHaveAttribute('aria-hidden', 'true');
    await expect(readMore.locator('a, button, [tabindex]')).toHaveCount(0);

    const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
    const comingSoon = unavailableCard.locator('[data-slot="comingSoonTag"]');
    await expect(comingSoon).toHaveCount(1);
    await expect(comingSoon).toHaveText(/.+/u);
    await expect(comingSoon).not.toHaveAttribute('aria-hidden', 'true');
    await expectPageToBeAxeClean(page);
  });

  test('@smoke assertion:W12-mobile Mobile Normal card tree keeps CTA status and probe semantics', async ({
    page
  }) => {
    test.setTimeout(60_000);

    for (const viewportWidth of W12_MOBILE_VIEWPORTS) {
      await setTouchViewport(page, {width: viewportWidth, height: 844});
      await page.goto('/en');

      await expect(page.getByTestId('landing-grid-shell')).toHaveAttribute('data-grid-tier', 'mobile');

      const testCard = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);
      const testTags = testCard.locator('[data-slot="tags"]');
      const probe = testCard.locator('[data-slot="tagMeasurementProbe"]');
      const visibleCount = Number(await testTags.getAttribute('data-visible-tag-count'));
      await expect(testTags.locator('.landing-grid-card-tag-item')).toHaveCount(visibleCount);
      await expect(probe).toHaveAttribute('aria-hidden', 'true');
      await expect(probe).toHaveAttribute('inert', '');
      await expect(probe.locator('[data-inline-probe-tag]')).toHaveCount(3);

      const blogCard = page.locator(`[data-card-variant="${PRIMARY_BLOG_VARIANT}"]`);
      const blogTrigger = blogCard.getByTestId('landing-grid-card-trigger');
      const readMore = blogCard.locator('[data-slot="blogReadMore"]');
      await expect(blogTrigger).toHaveAttribute('href', buildLocalizedBlogDetailRoute('en', PRIMARY_BLOG_VARIANT));
      await expect(blogTrigger).not.toHaveAttribute('aria-expanded');
      await expect(readMore).toBeVisible();
      await expect(readMore).toHaveAttribute('aria-hidden', 'true');
      await expect(readMore.locator('a, button, [tabindex]')).toHaveCount(0);

      const unavailableCard = page.locator('[data-card-variant="creativity-profile"]');
      const unavailableTrigger = unavailableCard.getByTestId('landing-grid-card-trigger');
      const comingSoon = unavailableCard.locator('[data-slot="comingSoonTag"]');
      await expect(unavailableTrigger).toHaveAttribute('aria-disabled', 'true');
      await expect(unavailableTrigger).toHaveAttribute('tabindex', '-1');
      await expect(comingSoon).toHaveCount(1);
      await expect(comingSoon).toHaveText('coming soon');
      await expect(comingSoon).not.toHaveAttribute('aria-hidden', 'true');
      await expect(unavailableTrigger).toHaveAccessibleDescription('coming soon');

      await expectPageToBeAxeClean(page);
    }
  });

  test('@smoke assertion:B5-axe-canonical KR representative landing states remain axe-clean', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/kr');
    await expectPageToBeAxeClean(page);

    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/kr');
    await page.locator('body').click({position: {x: 1, y: 1}});
    await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await page.keyboard.press('Space');
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveAttribute(
      'data-mobile-phase',
      'OPEN'
    );
    await expectPageToBeAxeClean(page);
  });

  // 종전 제목은 「… Esc is the dismiss action」이었고 말미에서 `Esc` 가 랜딩으로 나가며
  // `OPTED_OUT` 을 저장하는 것을 계약으로 고정했다. BQ-41 이 그 계약을 뒤집었다 — `Esc` 는
  // 취소이고 취소는 아무것도 쓰지 않는다(`req-test.md` §3.6). 이 케이스가 계속 재는 것은
  // **모달 의미론과 포커스 트랩**이고, `Esc` 부분만 새 계약으로 바뀐다.
  test('@smoke instruction overlay is a modal dialog — labelled, focus-trapped, and Esc writes nothing', async ({
    page
  }) => {
    // The describe seeds OPTED_IN; this case needs consent UNKNOWN + available variant so the
    // secondary CTA is "Deny and abandon" (redirects home). The later init script wins.
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAccessibleName('Before we start');
    await expect(dialog).toBeFocused();
    await expectPageToBeAxeClean(page);

    // Tab never leaves the dialog: 6 presses over 2 controls must land inside every time.
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab');
      await expect(dialog.locator(':focus')).toHaveCount(1);
    }
    // 6 Tabs over 2 controls ends on the last (accept); Shift+Tab steps back to deny natively,
    // and one more Shift+Tab from the first control must wrap to the last, not leave.
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('test-deny-and-abandon-button')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByTestId('test-accept-all-and-start-button')).toBeFocused();

    // `Esc` 는 이 문을 열지 않는다 — 다이얼로그는 그대로 열려 있고, 주소도 consent 도
    // 움직이지 않는다. 종전에는 이 한 번이 `deny_and_abandon` 이었다.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${PRIMARY_AVAILABLE_TEST_VARIANT}$`, 'u'));
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('vivetest-telemetry-consent')))
      .toBeNull();

    // 그리고 나가는 길은 버튼이 그대로 갖고 있다 — `Esc` 만 무력해진 것이지 경로가 사라진
    // 것이 아니다.
    await page.getByTestId('test-deny-and-abandon-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('vivetest-telemetry-consent')))
      .toBe('OPTED_OUT');
  });

  test('@smoke instruction overlay ignores Esc when Start is the only way forward, and Esc on a qualifier step is Back', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en/test/egtt');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveURL(/\/en\/test\/egtt$/u);

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-qualifier-step')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeFocused();
    await expectPageToBeAxeClean(page);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('test-qualifier-step')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-body')).toBeVisible();
  });

  test('@smoke test flow question and result surfaces are axe-clean and re-entry returns focus to the chip', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en/test/egtt');
    await page.getByTestId('test-start-button').click();
    await page.getByTestId('test-qualifier-choice-m').click();
    await page.getByTestId('test-qualifier-continue-button').click();
    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expectPageToBeAxeClean(page);

    const chip = page.getByTestId('test-qualifier-chip');
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('test-qualifier-reentry-cancel-button')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(chip).toBeFocused();

    for (let index = 0; index < 14; index += 1) {
      const submit = page.getByTestId('test-submit-button');
      if ((await submit.count()) > 0 && (await submit.isEnabled({timeout: 0}))) {
        await submit.click();
        break;
      }
      const number = page.getByTestId('test-question-number');
      const previous = await number.textContent();
      await page.getByTestId(index % 2 === 0 ? 'test-choice-a' : 'test-choice-b').click();
      await page
        .waitForFunction(
          (prev) => {
            const current = document.querySelector('[data-testid="test-question-number"]')?.textContent;
            const submitButton = document.querySelector('[data-testid="test-submit-button"]');
            return current !== prev || (submitButton instanceof HTMLButtonElement && !submitButton.disabled);
          },
          previous ?? '',
          {timeout: 2000}
        )
        .catch(() => {});
    }
    await expect(page.getByTestId('test-result-panel')).toBeVisible();
    await expectPageToBeAxeClean(page);
  });
  test('@smoke assertion:TT-01 every visible touch target meets --tap-min and WCAG 2.5.8 spacing', async ({
    page
  }) => {
    test.setTimeout(90_000);

    // `expectPageToBeAxeClean` 은 이 결함을 잡은 적이 없다 — axe 기본 규칙 집합에
    // `target-size` 가 들어 있지 않기 때문이다. 그래서 이 케이스가 따로 있다.
    const surfaces: ReadonlyArray<readonly [string, string]> = [
      ['landing', '/en'],
      ['blog index', buildLocalizedBlogIndexRoute('en')],
      ['blog detail', buildLocalizedBlogDetailRoute('en', PRIMARY_BLOG_VARIANT)],
      ['history', '/en/history'],
      ['test entry', buildLocalizedPrimaryTestRoute('en')],
      ['test error', '/en/test/error'],
      ['segment 404', '/en/no-such-landing-route']
    ];

    await seedTelemetryConsent(page, 'OPTED_IN');

    for (const [surfaceLabel, route] of surfaces) {
      await setTouchViewport(page, {width: 390, height: 844});
      await page.goto(route);
      await expectSurfaceToMeetTouchTargetMinimum(page, surfaceLabel);
    }

    // GNB 드로어가 열린 상태는 타깃이 가장 많이 모이는 표면이라 따로 잰다.
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
    await expectSurfaceToMeetTouchTargetMinimum(page, 'landing + drawer open');

    // 동의 배너는 `UNKNOWN` 에서만 뜨므로 마지막에 따로 세운다.
    await clearTelemetryConsent(page);
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();
    await expectSurfaceToMeetTouchTargetMinimum(page, 'landing + consent banner');
  });
  test('@smoke assertion:KB-01 keyboard reach and Escape close hold on every surface regardless of input', async ({
    page
  }) => {
    test.setTimeout(90_000);

    // §7.6-a 의 동작 부분은 폭에도 입력 방식에도 속하지 않는 **셋째 축**이다. 외장 키보드를
    // 붙인 터치 기기는 hover 가 없어도 키보드가 있고, 거기서 확장한 카드를 Escape 로 닫을 수
    // 있어야 한다(WCAG 2.1.1/2.1.2). 축을 옮기기 **전에** 이 규칙을 전 표면으로 승격시킨다 —
    // 승격 없이 생명주기만 입력 축으로 옮기면 그 기기가 닫을 길을 잃는다.
    const surfaces = [
      {label: 'touch phone', size: {width: 390, height: 844}, touch: true},
      {label: 'touch tablet', size: {width: 900, height: 1200}, touch: true},
      {label: 'hover desktop', size: {width: 1440, height: 980}, touch: false}
    ] as const;

    for (const surface of surfaces) {
      if (surface.touch) {
        await setTouchViewport(page, surface.size);
      } else {
        await setHoverCapableViewport(page, surface.size);
      }
      await page.goto('/en');
      await page.locator('body').click({position: {x: 1, y: 1}});

      const card = page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`);

      // ⑴ 키보드로 도달할 수 있다.
      await tabUntilCardFocused(page, PRIMARY_AVAILABLE_TEST_VARIANT);

      // ⑵ 키보드로 확장할 수 있다.
      await page.keyboard.press('Space');
      await expect(card, `${surface.label}: 키보드로 확장되지 않았다`).toHaveAttribute(
        'data-card-state',
        'expanded'
      );

      // ⑶ Escape 로 닫을 수 있다 — 이 줄이 승격의 핵심이다.
      await page.keyboard.press('Escape');
      await expect(card, `${surface.label}: Escape 로 닫히지 않았다`).not.toHaveAttribute(
        'data-card-state',
        'expanded'
      );
    }
  });
  test('@smoke assertion:SK-01 skip link is the first tab stop, moves focus to main, and leaves no layout', async ({
    page
  }) => {
    for (const size of [
      {width: 1280, height: 900},
      {width: 390, height: 844}
    ]) {
      await setTouchViewport(page, size);
      await page.goto('/en');

      const skipLink = page.getByTestId('skip-to-content');

      // ⑴ 포커스 전에는 레이아웃을 차지하지 않는다 — 1×1 sr-only 상자다.
      const hiddenBox = await skipLink.boundingBox();
      expect(hiddenBox?.width ?? 0, `${size.width}px: 숨은 상태에서 폭을 차지한다`).toBeLessThanOrEqual(1);

      // ⑵ 문서 순서상 첫 탭 스톱이다. **클릭하지 않는다** — 클릭은 탭 시작점을 옮긴다.
      await page.keyboard.press('Tab');
      await expect(skipLink, `${size.width}px: 첫 탭 스톱이 아니다`).toBeFocused();

      // ⑶ 포커스를 받으면 보인다.
      await expect(skipLink).toBeVisible();
      const shownBox = await skipLink.boundingBox();
      expect(shownBox?.height ?? 0, `${size.width}px: 포커스 후에도 보이지 않는다`).toBeGreaterThan(20);

      // ⑷ 목적지는 `<main>` 이고 도착하면 포커스가 거기 있다.
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).toBeFocused();

      // ⑸ 도착이 **제품 링**으로 보인다. 종전에는 브라우저 기본값(`auto 1px rgb(0, 95, 204)`)이
      // 그려졌고, 그 파란색은 두 테마 어디에도 없다. 링이 그려지는 경로는 이것 하나뿐이므로
      // — 마우스 클릭은 `main` 에 포커스를 주지 않는다(실측 2026-09-16) — 여기가 유일한 증인이다.
      //
      // 색은 리터럴로 적지 않고 `--focus-ring` 을 **해석해서** 대조한다. 토큰은 테마마다 값이
      // 다르고(`getPropertyValue` 는 `var(--sage-500)` 같은 미해석 값을 돌려준다), 리터럴을
      // 적으면 테마 컷이 토큰을 옮길 때 이 단언만 뒤처진다.
      const ring = await page.evaluate(() => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--focus-ring)';
        document.body.append(probe);
        const resolvedToken = getComputedStyle(probe).color;
        probe.remove();

        const main = document.querySelector('main')!;
        const mainStyle = getComputedStyle(main);
        return {
          resolvedToken,
          outlineColor: mainStyle.outlineColor,
          outlineStyle: mainStyle.outlineStyle,
          outlineWidth: mainStyle.outlineWidth,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });

      expect(ring.outlineStyle, `${size.width}px: 목적지 링이 제품 링이 아니다`).toBe('solid');
      expect(ring.outlineWidth, `${size.width}px: 링 두께가 제품 값이 아니다`).toBe('2px');
      expect(ring.outlineColor, `${size.width}px: 링 색이 --focus-ring 이 아니다`).toBe(ring.resolvedToken);
      // outline 은 레이아웃을 밀지 않지만 offset 이 양수면 그릴 영역이 넓어진다. 1280 에서
      // `main` 이 뷰포트 폭과 같으므로(실측 x=0 w=1280) 여기서 가로 스크롤이 생기지 않는 것을
      // 함께 고정한다.
      expect(ring.documentOverflow, `${size.width}px: 목적지 링이 가로 오버플로를 만든다`).toBe(0);
    }
  });
});
