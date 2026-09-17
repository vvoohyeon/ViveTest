import {describe, expect, it} from 'vitest';

import {readRepoFile, walkRepoFiles} from './helpers/repo';

/**
 * `word-break: keep-all` 은 **혼자 쓰이면 CJK 에서 줄바꿈 기회를 0 으로 만든다.**
 *
 * 그 값은 한국어를 위한 것이다 — 어절 안에서 끊기지 않게 한다. 그런데 일본어·중국어에는
 * 공백이 없으므로 `keep-all` 이 문장 전체를 **끊을 수 없는 한 덩어리**로 만들고, 그 덩어리의
 * min-content 폭이 그대로 조상 상자의 폭이 된다.
 *
 * 실측(2026-09-17, 390px / 최소 글꼴 26px = 200% 확대): `/ja/test/error` 의 본문이 459px 로
 * 펼쳐져 문서가 가로로 **128px** 끌렸다. 평상시에는 글자가 짧아 드러나지 않고, 12 locale 중
 * 일본어 하나에서만, 그것도 확대했을 때만 난다 — 눈으로도 스냅샷으로도 보이지 않는 자리다.
 *
 * 저장소는 이미 그 짝을 알고 있었다: `keep-all` 을 쓰는 아홉 자리 중 **여덟이**
 * `overflow-wrap` 탈출구를 함께 달고 있었고 하나만 빠져 있었다. 관행을 조건으로 바꾼다.
 */
const KEEP_ALL = /\[word-break:keep-all\]/gu;
const ESCAPE = /\[overflow-wrap:(anywhere|break-word)\]/u;

describe('줄바꿈 금지에는 탈출구가 함께 간다', () => {
  it('`word-break:keep-all` 을 쓰는 모든 자리가 `overflow-wrap` 탈출구를 갖는다', () => {
    const offenders: string[] = [];
    let sites = 0;

    for (const file of walkRepoFiles('src', ['.ts', '.tsx'])) {
      const source = readRepoFile(file);

      source.split('\n').forEach((line, index) => {
        if (!KEEP_ALL.test(line)) {
          KEEP_ALL.lastIndex = 0;
          return;
        }
        KEEP_ALL.lastIndex = 0;
        sites += 1;

        // 같은 클래스 문자열이 두 줄로 접혀 있을 수 있으므로 앞뒤 한 줄까지 함께 본다.
        const neighbourhood = source.split('\n').slice(Math.max(0, index - 1), index + 2).join('\n');
        if (!ESCAPE.test(neighbourhood)) {
          offenders.push(`${file}:${index + 1}`);
        }
      });
    }

    expect(sites, '전제: `keep-all` 을 쓰는 자리가 없으면 아래 단언이 공허하다').toBeGreaterThan(3);
    expect(offenders).toEqual([]);
  });
});
