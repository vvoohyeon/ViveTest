import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * 설계 정의 계층의 컴포넌트는 **그려져 있어야 한다.**
 *
 * **이 검사가 있는 이유가 곧 이 검사가 막는 일이다.** `docs/design/ds/` 는 런타임이 소비하지
 * 않는 문서 계층이라 저장소의 어떤 게이트도 이 번들을 렌더하지 않는다. 그래서 컴포넌트를
 * 더하고 specimen 을 빠뜨리면 **아무 일도 일어나지 않는다** — `lint` 도 `typecheck` 도
 * `npm test` 도 `qa:rules` 도 전부 초록이고, 그림이 없는 규칙은 Claude Design 의 Design
 * System pane 에서도 카드가 되지 않으므로 존재하지 않는 것과 같아진다.
 *
 * 그 사각지대는 이미 한 번 값을 치렀다. BQ-42 가 제품에 세 번째 답변 마크 상태를 넣었을 때
 * 카탈로그는 두 상태인 채로 남았고 사람이 지적해서야 드러났다 —
 * `answer-choice-catalog-parity.test.ts` 가 그 한 컴포넌트에 대해 세운 가드를, 이 검사가
 * **번들 전체**로 넓힌다.
 *
 * 규칙은 하나다: `app-components.css` · `catalog-components.css` 가 **선언하는** 모든
 * `.vt-*` 클래스는 `preview/` 의 specimen 중 적어도 하나에 나타난다. 허용목록을 두지
 * 않는다 — 목록을 두면 목록 밖에 생긴 것을 구조적으로 보지 못하고(L30), 그것이 정확히 이
 * 사각지대의 모양이다.
 *
 * **이 검사가 보지 못하는 것.** 클래스가 마크업에 **있다**는 것만 보고, 그 specimen 이
 * 그 컴포넌트를 제대로 그리는지는 보지 못한다. 그 판정은 렌더해서 눈으로 하는 일이고
 * (2026-09-16 에 그렇게 해서 시트의 액션 행 배열 · 시트 바닥 여백 · skip link 의 층과 대비
 * 네 가지를 잡았다), 자동으로 옮길 수 있는 부분은 대비 전수와 잘림 검사다.
 */
const BUNDLE_STYLESHEETS = [
  'docs/design/ds/app-components.css',
  'docs/design/ds/catalog-components.css'
] as const;

const PREVIEW_DIR = 'docs/design/ds/preview';

/** 선언부에서만 읽는다 — 자손 선택자(`.vt-drawer .vt-chip`)의 오른쪽은 소비지 선언이 아니다. */
function readDeclaredComponents(): string[] {
  const declared = new Set<string>();

  for (const stylesheet of BUNDLE_STYLESHEETS) {
    for (const match of readRepoFile(stylesheet).matchAll(/^\.(vt-[a-z0-9_-]+)/gmu)) {
      declared.add(match[1]);
    }
  }

  return [...declared].sort();
}

function readSpecimenMarkup(): string {
  return walkRepoFiles(PREVIEW_DIR, ['.html'])
    .map((file) => readRepoFile(file))
    .join('\n');
}

describe('설계 정의의 컴포넌트는 그려져 있다', () => {
  const declared = readDeclaredComponents();
  const markup = readSpecimenMarkup();

  it('전제 — 선언과 specimen 을 모두 읽었다', () => {
    // 정규식이 빗나가거나 디렉터리를 못 찾으면 아래 단언이 조용히 공허해진다.
    expect(declared.length).toBeGreaterThan(0);
    expect(markup.length).toBeGreaterThan(0);
    expect(walkRepoFiles(PREVIEW_DIR, ['.html']).length).toBeGreaterThan(0);
  });

  it('선언된 모든 컴포넌트가 적어도 하나의 specimen 에 나타난다', () => {
    const undrawn = declared.filter((component) => !markup.includes(component));

    expect(
      undrawn,
      `설계 정의에 있으나 어느 specimen 에도 그려지지 않은 컴포넌트:\n${undrawn.join('\n')}`
    ).toEqual([]);
  });

  it('모든 specimen 이 `@dsCard` 마커를 갖는다', () => {
    // 마커가 없으면 Design System pane 이 카드를 만들지 않는다 — 파일은 push 되지만
    // 아무도 보지 못하고, 그것은 그리지 않은 것과 구별되지 않는다(`ds/SYNC.md`).
    const unmarked = walkRepoFiles(PREVIEW_DIR, ['.html']).filter(
      (file) => !/<!--\s*@dsCard\s/u.test(readRepoFile(file))
    );

    expect(unmarked).toEqual([]);
  });

  it('`@dsCard` 마커가 이름과 뷰포트를 갖는다', () => {
    const malformed = walkRepoFiles(PREVIEW_DIR, ['.html']).filter((file) => {
      const marker = readRepoFile(file).match(/<!--\s*@dsCard\s([^>]*)-->/u);
      return marker === null || !/name="[^"]+"/u.test(marker[1]) || !/viewport="\d+x\d+"/u.test(marker[1]);
    });

    expect(malformed).toEqual([]);
  });

  it('아직 실현되지 않은 컴포넌트는 그렇게 표시돼 있다', () => {
    // `docs/design/ds/` 는 제품이 렌더하는 값의 거울이다(`README.md`). step 3 이 만들 표면을
    // 미리 그리면 그 성질이 깨지므로, 그런 블록은 `[intent`로 표시하고 어느 단위가 실현할지
    // 적는다(`AGENTS.md` §3-1 의 I 코드). 표시가 사라지는 것은 둘 중 하나다 — 실현됐거나,
    // 표시를 지웠거나. 전자라면 이 목록에서 빠지는 것이 맞다.
    const intentMarkers = BUNDLE_STYLESHEETS.flatMap((stylesheet) =>
      [...readRepoFile(stylesheet).matchAll(/\[intent[^\]]*\]/gu)].map((match) => match[0])
    );

    expect(intentMarkers.length, 'intent 표시가 하나도 없다 — 이 단언이 공허해졌다').toBeGreaterThan(0);

    const withoutOwner = intentMarkers.filter((marker) => !/step 3/u.test(marker));

    expect(
      withoutOwner,
      `실현 단위를 적지 않은 intent 표시 — 주인이 없으면 영원히 intent 로 남는다:\n${withoutOwner.join('\n')}`
    ).toEqual([]);
  });
});
