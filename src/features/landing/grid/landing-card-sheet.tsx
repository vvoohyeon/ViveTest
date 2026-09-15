'use client';

import {useId, useState} from 'react';
import type {KeyboardEventHandler, MouseEvent, MouseEventHandler} from 'react';

import type {AppLocale} from '@/config/site';
import type {LandingCardCopy} from '@/features/landing/grid/landing-card-contract';
import {ExpandedCardBody} from '@/features/landing/grid/landing-grid-card-expanded-body';
import {
  LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {mobilePhaseFromSheetPhase, type LandingMobileExpandedPhase} from '@/features/landing/grid/mobile-lifecycle';
import {BottomSheet} from '@/features/ui/bottom-sheet';
import type {SheetCloseReason} from '@/features/ui/sheet-motion';
import type {SheetPhase} from '@/features/ui/sheet-phase';
import type {LandingCard} from '@/features/variant-registry';

// 폰의 카드 확장 — **바텀시트**(명세 규칙 3 · §3-4). 시트 프리미티브 위에 카드 본문을 얹는
// 것이 이 파일의 전부이고, 층·포커스·잠금·제스처·모션·history 항목은 프리미티브가 갖는다.
//
// 종전의 in-flow 확장이 지키려던 둘은 여전히 유효하되 지키는 방법이 바뀌었다. **연속성**은
// 같은 제목과 같은 본문을 시트가 이어 받아 읽히고, **복귀 정확성**은 절차가 아니라 구조가
// 준다 — 흐름 밖의 시트는 형제를 밀지 않으므로 닫은 뒤 되돌릴 좌표가 애초에 없다.

type LandingTestCard = Extract<LandingCard, {type: 'test'}>;

export interface LandingCardSheetState {
  phase: LandingMobileExpandedPhase;
  cardVariant: string | null;
}

export function LandingCardSheet({
  card,
  locale,
  copy,
  open,
  reducedMotion,
  onCloseRequest,
  onStateChange,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect
}: {
  /** 열려 있는 카드. 닫히는 동안에는 `null` 이 되므로 마지막 카드를 붙들어 본문을 잇는다. */
  card: LandingTestCard | null;
  locale: AppLocale;
  copy: LandingCardCopy;
  open: boolean;
  reducedMotion: boolean;
  onCloseRequest: (reason: SheetCloseReason) => void;
  onStateChange: (state: LandingCardSheetState) => void;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const titleId = useId();
  // 닫히는 동안 `card` 는 `null` 이 되지만 본문은 남아 있어야 이탈이 보인다. 붙들기는 렌더 중
  // 상태 조정으로 한다 — effect 로 미루면 본문이 한 프레임 비고, 그 빈 프레임이 시트가
  // 내려가는 동안 보인다.
  const [retainedCard, setRetainedCard] = useState<LandingTestCard | null>(card);

  if (card && card !== retainedCard) {
    setRetainedCard(card);
  }

  const renderedCard = card ?? retainedCard;
  if (!renderedCard) {
    return null;
  }

  const handleClose: MouseEventHandler<HTMLButtonElement> = () => {
    onCloseRequest('control');
  };

  return (
    <BottomSheet
      open={open}
      layerId="landing-card-sheet"
      titleId={titleId}
      testId="landing-card-sheet"
      closeLabel={copy.closeExpandedAria}
      reducedMotion={reducedMotion}
      onCloseRequest={onCloseRequest}
      onPhaseChange={(phase: SheetPhase) => {
        onStateChange({
          phase: mobilePhaseFromSheetPhase(phase),
          cardVariant: phase === 'closed' ? null : renderedCard.variant
        });
      }}
      header={
        <>
          <h2 className={LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME} id={titleId} data-slot="cardTitle">
            {renderedCard.title}
          </h2>
          {/* 폰 시트는 **보이는** 닫기 컨트롤을 갖는다(규칙 3). 제자리 오버레이에 X 를 두지
              않는 결정은 그쪽의 「카드 밖이 곧 닫기 영역」이라는 사정에서 나온 것이고, 시트에는
              그 사정이 없다. */}
          <button
            type="button"
            className={LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME}
            aria-label={copy.closeExpandedAria}
            data-slot="mobileClose"
            onClick={handleClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </>
      }
    >
      <div data-slot="expandedBody" onKeyDown={onExpandedBodyKeyDown}>
        <ExpandedCardBody
          card={renderedCard}
          locale={locale}
          copy={copy}
          interactive
          onAnswerChoiceSelect={onAnswerChoiceSelect}
        />
      </div>
    </BottomSheet>
  );
}
