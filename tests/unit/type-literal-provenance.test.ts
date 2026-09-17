/**
 * 제품의 활자 리터럴은 **출처를 밝힌다.**
 *
 * `src/**` 에 남은 `text-[13px]` · `text-[0.96rem]` 류 열둘은 이름 붙지 않은 토큰이 아니다.
 * 전부 사다리 밖이거나(`--font` 어느 단계도 그 크기를 갖지 않는다) 크기만 겹친다(크기는
 * 토큰과 같지만 그 토큰의 무게·행간은 이 자리에 맞지 않아 `[font:var(--x)]` 단축을 쓸 수
 * 없다 — 단축은 옆의 `font-semibold` 를 이긴다). 그래서 토큰화는 정리가 아니라 활자
 * 사다리를 바꾸는 설계 결정이고, 그것은 `design.md` §5 와 `ds/colors_and_type.css` 의
 * 소관이다(`AGENTS.md` §2 Visual source precedence).
 *
 * 여기서 고정하는 것은 **표식이 있는가**가 아니라 **표식이 참인가**다. 표식만 요구하는
 * 가드는 도장이 되고, 도장은 값이 변해도 그대로 찍혀 있다(L30·L36).
 *
 * - `off-ladder` — `globals.css` 의 어느 활자 토큰도 그 크기를 갖지 않아야 한다. 나중에
 *   그 크기의 단계가 생기면 이 주장이 거짓이 되어 붉어지고, 그때가 토큰화할 때다.
 * - `partial-role --token` — 지목한 토큰이 실재하고 그 **크기가 리터럴과 같아야** 한다.
 *   크기가 다른 토큰을 적으면 붉어진다.
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

const TYPE_LITERAL = /text-\[(\d+(?:\.\d+)?)(px|rem)\]/gu;
const MARKER = /ds-literal:\s*(off-ladder|partial-role)(?:\s+(--[a-z0-9-]+))?/u;
/** `--name: <weight> <size>px/<lh> var(--font-sans)` 에서 크기만 뽑는다. */
const TYPE_TOKEN = /^\s*(--[a-z0-9-]+):\s*\d+\s+(\d+(?:\.\d+)?)px\/[\d.]+\s+var\(--font-sans\)/u;

/** 토큰 이름 -> 그 토큰이 어느 뷰포트에서든 갖는 px 크기 전부. */
function typeTokenSizes(): Map<string, Set<number>> {
  const sizes = new Map<string, Set<number>>();

  for (const line of readRepoFile('src/app/globals.css').split('\n')) {
    const match = TYPE_TOKEN.exec(line);
    if (!match) continue;
    const bucket = sizes.get(match[1]) ?? new Set<number>();
    bucket.add(Number(match[2]));
    sizes.set(match[1], bucket);
  }

  return sizes;
}

/**
 * 리터럴 바로 위 열 줄. 클래스 문자열은 한 줄이 길어 주석을 문자열 안에 넣을 수 없으므로
 * 표식은 그 위 주석이 진다.
 *
 * **근접으로 충분한 이유는 표식의 주장이 따로 검증되기 때문이다.** 위 리터럴의 표식이 아래
 * 리터럴에 우연히 걸려도, 그 표식은 아래 리터럴의 **자기 px 값**으로 다시 판정된다 —
 * `partial-role --caption` 은 13px 에만 참이고 12.8px 에는 거짓이다. 그래서 범위를 넉넉히
 * 잡아도 도장이 되지 않는다. 선언을 거슬러 찾는 방식은 컴포넌트 안에 인라인된 리터럴에서
 * 엉뚱한 선언에 닿는다(실측: `landing-grid-card-normal-face.tsx:263` 이 `:24` 로 갔다).
 */
const MARKER_REACH_LINES = 10;

function commentAbove(lines: string[], matchIndex: number): string {
  return lines.slice(Math.max(0, matchIndex - MARKER_REACH_LINES), matchIndex).join('\n');
}

describe('제품의 활자 리터럴은 출처를 밝힌다', () => {
  const tokenSizes = typeTokenSizes();
  const allSizes = new Set([...tokenSizes.values()].flatMap((set) => [...set]));

  const literals = walkRepoFiles('src', ['.ts', '.tsx']).flatMap((file) => {
    const text = readRepoFile(file);
    const lines = text.split('\n');

    return [...text.matchAll(TYPE_LITERAL)].map((match) => {
      const lineIndex = text.slice(0, match.index).split('\n').length - 1;
      return {
        file,
        line: lineIndex + 1,
        literal: match[0],
        px: match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1]),
        comment: commentAbove(lines, lineIndex)
      };
    });
  });

  it('활자 토큰과 리터럴을 둘 다 읽어 냈다 — 어느 쪽이 0 이면 검사가 아니라 파서가 죽은 것이다', () => {
    expect(tokenSizes.size).toBeGreaterThan(5);
    expect(literals.length).toBeGreaterThan(0);
  });

  it.each(literals.map((entry) => [`${entry.file}:${entry.line} ${entry.literal}`, entry] as const))(
    '%s 이 출처 표식을 달고 그 표식이 참이다',
    (_label, entry) => {
      const marker = MARKER.exec(entry.comment);

      expect(
        marker,
        `${entry.file}:${entry.line} 의 ${entry.literal} 에 출처 표식이 없다. 선언 위 주석에 ` +
          '`ds-literal: off-ladder` 또는 `ds-literal: partial-role --token` 을 적는다.'
      ).not.toBeNull();

      if (marker?.[1] === 'off-ladder') {
        expect(
          allSizes.has(entry.px),
          `${entry.file}:${entry.line} 은 ${entry.px}px 을 off-ladder 라 적었지만 그 크기의 활자 ` +
            '토큰이 이제 존재한다 — 토큰화할 때다.'
        ).toBe(false);
        return;
      }

      const named = marker?.[2];
      expect(named, `${entry.file}:${entry.line} 의 partial-role 표식이 토큰을 지목하지 않는다`).toBeTruthy();
      expect(
        tokenSizes.get(named ?? ''),
        `${entry.file}:${entry.line} 이 지목한 ${named} 를 globals.css 가 활자 토큰으로 선언하지 않는다`
      ).toBeDefined();
      expect(
        tokenSizes.get(named ?? '')?.has(entry.px),
        `${entry.file}:${entry.line} 은 ${entry.literal} 을 ${named} 의 부분 사용이라 적었지만 ` +
          `${named} 의 크기는 ${[...(tokenSizes.get(named ?? '') ?? [])].join(' / ')}px 이다`
      ).toBe(true);
    }
  );
});
