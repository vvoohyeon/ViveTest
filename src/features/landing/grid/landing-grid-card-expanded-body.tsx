import {Fragment} from 'react';
import type {MouseEvent} from 'react';

import type {AppLocale} from '@/config/site';
import type {LandingCardCopy} from '@/features/landing/grid/landing-card-contract';
import {
  joinClassNames,
  LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME,
  LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME,
  LANDING_GRID_CARD_ANSWER_CHOICE_TEXT_CLASSNAME,
  LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_FLOOR_BODY_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_FLOOR_GROUP_CLASSNAME,
  LANDING_GRID_CARD_EXPANDED_FLOOR_SPACER_CLASSNAME,
  LANDING_GRID_CARD_META_ITEM_CLASSNAME,
  LANDING_GRID_CARD_META_ITEM_LEAD_CLASSNAME,
  LANDING_GRID_CARD_META_LABEL_CLASSNAME,
  LANDING_GRID_CARD_META_ROW_CLASSNAME,
  LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME,
  LANDING_GRID_CARD_META_VALUE_CLASSNAME,
  LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME,
  LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME,
  LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME
} from '@/features/landing/grid/landing-grid-card-classnames';
import {resolveTestPreviewPayload, type LandingCard} from '@/features/variant-registry';
import styles from '@/features/landing/grid/landing-grid-card.module.css';

// 확장 본문 — 질문 · 선택지 · 메타 행. 데스크톱 오버레이와 모바일 in-flow 가 **같은 것**을
// 쓴다. 두 표면이 갈라지는 지점은 `layoutMode` 하나뿐이다: BQ-24 높이 바닥을 흡수하는
// 단일 spacer 를 쓰는 'desktop-overlay-floor' 인가, 모바일의 grid 배치인 'flow' 인가.

type LandingTestCard = Extract<LandingCard, {type: 'test'}>;

// 'desktop-overlay-floor' opts the expanded body into the BQ-24 floor layout (flex column + single
// bottom spacer). 'flow' keeps the shared mobile expanded/transient grid layout untouched.
export type ExpandedBodyLayoutMode = 'flow' | 'desktop-overlay-floor';

const metaValueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

function formatMetaValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return metaValueFormatter.format(Math.max(0, Math.trunc(value)));
}

export interface ExpandedCardBodyProps {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  layoutMode?: ExpandedBodyLayoutMode;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}

interface ExpandedTestBodyProps {
  card: LandingTestCard;
  locale: AppLocale;
  copy: LandingCardCopy;
  interactive: boolean;
  layoutMode: ExpandedBodyLayoutMode;
  onAnswerChoiceSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}

