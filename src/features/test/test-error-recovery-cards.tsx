'use client';

import Link from 'next/link';
import {useMemo, useSyncExternalStore} from 'react';

import {
  hasCommittedResultFlag,
  isVariantCompleted,
  selectRecoveryCards,
  type RecoveryCandidate
} from '@/features/test/recovery-cards';
import {
  getRunHistorySnapshot,
  getServerRunHistorySnapshot,
  subscribeRunHistory
} from '@/features/test/storage/run-history';
import {testBodyClassName, testOverlineClassName, testWellClassName} from '@/features/test/surface-class-names';
import {focusRingClassName} from '@/features/ui/button-class-names';

/**
 * 복구 카드 — `req-test.md` §6.1 「Phase 4 확장 계약」.
 *
 * 클라이언트 컴포넌트인 이유는 완료 증거가 `localStorage` 에 있기 때문이고, `useSyncExternalStore`
 * 를 쓰는 이유는 회차 이력 목록과 **같은 이유**다 — effect 없이 읽고, 서버 스냅샷과 첫
 * 클라이언트 렌더가 같은 값을 보므로 하이드레이션이 어긋나지 않는다.
 *
 * **서버는 거르지 않은 앞의 두 장을 그린다.** 서버에는 이 기기의 완료 증거가 없으므로 거를
 * 근거가 없고, 그 상태에서 한 장도 그리지 않는 쪽을 고르면 스크립트가 없는 브라우저에서 이
 * 화면이 다시 「홈으로」 하나짜리 막다른 곳이 된다 — 이 단위가 없애려던 바로 그 상태다. 이미
 * 끝낸 테스트가 한 장 섞여 보이는 것은 **앞으로 가는 경로**이지 막다른 길이 아니므로, 둘 중
 * 그쪽을 고른다(§6.1 「막다른 곳에 막다른 화면을 두지 않는다」).
 */

const recoveryCardsSectionClassName = 'mt-5 grid w-full gap-2 text-left';
const recoveryCardsLabelClassName = `${testOverlineClassName} text-center`;
const recoveryCardsListClassName = 'm-0 grid list-none gap-2 p-0';
// 누름 스킨을 hover 와 **같은 리터럴**에 둔다. 터치에는 hover 가 없으므로 둘은 짝이고
// (`press-feedback.test.ts`), 그 검사는 문자열 리터럴 하나를 단위로 읽으므로 줄을 갈라 두면
// 같은 클래스인데도 짝이 없는 것으로 읽힌다 — 실제로 그렇게 한 번 붉혔다.
const recoveryCardHoverPressClassName =
  'hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] active:border-[var(--border-strong)] active:bg-[var(--surface-strong)]';
const recoveryCardClassName =
  `flex min-h-[var(--tap-min)] items-center px-4 py-3 ${testWellClassName} ${focusRingClassName} ` +
  'no-underline [color:inherit] [transition-duration:140ms] [transition-property:background-color,border-color] ' +
  `[transition-timing-function:ease] motion-reduce:transition-none ${recoveryCardHoverPressClassName}`;
const recoveryCardNameClassName = `${testBodyClassName} [word-break:keep-all] [overflow-wrap:anywhere]`;

interface TestErrorRecoveryCardsProps {
  /** 카탈로그 **선언 순서**대로 온다. 여기서 다시 정렬하지 않는다(계약 1 항). */
  candidates: RecoveryCandidate[];
  label: string;
}

export function TestErrorRecoveryCards({candidates, label}: TestErrorRecoveryCardsProps) {
  const history = useSyncExternalStore(subscribeRunHistory, getRunHistorySnapshot, getServerRunHistorySnapshot);

  const cards = useMemo(
    () =>
      selectRecoveryCards(candidates, (variantId) =>
        isVariantCompleted({
          variantId,
          history,
          hasCommittedResultFlag: hasCommittedResultFlag(variantId)
        })
      ),
    [candidates, history]
  );

  // 전체 완료면 카드는 0 개이고 랜딩 CTA 만 남는다(계약 엣지 2). 빈 제목만 남기지 않는다.
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className={recoveryCardsSectionClassName} data-testid="test-error-recovery-cards">
      <h2 className={recoveryCardsLabelClassName} id="test-error-recovery-cards-label">
        {label}
      </h2>
      <ul className={recoveryCardsListClassName} aria-labelledby="test-error-recovery-cards-label">
        {cards.map((card) => (
          <li key={card.variantId}>
            <Link className={recoveryCardClassName} href={card.href} data-testid="test-error-recovery-card">
              <span className={recoveryCardNameClassName}>{card.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
