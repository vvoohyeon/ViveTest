/**
 * `Intl` 포맷터는 **읽는 사람의 언어**로 만든다.
 *
 * 숫자·날짜 형식은 locale 마다 다르다. 구분자 하나로 `15,236` 이 `15.236` 이 되고, 그 둘은
 * 천 단위와 소수점이라 **다른 수로 읽힌다**. 그런데 포맷터를 만드는 자리는 눈에 잘 띄지 않는다 —
 * 모듈 최상단에 상수 한 줄로 서 있고, 화면에는 그럴듯한 숫자가 나오므로 12 locale 을 전부
 * 열어 보기 전에는 아무것도 붉지 않는다.
 *
 * 그래서 **리터럴 태그로 만드는 것 자체를 금지한다.** 목록이 아니라 조건이므로 내일 생기는
 * 포맷터도 같은 규칙을 받는다(L30).
 *
 * 태그는 `resolveHtmlLang(locale)` 로 얻는다 — 제품 locale 코드 `kr` · `zs` · `zt` 는 BCP 47 이
 * 아니라 `Intl` 이 모르는 저장소 고유 코드이고, 그대로 넘기면 조용히 시스템 기본 locale 로
 * 떨어진다(`src/config/site.ts` 가 그 대응을 소유한다).
 */
import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/** `new Intl.<X>(` 의 첫 인자가 문자열 리터럴인 자리. */
const INTL_WITH_LITERAL_TAG = /new\s+Intl\.[A-Za-z]+\(\s*(['"`])/gu;
/** `new Intl.<X>(` 전부 — 하나도 못 찾으면 규칙이 아니라 수집기가 죽은 것이다. */
const ANY_INTL_CONSTRUCTION = /new\s+Intl\.[A-Za-z]+\(/gu;

describe('`Intl` 포맷터는 리터럴 태그로 만들지 않는다', () => {
  const sources = walkRepoFiles('src', ['.ts', '.tsx']).map((file) => ({
    file,
    text: readRepoFile(file)
  }));

  it('훑을 `Intl` 생성 자리를 찾아냈다', () => {
    const total = sources.reduce((sum, {text}) => sum + [...text.matchAll(ANY_INTL_CONSTRUCTION)].length, 0);
    expect(total, '`src` 에 Intl 생성이 하나도 없다 — 수집기가 죽었다').toBeGreaterThan(0);
  });

  it('첫 인자가 리터럴인 자리가 없다', () => {
    const offenders = sources.flatMap(({file, text}) =>
      [...text.matchAll(INTL_WITH_LITERAL_TAG)].map((match) => {
        const line = text.slice(0, match.index).split('\n').length;
        return `${file}:${line}`;
      })
    );

    expect(
      offenders,
      '`Intl` 포맷터를 리터럴 태그로 만들면 12 locale 전부에 그 한 언어의 형식이 나간다. ' +
        '`resolveHtmlLang(locale)` 을 넘긴다 — 제품 코드 `kr`·`zs`·`zt` 는 BCP 47 이 아니므로 그대로 넘기면 안 된다.'
    ).toEqual([]);
  });
});
