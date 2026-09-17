import {expect, test, type Locator, type Page} from '@playwright/test';

import {localeOptions, type AppLocale} from '../../src/config/site';
import {
  CONTAINER_MAX_WIDTH,
  MOBILE_MAX_VIEWPORT_WIDTH,
  MOBILE_SIDE_PADDING,
  NARROW_PADDING_MAX_VIEWPORT_WIDTH,
  NARROW_TABLET_SIDE_PADDING,
  TABLET_DESKTOP_SIDE_PADDING
} from '../../src/features/landing/grid/layout-plan';
import {seedTelemetryConsent} from './helpers/consent';
import {
  buildLocalizedBlogDetailRoute,
  buildLocalizedBlogIndexRoute,
  buildLocalizedPrimaryTestRoute,
  SECONDARY_BLOG_VARIANT
} from './helpers/landing-fixture';
import {setTouchViewport} from './helpers/touch-context';

// instruction 은 이제 폰에서 **모달 바텀시트**이고 그 아래 층은 GNB 까지 `inert` 다(명세 규칙 1).
// 종전에는 `z-[1050]` 이라 GNB 가 모달 **위**에 있었고, 그래서 모달이 열린 채 GNB 로 회차를 버릴
// 수 있었다 — 그것이 blocker 였고 이 단계가 닫았다. 아래 검사들이 보는 것은 GNB 의 back 이므로,
// 그 컨트롤에 닿으려면 먼저 관문을 통과해야 한다. 통과 자체는 다른 스펙이 본다.
async function passInstructionGate(page: Page) {
  // **`count()` 로 판정하지 않는다** — 렌더 전의 0 은 「관문이 없다」와 구별되지 않고, 그대로
  // 지나가면 뒤의 클릭을 모달 스크림이 삼킨다. 알려진 동의 + 직접 진입은 반드시 관문을 거친다.
  const sheet = page.getByTestId('test-instruction-overlay');
  await expect(sheet).toBeVisible();
  await page.getByTestId('test-start-button').click();
  await expect(sheet).toHaveCount(0);
}


const THEME_STORAGE_KEY = 'vivetest-theme';
const DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX = 0.5;
const EN_SETTINGS_LABEL = 'Settings';
/** 명세 §3-1 — 보이는 껍데기 36px, 히트 영역 44px. */
const GNB_CONTROL_SHELL_PX = 36;
const GNB_CONTROL_HIT_PX = 44;
/** 설계 정의의 `.vt-pill` 과 같은 값 — `--label`(14px) + 명시된 600. */
const GNB_CONTROL_FONT_SIZE = '14px';
const GNB_CONTROL_FONT_WEIGHT = '600';
const HOVER_STYLE_SETTLE_MS = 180;

async function installViewTransitionStub(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: function (update: () => void) {
        update();
        return {
          ready: Promise.resolve()
        };
      }
    });
  });
}

async function readInteractiveSurfaceStyles(locator: Locator) {
  return locator.evaluate((element) => {
    const styles = getComputedStyle(element);
    const borderTopColor = styles.borderTopColor;

    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      borderTopColor,
      color: styles.color,
      boxShadow: styles.boxShadow,
      hasVisibleBorder: borderTopColor !== 'transparent' && borderTopColor !== 'rgba(0, 0, 0, 0)'
    };
  });
}

async function readSharedShellLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('.page-shell-main');
    const gnbInner = document.querySelector<HTMLElement>('.gnb-inner');

    if (!main || !gnbInner) {
      throw new Error('Expected shared shell landmarks to be present.');
    }

    const mainStyle = getComputedStyle(main);
    const mainRect = main.getBoundingClientRect();
    const gnbRect = gnbInner.getBoundingClientRect();

    return {
      main: {
        maxWidth: mainStyle.maxWidth,
        paddingTop: mainStyle.paddingTop,
        width: mainRect.width,
        left: mainRect.left
      },
      gnb: {
        width: gnbRect.width,
        left: gnbRect.left
      }
    };
  });
}

function getLocaleLabel(locale: AppLocale): string {
  return localeOptions.find(({code}) => code === locale)?.label ?? locale;
}

function getAlternateLocaleLabels(locale: AppLocale): string[] {
  return localeOptions.filter(({code}) => code !== locale).map(({label}) => label);
}

async function expectLocalePickerState(page: Page, scope: 'desktop' | 'mobile', locale: AppLocale) {
  const localeControls = page.getByTestId(`${scope}-gnb-locale-controls`);
  const currentLocaleLabel = getLocaleLabel(locale);

  await expect(localeControls.getByRole('button')).toHaveCount(localeOptions.length);

  for (const {code, label} of localeOptions) {
    const button = localeControls.getByRole('button', {name: label});

    await expect(button).toBeVisible();

    if (code === locale) {
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toBeDisabled();
      await expect(button).toHaveText(currentLocaleLabel);
    } else {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toBeEnabled();
    }
  }
}

async function expectSettingsLabel(page: Page, scope: 'desktop' | 'mobile', expectedLabel: string) {
  // 보이는 라벨은 한 자리에 하나다(명세 §3-2). 묶음 이름 둘(`Theme`·`Language`)은 화면에
  // 글자로 나오지 않고 접근 가능한 이름으로만 산다(명세 §2-4).
  await expect(page.getByTestId(`${scope}-gnb-theme-controls`).locator('.gnb-settings-label')).toHaveText(expectedLabel);
  await expect(page.getByTestId(`${scope}-gnb-locale-controls`).locator('.gnb-settings-label')).toHaveCount(0);
  await expect(page.getByTestId(`${scope}-gnb-theme-controls`).getByRole('radiogroup')).toHaveAttribute(
    'aria-label',
    'Theme'
  );
  await expect(page.getByTestId(`${scope}-gnb-locale-controls`).getByRole('group')).toHaveAttribute(
    'aria-label',
    'Language'
  );
}

/**
 * 테마 컨트롤 셋 — `System` 텍스트 버튼 · dark 스와치 · light 스와치(명세 §2-9).
 *
 * 종전에는 `disabled` 가 「적용 중」을 가리켰고 이 헬퍼가 그것으로 둘을 갈랐다. 규칙 5 가 그
 * 겸직을 금하므로(적용 중인 쪽을 `disabled` 로 만들지 않는다) 선택은 `aria-checked` 가 말한다.
 */
function getThemeControls(page: Page, scope: 'desktop' | 'mobile') {
  const controls = page.getByTestId(`${scope}-gnb-theme-controls`);

  return {
    controls,
    systemButton: page.getByTestId(`${scope}-gnb-theme-system`),
    lightButton: page.getByTestId(`${scope}-gnb-theme-light`),
    darkButton: page.getByTestId(`${scope}-gnb-theme-dark`),
    swatches: controls.locator('[role="radio"][data-theme-option="dark"], [role="radio"][data-theme-option="light"]'),
    checkedButton: controls.locator('[role="radio"][aria-checked="true"]')
  };
}

function getThemeSwatches(page: Page, scope: 'desktop' | 'mobile', chosen: 'light' | 'dark') {
  const {lightButton, darkButton} = getThemeControls(page, scope);

  return chosen === 'light'
    ? {chosenButton: lightButton, otherButton: darkButton}
    : {chosenButton: darkButton, otherButton: lightButton};
}

