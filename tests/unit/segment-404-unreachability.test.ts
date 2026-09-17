/**
 * `[locale]` 안에서 해결되는 404 는 **도달 불가로 유지된다.**
 *
 * L51 이 측정한 것: `[locale]` 안에서 `notFound()` 가 풀리면 응답은 원인과 무관하게
 * `<html id="__next_error__">` 이고 `<body>` 의 보이는 글자가 0 자다. 상태 코드만 맞고
 * 화면에는 아무것도 없으며, 탈출 링크도 없다. 단위 10 이 그래서 도달 가능한 `notFound()`
 * 를 전부 없앴다 — 모르는 variant 는 복구 페이지로, 모르는 경로는 `[locale]` **밖**의
 * 프록시가 처리한다.
 *
 * 그런데 「없앴다」는 과거의 행위이고, 다음 세션이 `notFound()` 를 한 줄 더 쓰는 것을
 * 아무것도 막지 않는다. 그 한 줄은 **초록 위에서** 추가된다: 도달 불가한 결함을 지키는
 * 검사는 고장 주입조차 통과하므로(L42) 기존 게이트는 그것을 볼 수 없고, 사용자만 흰
 * 화면을 본다.
 *
 * 그래서 행위가 아니라 **그것을 도달 불가로 만드는 조건**을 고정한다. 조건은 둘이고 둘
 * 다 성립해야 한다.
 *
 * ⑴ `[locale]/layout.tsx` 가 `dynamicParams = false` 를 선언한다 — 모르는 locale 은 페이지
 *    함수가 돌기 전에 라우팅 층에서 끊긴다(그리고 `generateStaticParams` 가 그 집합을 만든다).
 * ⑵ `src/app/**` 의 모든 `notFound()` 가 `!isLocale(<param>)` 하나를 조건으로 갖는다 —
 *    ⑴ 이 그 조건을 성립 불가로 만드는 유일한 조건이기 때문이다.
 *
 * 파일 목록을 세지 않는다(L30). `src/app` 을 전수로 훑고 **발견된 모든** `notFound()` 에
 * 같은 질문을 묻는다 — 내일 생기는 라우트도 목록에 넣을 필요 없이 같은 규칙을 받는다.
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

const LOCALE_LAYOUT = 'src/app/[locale]/layout.tsx';
/** `if (!isLocale(locale)) {` — 파라미터 이름은 묻지 않는다. 조건의 모양만 묻는다. */
const LOCALE_GUARD = /if\s*\(\s*!\s*isLocale\s*\(\s*[A-Za-z_$][\w$]*\s*\)\s*\)\s*\{\s*$/u;

interface NotFoundCall {
  file: string;
  line: number;
  guard: string;
}

function notFoundCalls(): NotFoundCall[] {
  return walkRepoFiles('src/app', ['.ts', '.tsx']).flatMap((file) => {
    const lines = readRepoFile(file).split('\n');

    return lines.flatMap((line, index) =>
      /(^|[^.\w])notFound\s*\(\s*\)/u.test(line) && !line.trim().startsWith('//')
        ? [{file, line: index + 1, guard: (lines[index - 1] ?? '').trim()}]
        : []
    );
  });
}

describe('`[locale]` 안의 404 는 도달 불가로 유지된다', () => {
  const calls = notFoundCalls();

  it('훑을 `notFound()` 를 찾아냈다 — 0 이면 규칙이 아니라 수집기가 죽은 것이다', () => {
    expect(calls.length).toBeGreaterThan(0);
  });

  it('`[locale]` 레이아웃이 `dynamicParams = false` 와 `generateStaticParams` 를 함께 갖는다', () => {
    const layout = readRepoFile(LOCALE_LAYOUT);

    // 둘이 짝이다 — `dynamicParams = false` 는 생성된 집합 밖을 끊고, 그 집합을 만드는 것이
    // `generateStaticParams` 다. 하나만 있으면 끊는 기준이 없거나 끊지 않는다.
    expect(layout, `${LOCALE_LAYOUT} 이 dynamicParams = false 를 선언하지 않는다`).toMatch(
      /export\s+const\s+dynamicParams\s*=\s*false/u
    );
    expect(layout, `${LOCALE_LAYOUT} 에 generateStaticParams 가 없다`).toMatch(
      /export\s+(async\s+)?function\s+generateStaticParams/u
    );
  });

  it.each(calls.map((call) => [`${call.file}:${call.line}`, call] as const))(
    '%s 의 notFound() 가 locale 가드 뒤에 있다',
    (_label, call) => {
      expect(
        LOCALE_GUARD.test(call.guard),
        `${call.file}:${call.line} 의 notFound() 조건이 \`if (!isLocale(<param>)) {\` 이 아니다 — 바로 위 줄은 ` +
          `\`${call.guard}\` 다.\n` +
          '`[locale]` 안에서 풀리는 404 는 상태 코드만 맞고 `<body>` 가 비어 나간다(L51). ' +
          '모르는 variant 는 `req-test.md` §6.1 의 복구 페이지로, 모르는 경로는 `[locale]` 밖에서 처리한다. ' +
          '정말 이 자리에 404 가 필요하다면 그 응답이 서버에서 글자를 내는지 먼저 재라.'
      ).toBe(true);
    }
  );
});
