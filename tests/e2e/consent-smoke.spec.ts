import {expect, test, type Page} from '@playwright/test';

import {
  clearTelemetryConsent,
  seedTelemetryConsent,
  TELEMETRY_CONSENT_STORAGE_KEY
} from './helpers/consent';
import {expectPageToBeAxeClean} from './helpers/axe';
import {
  buildLocalizedTestRoute,
  buildLocalizedPrimaryOptOutTestRoute,
  buildLocalizedPrimaryTestRoute,
  PRIMARY_AVAILABLE_TEST_VARIANT,
  PRIMARY_OPT_OUT_TEST_VARIANT,
  TEST_VARIANT_INSTRUCTION_FIXTURES_EN
} from './helpers/landing-fixture';
import {testVariantKey} from '../../src/features/test/storage/test-storage-keys';

const UNKNOWN_AVAILABLE_NOTE =
  'For a better experience, please agree to the terms to proceed with the test.';
const UNKNOWN_OPT_OUT_NOTE =
  'For a better experience, please agree to the terms before proceeding with the test. You can still continue without agreeing.';
const OPTED_OUT_AVAILABLE_WARNING =
  "This test is only available to users who have agreed. We're sorry, but if you keep your current preference, you will not be able to take this test.";
const EGTT_AVAILABLE_TEST_VARIANT = 'egtt';
const EGTT_QUALIFIER_QUESTION = 'My sexual identity is';
const EGTT_FIRST_SCORING_QUESTION = /interested in making me charming/u;

type StorageVariantId = Parameters<typeof testVariantKey.responseSet>[0];

function asStorageVariantId(variant: string): StorageVariantId {
  return variant as StorageVariantId;
}

function activeRunStorageKey(variant: string) {
  return testVariantKey.activeRun(asStorageVariantId(variant));
}

function responseSetStorageKey(variant: string) {
  return testVariantKey.responseSet(asStorageVariantId(variant));
}

function getInstructionFixture(variant: string) {
  const fixture = TEST_VARIANT_INSTRUCTION_FIXTURES_EN.find((candidate) => candidate.variant === variant);
  if (!fixture) {
    throw new Error(`Missing test instruction fixture for variant: ${variant}`);
  }

  return fixture;
}

const AVAILABLE_INSTRUCTION_EN = getInstructionFixture(PRIMARY_AVAILABLE_TEST_VARIANT).instruction;
const OPT_OUT_INSTRUCTION_EN = getInstructionFixture(PRIMARY_OPT_OUT_TEST_VARIANT).instruction;

async function readConsent(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), TELEMETRY_CONSENT_STORAGE_KEY);
}

async function readInstructionSeen(page: Page, variant: string) {
  return page.evaluate((key) => window.sessionStorage.getItem(key), `vivetest-test-instruction-seen:${variant}`);
}

async function readResponseSet(page: Page, variant: string) {
  return page.evaluate((key) => window.localStorage.getItem(key), responseSetStorageKey(variant));
}

async function beginLandingTestIngress(page: Page, cardVariant: string) {
  const card = page.locator(`[data-card-variant="${cardVariant}"]`);
  await card.getByTestId('landing-grid-card-trigger').click();
  await card.locator('[data-slot="answerChoiceA"]').click();
  await expect
    .poll(() => page.evaluate((key) => window.sessionStorage.getItem(key), `vivetest-landing-ingress:${cardVariant}`))
    .not.toBeNull();
}

async function expectNoLegacyInstructionUi(page: Page) {
  await expect(page.getByTestId('test-local-consent-banner')).toHaveCount(0);
  await expect(page.getByTestId('test-instruction-dialog')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-close-button')).toHaveCount(0);
  await expect(page.getByTestId('test-dialog-confirm-button')).toHaveCount(0);
}

async function answerCurrentQuestion(page: Page, choice: 'A' | 'B') {
  const questionNumber = page.getByTestId('test-question-number');
  const previousQuestionNumber = await questionNumber.textContent();

  await page.getByTestId(choice === 'A' ? 'test-choice-a' : 'test-choice-b').click();

  await expect(questionNumber).not.toHaveText(previousQuestionNumber ?? '', {timeout: 800});
}

async function acceptNextBeforeUnload(page: Page) {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    await dialog.accept();
  });
}