/**
 * `box-shadow` 의 **최상위** 층 수. `rgb(1, 2, 3) 0px 0px 0px 2px` 처럼 색 함수가 쉼표를
 * 품고 있으므로 단순 `split(',')` 은 한 층을 세 층으로 읽는다. 괄호 깊이를 세어 괄호 밖
 * 쉼표에서만 자른다.
 */
function countTopLevelLayers(boxShadow: string): number {
  if (boxShadow === 'none' || boxShadow.trim() === '') {
    return 0;
  }

  let depth = 0;
  let layers = 1;

  for (const character of boxShadow) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      layers += 1;
    }
  }

  return layers;
}

/**
 * 명세 규칙 5 — **주장이 둘이면 마크도 둘이다.**
 *
 * 「내가 고른 것」(preference)과 「지금 적용 중인 것」(effective)은 서로 다른 주장이고, 한 마크가
 * 둘을 겸직하면 `System` 을 표현할 자리가 없어진다. 그래서 명시 선택은 링 하나, 시스템
 * 선택은 칩 + 배지 점 둘이다.
 */
async function expectThemeMarks(
  page: Page,
  scope: 'desktop' | 'mobile',
  {preference, resolvedTheme}: {preference: 'system' | 'light' | 'dark'; resolvedTheme: 'light' | 'dark'}
) {
  const {controls, systemButton, lightButton, darkButton} = getThemeControls(page, scope);

  // 순서는 고정이다 — 해석된 테마에 따라 바뀌지 않는다(규칙 8 의 나머지 절반).
  await expect(controls.locator('[role="radio"]')).toHaveCount(3);
  for (const [index, option] of ['system', 'dark', 'light'].entries()) {
    await expect(controls.locator('[role="radio"]').nth(index)).toHaveAttribute('data-theme-option', option);
  }

  for (const [option, button] of [
    ['system', systemButton],
    ['dark', darkButton],
    ['light', lightButton]
  ] as const) {
    await expect(button).toHaveAttribute('aria-checked', option === preference ? 'true' : 'false');
    // 적용 중인 쪽을 `disabled` 로 만들지 않는다 — 점은 덜 강조되지만 **누를 수 있다**.
    await expect(button).toBeEnabled();
  }

  // 규칙 5 의 나머지 절반 — **링은 하나다.** 종전에는 `boxShadow !== 'none'` 만 봤는데,
  // 규칙 5 가 금지하는 그 모양(`0 0 0 2px var(--canvas), 0 0 0 4px var(--accent)`)도
  // `'none'` 이 아니므로 그 가드는 통과한다. 금지된 것이 「그림자가 없음」이 아니라 「층이
  // 둘」이므로, 문자열을 맞추지 않고 **최상위 층 수**를 센다 — 색·두께가 바뀌어도 규칙은
  // 같은 것을 계속 잰다.
  if (preference !== 'system') {
    const swatch = controls.locator(`[role="radio"][data-theme-option="${preference}"]`);

    // **쉬는 상태를 재야 한다.** 테마 전환이 도는 동안 Chrome 은 `box-shadow` 를 보간하며
    // 층 목록을 빈 층으로 채운다 — 실측으로 `rgba(125, 170, 149, 0.384) 0 0 0 0.765728px` +
    // 빈 층 다섯, 즉 여섯 층이 나온다. 그것은 규칙 5 가 금지하는 「2px 지면 + 2px sage」가
    // 아니라 전환 한 프레임이다. 그래서 한 번 읽지 않고 **정착할 때까지** 읽는다. 쉬는
    // 상태가 정말 두 층이면 그것은 정착값이므로 영영 1 이 되지 않고 이 검사는 여전히 붉다.
    await expect
      .poll(
        async () => {
          const shadow = await swatch.evaluate((element) => getComputedStyle(element).boxShadow);
          if (shadow === 'none') {
            return 'none — 고른 스와치에 선택 링이 없다';
          }

          const layers = countTopLevelLayers(shadow);
          return layers === 1 ? '1' : `${layers}층: ${shadow}`;
        },
        {message: `규칙 5 — 고른 스와치의 링은 한 층이다 (${scope} / ${preference})`}
      )
      .toBe('1');
  }

  const badges = controls.locator('.gnb-chip-effective-badge');
  if (preference === 'system') {
    await expect(badges).toHaveCount(1);
    await expect(
      controls.locator(`[data-theme-option="${resolvedTheme}"] .gnb-chip-effective-badge`)
    ).toHaveCount(1);
    // 색만으로 상태를 구분하지 않는다(WCAG 1.4.1) — 점에는 텍스트 대안이 따른다.
    await expect(controls.locator(`[data-theme-option="${resolvedTheme}"]`)).toHaveAttribute(
      'aria-label',
      /Currently applied/u
    );
  } else {
    await expect(badges).toHaveCount(0);
  }
}

/**
 * 규칙 8 — 레이어의 우측 상단 모서리가 트리거 pill 의 우측 상단 모서리와 **일치**하고,
 * 레이어는 pill 을 **덮으며** 아래·왼쪽으로 펼쳐진다.
 *
 * 종전의 계약은 「패널 안의 현재 테마 칩이 트리거 위에 정확히 올라온다」였다 — 트리거가
 * 44px 짜리 글리프 상자여서 가능했던 모양이고, §2-9 의 넓은 텍스트 pill 에서는 성립할 수 없다.
 * 대신 규칙 8 이 직접 말하는 모서리 일치를 재다.
 */
async function expectDesktopSettingsLayerAlignment(page: Page) {
  const panel = page.getByTestId('gnb-settings-panel');

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector('.gnb-settings-trigger-shell');
    const layer = document.querySelector('[data-testid="gnb-settings-panel"]');

    if (!(shell instanceof HTMLElement) || !(layer instanceof HTMLElement)) {
      return null;
    }

    const shellBox = shell.getBoundingClientRect();
    const layerBox = layer.getBoundingClientRect();
    const covering = document.elementFromPoint(
      shellBox.left + shellBox.width / 2,
      shellBox.top + shellBox.height / 2
    );

    return {
      shellRight: shellBox.right,
      shellTop: shellBox.top,
      layerRight: layerBox.right,
      layerTop: layerBox.top,
      layerLeft: layerBox.left,
      layerBottom: layerBox.bottom,
      shellBottom: shellBox.bottom,
      shellLeft: shellBox.left,
      layerCoversPill: covering instanceof Element && covering.closest('[data-testid="gnb-settings-panel"]') !== null
    };
  });

  await expect(panel).toBeVisible();
  expect(geometry).not.toBeNull();

  expect(Math.abs((geometry?.layerRight ?? 0) - (geometry?.shellRight ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  expect(Math.abs((geometry?.layerTop ?? 0) - (geometry?.shellTop ?? 0))).toBeLessThanOrEqual(
    DESKTOP_SETTINGS_GEOMETRY_TOLERANCE_PX
  );
  // 아래·왼쪽으로 펼쳐진다 — 트리거 아래에 간격을 두고 뜨지 않는다.
  expect(geometry?.layerLeft ?? 0).toBeLessThan(geometry?.shellLeft ?? 0);
  expect(geometry?.layerBottom ?? 0).toBeGreaterThan(geometry?.shellBottom ?? 0);
  expect(geometry?.layerCoversPill, '레이어가 pill 을 덮지 않는다').toBe(true);
}

async function seedManualTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(
    ([storageKey, nextTheme]) => {
      window.localStorage.setItem(storageKey, nextTheme);
    },
    [THEME_STORAGE_KEY, theme] as const
  );
}

/**
 * 대상이 포커스될 때까지 `Tab` 을 누른다.
 *
 * 종전에는 랜딩에서 첫 `Tab` 이 곧 첫 카드였으므로 케이스들이 그 한 번을 직접 적었다. skip
 * link 도입으로 탭 순서가 문서 순서가 되면서 그 전제가 사라졌고, **그 전제에 기대던 단언과
 * 그 케이스가 실제로 재려던 것을 가른다** — 아래 케이스들이 재는 것은 「닫힌 패널이 탭 순서에
 * 들어오지 않는다」이지 「첫 Tab 이 어디로 가는가」가 아니다.
 */
async function tabUntilFocused(page: Page, target: Locator, budget = 40): Promise<void> {
  for (let attempt = 0; attempt < budget; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) {
      return;
    }
  }

  throw new Error('Tab budget exhausted before reaching the target');
}

