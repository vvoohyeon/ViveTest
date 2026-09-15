import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

/**
 * 답변 선택지의 상태 집합을 제품과 ds 카탈로그가 같이 갖도록 고정한다.
 *
 * **이 검사가 있는 이유가 곧 이 검사가 막는 일이다.** BQ-42 가 제품에 세 번째 마크 상태
 * (`previous-answer`)를 넣었는데 `docs/design/ds/catalog-components.css` 의
 * `.vt-choice--answer` 는 두 상태인 채로 남았고, 아무 게이트도 그것을 보지 못했다 — 카탈로그는
 * 런타임이 소비하지 않는 문서 계층이고 저장소의 어떤 검사도 이 번들을 렌더하지 않는다
 * (`ds/SYNC.md` 「Auditing contrast」가 같은 사각지대를 적는다). 사람이 알아차려 지적하지
 * 않았다면 설계 정의가 제품보다 낡은 채로 Claude Design 에 push 됐을 것이다.
 *
 * 상태 목록을 손으로 적지 않는다 — 타입에서 읽는다. 손으로 적으면 이 검사 자신이 다음 상태를
 * 놓친다.
 */
const REPO_ROOT = resolve(__dirname, '../..');

function read(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), 'utf8');
}

/** `AnswerChoiceState` union 에서 상태 이름을 읽는다. */
function readProductStates(): string[] {
  const source = read('src/features/test/answer-choice-state.ts');
  const union = source.match(/export type AnswerChoiceState =([^;]+);/u);

  expect(union, 'AnswerChoiceState union 을 찾지 못했다').not.toBeNull();

  return Array.from(union![1].matchAll(/'([a-z-]+)'/gu), (match) => match[1]);
}

/** `none` 은 그릴 것이 없는 상태라 카탈로그에 규칙이 없다. */
const UNRENDERED_STATE = 'none';

/** 상태 이름 → 카탈로그 modifier. 이름 규약이 `is-<state>` 하나라 변환이 한 줄이다. */
function catalogModifier(state: string): string {
  return `.vt-choice--answer.is-${state}`;
}

describe('answer choice state parity — product ↔ ds catalog', () => {
  const states = readProductStates();
  const catalog = read('docs/design/ds/catalog-components.css');

  it('상태 집합이 비어 있지 않다', () => {
    // 전제: 정규식이 빗나가면 아래 단언이 조용히 공허해진다.
    expect(states).toContain(UNRENDERED_STATE);
    expect(states.length).toBeGreaterThanOrEqual(3);
  });

  it('그려지는 상태마다 카탈로그에 규칙이 있다', () => {
    const missing = states
      .filter((state) => state !== UNRENDERED_STATE)
      .filter((state) => !catalog.includes(catalogModifier(state)));

    expect(missing).toEqual([]);
  });

  it('카탈로그의 표식 상태가 마크 슬롯 크기를 바꾸지 않는다', () => {
    // 슬롯은 라벨 **뒤**에 있으므로 크기가 달라지면 라벨의 시작이 아니라 **폭**이 줄고, 긴
    // 답변의 줄바꿈이 바뀐다. 상태 규칙이 `width`/`height` 를 건드리면 그 성질이 깨진다.
    const stateBlocks = Array.from(
      catalog.matchAll(/\.vt-choice--answer\.is-[a-z-]+ \.vt-choice__mark \{([^}]*)\}/gu),
      (match) => match[1]
    );

    expect(stateBlocks.length).toBeGreaterThan(0);

    for (const block of stateBlocks) {
      expect(block).not.toMatch(/(?:^|\s)(?:width|height|margin|padding)\s*:/u);
    }
  });

  it('제품이 그 상태를 실제로 렌더한다', () => {
    // 카탈로그만 상태를 갖고 제품이 안 그리는 반대 방향의 표류도 막는다.
    const classNames = read('src/features/test/surface-class-names.ts');

    for (const state of states.filter((item) => item !== UNRENDERED_STATE)) {
      // 런타임은 Tailwind 임의 variant 로 이 상태를 읽는다 — `group-data-[<state>=true]/answer:`.
      expect(classNames, state).toContain(`data-[${state}=true]`);
    }
  });
});
