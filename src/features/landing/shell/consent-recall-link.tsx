'use client';

import {useTranslations} from 'next-intl';

import {requestConsentRecall} from '@/features/telemetry/consent-recall';

/**
 * 동의 재호출 진입점의 공통 모양. **버튼도 칩도 아닌 얇은 링크다** — 자주 쓰지 않는 것은
 * 조용하다(명세 규칙 7).
 *
 * **보이는 것과 만지는 것을 분리한다**(명세 §3-1). 잉크는 13px caption 에 배경도 테두리도
 * 없어 링크로 읽히지만, 히트 영역은 `--tap-min`(44px)이다. 처음에는 `py-1` 만 주어 26.84px
 * 였고 `assertion:TT-01` 이 그것을 붉혔다 — 이 저장소의 하한은 WCAG 2.5.5(AAA)와 같은 44px
 * 이고, 규범이 문장 안 링크에 두는 inline 예외를 이 가드는 갖고 있지 않다. 가드를 느슨하게
 * 만드는 대신 제품이 하한을 지킨다(BQ-46).
 *
 * 규칙 7 의 「행을 차지하지 않는다」는 여전히 참이다 — 이것은 우측 정렬된 inline 컨트롤이지
 * 드로어의 이동 링크처럼 폭을 다 쓰는 행이 아니다.
 */
const CONSENT_RECALL_LINK_CLASS = [
  'telemetry-consent-recall-link inline-flex min-h-[var(--tap-min)] cursor-pointer items-center border-0 bg-transparent px-0 py-0',
  '[font:var(--caption)] underline [text-underline-offset:2px]',
  '[transition-property:color] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-standard)] motion-reduce:transition-none',
  'focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:[outline-offset:2px]'
].join(' ');

/**
 * **잉크는 지면이 정한다.** 색 유틸리티를 바탕 문자열에 넣고 호출부에서 덧쓰지 않는 이유는
 * 두 가지다 — 같은 속성을 두 유틸리티가 정하면 명시도가 같아 Tailwind 의 emit 순서가 승자를
 * 정하고(L10), 그보다 먼저 **지면이 다르면 같은 잉크가 기준을 넘지 못한다**. 실측: 같은
 * `--muted-aa`(`#756d66`)가 canvas(`#fbfaf7`) 위에서는 4.86:1 이지만 고지 행의
 * `--surface-muted`(`#ece8df`) 위에서는 **4.15:1** 로 떨어진다(axe 가 이 자리에서 붉혔다).
 *
 * 그래서 톤이 지면의 이름을 갖는다.
 *
 * `quiet` 의 잉크가 `--muted-aa` 인 것은 명세 §2-10 의 「`--muted-aa` 보다 더 흐린 회색이되
 * 4.5:1 이상」이 실현 불가이기 때문이다 — 그 아래 남는 구간이 4.5~4.86 뿐이고, `--muted`
 * (`#817a72`)는 canvas 위에서 4.06:1 이라 이미 기준 미달이다(BQ-46).
 */
const CONSENT_RECALL_TONE_CLASS = {
  /** canvas 지면 — 드로어 설정 블록과 페이지 최하단. */
  quiet: 'text-[var(--muted-aa)] hover:text-[var(--ink-body)]',
  /** `--surface-muted` 지면 — `OPTED_OUT` 고지 행. 실측 대비 light 5.8:1 · dark 7.22:1. */
  onMuted: 'text-[var(--accent-fg)] hover:text-[var(--accent-solid-hover)]'
} as const;

export type ConsentRecallTone = keyof typeof CONSENT_RECALL_TONE_CLASS;

interface ConsentRecallLinkProps {
  /** 기본값은 `consent.recall`. 고지 행처럼 문장 안에 들어가는 자리는 자기 라벨을 준다. */
  label?: string;
  className?: string;
  testId?: string;
  /** 링크가 앉는 지면. 기본은 canvas. */
  tone?: ConsentRecallTone;
  /** 재호출을 요청한 뒤 호출자가 자기 층을 정리할 자리. 드로어는 여기서 자신을 닫는다 — 닫지 않으면 배너가 드로어 스크림 뒤에 뜬다. */
  onActivate?: () => void;
}

export function ConsentRecallLink({label, className, testId, tone = 'quiet', onActivate}: ConsentRecallLinkProps) {
  const t = useTranslations('consent');

  return (
    <button
      type="button"
      className={`${CONSENT_RECALL_LINK_CLASS} ${CONSENT_RECALL_TONE_CLASS[tone]} ${className ?? ''}`}
      data-testid={testId}
      onClick={() => {
        requestConsentRecall();
        onActivate?.();
      }}
    >
      {label ?? t('recall')}
    </button>
  );
}