async function readConsentBannerLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>('[data-testid="telemetry-consent-banner"]');
    const message = document.querySelector<HTMLElement>('.telemetry-consent-banner-message');
    const actions = document.querySelector<HTMLElement>('.telemetry-consent-banner-actions');

    if (!banner || !message || !actions) {
      throw new Error('Expected telemetry consent banner landmarks to be present.');
    }

    const bannerStyle = getComputedStyle(banner);
    const messageStyle = getComputedStyle(message);
    const actionsStyle = getComputedStyle(actions);
    const bannerRect = banner.getBoundingClientRect();

    return {
      banner: {
        display: bannerStyle.display,
        maxWidth: bannerStyle.maxWidth,
        flexWrap: bannerStyle.flexWrap,
        width: bannerRect.width
      },
      message: {
        flexBasis: messageStyle.flexBasis
      },
      actions: {
        display: actionsStyle.display,
        justifyContent: actionsStyle.justifyContent
      }
    };
  });
}

const BANNER_OCCLUSION_VIEWPORT = {width: 1280, height: 720} as const;
const BANNER_OCCLUSION_CARD_VARIANT = 'egtt';

/**
 * 확장 카드가 실제로 그리는 상자는 카드 루트가 아니라 expanded shell frame 이다 — 실측
 * (2026-09-10, chromium 1280×720): 루트가 `[468, 720]` 일 때 프레임은 `[468, 749]` 로 29px
 * 더 내려온다. 루트로 재면 그 29px 이 검사에서 사라지므로 프레임을 집는다.
 */
async function readBannerOverlap(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector('[data-testid="telemetry-consent-banner"]');
    if (!banner) {
      throw new Error('Expected the consent banner to be mounted.');
    }

    const bannerRect = banner.getBoundingClientRect();
    const bannerStyle = getComputedStyle(banner);
    const avoidRects = Array.from(document.querySelectorAll('[data-consent-banner-avoid]')).map((element) =>
      element.getBoundingClientRect()
    );

    const overlaps = avoidRects.map((rect) =>
      Math.round(Math.max(0, Math.min(rect.bottom, bannerRect.bottom) - Math.max(rect.top, bannerRect.top)))
    );

    return {
      avoidCount: avoidRects.length,
      bannerVisibility: bannerStyle.visibility,
      bannerOpacity: bannerStyle.opacity,
      bannerRect: [Math.round(bannerRect.top), Math.round(bannerRect.bottom)] as const,
      maxVerticalOverlap: overlaps.length === 0 ? 0 : Math.max(...overlaps),
      // 배너가 숨어 있으면 겹쳐도 가리지 않는다. 「가림」은 겹침과 가시성의 곱이다.
      occlusionPx:
        bannerStyle.visibility === 'hidden' || bannerStyle.opacity === '0'
          ? 0
          : overlaps.length === 0
            ? 0
            : Math.max(...overlaps)
    };
  });
}

/**
 * spacer 가 예약해야 하는 것은 「배너 높이」가 아니라 「배너 높이 + 배너가 바닥에서 띄운
 * 만큼」이다. 고정 레이어의 하단 오프셋은 `max(16px, env(safe-area-inset-bottom))` 이라
 * 상수로 적을 수 없으므로 뷰포트와 레이어 사각형의 차로 실측한다.
 */
async function readConsentBannerSpacerMetrics(page: Page) {
  return page.evaluate(() => {
    const spacer = document.querySelector('.telemetry-consent-banner-spacer');
    const layer = document.querySelector('.telemetry-consent-banner-layer');
    const banner = document.querySelector('[data-testid="telemetry-consent-banner"]');
    if (!spacer || !layer || !banner) {
      throw new Error('Expected the consent banner spacer, layer and section to be mounted.');
    }

    const bannerHeight = Math.ceil(banner.getBoundingClientRect().height);
    const bottomGapPx = Math.max(0, Math.round(window.innerHeight - layer.getBoundingClientRect().bottom));
    const spacerHeight = Math.round(spacer.getBoundingClientRect().height);

    return {
      bannerHeight,
      bottomGapPx,
      spacerHeight,
      requiredHeight: bannerHeight + bottomGapPx,
      overReservedPx: spacerHeight - (bannerHeight + bottomGapPx)
    };
  });
}

