import {chromium, expect, test, type Page} from '@playwright/test';

import {locales} from '../../src/config/site';

/**
 * 타이포의 뷰포트 축을 **양방향으로** 고정한다.
 *
 * 한쪽만 재면 축이 있는지 알 수 없다 — 모바일 값만 단언하면 데스크톱도 같은 값이 된 회귀를
 * 통과시키고, 데스크톱만 단언하면 축이 통째로 사라져도 초록이다. 그래서 같은 역할을 두 폭에서
 * 재고 **다르다는 것**까지 함께 본다.
 */
const ROLE_PROBES = [
  {role: 'cardTitle', selector: '[data-slot="cardTitle"]', mobile: 18, desktop: 20},
  {role: 'cardSubtitle', selector: '[data-card-variant] p', mobile: 16, desktop: 15}
] as const;

async function fontSizeOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((css) => {
    const element = document.querySelector(css);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`프로브가 원소를 찾지 못했다: ${css}`);
    }

    return Math.round(Number.parseFloat(getComputedStyle(element).fontSize) * 100) / 100;
  }, selector);
}

test.describe('Typography viewport axis', () => {
  test('@smoke assertion:TY-01 tokenized roles take a different step on the phone', async ({browser}) => {
    for (const probe of ROLE_PROBES) {
      const measured: Record<string, number> = {};
      for (const [label, width] of [['mobile', 390], ['desktop', 1280]] as const) {
        const context = await browser.newContext({viewport: {width, height: 844}});
        const page = await context.newPage();
        await page.goto('/en');
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        measured[label] = await fontSizeOf(page, probe.selector);
        await context.close();
      }

      expect(measured.mobile, `${probe.role} @390`).toBe(probe.mobile);
      expect(measured.desktop, `${probe.role} @1280`).toBe(probe.desktop);
      expect(measured.mobile, `${probe.role}: 축이 없다 — 두 폭이 같은 값이다`).not.toBe(measured.desktop);
    }
  });

  test('@smoke assertion:TY-02 the phone carries no tokenized prose below 15px', async ({browser}) => {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    const page = await context.newPage();
    await page.goto('/en');
    // **`document.fonts.ready` 는 렌더 장벽이 아니다.** 카탈로그는 하이드레이션 뒤에 그려지는데
    // 폰트 약속은 그보다 먼저 풀리므로, 그것만 기다리면 census 가 GNB 몇 줄만 보고 끝난다
    // (실측: 6 개 대 47 개). 종전에는 번들 도착이 우연히 빨라 통과하고 있었고, `motion` 제거로
    // 그 우연이 사라지자 드러났다. 피사체가 실제로 그려진 것을 먼저 확인한다.
    await expect(page.locator('[data-testid="landing-grid-card"]').first()).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const census = await page.evaluate(() => {
      const undersized: string[] = [];
      let visible = 0;
      for (const element of document.querySelectorAll('body *')) {
        if (!(element instanceof HTMLElement)) continue;
        const ownText = [...element.childNodes]
          .filter((node) => node.nodeType === 3)
          .map((node) => (node.textContent ?? '').trim())
          .join('');
        if (ownText.length === 0) continue;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        visible += 1;
        const size = Math.round(Number.parseFloat(style.fontSize) * 100) / 100;
        // 재는 것은 **본문**이다. 바닥은 15px — 모바일 열이 `--body-sm` 을 14 → 15 로 올렸고
        // `--button` 은 15 다. 13px 이하는 보조 정보(태그·메타·캡션)이고 밀도와 함께 판정한다.
        //
        // **GNB 띄 안은 본문이 아니라 크롬이다.** 그곳의 활자는 설계 정의가 `--label`(14px, UI
        // 라벨용)로 고정하고 `assertion:GN-01`·`GN-04` 가 그 값을 직접 재므로 여기서 다시 묻지
        // 않는다. 종전에는 이 자리에 `size === 14.08` 이라는 **숫자**가 적혀 있었는데, 그것은
        // pill 에 토큰이 없던 동안의 임시물이고 값이 14px 로 바뀜 순간 조용히 달라진다.
        if (size >= 15 || size <= 13 || element.closest('.gnb-shell') !== null) continue;
        undersized.push(`${element.tagName}.${String(element.className).split(' ')[0]} ${size}px`);
      }

      return {visible, undersized};
    });

    expect(census.visible, '전제: 텍스트를 하나도 못 찾으면 아래 단언이 공허하다').toBeGreaterThan(20);
    // 14px 대로 남은 토큰 역할이 있으면 모바일 열이 그 자리를 놓쳤다는 뜻이다 — 열을 통째로
    // 지우면 `--body-sm` 이 14px 로 떨어져 여기가 붉는다.
    expect(census.undersized).toEqual([]);
    await context.close();
  });
  // 히어로 밴드를 걷고 남긴 것이 **페이지 제목 영역**이다(명세 §2-12). 재는 것은 줄 수와
  // 상자 하나다 — 기준 폭 390px 에서 12 locale 전부 제목 한 줄 · 부제 한 줄이고, 어느 폭에서도
  // 잘리지 않으며, 영역의 높이가 그 두 줄과 선언한 여백의 **합과 정확히 같다**. 마지막 것이
  // 「밴드가 아니다」를 기하로 말한다: 배경도 일러스트도 여분의 높이도 없다는 뜻이다.
  //
  // 320px 에서는 제목이 여섯 locale 에서 두 줄이 된다 — 상한이 둘인 이유이고, 그래서 이 검사는
  // 「한 줄」을 390px 에만 요구하고 「잘리지 않는다」를 두 폭 모두에 요구한다.
  test('@smoke assertion:PH-01 the landing page head stays one title line and one subtitle line in all 12 locales', async ({
    browser
  }) => {
    for (const width of [390, 320] as const) {
      const context = await browser.newContext({viewport: {width, height: 844}, hasTouch: true, isMobile: true});
      const page = await context.newPage();

      for (const locale of locales) {
        await page.goto(`/${locale}`);
        const head = page.locator('.landing-page-head');
        await expect(head).toBeVisible();

        const measured = await head.evaluate((element) => {
          const title = element.querySelector<HTMLElement>('h1');
          const subtitle = element.querySelector<HTMLElement>('p');

          if (!title || !subtitle) {
            throw new Error('페이지 제목 영역에 제목과 부제가 모두 있어야 한다.');
          }

          const read = (node: HTMLElement) => {
            const style = getComputedStyle(node);
            const lineHeight = Number.parseFloat(style.lineHeight);
            return {
              lineHeight,
              lines: Math.round(node.scrollHeight / lineHeight),
              // clamp 된 상자에서 `scrollHeight` 는 잘리지 않은 높이를 돌려준다 — 그래서 잘림은 차이로 읽는다.
              truncated: node.scrollHeight > node.clientHeight + 1
            };
          };

          const style = getComputedStyle(element);
          return {
            title: read(title),
            subtitle: read(subtitle),
            height: element.getBoundingClientRect().height,
            gap: Number.parseFloat(style.rowGap),
            paddingTop: Number.parseFloat(style.paddingTop),
            paddingBottom: Number.parseFloat(style.paddingBottom),
            backgroundImage: style.backgroundImage,
            borderWidth: style.borderTopWidth
          };
        });

        expect(measured.title.truncated, `${locale}/${width} title truncated`).toBe(false);
        expect(measured.subtitle.truncated, `${locale}/${width} subtitle truncated`).toBe(false);
        expect(measured.subtitle.lines, `${locale}/${width} subtitle lines`).toBe(1);

        if (width === 390) {
          expect(measured.title.lines, `${locale}/390 title lines`).toBe(1);
        }

        // 밴드가 아니다 — 두 줄과 선언한 여백 말고는 아무것도 자리를 차지하지 않는다.
        const accounted =
          measured.title.lineHeight * measured.title.lines +
          measured.subtitle.lineHeight * measured.subtitle.lines +
          measured.gap +
          measured.paddingTop +
          measured.paddingBottom;
        expect(Math.abs(measured.height - accounted), `${locale}/${width} unaccounted head height`).toBeLessThanOrEqual(
          1
        );
        expect(measured.backgroundImage, `${locale}/${width} head background`).toBe('none');
        expect(measured.borderWidth, `${locale}/${width} head border`).toBe('0px');
      }

      await context.close();
    }
  });
});

