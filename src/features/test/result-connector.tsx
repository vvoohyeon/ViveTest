'use client';

import {useRouter} from 'next/navigation';
import {useEffect, useMemo} from 'react';

import type {AppLocale} from '@/config/site';
import type {ResolvedQuestion} from '@/features/test/question-bank';
import {buildResultAddress} from '@/features/test/result-view-model';
import {TestResultPanel} from '@/features/test/test-result-panel';
import type {LocalizedRoutePath} from '@/i18n/localized-path';

interface ResultConnectorProps {
  questions: ReadonlyArray<ResolvedQuestion>;
  answers: Record<string, string>;
  locale: AppLocale;
  landingPath: LocalizedRoutePath;
  route: string;
  variant: string;
  landingIngressFlag: boolean;
}

/**
 * 끝난 회차를 **주소로 보낸다** — 명세 §2-6.
 *
 * `replace` 인 이유는 뒤로가기의 목적지 때문이다. `push` 하면 결과에서 뒤로가기 한 번이 완료된
 * 회차의 테스트 페이지를 다시 부트스트랩하고, 그 페이지는 instruction 부터 다시 보여 준다.
 * `replace` 로 그 항목을 대체하면 뒤로가기는 **테스트에 들어오기 전 페이지**로 간다. 결과 주소는
 * 새로고침과 공유로 복원되므로 history 에서 테스트 항목이 사라져도 잃는 것이 없다.
 *
 * **패널은 이 이동의 중간 상태다.** 여기서 `TestResultPanel` 을 계속 렌더하는 이유는 두 가지다:
 * 이동이 끝날 때까지 빈 화면을 만들지 않고, `result_viewed` 의 마운트 발화(`req-test.md:75` 의
 * 현재 계약)를 잃지 않기 위해서다. 자식의 effect 가 부모보다 먼저 도므로 발화는 이동 요청보다
 * 앞선다 — 순서가 우연이 아니라 배치에서 나온다.
 *
 * 주소를 만들 수 없으면 **이동하지 않는다.** 그때 남는 화면이 지금까지의 화면이므로 잃는 것이
 * 없고, 절반쯤 만든 주소로 보내는 것보다 낫다. 이유는 `data-result-address-failure` 로 내보내
 * 어느 단계에서 멈췄는지 보이게 한다.
 */
export function ResultConnector({
  questions,
  answers,
  locale,
  landingPath,
  route,
  variant,
  landingIngressFlag
}: ResultConnectorProps) {
  const router = useRouter();
  const address = useMemo(
    () => buildResultAddress({locale, variant, questions, answers}),
    [answers, locale, questions, variant]
  );

  useEffect(() => {
    if (!address.ok) {
      return;
    }

    router.replace(address.address);
  }, [address, router]);

  return (
    <div data-testid="test-result-handoff" data-result-address-failure={address.ok ? undefined : address.reason}>
      <TestResultPanel
        questions={questions}
        answers={answers}
        locale={locale}
        landingPath={landingPath}
        route={route}
        variant={variant}
        landingIngressFlag={landingIngressFlag}
      />
    </div>
  );
}