function ExpandedTestAnswerChoice({
  choice,
  label,
  interactive,
  onSelect
}: {
  choice: 'A' | 'B';
  label: string;
  interactive: boolean;
  onSelect?: (choice: 'A' | 'B', event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className={LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME}
      data-slot={interactive ? `answerChoice${choice}` : undefined}
      onClick={(event) => {
        if (interactive) {
          onSelect?.(choice, event);
        }
      }}
      tabIndex={interactive ? undefined : -1}
      aria-hidden={interactive ? undefined : 'true'}
    >
      <span className={LANDING_GRID_CARD_ANSWER_CHOICE_TEXT_CLASSNAME}>{label}</span>
      <span className={LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME} aria-hidden="true">→</span>
    </button>
  );
}

interface ExpandedMetaEntry {
  label: string;
  value: number;
}

// Quiet data row (design §6.10): inline "value label" items separated by decorative dots,
// with the complete duration item emphasized. data-slot/data-motion-slot preserved for QA + motion.
function ExpandedMetaRow({entries, interactive}: {entries: [ExpandedMetaEntry, ...ExpandedMetaEntry[]]; interactive: boolean}) {
  return (
    <p
      // 3 단 stagger 의 셋째 칸이다(`design.md:374`). CSS 는 40/100/160ms 를 정의하는데 meta 가
      // Middle 로 배정돼 **Late 가 소비자 0 인 채로 남아** 있었다 — 죽은 코드가 아니라 배정
      // 누락이다. 순서는 질문(Early) → 선택지(Middle) → 메타(Late).
      className={joinClassNames(LANDING_GRID_CARD_META_ROW_CLASSNAME, styles.motionStageLate)}
      data-slot={interactive ? 'meta' : undefined}
      data-motion-slot="meta"
    >
      {entries.map((entry, index) => (
        <Fragment key={entry.label}>
          {index > 0 ? (
            <span className={LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME} aria-hidden="true">
              ·
            </span>
          ) : null}
          {index === 0 ? (
            <strong className={LANDING_GRID_CARD_META_ITEM_LEAD_CLASSNAME}>
              <span className={LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME}>{formatMetaValue(entry.value)}</span>
              <span className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{entry.label}</span>
            </strong>
          ) : (
            <span className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>
              <span className={LANDING_GRID_CARD_META_VALUE_CLASSNAME}>{formatMetaValue(entry.value)}</span>
              <span className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{entry.label}</span>
            </span>
          )}
        </Fragment>
      ))}
    </p>
  );
}

function ExpandedTestBody({card, locale, copy, interactive, layoutMode, onAnswerChoiceSelect}: ExpandedTestBodyProps) {
  // Preserve the registry resolver boundary; card UI must not read fixture source directly.
  const previewPayload = resolveTestPreviewPayload(card.variant, locale);
  const bodyDataSlot = interactive ? undefined : 'mobileTransientExpandedBody';

  const previewQuestion = (
    <p
      className={joinClassNames(LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME, styles.motionStageEarly)}
      data-slot={interactive ? 'previewQuestion' : undefined}
      data-motion-slot="preview"
    >
      {previewPayload.previewQuestion}
    </p>
  );

  const answerChoices = (
    <div
      className={joinClassNames(LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME, styles.motionStageMiddle)}
      data-slot={interactive ? 'answerChoices' : undefined}
      data-motion-slot="answerChoices"
    >
      <ExpandedTestAnswerChoice
        choice="A"
        label={previewPayload.answerChoiceA}
        interactive={interactive}
        onSelect={onAnswerChoiceSelect}
      />
      <ExpandedTestAnswerChoice
        choice="B"
        label={previewPayload.answerChoiceB}
        interactive={interactive}
        onSelect={onAnswerChoiceSelect}
      />
    </div>
  );

  const meta = (
    <ExpandedMetaRow
      interactive={interactive}
      entries={[
        {label: copy.metaEstimated, value: card.test.meta.durationM},
        {label: copy.metaShares, value: card.test.meta.sharedC},
        {label: copy.metaAttempts, value: card.test.meta.engagedC}
      ]}
    />
  );

  if (layoutMode === 'desktop-overlay-floor') {
    // Single spacer between the last choice and the meta row (design §7.3).
    return (
      <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_BODY_CLASSNAME} data-slot={bodyDataSlot}>
        <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_GROUP_CLASSNAME}>
          {previewQuestion}
          {answerChoices}
        </div>
        <div className={LANDING_GRID_CARD_EXPANDED_FLOOR_SPACER_CLASSNAME} aria-hidden="true" />
        {meta}
      </div>
    );
  }

  return (
    <div className={LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME} data-slot={bodyDataSlot}>
      {previewQuestion}
      {answerChoices}
      {meta}
    </div>
  );
}

export function ExpandedCardBody({
  card,
  locale,
  copy,
  interactive,
  layoutMode = 'flow',
  onAnswerChoiceSelect
}: ExpandedCardBodyProps) {
  return (
    <ExpandedTestBody
      card={card}
      locale={locale}
      copy={copy}
      interactive={interactive}
      layoutMode={layoutMode}
      onAnswerChoiceSelect={onAnswerChoiceSelect}
    />
  );
}
