import {expect, test, type Page} from '@playwright/test';

import {setTouchViewport} from './helpers/touch-context';

/**
 * 모션과 터치 기본값 — **reduced-motion 의 답은 「전부 0」이 아니다.**
 *
 * `prefers-reduced-motion` 은 *움직임*에 대한 선호이지 색과 불투명도에 대한 선호가 아니다.
 * 그래서 이 검사는 개수를 세지 않고 **성질**을 묻는다: 감소 모드에서 움직이는 원소가 0 인가.
 * 개수로 재면 「몇 개면 충분한가」라는 답할 수 없는 질문이 남고, 개체수가 바뀔 때마다 숫자를
 * 내리는 것으로 끝난다(하한을 개체수에서 유도하지 않는다 — `design-tokens-dark-parity` 의 교훈).
 */

const MOVING_PROPERTIES = /(transform|translate|top|left|right|bottom|width|height|margin|inset)/u;

async function collectMotion(page: Page) {
  return page.evaluate(() => {
    const rows: Array<{label: string; kind: string; detail: string; transform: string}> = [];
    for (const element of Array.from(document.querySelectorAll('*'))) {
      const style = window.getComputedStyle(element);
      const animating = style.animationName !== 'none' && style.animationName !== '';
      const transitioning =
        style.transitionProperty !== 'none' && Number.parseFloat(style.transitionDuration) > 0;
      if (!animating && !transitioning) {
        continue;
      }
      const html = element as HTMLElement;
      rows.push({
        label:
          html.dataset.testid ??
          html.dataset.slot ??
          `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0] ?? ''}`,
        kind: animating ? 'animation' : 'transition',
        detail: animating ? style.animationName : style.transitionProperty,
        transform: style.transform
      });
    }
    return rows;
  });
}

async function openExpandedCard(page: Page) {
  await page.goto('/en');
  await page.locator('[data-card-variant="qmbti"]').getByTestId('landing-grid-card-trigger').click();
  await expect(page.getByTestId('landing-card-sheet')).toBeVisible();
}

test.describe('motion and touch defaults', () => {
  test('@smoke assertion:MO-01 reduced motion keeps colour and fade but moves nothing', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await setTouchViewport(page, {width: 390, height: 844});
    await openExpandedCard(page);

    const rows = await collectMotion(page);
    expect(rows.length, '전제: 감소 모드에서 전이가 하나도 없으면 아래 단언이 공허하다').toBeGreaterThan(0);

    const moving = rows.filter(
      (row) => MOVING_PROPERTIES.test(row.detail) || (row.transform !== 'none' && row.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
    );
    expect(
      moving.map((row) => `${row.label} (${row.kind}: ${row.detail})`),
      '감소 모드에서 움직이는 원소 — 색과 페이드는 남기되 이동은 남기지 않는다'
    ).toEqual([]);
  });

  test('@smoke assertion:MO-01 normal motion still moves — the reduced check is not vacuous', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await openExpandedCard(page);

    const rows = await collectMotion(page);
    const moving = rows.filter(
      (row) => MOVING_PROPERTIES.test(row.detail) || (row.transform !== 'none' && row.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
    );
    expect(
      moving.length,
      '평소 모드에서도 움직이는 것이 0 이면, 위 감소 모드 단언은 감소가 아니라 처음부터 없는 것을 재고 있다'
    ).toBeGreaterThan(0);
  });

  test('@smoke assertion:MO-02 touch defaults reach the document root and every control', async ({page}) => {
    await setTouchViewport(page, {width: 390, height: 844});
    await page.goto('/en');

    // **읽기 전에 레이아웃을 한 번 강제한다.** `overscroll-behavior` 는 루트에서 뷰포트로
    // 전파되는 속성이고, 전파가 해소되기 전의 `getComputedStyle` 은 `auto` 를 돌려준다 —
    // 그런데 `getComputedStyle` 자체는 레이아웃을 강제하지 않으므로 **폴링해도 값이 바뀌지
    // 않는다.** 실측(2026-09-16): 폴링만 두면 5 회 연속 5.6~7.1 초를 기다린 뒤 `auto` 로 실패하고,
    // 앞에 `offsetHeight` 한 줄을 두면 3 회 연속 2.6 초에 초록이다. 「기다리면 된다」가 통하지
    // 않는 자리라서, 폴링은 남기되 장벽을 앞에 둔다.
    await page.evaluate(() => document.documentElement.offsetHeight);

    await expect
      .poll(() => page.evaluate(() => window.getComputedStyle(document.documentElement).overscrollBehaviorY), {
        message: '문서 루트가 당겨-새로고침과 스크롤 체이닝을 끊는다'
      })
      .toBe('none');

    const controls = await page.evaluate(() => {
      const rows: Array<{label: string; touchAction: string}> = [];
      for (const element of Array.from(
        document.querySelectorAll('button:not([disabled]), a[href], [role="button"]')
      )) {
        const html = element as HTMLElement;
        const rect = html.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          continue;
        }
        rows.push({
          label: html.dataset.testid ?? html.dataset.slot ?? html.tagName.toLowerCase(),
          touchAction: window.getComputedStyle(html).touchAction
        });
      }
      return rows;
    });

    expect(controls.length, '전제: 컨트롤을 하나도 못 찾으면 공허하다').toBeGreaterThan(0);
    const waiting = controls.filter((control) => !control.touchAction.includes('manipulation'));
    expect(
      waiting.map((control) => `${control.label} (${control.touchAction})`),
      '더블탭 대기를 남긴 컨트롤 — 그 300ms 동안 화면이 아무 말도 하지 않는다'
    ).toEqual([]);
  });
});
