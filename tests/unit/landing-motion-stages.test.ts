import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * 3 단 stagger 는 **정의와 배정이 짝**이어야 한다.
 *
 * CSS 가 40/100/160ms 세 칸을 정의하는데 meta 슬롯이 Middle 로 배정돼 **Late 가 소비자 0 인
 * 채로** 있었다. 죽은 코드처럼 보이지만 죽은 코드가 아니다 — `design.md` §8 이 staged stagger
 * 를 요구하므로 비어 있는 칸은 **배정 누락**이고, 그 상태에서는 셋째 칸의 지연이 화면에
 * 나타나지 않는다. 어느 게이트도 이것을 보지 않았다: CSS 는 유효하고, 마크업은 렌더되며,
 * 스크린샷은 정지 화면이라 지연을 담지 않는다.
 *
 * **소유자 목록을 훑지 않는다**(L30) — `src` 전수에서 `styles.motionStage*` 참조를 세고,
 * CSS 가 정의한 칸 전부가 적어도 하나의 소비자를 갖는지 묻는다.
 */
const STAGE_DEFINITION = /\.motionStage(Early|Middle|Late)\b/gu;
const STAGE_USAGE = /styles\.motionStage(Early|Middle|Late)\b/gu;
const CARD_CSS = 'src/features/landing/grid/landing-grid-card.module.css';

describe('확장 본문의 3 단 stagger', () => {
  it('CSS 가 정의한 칸 전부가 소비자를 갖는다', () => {
    const defined = new Set(
      [...readRepoFile(CARD_CSS).matchAll(STAGE_DEFINITION)].map((match) => match[1])
    );
    expect(defined, '전제: 세 칸이 정의돼 있지 않으면 아래 단언이 공허해진다').toEqual(
      new Set(['Early', 'Middle', 'Late'])
    );

    const used = new Map<string, string[]>();
    for (const file of walkRepoFiles('src', ['.ts', '.tsx'])) {
      for (const match of readRepoFile(file).matchAll(STAGE_USAGE)) {
        used.set(match[1], [...(used.get(match[1]) ?? []), file]);
      }
    }

    const orphaned = [...defined].filter((stage) => !used.has(stage));
    expect(
      orphaned,
      `정의만 있고 배정되지 않은 칸: ${orphaned.join(', ')} — 죽은 코드가 아니라 배정 누락이다`
    ).toEqual([]);
  });

  it('세 칸이 질문 → 선택지 → 메타 순서로 배정된다', () => {
    const body = readRepoFile('src/features/landing/grid/landing-grid-card-expanded-body.tsx');
    const stageOf = (className: string): string | null => {
      const index = body.indexOf(className);
      if (index < 0) {
        return null;
      }
      // 같은 `joinClassNames(...)` 호출 안에서 뒤따르는 stage 를 읽는다.
      const tail = body.slice(index, index + 200);
      return tail.match(/styles\.motionStage(Early|Middle|Late)\b/u)?.[1] ?? null;
    };

    expect(stageOf('LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME, styles')).toBe('Early');
    expect(stageOf('LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME, styles')).toBe('Middle');
    expect(stageOf('LANDING_GRID_CARD_META_ROW_CLASSNAME, styles')).toBe('Late');
  });
});