async function expandCardAtDocumentBottom(page: Page, cardBottomViewportY: number) {
  const card = page.locator(`[data-card-variant="${BANNER_OCCLUSION_CARD_VARIANT}"]`);
  const restingBox = await card.boundingBox();
  if (!restingBox) {
    throw new Error('Expected a resting bounding box for the banner-occlusion card.');
  }

  await page.evaluate((delta) => window.scrollBy(0, delta), restingBox.y + restingBox.height - cardBottomViewportY);
  await page.waitForTimeout(200);

  const trigger = card.getByTestId('landing-grid-card-trigger').first();
  const triggerBox = await trigger.boundingBox();
  if (!triggerBox) {
    throw new Error('Expected a bounding box for the banner-occlusion card trigger.');
  }

  // 포인터를 카드 밖에서 안으로 들여야 `mouseenter` 가 실린다. (0,0) 에서 곧장 목표로
  // 뛰면 chromium 이 진입 이벤트를 만들지 않아 확장이 시작되지 않는다(실측).
  await page.mouse.move(6, 6);
  await page.mouse.move(triggerBox.x + triggerBox.width / 2, triggerBox.y + triggerBox.height / 2, {steps: 5});
  await expect(card).toHaveAttribute('data-card-state', 'expanded');
  await page.waitForTimeout(420);

  return card;
}

const CONSENT_LOCALES = ['en', 'kr', 'ja', 'zs', 'zt', 'es', 'fr', 'pt', 'de', 'hi', 'id', 'ru'] as const;

/**
 * 배너 본문의 **줄 수**를 센다. 높이를 줄 높이로 나누지 않고 `Range.getClientRects()` 로 실제
 * 줄 상자를 세는 이유는, 나눗셈이 폰트 폴백이나 줄 높이 변경을 조용히 흡수하기 때문이다.
 *
 * 액션 행의 접힘은 「버튼 둘이 세로로 겹치는가」로 본다. `top` 비교는 쓰지 않는다 — CTA 는
 * 46px, 평문은 44px 이라 같은 줄에서도 `items-center` 때문에 `top` 이 1px 다르다.
 */
async function readConsentBannerBodyMetrics(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>('[data-testid="telemetry-consent-banner"]');
    const message = banner?.querySelector<HTMLElement>('.telemetry-consent-banner-message');
    const actions = banner?.querySelector<HTMLElement>('.telemetry-consent-banner-actions');
    if (!banner || !message || !actions) {
      throw new Error('Expected telemetry consent banner landmarks to be present.');
    }

    const range = document.createRange();
    range.selectNodeContents(message);
    const rects = Array.from(actions.querySelectorAll('button')).map((button) =>
      button.getBoundingClientRect()
    );

    return {
      lines: range.getClientRects().length,
      buttonCount: rects.length,
      actionRowWraps:
        rects.length >= 2 &&
        !rects.every((rect) => rect.top < rects[0].bottom - 2 && rect.bottom > rects[0].top + 2),
      headingCount: banner.querySelectorAll('h1, h2, h3, h4, h5, h6').length
    };
  });
}

async function readVisibleLandingCardCount(page: Page) {
  return page.locator('[data-card-variant]').count();
}

