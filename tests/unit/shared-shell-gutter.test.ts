import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

import {
  MOBILE_MAX_VIEWPORT_WIDTH,
  MOBILE_SIDE_PADDING,
  NARROW_PADDING_MAX_VIEWPORT_WIDTH,
  NARROW_TABLET_SIDE_PADDING,
  TABLET_DESKTOP_SIDE_PADDING
} from '@/features/landing/grid/layout-plan';

const REPO_ROOT = resolve(__dirname, '../..');
const GLOBALS_CSS = readFileSync(resolve(REPO_ROOT, 'src/app/globals.css'), 'utf8');
const PAGE_SHELL = readFileSync(
  resolve(REPO_ROOT, 'src/features/landing/shell/page-shell.tsx'),
  'utf8'
);
const SITE_GNB = readFileSync(resolve(REPO_ROOT, 'src/features/gnb/site-gnb.tsx'), 'utf8');

const GUTTER_TOKEN = '--shell-gutter';
const GUTTER_UTILITY = 'px-[var(--shell-gutter)]';

/**
 * `--shell-gutter` 선언을 모두 읽는다. 셋이어야 하고 순서는 base → 768 → 900 이다.
 * 미디어 쿼리 조건은 선언 바로 앞의 가장 가까운 `@media` 를 되짚어 읽는다.
 */
function readGutterDeclarations(css: string): Array<{minWidth: number | null; value: string}> {
  const declarations: Array<{minWidth: number | null; value: string}> = [];
  const pattern = new RegExp(`${GUTTER_TOKEN}\\s*:\\s*([^;]+);`, 'g');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(css)) !== null) {
    const preceding = css.slice(0, match.index);
    const mediaMatches = [...preceding.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)];
    const lastMedia = mediaMatches.at(-1);
    const lastMediaIndex = lastMedia?.index ?? -1;
    const bracesAfterMedia =
      lastMediaIndex >= 0 ? preceding.slice(lastMediaIndex) : '';
    const openCount = (bracesAfterMedia.match(/\{/g) ?? []).length;
    const closeCount = (bracesAfterMedia.match(/\}/g) ?? []).length;
    const insideMedia = lastMedia !== undefined && openCount > closeCount;

    declarations.push({
      minWidth: insideMedia ? Number(lastMedia![1]) : null,
      value: match[1]!.trim()
    });
  }

  return declarations;
}

describe('shared shell gutter', () => {
  it('declares the three contract values exactly once each, at the declared boundaries', () => {
    const declarations = readGutterDeclarations(GLOBALS_CSS);

    expect(declarations).toEqual([
      {minWidth: null, value: `${MOBILE_SIDE_PADDING}px`},
      {minWidth: MOBILE_MAX_VIEWPORT_WIDTH + 1, value: `${NARROW_TABLET_SIDE_PADDING}px`},
      {
        minWidth: NARROW_PADDING_MAX_VIEWPORT_WIDTH + 1,
        value: `${TABLET_DESKTOP_SIDE_PADDING}px`
      }
    ]);
  });

  it('drives both shared shell surfaces from that one token', () => {
    expect(PAGE_SHELL).toContain(GUTTER_UTILITY);
    expect(SITE_GNB).toContain(GUTTER_UTILITY);
  });

  it('leaves no competing inline-padding utility on either surface', () => {
    // `md:px-5` 와 `min-[900px]:px-6` 이 같은 속성을 두고 겹치면 emit 순서가 결과를
    // 정한다. 두 표면 모두 그렇게 져 있었으므로(2026-09-11 실측) 경쟁 자체를 금지한다.
    const competingUtility = /(?:^|["\s:])(?:(?:md|lg|xl|2xl|sm|min-\[[^\]]+\]|max-\[[^\]]+\])[^"\s]*?:)?px-(?:\d|\[)/;

    for (const [name, source] of [
      ['page-shell.tsx', PAGE_SHELL],
      ['site-gnb.tsx', SITE_GNB]
    ] as const) {
      const classNameLiterals = [...source.matchAll(/'([^']*px-[^']*)'|"([^"]*px-[^"]*)"/g)].map(
        (match) => match[1] ?? match[2] ?? ''
      );

      for (const literal of classNameLiterals) {
        if (!literal.includes(GUTTER_UTILITY)) {
          continue;
        }

        const withoutGutter = literal.split(GUTTER_UTILITY).join(' ');

        expect(
          competingUtility.test(withoutGutter),
          `${name} 의 공유 셸 클래스 문자열이 ${GUTTER_UTILITY} 외의 좌우 패딩 유틸리티를 함께 갖는다: ${literal}`
        ).toBe(false);
      }
    }
  });
});
