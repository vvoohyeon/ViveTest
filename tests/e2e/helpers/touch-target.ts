import {expect, type Page} from '@playwright/test';

/**
 * 터치 타깃 하한과 인접 간격을 재는 공용 프로브.
 *
 * **왜 새로 만드는가.** 저장소에 44px/24px 하한을 단언하는 검사가 하나도 없었고,
 * `@axe-core/playwright` 는 `target-size`(WCAG 2.5.8)를 기본 규칙 집합에서 돌리지 않는다 —
 * 즉 `expectPageToBeAxeClean` 이 초록이어도 타깃 크기는 **한 번도 검사된 적이 없다.**
 *
 * **하한의 출처.** 44px 은 이 저장소가 이미 갖고 있는 `--tap-min`(`src/app/globals.css`) 이고,
 * 그것이 WCAG 2.5.5 Target Size (Enhanced, AAA) 와 같은 값이다. 여기서 새 수를 만들지 않는다.
 *
 * **간격 규칙의 출처.** WCAG 2.5.8 의 간격 예외를 그대로 쓴다 — 겹치지 않는 두 타깃의
 * 중심에 지름 `--tap-min` 의 원을 놓았을 때 두 원이 겹치지 않아야 한다(= 중심 거리 >= 44px).
 * 44px 타깃 둘이 맞닿아 있으면 중심 거리가 정확히 44px 이라 통과한다 — 그것이 규범의 의도다.
 */
export const TAP_MIN_PX = 44;

export interface TouchTargetRect {
  label: string;
  tag: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export async function collectVisibleTouchTargets(page: Page): Promise<TouchTargetRect[]> {
  return page.evaluate((selector) => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const collected: Array<{label: string; tag: string; width: number; height: number; x: number; y: number}> = [];

    for (const element of document.querySelectorAll(selector)) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      const style = window.getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
        continue;
      }

      // 접근성 트리와 탭 순서에서 빠진 것은 만질 수 있는 타깃이 아니다.
      if (element.closest('[aria-hidden="true"]') !== null || element.closest('[inert]') !== null) {
        continue;
      }

      if (element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled')) {
        continue;
      }

      // **만질 수 없는 것은 터치 타깃이 아니다.** skip link 처럼 포커스로만 드러나는 원소는
      // 숨어 있는 동안 `pointer-events: none` 이라 탭의 대상이 되지 않는다 — 그것을 1×1
      // 타깃으로 세면 「보이지도 눌리지도 않는 것」이 하한 위반으로 잡힌다. 포커스를 받아
      // 드러난 상태의 크기는 `assertion:SK-01` 이 따로 고정한다.
      if (style.pointerEvents === 'none') {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      collected.push({
        label:
          element.dataset.testid ??
          element.getAttribute('aria-label') ??
          (element.textContent ?? '').trim().slice(0, 40) ??
          element.tagName,
        tag: element.tagName,
        width: round(rect.width),
        height: round(rect.height),
        x: round(rect.x),
        y: round(rect.y)
      });
    }

    return collected;
  }, INTERACTIVE_SELECTOR);
}

function describeTarget(target: TouchTargetRect): string {
  return `${target.label} [${target.tag}] ${target.width}×${target.height}`;
}

export function findUndersizedTargets(targets: readonly TouchTargetRect[]): TouchTargetRect[] {
  return targets.filter((target) => Math.min(target.width, target.height) < TAP_MIN_PX);
}

export interface TouchTargetCrowding {
  first: TouchTargetRect;
  second: TouchTargetRect;
  centerDistance: number;
}

export function findCrowdedTargetPairs(targets: readonly TouchTargetRect[]): TouchTargetCrowding[] {
  const crowded: TouchTargetCrowding[] = [];

  for (let i = 0; i < targets.length; i += 1) {
    for (let j = i + 1; j < targets.length; j += 1) {
      const first = targets[i];
      const second = targets[j];

      const overlaps =
        first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y;

      // 겹치는 쌍은 간격 규칙의 대상이 아니다(포개진 레이어·래퍼). 크기 규칙이 따로 본다.
      if (overlaps) {
        continue;
      }

      const dx = first.x + first.width / 2 - (second.x + second.width / 2);
      const dy = first.y + first.height / 2 - (second.y + second.height / 2);
      const centerDistance = Math.round(Math.hypot(dx, dy) * 100) / 100;

      if (centerDistance < TAP_MIN_PX) {
        crowded.push({first, second, centerDistance});
      }
    }
  }

  return crowded;
}

export async function expectSurfaceToMeetTouchTargetMinimum(page: Page, surfaceLabel: string): Promise<void> {
  const targets = await collectVisibleTouchTargets(page);

  expect(targets.length, `${surfaceLabel}: 보이는 인터랙티브 원소가 하나도 없다 — 프로브가 표면을 잘못 잡았다`).toBeGreaterThan(0);

  const undersized = findUndersizedTargets(targets);
  expect(
    undersized.map(describeTarget),
    `${surfaceLabel}: --tap-min(${TAP_MIN_PX}px) 미만 타깃`
  ).toEqual([]);

  const crowded = findCrowdedTargetPairs(targets);
  expect(
    crowded.map((pair) => `${describeTarget(pair.first)} ↔ ${describeTarget(pair.second)} = ${pair.centerDistance}px`),
    `${surfaceLabel}: 중심 거리가 ${TAP_MIN_PX}px 미만인 인접 타깃 쌍(WCAG 2.5.8 간격)`
  ).toEqual([]);
}
