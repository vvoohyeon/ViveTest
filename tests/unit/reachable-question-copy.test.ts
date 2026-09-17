import {describe, expect, it} from 'vitest';

import {locales} from '../../src/config/site';
import {questionSourceFixture} from '../../src/features/test/fixtures/questions';
import {
  isRuntimeTestEntryBlocked,
  resolveLandingTestEntryCardByVariant
} from '../../src/features/variant-registry';

/**
 * **도달할 수 있는 회차에 자리표시자를 남기지 않는다.**
 *
 * `qmbti` 의 Q7·Q8 이 `Q_placeholder_qmbti_7` · `Option A` · `Option B` 로 프로덕션에 나가고
 * 있었다. 어느 게이트도 이것을 보지 않았다 — 문자열은 유효하고, 렌더는 멀쩡하며, 문항 수도
 * 맞고, 스냅샷은 그 문항까지 진행하지 않는다. **드러나는 유일한 방법은 끝까지 답해 보는 것**
 * 이었고 그것은 착수 분석이 사람 손으로 한 일이다.
 *
 * 그래서 조건으로 고정한다 — **소유자 목록이 아니라**(L30·L36) 진입이 막히지 않은 variant
 * 전부를 훑고, 그 문항 은행에 자리표시자 어휘가 남아 있는지 묻는다. 새 variant 가 열려도
 * 같은 조건에 걸린다.
 *
 * 아직 열리지 않은 variant(`coming soon`)는 대상이 아니다 — 그쪽의 자리표시자는 읽히지 않고,
 * 열리는 시점에 이 검사가 그것을 잡는다.
 */

const PLACEHOLDER_PATTERNS = [
  /placeholder/iu,
  /^Option [AB]$/u,
  /^옵션 [AB]$/u,
  /^Q\d+$/u,
  /\bTBD\b/u,
  /\bTODO\b/u
];

function findPlaceholder(value: string): string | null {
  const trimmed = value.trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed)) ? trimmed : null;
}

describe('도달 가능한 문항 문구', () => {
  it('진입이 열린 variant 의 문항 은행에 자리표시자가 없다', () => {
    const reachable = Object.keys(questionSourceFixture).filter(
      (variant) =>
        !isRuntimeTestEntryBlocked(variant) &&
        locales.some((locale) => resolveLandingTestEntryCardByVariant(locale, variant) !== null)
    );

    expect(reachable.length, '전제: 진입할 수 있는 variant 가 없으면 아래 단언이 공허하다').toBeGreaterThan(0);

    const offenders = reachable.flatMap((variant) =>
      questionSourceFixture[variant].flatMap((row) =>
        (['question', 'answerA', 'answerB'] as const).flatMap((field) =>
          Object.entries(row[field]).flatMap(([locale, value]) => {
            const found = typeof value === 'string' ? findPlaceholder(value) : null;
            return found ? [`${variant} Q${row.seq} ${field}.${locale}: ${found}`] : [];
          })
        )
      )
    );

    expect(offenders).toEqual([]);
  });
});