test.describe('Instruction consent contract smoke', () => {
  test('@smoke landing unknown consent keeps the desktop consent banner flex and max-width contract', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1600, height: 1000});
    await page.goto('/en');

    await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();
    await expectPageToBeAxeClean(page);

    const metrics = await readConsentBannerLayoutMetrics(page);

    expect(metrics.banner.display).toBe('flex');
    expect(metrics.banner.maxWidth).toBe('1280px');
    expect(metrics.banner.flexWrap).toBe('nowrap');
    expect(metrics.banner.width).toBeCloseTo(1280, 0);
    expect(metrics.message.flexBasis).toBe('520px');
    expect(metrics.actions.display).toBe('flex');
    expect(metrics.actions.justifyContent).toBe('flex-end');
  });

  test('@smoke landing UNKNOWN consent banner never covers an expanded card and stays visible when it does not', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize(BANNER_OCCLUSION_VIEWPORT);
    await page.goto('/en');

    await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();

    // ⑴ 카드 바닥을 뷰포트 바닥에 붙이면 확장 프레임이 배너 띠를 관통한다 — 수정 전 80px.
    await expandCardAtDocumentBottom(page, BANNER_OCCLUSION_VIEWPORT.height);

    const intersecting = await readBannerOverlap(page);

    // 전제 단언: 이 배치가 실제로 겹침을 만들어야 검사가 무언가를 재현한다.
    expect(intersecting.avoidCount).toBeGreaterThan(0);
    expect(intersecting.maxVerticalOverlap).toBeGreaterThan(0);
    expect(intersecting.occlusionPx).toBe(0);

    // ⑵ 같은 카드를 화면 중앙에서 열면 배너와 만나지 않으므로 동의 UI 는 그대로 있어야 한다.
    await page.mouse.move(6, 6);
    await page.waitForTimeout(420);
    await expandCardAtDocumentBottom(page, Math.round(BANNER_OCCLUSION_VIEWPORT.height / 2));

    const clear = await readBannerOverlap(page);

    expect(clear.avoidCount).toBeGreaterThan(0);
    expect(clear.maxVerticalOverlap).toBe(0);
    expect(clear.bannerVisibility).toBe('visible');
    expect(clear.bannerOpacity).toBe('1');
  });

  test('@smoke landing UNKNOWN consent banner spacer reserves exactly the banner height plus its bottom gap', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize(BANNER_OCCLUSION_VIEWPORT);
    await page.goto('/en');

    await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();

    const desktop = await readConsentBannerSpacerMetrics(page);

    // 전제 단언: 하한(120px)이 실측 높이보다 커야 과다 예약이 재현된다 — 수정 전 80+16 에
    // 대해 120 을 잡아 24px 과다였다.
    expect(desktop.bannerHeight).toBeGreaterThan(0);
    expect(desktop.requiredHeight).toBeLessThan(120);
    expect(desktop.overReservedPx).toBe(0);

    // 배너가 줄바꿈해 높아지는 폭에서도 spacer 가 따라와야 한다 — 하한이 아니라 실측이
    // 정본이라는 뜻이다.
    await page.setViewportSize({width: 480, height: 800});
    await page.waitForTimeout(200);

    const narrow = await readConsentBannerSpacerMetrics(page);

    expect(narrow.bannerHeight).toBeGreaterThan(desktop.bannerHeight);
    expect(narrow.overReservedPx).toBe(0);
  });

  test('@smoke consent banner keeps its line budget and two-button row across twelve locales', async ({page}) => {
    // 명세 규칙 4 · §2-1 — 본문은 390px 에서 2 줄, 320px 에서 3 줄을 넘지 않는다. 종전 세 버튼
    // 배너는 locale 에 따라 169~288px 였고 액션 행이 여섯 locale 에서 접혔다.
    await clearTelemetryConsent(page);

    for (const {width, lineBudget} of [
      {width: 390, lineBudget: 2},
      {width: 320, lineBudget: 3}
    ]) {
      await page.setViewportSize({width, height: 812});

      for (const locale of CONSENT_LOCALES) {
        await page.goto(`/${locale}`);
        await expect(page.getByTestId('telemetry-consent-banner')).toBeVisible();

        const metrics = await readConsentBannerBodyMetrics(page);
        const label = `${locale}@${width}`;

        expect(metrics.lines, `${label} 본문 줄 수`).toBeLessThanOrEqual(lineBudget);
        expect(metrics.buttonCount, `${label} 버튼 개수`).toBe(2);
        expect(metrics.actionRowWraps, `${label} 액션 행 접힘`).toBe(false);
        // 규칙 4 — 제목 줄을 넣지 않는다.
        expect(metrics.headingCount, `${label} 제목 줄`).toBe(0);
        await expect(page.getByTestId('telemetry-consent-preferences')).toHaveCount(0);
        // 첫 방문 배너에는 닫기가 없다 — 거기서는 선택이 곧 닫기다.
        await expect(page.getByTestId('telemetry-consent-close')).toHaveCount(0);
      }
    }
  });

  test('@smoke the desktop footer link recalls the same banner with the previous choice and a close', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    await expect(page.getByTestId('telemetry-consent-banner')).toHaveCount(0);

    const footerLink = page.getByTestId('page-footer-consent-recall');
    await expect(footerLink).toBeVisible();
    await footerLink.click();

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-mode', 'recall');
    // 재호출 배너에만 닫기 X 가 있고, 그것이 「보기만 하고 닫을」 유일한 길이다(명세 §2-5).
    await expect(page.getByTestId('telemetry-consent-close')).toBeVisible();
    await expect(page.getByTestId('telemetry-consent-deny')).toContainText('Your previous choice');
    // 포커스는 링크가 아니라 배너로 간다 — 부른 UI 를 만나지 못하면 재호출이 아니다.
    await expect(banner).toBeFocused();
    await expectPageToBeAxeClean(page);

    await page.getByTestId('telemetry-consent-close').click();
    await expect(banner).toHaveCount(0);
    expect(await readConsent(page)).toBe('OPTED_OUT');
  });

  test('@smoke OPTED_OUT landing explains the shrunken catalog and links back in the same place', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 390, height: 812});
    await page.goto('/en');
    const unknownCardCount = await readVisibleLandingCardCount(page);

    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.goto('/en');
    const optedOutCardCount = await readVisibleLandingCardCount(page);
    expect(optedOutCardCount).toBeLessThan(unknownCardCount);

    const notice = page.getByTestId('landing-consent-notice');
    await expect(notice).toBeVisible();
    // 숨은 개수는 실제 필터 결과의 차다 — 상수가 아니다.
    await expect(notice).toContainText(String(unknownCardCount - optedOutCardCount));

    // 고지 행은 그리드 **위**에 있다. 숨긴 이유와 해제 경로가 같은 자리에 있어야 한다.
    //
    // `boundingBox()` 가 돌려주는 것은 `{x, y, width, height}` 뿐이라 `.bottom` 은 존재하지
    // 않는다 — 처음 판본이 그것을 읽고 `?? 0` 으로 흘려서 「0 <= firstCardTop」이라는 항상
    // 참인 문장이 됐고, 고지 행을 그리드 **뒤**로 옮기는 고장 주입을 그대로 통과했다(L16).
    const noticeBox = await notice.boundingBox();
    const firstCardBox = await page.locator('[data-card-variant]').first().boundingBox();
    expect(noticeBox, '고지 행 상자').not.toBeNull();
    expect(firstCardBox, '첫 카드 상자').not.toBeNull();
    expect(noticeBox!.y + noticeBox!.height).toBeLessThanOrEqual(firstCardBox!.y);

    await page.getByTestId('landing-consent-notice-action').click();
    await expect(page.getByTestId('telemetry-consent-banner')).toHaveAttribute('data-mode', 'recall');
  });

  test('@smoke OPTED_IN landing carries no notice row', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize({width: 390, height: 812});
    await page.goto('/en');

    await expect(page.getByTestId('landing-consent-notice')).toHaveCount(0);
  });

  test('@smoke the qualifier sheet opens above the first-visit banner and the banner stays', async ({page}) => {
    // 명세 §2-2 — 배너는 스크림 아래에 **그대로 남는다**. 사라졌다 돌아오지 않는다.
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 390, height: 812});
    await page.goto('/en');

    const banner = page.getByTestId('telemetry-consent-banner');
    await expect(banner).toBeVisible();

    await page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`).getByTestId('landing-grid-card-trigger').click();
    await expect(page.getByTestId('landing-card-sheet')).toBeVisible();

    const layering = await page.evaluate(() => {
      const bannerElement = document.querySelector<HTMLElement>('[data-testid="telemetry-consent-banner"]');
      const bannerLayer = document.querySelector<HTMLElement>('.telemetry-consent-banner-layer');
      const sheetScrim = document.querySelector<HTMLElement>('[data-testid="landing-card-sheet-scrim"]');
      if (!bannerElement || !bannerLayer || !sheetScrim) {
        throw new Error('Expected the consent banner and the open sheet to share the document.');
      }

      const bannerStyle = getComputedStyle(bannerElement);
      const readLayerZIndex = (element: HTMLElement) => {
        for (let node: HTMLElement | null = element; node; node = node.parentElement) {
          const zIndex = Number.parseInt(getComputedStyle(node).zIndex, 10);
          if (Number.isFinite(zIndex)) {
            return zIndex;
          }
        }

        return 0;
      };

      return {
        bannerVisibility: bannerStyle.visibility,
        bannerOpacity: bannerStyle.opacity,
        bannerOccluding: bannerElement.dataset.occluding,
        // 스크림 아래 층은 `inert` 다(규칙 1) — 배너의 버튼은 이 동안 눌리지 않는다.
        bannerInert: bannerElement.closest('[inert]') !== null,
        bannerZIndex: readLayerZIndex(bannerLayer),
        sheetZIndex: readLayerZIndex(sheetScrim)
      };
    });

    // 회피 rAF 루프의 전제가 바뀌었다: 폰의 확장은 더 이상 흐름 안 상자가 아니라 배너 **위**
    // 층의 시트이므로 「덮지 말라」 표식을 달지 않고, 배너는 비켜서지 않는다.
    expect(layering.bannerVisibility).toBe('visible');
    expect(layering.bannerOpacity).toBe('1');
    expect(layering.bannerOccluding).toBe('false');
    expect(layering.bannerInert).toBe(true);
    // 시트는 배너 **위** 층이다 — 두 UI 는 컨테이너를 공유하지 않는다.
    expect(layering.sheetZIndex).toBeGreaterThan(layering.bannerZIndex);
  });

  test('@smoke assertion:B20-instruction-contract-display landing UNKNOWN available shows variant instruction with divider/note and Deny and Abandon returns home without instructionSeen', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_AVAILABLE_NOTE);
    await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveText('Accept all and start');
    await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveText('Deny and abandon');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-abandon-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-card-variant="${PRIMARY_OPT_OUT_TEST_VARIANT}"]`)).toHaveCount(1);
  });

  test('@smoke assertion:B22-secondary-cta-contract landing UNKNOWN opt_out shows variant instruction with divider/note and Deny and Start continues from Q2', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_OPT_OUT_TEST_VARIANT);
    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_OPT_OUT_NOTE);
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveText('Deny and start');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('25%');
  });

  test('@smoke assertion:B21-accept-all-and-start-contract deep-link UNKNOWN available uses note-based CTA contract and Accept All and Start begins at Q1', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_AVAILABLE_NOTE);
    await expect(page.getByTestId('test-accept-all-and-start-button')).toBeVisible();
    await expect(page.getByTestId('test-deny-and-abandon-button')).toBeVisible();
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-accept-all-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_IN');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  test('@smoke deep-link UNKNOWN available Deny and Abandon returns home without leaving legacy UI behind', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('test-deny-and-abandon-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect(page.locator(`[data-card-variant="${PRIMARY_AVAILABLE_TEST_VARIANT}"]`)).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);
  });

  test('@smoke deep-link UNKNOWN opt_out uses variant instruction and Deny and Start begins at Q1', async ({page}) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryOptOutTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_OPT_OUT_NOTE);
    await expect(page.getByTestId('test-deny-and-start-button')).toBeVisible();
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  test('@smoke assertion:ESC-01 Escape writes nothing on the instruction step in every consent shape', async ({
    page
  }) => {
    // 종전 계약은 `Esc` 를 그 단계 secondary CTA 의 별칭으로 정의했고, 그래서 취소 키가
    // consent 를 영구 저장하는 유일한 경로였다(`UNKNOWN + available` 은 `deny_and_abandon`,
    // `UNKNOWN + opt_out` 은 `deny_and_start`). 개정 후 instruction step 의 `Esc` 는
    // no-op 이다(`req-test.md` §3.6). **이 동작을 보는 E2E 가 0 건이었다.**
    const surfaces = [
      {
        label: 'UNKNOWN + available (종전 deny_and_abandon)',
        route: buildLocalizedPrimaryTestRoute('en'),
        variant: PRIMARY_AVAILABLE_TEST_VARIANT
      },
      {
        label: 'UNKNOWN + opt_out (종전 deny_and_start)',
        route: buildLocalizedPrimaryOptOutTestRoute('en'),
        variant: PRIMARY_OPT_OUT_TEST_VARIANT
      }
    ] as const;

    await page.setViewportSize({width: 1280, height: 900});

    for (const surface of surfaces) {
      await clearTelemetryConsent(page);
      await page.goto(surface.route);
      await expect(page.getByTestId('test-instruction-overlay'), surface.label).toBeVisible();

      await page.keyboard.press('Escape');
      // 다음 단언 앞에 상태가 자리잡을 틈을 준다 — 종전 동작은 저장과 이동이 즉시였다.
      await page.waitForTimeout(300);

      // ⑴ consent 를 쓰지 않는다. ⑵ `instructionSeen` 을 기록하지 않는다.
      // ⑶ commit 하지 않는다(창이 그대로 열려 있다). ⑷ redirect 하지 않는다.
      expect(await readConsent(page), `${surface.label}: Esc 가 consent 를 썼다`).toBeNull();
      expect(
        await readInstructionSeen(page, surface.variant),
        `${surface.label}: Esc 가 instructionSeen 을 기록했다`
      ).toBeNull();
      await expect(page.getByTestId('test-instruction-overlay'), surface.label).toBeVisible();
      await expect(page, surface.label).toHaveURL(new RegExp(`${surface.variant}$`, 'u'));
    }

    // 금지는 `Esc` 에만 걸린다 — 같은 화면의 버튼은 그대로 효력을 갖는다. 이 대조군이 없으면
    // 위 단언은 「secondary CTA 가 죽었다」와 구별되지 않는다.
    await page.getByTestId('test-deny-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
  });

  test('@smoke assertion:B23-opted-out-available-warning-contract direct available OPTED_OUT replaces the old redirect contract with warning copy and Keep Current Preference', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(AVAILABLE_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(OPTED_OUT_AVAILABLE_WARNING);
    await expect(page.getByTestId('test-keep-current-preference-button')).toHaveText('Keep current preference');
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-keep-current-preference-button').click();
    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBeNull();
  });

  test('@smoke direct available OPTED_OUT can still accept all and start from Q1', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('test-accept-all-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_IN');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
    await expectNoLegacyInstructionUi(page);
  });

  test('@smoke direct active-run reload resumes at the next unanswered question', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));

    await page.getByTestId('test-start-button').click();
    await expect(page.getByTestId('test-shell-card')).toHaveAttribute('data-entry-status', 'started');
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');

    await answerCurrentQuestion(page, 'A');
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');
    await expect(page.getByTestId('test-progress')).toHaveText('13%');

    await acceptNextBeforeUnload(page);
    await page.reload();

    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-shell-card')).toHaveAttribute('data-entry-status', 'started');
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
  });

  test('@smoke landing ingress ignores an older active-run response set for the same variant', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.addInitScript(({variant, activeRunKey, responseSetKey}) => {
      const now = Date.now();
      window.localStorage.setItem(
        activeRunKey,
        JSON.stringify({variantId: variant, startedAtMs: now - 1000, lastAnsweredAtMs: now - 1000})
      );
      window.localStorage.setItem(
        responseSetKey,
        JSON.stringify({'1': 'B', '2': 'B', '3': 'B'})
      );
    }, {
      variant: PRIMARY_AVAILABLE_TEST_VARIANT,
      activeRunKey: activeRunStorageKey(PRIMARY_AVAILABLE_TEST_VARIANT),
      responseSetKey: responseSetStorageKey(PRIMARY_AVAILABLE_TEST_VARIANT)
    });
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    await beginLandingTestIngress(page, PRIMARY_AVAILABLE_TEST_VARIANT);
    await page.getByTestId('test-start-button').click();

    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-shell-card')).toHaveAttribute('data-entry-status', 'started');
    await expect(page.getByTestId('test-question-number')).toHaveText('Q2');
    await expect(page.getByTestId('test-progress')).toHaveText('13%');
    await expect.poll(() => readResponseSet(page, PRIMARY_AVAILABLE_TEST_VARIANT)).toBe(JSON.stringify({'1': 'A'}));
  });

  test('@smoke direct opt_out OPTED_OUT keeps plain instruction and Start begins at Q1', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_OUT');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedPrimaryOptOutTestRoute('en'));

    await expect(page.getByTestId('test-instruction-body')).toHaveText(OPT_OUT_INSTRUCTION_EN);
    await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
    await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
    await expect(page.getByTestId('test-start-button')).toBeVisible();
    await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveCount(0);
    await expect(page.getByTestId('test-deny-and-start-button')).toHaveCount(0);
    await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveCount(0);
    await expect(page.getByTestId('test-keep-current-preference-button')).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, PRIMARY_OPT_OUT_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-instruction-overlay')).toBeHidden();
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
  });

  for (const fixture of TEST_VARIANT_INSTRUCTION_FIXTURES_EN) {
    test(`@smoke known-consent direct ${fixture.attribute} ${fixture.variant} shows the resolved instruction with Start only`, async ({
      page
    }) => {
      await seedTelemetryConsent(page, 'OPTED_IN');
      await page.setViewportSize({width: 1280, height: 900});
      await page.goto(buildLocalizedTestRoute('en', fixture.variant));

      await expect(page.getByTestId('test-instruction-body')).toHaveText(fixture.instruction);
      await expect(page.getByTestId('test-instruction-divider')).toHaveCount(0);
      await expect(page.getByTestId('test-instruction-note')).toHaveCount(0);
      await expect(page.getByTestId('test-start-button')).toBeVisible();
      await expect(page.getByTestId('test-accept-all-and-start-button')).toHaveCount(0);
      await expect(page.getByTestId('test-deny-and-start-button')).toHaveCount(0);
      await expect(page.getByTestId('test-deny-and-abandon-button')).toHaveCount(0);
      await expect(page.getByTestId('test-keep-current-preference-button')).toHaveCount(0);
      await expectNoLegacyInstructionUi(page);
    });
  }

  test('shows browser unload warning when test is started and not submitted', async ({browser}) => {
    const page = await browser.newPage();

    try {
      await seedTelemetryConsent(page, 'OPTED_IN');
      await page.setViewportSize({width: 1280, height: 900});
      await page.goto(buildLocalizedTestRoute('en', PRIMARY_AVAILABLE_TEST_VARIANT));

      await expect(page.getByTestId('test-instruction-overlay')).toBeVisible();
      await page.getByTestId('test-start-button').click();
      await expect(page.getByTestId('test-shell-card')).toHaveAttribute('data-entry-status', 'started');
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                resolve();
              });
            });
          })
      );

      const dialogPromise = page.waitForEvent('dialog');
      void page.reload().catch(() => undefined);
      const dialog = await dialogPromise;
      expect(dialog.type()).toBe('beforeunload');
      await dialog.dismiss();
    } finally {
      if (!page.isClosed()) {
        await page.close();
      }
    }
  });
});

