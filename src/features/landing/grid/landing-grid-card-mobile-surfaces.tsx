import type {KeyboardEventHandler, MouseEvent, MouseEventHandler} from 'react';

import type {AppLocale} from '@/config/site';
import type {
  LandingCardCopy,
  LandingCardMobileTransientMode
} from '@/features/landing/grid/landing-card-contract';
import {
  joinClassNames,
  LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_CLOSE_GHOST_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TRANSIENT_HEADER_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_TRANSIENT_SURFACE_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {ExpandedCardBody} from '@/features/landing/grid/landing-grid-card-expanded-body';
import {CONSENT_BANNER_AVOID_ATTRIBUTE} from '@/features/landing/shell/consent-banner';
import type {LandingCard} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

// 모바일의 확장 표면 둘. 정착한 in-flow 본문(OPEN)과, 열리거나 닫히는 동안에만 존재하는
// transient 셸이다. 둘은 같은 본문을 쓰지만 역할이 다르다 — in-flow 는 상호작용 가능한
// 실제 카드이고, transient 셸은 `aria-hidden` 인 모션 전용 표면이다.

type LandingTestCard = Extract<LandingCard, {type: 'test'}>;

export function MobileExpandedSurface({
  card,
  locale,
  copy,
  closeDisabled,
  onClose,
  onExpandedBodyKeyDown,
  onAnswerChoiceSelect
}: {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  closeDisabled: boolean;
  onClose?: MouseEventHandler<HTMLButtonElement>;
  onExpandedBodyKeyDown?: KeyboardEventHandler<HTMLElement>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={joinClassNames(LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME, styles.mobileExpanded, styles.expandedBody)}
      data-slot="expandedBody"
      {...{[CONSENT_BANNER_AVOID_ATTRIBUTE]: ''}}
      onKeyDown={onExpandedBodyKeyDown}
    >
      <div className={LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME} data-slot="mobileHeader">
        <h2 className={LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME} data-slot="cardTitle">
          {card.title}
        </h2>
        <button
          type="button"
          className={LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME}
          aria-label={copy.closeExpandedAria}
          data-slot="mobileClose"
          onClick={onClose}
          disabled={closeDisabled}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <ExpandedCardBody
        card={card}
        locale={locale}
        copy={copy}
        interactive
        onAnswerChoiceSelect={onAnswerChoiceSelect}
      />
    </div>
  );
}

export function MobileTransientShell({
  card,
  locale,
  copy,
  shellClassName,
  transientMode,
  onAnswerChoiceSelect
}: {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  shellClassName: string;
  transientMode: Exclude<LandingCardMobileTransientMode, 'NONE'>;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={shellClassName}
      data-slot="mobileTransientShell"
      data-state={transientMode}
      {...{[CONSENT_BANNER_AVOID_ATTRIBUTE]: ''}}
      aria-hidden="true"
    >
      <div
        className={joinClassNames(LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME, styles.transientPanel)}
        data-slot="mobileTransientPanel"
      />
      <div className={LANDING_GRID_CARD_MOBILE_TRANSIENT_SURFACE_CLASSNAME}>
        <div className={LANDING_GRID_CARD_MOBILE_TRANSIENT_HEADER_CLASSNAME}>
          <h2 className={LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME} data-slot="cardTitleTransient">
            {card.title}
          </h2>
          <span
            className={LANDING_GRID_CARD_MOBILE_CLOSE_GHOST_CLASSNAME}
            data-slot="mobileCloseGhost"
          >
            <span aria-hidden="true">×</span>
          </span>
        </div>
        <ExpandedCardBody
          card={card}
          locale={locale}
          copy={copy}
          interactive={false}
          onAnswerChoiceSelect={onAnswerChoiceSelect}
        />
      </div>
    </div>
  );
}