/**
 * WCAG 1.4.4 — **글자를 200% 로 키워도 가로로 끌리지 않는다.**
 *
 * 확대는 브라우저의 **최소 글꼴** 설정으로 흥낸다(26px = 보조 정보 13px 의 두 배).
 * `deviceScaleFactor` 는 화면 전체를 키우므로 규범이 말하는 **글자만** 키우는 것과 다르다 —
 * 레이아웃은 그대로고 글자만 커질 때 무엇이 넘치는가가 재는 것이다.
 *
 * 이 자리에 검사가 없었고, 없는 동안 결함이 하나 살아 있었다 — 실측(2026-09-17):
 * `/ja/test/error` 에서 본문의 `word-break: keep-all` 이 일본어에 줄바꿈 기회를 0 으로
 * 만들어 문서가 가로로 **128px** 끌렸다. 12 locale 중 하나에서, 그것도 확대했을 때만
 * 난다 — 스냅샷도 axe 도 보지 못하는 자리다.
 */
test.describe('Text zoom', () => {
  test('@smoke assertion:ZM-01 no surface scrolls horizontally at 200% text zoom in any locale', async ({baseURL}) => {
    test.setTimeout(180_000);

    // 최소 글꼴은 **기동 인자**라 `test.use({launchOptions})` 를 describe 안에 둔 수 없다
    // (새 worker 를 강제한다). 그래서 이 검사만 자기 브라우저를 연다 — 나머지 검사의 worker
    // 구성을 건드리지 않는 것이 이 모양의 이점이다.
    const browser = await chromium.launch({args: ['--blink-settings=minimumFontSize=26']});

    const routes = [
      ['landing', (locale: string) => `/${locale}`],
      ['blog index', (locale: string) => `/${locale}/blog`],
      ['history', (locale: string) => `/${locale}/history`],
      ['test error', (locale: string) => `/${locale}/test/error`]
    ] as const;

    const offenders: string[] = [];

    for (const [label, build] of routes) {
      for (const locale of locales) {
        const context = await browser.newContext({viewport: {width: 390, height: 844}});
        const page = await context.newPage();
        await page.goto(`${baseURL ?? ''}${build(locale)}`);
        await expect(page.locator('body')).toBeVisible();
        await page.evaluate(async () => {
          await document.fonts.ready;
        });

        const overflow = await page.evaluate(() => ({
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.body.scrollWidth - document.body.clientWidth
        }));

        if (overflow.doc > 0 || overflow.body > 0) {
          offenders.push(`${label}/${locale}: doc ${overflow.doc}px · body ${overflow.body}px`);
        }

        await context.close();
      }
    }

    await browser.close();
    expect(offenders).toEqual([]);
  });
});