test.describe('EGTT qualifier consent path', () => {
  // Chip/reentry cases stay in qualifier-overlay.spec.ts; this block covers consent-policy intersections only.
  test('@smoke direct UNKNOWN available EGTT accepts consent, collects qualifier, and starts scoring', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedTestRoute('en', EGTT_AVAILABLE_TEST_VARIANT));

    await expect(page.getByTestId('test-instruction-divider')).toBeVisible();
    await expect(page.getByTestId('test-instruction-note')).toHaveText(UNKNOWN_AVAILABLE_NOTE);
    await expect(page.getByTestId('test-accept-all-and-start-button')).toBeVisible();
    await expect(page.getByTestId('test-deny-and-abandon-button')).toBeVisible();
    await expectNoLegacyInstructionUi(page);

    await page.getByTestId('test-accept-all-and-start-button').click();
    await expect.poll(() => readConsent(page)).toBe('OPTED_IN');
    await expect.poll(() => readInstructionSeen(page, EGTT_AVAILABLE_TEST_VARIANT)).toBe('true');
    await expect(page.getByTestId('test-qualifier-step')).toContainText(EGTT_QUALIFIER_QUESTION);

    await page.getByTestId('test-qualifier-choice-f').click();
    await page.getByTestId('test-qualifier-continue-button').click();

    await expect(page.getByTestId('test-instruction-overlay')).toHaveCount(0);
    await expect(page.getByTestId('test-question-panel')).toBeVisible();
    await expect(page.getByTestId('test-question-number')).toHaveText('Q1');
    await expect(page.getByTestId('test-question-panel')).not.toContainText(EGTT_QUALIFIER_QUESTION);
    await expect(page.getByTestId('test-question-panel')).toContainText(EGTT_FIRST_SCORING_QUESTION);
    await expect(page.getByTestId('test-progress')).toHaveText('0%');
    await expect.poll(() => readResponseSet(page, EGTT_AVAILABLE_TEST_VARIANT)).toBe(JSON.stringify({'1': 'F'}));
  });

  test('@smoke direct UNKNOWN available EGTT Deny and Abandon returns home without qualifier residue', async ({
    page
  }) => {
    await clearTelemetryConsent(page);
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(buildLocalizedTestRoute('en', EGTT_AVAILABLE_TEST_VARIANT));

    await expect(page.getByTestId('test-deny-and-abandon-button')).toBeVisible();
    await expect(page.getByTestId('test-qualifier-step')).toHaveCount(0);

    await page.getByTestId('test-deny-and-abandon-button').click();

    await expect(page).toHaveURL(/\/en$/u);
    await expect.poll(() => readConsent(page)).toBe('OPTED_OUT');
    await expect.poll(() => readInstructionSeen(page, EGTT_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect.poll(() => readResponseSet(page, EGTT_AVAILABLE_TEST_VARIANT)).toBeNull();
    await expect(page.locator(`[data-card-variant="${EGTT_AVAILABLE_TEST_VARIANT}"]`)).toHaveCount(0);
    await expectNoLegacyInstructionUi(page);
  });
});