test.describe('Phase 3 gnb shell smoke', () => {
  test.beforeEach(async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
  });

  test('@smoke assertion:B3-desktop-settings desktop settings open-close and overlay contract', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible({timeout: 200});
    await expectSettingsLabel(page, 'desktop', EN_SETTINGS_LABEL);
    await expectLocalePickerState(page, 'desktop', 'en');
    await expectDesktopSettingsLayerAlignment(page);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(panel).toBeVisible();

    await page.evaluate(() => {
      const triggerEl = document.querySelector('[data-testid="gnb-settings-trigger"]');
      if (triggerEl instanceof HTMLElement) {
        triggerEl.blur();
      }
    });
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke desktop settings close on outside click', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible();

    await page.locator('.page-shell-main').click();
    await expect(panel).toBeHidden();
  });

  test('@smoke shared page shell keeps the 1280px main contract aligned with the GNB on representative routes', async ({
    page
  }) => {
    await page.setViewportSize({width: 1600, height: 1000});

    for (const route of ['/en', '/en/history', buildLocalizedPrimaryTestRoute('en')]) {
      await page.goto(route);

      const metrics = await readSharedShellLayoutMetrics(page);

      expect(metrics.main.maxWidth).toBe('1280px');
      expect(metrics.main.paddingTop).toBe('88px');
      expect(metrics.main.width).toBeCloseTo(1280, 0);
      expect(metrics.gnb.width).toBeCloseTo(1280, 0);
      expect(metrics.main.left).toBeCloseTo(metrics.gnb.left, 1);
    }
  });

  test('@smoke shared page shell and GNB carry one gutter at every declared tier', async ({page}) => {
    // 계약: req-landing.md §6.4 — Desktop/Tablet 24px(좁은 폭 20px), Mobile 16px.
    // 상수는 layout-plan.ts 가 갖고, 값은 globals.css 의 `--shell-gutter` 한 곳에서 온다.
    const expectedGutter = (viewportWidth: number) => {
      if (viewportWidth <= MOBILE_MAX_VIEWPORT_WIDTH) {
        return MOBILE_SIDE_PADDING;
      }

      if (viewportWidth <= NARROW_PADDING_MAX_VIEWPORT_WIDTH) {
        return NARROW_TABLET_SIDE_PADDING;
      }

      return TABLET_DESKTOP_SIDE_PADDING;
    };

    const widths = [
      390,
      MOBILE_MAX_VIEWPORT_WIDTH,
      MOBILE_MAX_VIEWPORT_WIDTH + 1,
      NARROW_PADDING_MAX_VIEWPORT_WIDTH,
      NARROW_PADDING_MAX_VIEWPORT_WIDTH + 1,
      1024,
      1100,
      CONTAINER_MAX_WIDTH,
      1600
    ];

    await page.goto('/en');

    for (const width of widths) {
      await page.setViewportSize({width, height: 900});

      const measured = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>('.page-shell-main');
        const gnbInner = document.querySelector<HTMLElement>('.gnb-inner');

        if (!main || !gnbInner) {
          throw new Error('Expected shared shell landmarks to be present.');
        }

        const read = (element: HTMLElement) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return {
            paddingLeft: Number.parseFloat(style.paddingLeft),
            paddingRight: Number.parseFloat(style.paddingRight),
            contentLeft: rect.left + Number.parseFloat(style.paddingLeft)
          };
        };

        return {
          // 전제: 고전 스크롤바가 있으면 미디어 쿼리가 보는 폭이 viewport 폭보다 좁아져
          // 경계 케이스가 조용히 옆 tier 를 측정하게 된다. 전제를 먼저 깬다.
          cssViewportWidth: document.documentElement.clientWidth,
          innerWidth: window.innerWidth,
          main: read(main),
          gnb: read(gnbInner)
        };
      });

      expect(measured.cssViewportWidth, `viewport ${width}: 스크롤바가 CSS viewport 폭을 줄였다`).toBe(
        measured.innerWidth
      );

      const gutter = expectedGutter(width);

      expect(measured.main.paddingLeft, `main padding-left @ ${width}`).toBe(gutter);
      expect(measured.main.paddingRight, `main padding-right @ ${width}`).toBe(gutter);
      expect(measured.gnb.paddingLeft, `gnb padding-left @ ${width}`).toBe(gutter);
      expect(measured.gnb.paddingRight, `gnb padding-right @ ${width}`).toBe(gutter);
      expect(measured.main.contentLeft, `content left edges @ ${width}`).toBeCloseTo(
        measured.gnb.contentLeft,
        1
      );
    }
  });

  test('@smoke desktop fallback open works without hover capability', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === '(hover: hover) and (pointer: fine)') {
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeHidden();

    await trigger.focus();
    await expect(panel).toBeVisible();
  });

  test('@smoke desktop settings marks System as chosen and the resolved side as applied', async ({page}) => {
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.localStorage.removeItem('vivetest-theme');
      window.matchMedia = (query: string) => {
        if (query === '(prefers-color-scheme: dark)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }
        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-theme-preference', 'system');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    // 저장된 선택이 없으므로 고른 것은 `System` 이고, 적용 중인 것은 OS 가 해석한 다크다 —
    // 주장이 둘이므로 마크도 둘이다(규칙 5). 종전에는 이 화면에 `System` 이 아예 없었다.
    await expectThemeMarks(page, 'desktop', {preference: 'system', resolvedTheme: 'dark'});
    await expectDesktopSettingsLayerAlignment(page);
  });

  test('@smoke desktop settings restores the stored manual theme without a blank selected state', async ({page}) => {
    await seedManualTheme(page, 'dark');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await expectThemeMarks(page, 'desktop', {preference: 'dark', resolvedTheme: 'dark'});
    await expectDesktopSettingsLayerAlignment(page);
  });

  test('@smoke desktop theme switch applies blur transition styles and cleans them up', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');

    await trigger.hover();
    await expect(panel).toBeVisible();
    await expectThemeMarks(page, 'desktop', {preference: 'light', resolvedTheme: 'light'});

    const {darkButton} = getThemeControls(page, 'desktop');

    await darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('vivetest-theme'))).toBe('dark');
    await expect(page.getByTestId('gnb-settings-trigger')).toHaveAttribute('data-current-theme', 'dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(1);

    await trigger.hover();
    await expect(panel).toBeVisible();
    await expectThemeMarks(page, 'desktop', {preference: 'dark', resolvedTheme: 'dark'});

    await expect(page.locator('#theme-switch-style')).toHaveCount(0, {timeout: 3000});
  });

  test('@smoke desktop settings expose a hover affordance on selectable locale and theme chips while selected chips stay inert', async ({
    page
  }) => {
    await page.setViewportSize({width: 1280, height: 900});

    // The realized `--theme-preview-*` literals from `src/app/globals.css`. They are
    // written out rather than read from the tokens on purpose: reading them back would
    // make this assertion agree with whatever the product currently is. Refreshed for
    // the 2026-09-07 theme cut, which replaced the legacy cool palette (#121821 /
    // #eff2f8) these previously carried.
    const themePreviewRestStylesByTheme = {
      light: {
        backgroundColor: 'rgb(255, 255, 255)',
        color: 'rgb(30, 26, 22)'
      },
      dark: {
        backgroundColor: 'rgb(30, 26, 22)',
        color: 'rgb(251, 250, 247)'
      }
    } as const;

    for (const theme of ['light', 'dark'] as const) {
      await seedManualTheme(page, theme);
      await page.goto('/en');
      await page.mouse.move(32, 220);
      await expect(page.getByTestId('gnb-settings-panel')).toBeHidden();

      await page.getByTestId('gnb-settings-trigger').click();
      await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();

      const localeControls = page.getByTestId('desktop-gnb-locale-controls');
      const selectableLocaleChip = localeControls.locator('button:not([disabled])').first();
      const selectedLocaleChip = localeControls.locator('button[disabled]');
      const {chosenButton, otherButton} = getThemeSwatches(page, 'desktop', theme);
      const alternateTheme = theme === 'light' ? 'dark' : 'light';

      const [selectableLocaleBeforeHover, selectedLocaleBeforeHover, currentThemeBeforeHover, alternateThemeBeforeHover] =
        await Promise.all([
          readInteractiveSurfaceStyles(selectableLocaleChip),
          readInteractiveSurfaceStyles(selectedLocaleChip),
          readInteractiveSurfaceStyles(chosenButton),
          readInteractiveSurfaceStyles(otherButton)
        ]);

      expect.soft(selectedLocaleBeforeHover.hasVisibleBorder).toBe(false);
      expect.soft(selectedLocaleBeforeHover.boxShadow).toBe('none');

      // A theme swatch's content IS a colour, so selection cannot be the usual fill
      // swap -- it would paint over the thing the control is showing. The selected
      // swatch keeps its own preview surface and takes a ring instead.
      await expect(chosenButton).toHaveAttribute('data-chip-surface', `theme-preview-${theme}`);
      expect.soft(currentThemeBeforeHover.backgroundColor).toBe(
        themePreviewRestStylesByTheme[theme].backgroundColor
      );
      expect.soft(currentThemeBeforeHover.color).toBe(themePreviewRestStylesByTheme[theme].color);
      expect.soft(currentThemeBeforeHover.hasVisibleBorder).toBe(true);
      expect.soft(currentThemeBeforeHover.boxShadow).not.toBe('none');
      await expect(otherButton).toHaveAttribute('data-chip-surface', `theme-preview-${alternateTheme}`);
      expect.soft(alternateThemeBeforeHover.backgroundColor).toBe(
        themePreviewRestStylesByTheme[alternateTheme].backgroundColor
      );
      expect.soft(alternateThemeBeforeHover.color).toBe(themePreviewRestStylesByTheme[alternateTheme].color);

      // Selectable GNB chips expose their own interactive hover affordance. This is asserted at the
      // presence level (an affordance appears) rather than by matching the expanded-test answer-choice
      // styles: Wave 5 re-skinned the answer choice to its own scoped sage tokens, and the GNB visual
      // is a later wave, so the two surfaces are intentionally no longer style-identical.
      await selectableLocaleChip.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(selectableLocaleChip)).not.toEqual(selectableLocaleBeforeHover);

      await otherButton.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(otherButton)).not.toEqual(alternateThemeBeforeHover);

      await selectedLocaleChip.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(selectedLocaleChip)).toEqual(selectedLocaleBeforeHover);

      // 고른 스와치는 `disabled` 가 아니지만(규칙 5) hover 어포던스는 갖지 않는다 — 이미 고른 것을
      // 다시 고를 수 없다는 사실은 선택 링이 말하고, 그 위에 도드라짓 면을 하나 더 깔면 링이 흐려진다.
      await chosenButton.hover();
      await page.waitForTimeout(HOVER_STYLE_SETTLE_MS);
      expect.soft(await readInteractiveSurfaceStyles(chosenButton)).toEqual(currentThemeBeforeHover);
    }
  });

  test('@smoke reduced-motion theme switch falls back without injecting transition styles', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => true
          } as MediaQueryList;
        }

        return originalMatchMedia(query);
      };
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    const panel = page.getByTestId('gnb-settings-panel');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(panel).toBeVisible();

    await getThemeControls(page, 'desktop').darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expectThemeMarks(page, 'desktop', {preference: 'dark', resolvedTheme: 'dark'});
    await expect(page.locator('#theme-switch-style')).toHaveCount(0);
  });

  test('@smoke unsupported theme transition falls back without injecting transition styles', async ({page}) => {
    await seedManualTheme(page, 'light');
    await page.addInitScript(() => {
      Object.defineProperty(Document.prototype, 'startViewTransition', {
        configurable: true,
        writable: true,
        value: undefined
      });
    });

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    const panel = page.getByTestId('gnb-settings-panel');

    await page.getByTestId('gnb-settings-trigger').hover();
    await expect(panel).toBeVisible();

    await getThemeControls(page, 'desktop').darkButton.click();
    await expect(panel).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expectThemeMarks(page, 'desktop', {preference: 'dark', resolvedTheme: 'dark'});
    await expect(page.locator('#theme-switch-style')).toHaveCount(0);
  });

  test('@smoke mobile theme switch keeps the menu open while applying the next theme', async ({page}) => {
    await installViewTransitionStub(page);
    await seedManualTheme(page, 'light');
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const panel = page.getByTestId('gnb-mobile-menu-panel');

    await trigger.click();
    await expect(panel).toBeVisible();
    await expectSettingsLabel(page, 'mobile', EN_SETTINGS_LABEL);
    await expectThemeMarks(page, 'mobile', {preference: 'light', resolvedTheme: 'light'});

    await getThemeControls(page, 'mobile').darkButton.click();

    await expect(panel).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme')))
      .toBe('dark');
    await expect(page.locator('#theme-switch-style')).toHaveCount(1);
    await expectThemeMarks(page, 'mobile', {preference: 'dark', resolvedTheme: 'dark'});
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#theme-switch-style')).toHaveCount(0, {timeout: 3000});
  });

  // 종전 제목은 「enters cards first, reverse-enters GNB」였고 탭 순서를 상태의 함수로
  // 만드는 계약을 고정했다. skip link 로 교체되면서 랜딩도 문서 순서를 따른다 — 첫 탭 스톱은
  // skip link 이고, 그 다음이 GNB 다.
  test('@smoke assertion:B3-gnb-keyboard-matrix desktop landing follows document tab order from the skip link, and closes settings on focus-out', async ({
    page
  }) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    // **클릭하지 않는다.** 클릭은 브라우저의 sequential focus navigation starting point 를
    // 그 좌표로 옮기므로 그 뒤의 `Tab` 은 문서 처음이 아니라 **클릭한 자리**에서 이어진다
    // (실측: `(600,500)` 클릭 뒤 첫 `Tab` 은 그 부근 카드로 간다). 「첫 탭 스톱」을 재려면
    // 시작점을 건드리지 않아야 한다.

    const home = page.locator('.gnb-desktop .gnb-ci-link');
    const history = page.locator('.gnb-desktop .gnb-desktop-links a').nth(0);
    const blog = page.locator('.gnb-desktop .gnb-desktop-links a').nth(1);
    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');
    const localeControls = page.getByTestId('desktop-gnb-locale-controls');
    const {systemButton, darkButton, lightButton} = getThemeControls(page, 'desktop');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();

    // 첫 탭 스톱은 skip link 다 — 문서 순서 그대로이고 랜딩이라고 달라지지 않는다.
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('skip-to-content')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(home).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(history).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(blog).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(settingsTrigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();

    // 테마 컨트롤은 이제 셋이고 순서가 고정이다 — 적용 중인 쪽도 탭으로 닿는다(규칙 5).
    for (const themeButton of [systemButton, darkButton, lightButton]) {
      await page.keyboard.press('Tab');
      await expect(themeButton).toBeFocused();
    }

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke assertion:B3-gnb-keyboard-matrix desktop closed settings panel stays out of the tab order', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});
    await page.goto('/en');

    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();
    const panel = page.getByTestId('gnb-settings-panel');

    // 이 케이스가 재는 것은 **닫힌 패널이 탭 순서에 없다**는 것이다 — 트리거에서 한 번 더
    // `Tab` 하면 패널 내부가 아니라 첫 카드로 가야 한다.
    await tabUntilFocused(page, settingsTrigger);
    await expect(panel).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
  });

  test('@smoke assertion:B3-gnb-keyboard-matrix desktop blog/history contexts keep default GNB order and focus-out close', async ({
    page
  }) => {
    await page.setViewportSize({width: 1440, height: 980});

    for (const route of [
      buildLocalizedBlogIndexRoute('en'),
      buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT),
      '/en/history'
    ]) {
      await page.goto(route);
      await page.locator('body').click({position: {x: 1, y: 1}});

      const home = page.locator('.gnb-desktop .gnb-ci-link');
      const history = page.locator('.gnb-desktop .gnb-desktop-links a').nth(0);
      const blog = page.locator('.gnb-desktop .gnb-desktop-links a').nth(1);
      const settingsTrigger = page.getByTestId('gnb-settings-trigger');
      const panel = page.getByTestId('gnb-settings-panel');

      await page.keyboard.press('Tab');
      await expect(home).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(history).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(blog).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(settingsTrigger).toBeFocused();
      await expect(panel).toBeHidden();
      await page.keyboard.press('Shift+Tab');
      await expect(blog).toBeFocused();
    }

    await page.goto(buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT));
    await page.evaluate(() => {
      const sink = document.createElement('button');
      sink.type = 'button';
      sink.textContent = 'Destination focus sink';
      sink.setAttribute('data-testid', 'destination-focus-sink');
      document.querySelector('.page-shell-main')?.appendChild(sink);
    });
    await page.locator('body').click({position: {x: 1, y: 1}});

    const settingsTrigger = page.getByTestId('gnb-settings-trigger');
    const panel = page.getByTestId('gnb-settings-panel');
    const localeControls = page.getByTestId('desktop-gnb-locale-controls');
    const {systemButton, darkButton, lightButton} = getThemeControls(page, 'desktop');
    const sink = page.getByTestId('destination-focus-sink');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(settingsTrigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(panel).toBeVisible();
    await expectLocalePickerState(page, 'desktop', 'en');

    for (const themeButton of [systemButton, darkButton, lightButton]) {
      await page.keyboard.press('Tab');
      await expect(themeButton).toBeFocused();
    }

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }

    for (let attempts = 0; attempts < 8; attempts += 1) {
      await page.keyboard.press('Tab');
      const isSinkFocused = await sink.evaluate((element) => element === document.activeElement);
      if (isSinkFocused) {
        break;
      }
    }

    await expect(sink).toBeFocused();
    await expect(panel).toBeHidden({timeout: 150});
  });

  test('@smoke assertion:B7-mobile-overlay mobile overlay close-start and unlock timing', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('hidden');

    const backdrop = page.getByTestId('gnb-mobile-backdrop');
    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 12,
      clientY: 12
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 12,
      clientY: 12
    });

    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeHidden({timeout: 1000});
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('');

    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement;
          return active?.getAttribute('data-testid') ?? '';
        })
      )
      .toBe('gnb-mobile-menu-trigger');
  });

  // 종전 제목은 「enters cards first, reverse-enters menu」였다. skip link 로 교체되면서 랜딩도
  // 문서 순서를 따르므로 그 두 주장은 계약이 아니다 — 이 케이스가 계속 재는 것은 드로어가
  // 열린 뒤의 순회와 Escape 닫기의 포커스 복원이다.
  test('@smoke assertion:B7-gnb-keyboard-matrix mobile drawer traversal and escape-close focus restore', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const home = page.locator('.gnb-mobile .gnb-ci-link');
    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const panelHome = panel.getByRole('link', {name: 'Home'});
    const panelHistory = panel.getByRole('link', {name: 'History'});
    const panelBlog = panel.getByRole('link', {name: 'Blog'});
    const localeControls = page.getByTestId('mobile-gnb-locale-controls');
    const closeButton = page.getByTestId('gnb-mobile-menu-close');
    const consentRecall = page.getByTestId('gnb-mobile-consent-recall');
    const {systemButton, darkButton, lightButton} = getThemeControls(page, 'mobile');

    // 문서 순서: skip link → 로고 → 메뉴 트리거.
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('skip-to-content')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(home).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();

    // 순회는 패널의 **문서 순서**를 그대로 따른다: 헤더 닫기 → 설정 → 이동(최하단).
    // 종전에는 닫기가 없어 패널이 덮은 햄버거가 첫 탭 스톱이었고, 이동이 위에 있었다(명세 §2-4).
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    for (const themeButton of [systemButton, darkButton, lightButton]) {
      await page.keyboard.press('Tab');
      await expect(themeButton).toBeFocused();
    }

    await expectLocalePickerState(page, 'mobile', 'en');

    for (const label of getAlternateLocaleLabels('en')) {
      await page.keyboard.press('Tab');
      await expect(localeControls.getByRole('button', {name: label})).toBeFocused();
    }

    await page.keyboard.press('Tab');
    await expect(consentRecall).toBeFocused();

    for (const link of [panelHome, panelHistory, panelBlog]) {
      await page.keyboard.press('Tab');
      await expect(link).toBeFocused();
    }

    // 마지막 대상에서 한 번 더 누르면 **드로어 안에서** 처음으로 돌아온다 — `aria-modal` 이
    // 사실이라는 뜻이다. 종전에는 여기서 드로어 뒤의 럜딩 카드로 나갔다(실측 22 회 중 6 회).
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden({timeout: 1000});
    await expect(trigger).toBeFocused();
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile closed menu panel stays out of the tab order', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    const firstCardTrigger = page.getByTestId('landing-grid-card-trigger').first();
    const panel = page.getByTestId('gnb-mobile-menu-panel');

    // 위와 같다 — 재는 것은 닫힌 패널의 탭 순서 배제다.
    await tabUntilFocused(page, trigger);
    await expect(panel).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(firstCardTrigger).toBeFocused();
  });

  test('@smoke mobile outside-close cancels when gesture becomes scroll', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();

    const layer = page.getByTestId('gnb-mobile-layer');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const backdrop = page.getByTestId('gnb-mobile-backdrop');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 16
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await backdrop.dispatchEvent('pointermove', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 42
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 16,
      clientY: 42
    });

    await expect(layer).toHaveAttribute('data-state', 'open');
    await expect(panel).toBeVisible();
  });

  test('@smoke mobile ignores extra close input while already closing', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    const trigger = page.getByTestId('gnb-mobile-menu-trigger');
    await trigger.click();

    const layer = page.getByTestId('gnb-mobile-layer');
    const panel = page.getByTestId('gnb-mobile-menu-panel');
    const backdrop = page.getByTestId('gnb-mobile-backdrop');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await backdrop.dispatchEvent('pointerdown', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await backdrop.dispatchEvent('pointerup', {
      pointerType: 'touch',
      clientX: 18,
      clientY: 18
    });
    await expect(layer).toHaveAttribute('data-state', 'closing');

    await expect(panel).toBeHidden({timeout: 1000});
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile blog/history contexts keep back then menu traversal and keyboard close restore', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});

    for (const route of [
      buildLocalizedBlogIndexRoute('en'),
      buildLocalizedBlogDetailRoute('en', SECONDARY_BLOG_VARIANT),
      '/en/history'
    ]) {
      await page.goto(route);
      await page.locator('body').click({position: {x: 1, y: 1}});

      const back = page.getByTestId('gnb-mobile-back');
      const trigger = page.getByTestId('gnb-mobile-menu-trigger');
      const panel = page.getByTestId('gnb-mobile-menu-panel');
      const closeButton = page.getByTestId('gnb-mobile-menu-close');

      await page.keyboard.press('Tab');
      await expect(back).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(trigger).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(panel).toBeVisible();
      // 패널 안의 첫 대상은 헤더의 닫기다 — 이동 블록은 최하단으로 내려갔다(명세 §2-4).
      await page.keyboard.press('Tab');
      await expect(closeButton).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden({timeout: 1000});
      await expect(trigger).toBeFocused();
    }
  });

  test('@smoke mobile test back uses history before fallback', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto(buildLocalizedBlogIndexRoute('en'));
    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await passInstructionGate(page);

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });

  test('@smoke mobile test back falls back to localized landing', async ({page}) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await passInstructionGate(page);

    await page.getByTestId('gnb-mobile-test-back').click();
    await expect(page).toHaveURL(/\/en$/u);
  });

  test('@smoke assertion:B7-gnb-keyboard-matrix mobile test context exposes only keyboard-activatable back control', async ({
    page
  }) => {
    await seedTelemetryConsent(page, 'OPTED_IN');
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto(buildLocalizedBlogIndexRoute('en'));
    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await passInstructionGate(page);
    await page.locator('body').click({position: {x: 1, y: 1}});

    await expect(page.getByTestId('gnb-mobile-menu-trigger')).toHaveCount(0);

    const back = page.getByTestId('gnb-mobile-test-back');
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/blog$/u);
  });
  /**
   * 명세 §3-1 — 보이는 것과 만지는 것을 분리한다.
   *
   * **소유자 목록이 아니라 조건이다.** 어떤 컨트롤이 있는지 열거하면 다음에 생기는 컨트롤은 그
   * 목록 밖이라 구조적으로 보이지 않는다(L30·L36). 여기서는 문서의 `.gnb-control` 전부를 훑는다.
   */
  test('@smoke assertion:GN-01 every GNB control paints a 36px shell inside a 44px hit box', async ({page}) => {
    let typedControlCount = 0;
    const surfaces = [
      {label: 'mobile landing', size: {width: 390, height: 844}, route: '/en', openDrawer: true},
      {label: 'mobile history', size: {width: 390, height: 844}, route: '/en/history', openDrawer: false},
      {label: 'desktop landing', size: {width: 1280, height: 900}, route: '/en', openDrawer: false}
    ] as const;

    for (const surface of surfaces) {
      await setTouchViewport(page, surface.size);
      await page.goto(surface.route);

      if (surface.openDrawer) {
        await page.getByTestId('gnb-mobile-menu-trigger').click();
        await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
      }

      const controls = await page.evaluate(() =>
        [...document.querySelectorAll('.gnb-control')]
          .filter((control) => control instanceof HTMLElement && control.getBoundingClientRect().height > 0)
          .map((control) => {
            const shell = control.querySelector('.gnb-control-shell, .gnb-settings-trigger-shell');
            const hitBox = control.getBoundingClientRect();
            const shellBox = shell?.getBoundingClientRect();

            const shellStyle = shell ? window.getComputedStyle(shell) : null;

            return {
              label: (control as HTMLElement).dataset.testid ?? control.getAttribute('aria-label') ?? '?',
              hitHeight: Math.round(hitBox.height),
              shellHeight: shellBox ? Math.round(shellBox.height) : null,
              fontSize: shellStyle?.fontSize ?? null,
              fontWeight: shellStyle?.fontWeight ?? null,
              // 설정 pill 은 일부러 다르다 — 명세 §2-9 가 옆의 텍스트 링크와 같은 무게를 요구하고
              // 그 관계는 `assertion:GN-04` 가 따로 재다. 여기서는 기하만 공통이다.
              typed: shell?.classList.contains('gnb-control-shell') ?? false
            };
          })
      );

      expect(controls.length, `${surface.label}: 전제 — 훑을 컨트롤이 하나도 없다`).toBeGreaterThan(0);

      expect(
        controls.filter((control) => control.hitHeight !== GNB_CONTROL_HIT_PX),
        `${surface.label}: 히트 영역이 ${GNB_CONTROL_HIT_PX}px 가 아닌 컨트롤`
      ).toEqual([]);
      expect(
        controls.filter((control) => control.shellHeight !== GNB_CONTROL_SHELL_PX),
        `${surface.label}: 보이는 껍데기가 ${GNB_CONTROL_SHELL_PX}px 가 아닌 컨트롤`
      ).toEqual([]);

      // **활자는 쓴 것이 아니라 계산된 것을 재다**(L10). `[font:var(--label)]` 은 단축이라
      // 굵기까지 가져오고, 옆에 둔 `font-semibold` 는 Tailwind 의 emit 순서 때문에 진다 —
      // 실측(2026-09-16) 화면 이름이 적은 대로 600 이 아니라 500 으로 렌더됐다. 설계 정의의
      // `.vt-pill`(`font: var(--label)` + `font-weight: 600`)과 같은 값을 요구해 그 경주를 닫는다.
      // 데스크톱 럜딩의 유일한 컨트롤은 설정 pill 이라 이 분류가 빈다 — 전제는 표면마다가
      // 아니라 **전체에 대해** 묻는다(아래 루프 밖).
      const typedControls = controls.filter((control) => control.typed);
      typedControlCount += typedControls.length;
      expect(
        typedControls.filter((control) => control.fontSize !== GNB_CONTROL_FONT_SIZE),
        `${surface.label}: 껍데기의 활자 크기가 ${GNB_CONTROL_FONT_SIZE} 가 아니다`
      ).toEqual([]);
      expect(
        typedControls.filter((control) => control.fontWeight !== GNB_CONTROL_FONT_WEIGHT),
        `${surface.label}: 껍데기의 활자 굵기가 ${GNB_CONTROL_FONT_WEIGHT} 이 아니다`
      ).toEqual([]);
    }

    expect(typedControlCount, '전제: 활자를 재는 컨트롤이 세 표면 어디에도 없다').toBeGreaterThan(0);
  });

  /** 명세 §2-4 · 규칙 7 — 설정이 최상단, 이동이 최하단. 엄지가 닿는 자리를 이동이 갖는다. */
  test('@smoke assertion:GN-02 drawer puts settings at the top and navigation at the very bottom', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();

    const layout = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="gnb-mobile-menu-panel"]');

      if (!(panel instanceof HTMLElement)) {
        return null;
      }

      const head = panel.querySelector('.gnb-mobile-head');
      const settings = panel.querySelector('.gnb-mobile-settings');
      const links = panel.querySelector('.gnb-mobile-links');
      const top = (element: Element | null) => (element ? Math.round(element.getBoundingClientRect().top) : null);

      return {
        headTop: top(head),
        settingsTop: top(settings),
        linksTop: top(links),
        linksIsLastChild: panel.lastElementChild === links,
        panelHeight: Math.round(panel.getBoundingClientRect().height),
        viewportHeight: window.innerHeight,
        // `h-screen max-h-screen` 는 `100vh` 를 쓴다 — 주소 표시줄이 보이는 동안 드로어 바닥이 잘린다.
        usesViewportUnits: /\b(100vh)\b/u.test(panel.className)
      };
    });

    expect(layout).not.toBeNull();
    expect(layout?.headTop ?? 0, '헤더가 맨 위다').toBeLessThan(layout?.settingsTop ?? 0);
    expect(layout?.settingsTop ?? 0, '설정이 이동보다 위다').toBeLessThan(layout?.linksTop ?? 0);
    expect(layout?.linksIsLastChild, '이동 블록이 마지막 자식이 아니다').toBe(true);
    expect(layout?.panelHeight).toBe(layout?.viewportHeight);
    expect(layout?.usesViewportUnits, '`100vh` 로 돌아갔다').toBe(false);

    // 헤더에 **보이는** 닫기가 있다 — 패널이 바 위층이라 햄버거를 덮기 때문이다.
    const closeButton = page.getByTestId('gnb-mobile-menu-close');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeHidden({timeout: 1000});
  });

  /**
   * 명세 §2-4 — `aria-modal` 이 **사실**이 되게 한다.
   *
   * 종전 실측(2026-09-16): 드로어를 열고 Tab 을 22 회 누르면 17 번째부터 여섯 번이 드로어 뒤의
   * 럜딩 카드로 나갔다. 보이지도 않는 곳으로 포커스가 사라진다는 뜻이다.
   */
  test('@smoke assertion:GN-03 drawer traversal never leaves the panel', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();

    const escaped: string[] = [];

    // 패널의 대상 수(19)보다 많이 누른다 — 한 바퀴를 넘기지 못하면 샘을 볼 수 없다.
    for (let press = 0; press < 26; press += 1) {
      await page.keyboard.press('Tab');
      const outside = await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) {
          return 'body';
        }
        return active.closest('[data-testid="gnb-mobile-menu-panel"]') === null
          ? (active.dataset.testid ?? active.textContent?.trim().slice(0, 24) ?? active.tagName)
          : null;
      });

      if (outside !== null) {
        escaped.push(`${press + 1}: ${outside}`);
      }
    }

    expect(escaped, '드로어 밖으로 새어나간 포커스').toEqual([]);

    // 역방향도 같다 — 한 쪽만 닫힌 트랩은 트랩이 아니다.
    for (let press = 0; press < 4; press += 1) {
      await page.keyboard.press('Shift+Tab');
    }
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toContainText('Settings');
    expect(
      await page.evaluate(
        () => document.activeElement?.closest('[data-testid="gnb-mobile-menu-panel"]') !== null
      )
    ).toBe(true);
  });

  /** 명세 §2-9 · 규칙 7 — 조용한 pill 이다. 옆의 텍스트 링크와 같은 무게로 선다. */
  test('@smoke assertion:GN-04 desktop settings trigger is a quiet pill carrying the full language name', async ({
    page
  }) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');

    const shell = page.locator('.gnb-settings-trigger-shell');
    const navLink = page.locator('.gnb-desktop .gnb-desktop-link').first();

    const [shellStyles, navStyles] = await Promise.all([
      shell.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          background: styles.backgroundColor,
          borderColor: styles.borderTopColor,
          fontWeight: styles.fontWeight,
          fontSize: styles.fontSize,
          text: element.textContent?.trim() ?? ''
        };
      }),
      navLink.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {fontWeight: styles.fontWeight, fontSize: styles.fontSize};
      })
    ]);

    // 투명 여부는 alpha 로 본다 — `rgba(0, 0, 0, 0)` 과 `transparent` 는 같은 것을 다르게 적는다.
    expect(shellStyles.background, '쉬는 상태에 배경이 있다').toMatch(/rgba\(0, 0, 0, 0\)|transparent/u);
    expect(shellStyles.borderColor, '쉬는 상태에 테두리가 있다').toMatch(/rgba\(0, 0, 0, 0\)|transparent/u);
    expect(shellStyles.fontWeight, '기본 무게가 아니다').toBe(navStyles.fontWeight);
    expect(shellStyles.fontSize, '옆 링크와 크기가 다르다').toBe(navStyles.fontSize);
    // 언어는 **전체 이름**이다 — 코드 약어(`en`)를 쓰지 않는다.
    expect(shellStyles.text).toContain('English');

    await page.getByTestId('gnb-settings-trigger').click();
    await expectSettingsLabel(page, 'desktop', EN_SETTINGS_LABEL);
    await expectDesktopSettingsLayerAlignment(page);
  });

  /** 명세 규칙 3 — 시스템 뒤로가기가 오버레이 층 **전부**를 닫는다. 페이지를 떠나지 않는다. */
  test('@smoke assertion:GN-05 system back closes the drawer and the settings layer without leaving the page', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toHaveCount(0);
    await expect(page).toHaveURL(/\/en$/u);

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.getByTestId('gnb-settings-trigger').click();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('gnb-settings-panel')).toBeHidden();
    await expect(page).toHaveURL(/\/en$/u);
  });
  /**
   * 층을 닫는 것과 페이지를 떠나는 것이 **경주하지 않는다.**
   *
   * 실측(2026-09-16): 층이 history 항목을 갖게 된 직후, 언어 칩을 누르면 `router.push('/ru')` 와
   * 닫힌 층의 `history.back()` 이 함께 날아가 주소가 `/ru` 에 잠깐 닿았다 `/en` 으로 되돌아왔다 —
   * 누르면 아무 일도 일어나지 않는 칩이다. 두 표면 모두 재는 것은 그 둘이 같은 핸들러를 쓰기 때문이다.
   */
  test('@smoke assertion:GN-06 switching locale from either settings surface actually lands on the new locale', async ({
    page
  }) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
    await page
      .getByTestId('mobile-gnb-locale-controls')
      .getByRole('button', {name: getLocaleLabel('ja')})
      .click();

    await expect(page).toHaveURL(/\/ja$/u);
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toHaveCount(0);
    // 뒤로가기 한 번이 원래 자리로 돌려놓는다 — 층의 항목이 한 번 더 가로막지 않는다.
    await page.goBack();
    await expect(page).toHaveURL(/\/en$/u);

    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.getByTestId('gnb-settings-trigger').click();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();
    await page
      .getByTestId('desktop-gnb-locale-controls')
      .getByRole('button', {name: getLocaleLabel('ru')})
      .click();

    await expect(page).toHaveURL(/\/ru$/u);
    await page.goBack();
    await expect(page).toHaveURL(/\/en$/u);
  });
  /**
   * 층이 열린 동안에도 **링크가 듣는다.**
   *
   * 실측(2026-09-16): 설정 레이어에 history 항목을 붙이자 GNB 의 `History` 를 누르는 일이
   * **8 회 중 8 회** 죽었다 — 바깥을 누른 것이 `pointerdown` 에서 레이어를 닫고, 그 닫힘이
   * 항목을 거두면서 방금 시작된 이동을 지운다. 화면에는 오류도 경고도 없고 링크만 날아간다.
   *
   * 재는 것은 「층이 닫혔다」가 아니라 **「주소가 바뀜다」**이다 — 층은 어느 쪽이든 닫히므로
   * 닫힘만 재면 이 결함이 그대로 통과한다(L53).
   */
  test('@smoke assertion:GN-07 a link still navigates while an overlay layer is open', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto('/en');
    await page.getByTestId('gnb-settings-trigger').click();
    await expect(page.getByTestId('gnb-settings-panel')).toBeVisible();

    await page.locator('.gnb-desktop .gnb-desktop-links a').first().click();
    await expect(page).toHaveURL(/\/en\/history$/u);

    // 드로어도 같다 — 패널 **안의** 링크가 이동한다.
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');
    await page.getByTestId('gnb-mobile-menu-trigger').click();
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toBeVisible();
    await page.getByTestId('gnb-mobile-menu-panel').getByRole('link', {name: 'Blog'}).click();
    await expect(page).toHaveURL(/\/en\/blog$/u);
    await expect(page.getByTestId('gnb-mobile-menu-panel')).toHaveCount(0);
  });
  /**
   * 명세 §2-3 · §4 결함 1 — **중앙 정렬의 기준은 컬테이너 전체 폭이다.**
   *
   * 종전에는 테스트 띄에 화면 이름이 아예 없었다 — `Back` 과 플레이스홀더 타이머 둘뿐이고,
   * instruction 이 열린 동안에는 카드의 `h1` 이 시트 뒤에 가려 지금 어디인지를 말하는 것이 하나도
   * 없었다. 재는 것은 제목의 **잉크 중심이 띄의 중심과 같은가**이다 — 양쪽 컨트롤의 폭이 12
   * locale 에서 서로 다르므로, 그 둘 사이에서 가운데 정렬했다면 여기서 바로 드러난다.
   */
  test('@smoke assertion:TB-01 the test bar centres its screen title on the bar, not between the controls', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await seedTelemetryConsent(page, 'OPTED_IN');

    const offenders: string[] = [];

    for (const locale of localeOptions.map(({code}) => code)) {
      for (const width of [320, 390]) {
        await setTouchViewport(page, {width, height: 844});
        await page.goto(buildLocalizedPrimaryTestRoute(locale));

        const title = page.getByTestId('gnb-mobile-title');
        await expect(title).toBeVisible();

        const measured = await page.evaluate(() => {
          const bar = document.querySelector('.gnb-mobile');
          const element = document.querySelector('[data-testid="gnb-mobile-title"]');
          const back = document.querySelector('[data-testid="gnb-mobile-test-back"]');
          const timer = document.querySelector('[data-testid="gnb-mobile-test-timer"]');

          if (!(bar instanceof HTMLElement) || !(element instanceof HTMLElement) || !back || !timer) {
            return null;
          }

          // 상자가 아니라 **글자**의 중심을 재야 한다 — 제목 상자는 띄 전체 폭이라 그것을
          // 재면 어느 정렬이든 항상 통과한다.
          const range = document.createRange();
          range.selectNodeContents(element);
          const ink = range.getBoundingClientRect();
          const barBox = bar.getBoundingClientRect();
          const box = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const textLeft = box.left + Number.parseFloat(style.paddingLeft);
          const textRight = box.right - Number.parseFloat(style.paddingRight);

          return {
            offCentre: Math.abs((ink.left + ink.right) / 2 - (barBox.left + barBox.right) / 2),
            clearLeft: textLeft - back.getBoundingClientRect().right,
            clearRight: timer.getBoundingClientRect().left - textRight,
            lines: Math.round(box.height / Number.parseFloat(style.lineHeight))
          };
        });

        if (!measured) {
          offenders.push(`${locale}@${width}: 띄에서 제목·Back·타이머를 모두 찾지 못했다`);
          continue;
        }

        if (measured.offCentre > 1) {
          offenders.push(`${locale}@${width}: 제목이 ${measured.offCentre.toFixed(1)}px 밀렸다`);
        }
        if (measured.clearLeft < 0 || measured.clearRight < 0) {
          offenders.push(
            `${locale}@${width}: 양쪽 컨트롤과 겹친다(L ${measured.clearLeft.toFixed(1)} / R ${measured.clearRight.toFixed(1)})`
          );
        }
        // 접힘을 방치하지 않는다(명세 §4 결함 3).
        if (measured.lines !== 1) {
          offenders.push(`${locale}@${width}: 제목이 ${measured.lines} 줄이다`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  /**
   * 명세 §2-10 — 링크는 **콘텐츠 끝에 붙는 footer 행**이고 뷰포트 바닥에 고정하지 않는다.
   * 한 화면짜리 표면(히스토리)에서도 같다 — 거기서 고정하면 낙서처럼 떠서 끝릺음이 아니게 된다.
   */
  test('@smoke assertion:FT-01 the footer ends the content and is never pinned to the viewport', async ({page}) => {
    for (const route of ['/en', '/en/history']) {
      await page.setViewportSize({width: 1280, height: 900});
      await page.goto(route);

      const measured = await page.evaluate(() => {
        const footer = document.querySelector('[data-testid="page-footer"]');
        const main = document.querySelector('.page-shell-main');

        if (!(footer instanceof HTMLElement) || !(main instanceof HTMLElement)) {
          return null;
        }

        return {
          position: window.getComputedStyle(footer).position,
          belowMain: footer.getBoundingClientRect().top >= main.getBoundingClientRect().bottom,
          recalls: document.querySelectorAll('[data-testid="page-footer-consent-recall"]').length
        };
      });

      expect(measured, `${route}: footer 를 찾지 못했다`).not.toBeNull();
      expect(measured?.position, `${route}: footer 가 흐름 밖에 있다`).toBe('static');
      expect(measured?.belowMain, `${route}: footer 가 본문 끝에 붙지 않았다`).toBe(true);
      // 데스크톱 동의 수정 진입점은 이것과 고지 행 말고 더 만들지 않는다(§2-10 「하지 않는 것」).
      expect(measured?.recalls, `${route}: footer 의 동의 링크가 하나가 아니다`).toBe(1);
    }

    // 테스트 진행 중 표면에는 두지 않는다 — 그 표면의 GNB 가 설정을 걷는 것과 같은 이유다.
    await seedTelemetryConsent(page, 'OPTED_IN');
    await page.goto(buildLocalizedPrimaryTestRoute('en'));
    await expect(page.getByTestId('page-footer')).toHaveCount(0);
  });
});
