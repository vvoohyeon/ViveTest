import {Fragment} from 'react';
import type {MouseEvent} from 'react';

import {resolveHtmlLang, type AppLocale} from '@/config/site';
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
  LANDING_GRID_CARD_META_GROUP_CLASSNAME,
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

/**
 * meta 숫자는 **읽는 사람의 언어**로 쓴다.
 *
 * 종전에는 `Intl.NumberFormat('en-US')` 한 벌이 모듈 상단에 상수로 서 있었고, 그래서 12 locale
 * 전부가 미국식 구분자를 받았다. 구분자 하나가 `15,236` 을 `15.236` 으로 만들고 그 둘은 천
 * 단위와 소수점이라 **다른 수로 읽힌다** — 독일어·스페인어 독자에게는 15 로 보인다.
 *
 * 태그는 `resolveHtmlLang` 이 준다. 제품 locale 코드 `kr` · `zs` · `zt` 는 BCP 47 이 아니라
 * `Intl` 이 모르는 저장소 고유 코드이고, 그대로 넘기면 조용히 시스템 기본 locale 로 떨어진다.
 *
 * 포맷터는 태그로 캐시한다 — 생성이 싸지 않고, 확장 카드 하나가 이 함수를 세 번 부른다.
 */
const metaValueFormatters = new Map<string, Intl.NumberFormat>();

function resolveMetaValueFormatter(locale: AppLocale): Intl.NumberFormat {
  const tag = resolveHtmlLang(locale);
  const cached = metaValueFormatters.get(tag);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.NumberFormat(tag, {maximumFractionDigits: 0});
  metaValueFormatters.set(tag, formatter);
  return formatter;
}

export function formatMetaValue(value: number, locale: AppLocale): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return resolveMetaValueFormatter(locale).format(Math.max(0, Math.trunc(value)));
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

/**
 * `value` 는 **이미 형식이 입혀진 문자열**이다. 숫자를 그대로 들고 다니면 그것을 그리는 말단
 * 컴포넌트까지 `locale` 을 끌고 가야 하고, 그러면 형식 판단이 화면 어휘 안으로 들어간다.
 * 포맷은 `locale` 을 이미 아는 자리에서 한 번만 한다.
 */
interface ExpandedMetaEntry {
  label: string;
  value: string;
}

// Quiet data row (design §6.10): inline "value label" items separated by decorative dots,
// with the complete duration item emphasized. data-slot/data-motion-slot preserved for QA + motion.
//
// 명세 §3-3 — 왼쪽은 **회차에 관한 둘**(소요 · 완료)이고 오른쪽은 **다른 사람들에 관한 하나**
// (공유)다. 그 둘은 같은 종류의 주장이 아니므로 같은 점으로 잉지 않고 행의 끝으로 갈라진다.
function ExpandedMetaItem({entry, lead}: {entry: ExpandedMetaEntry; lead: boolean}) {
  const valueClassName = lead ? LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME : LANDING_GRID_CARD_META_VALUE_CLASSNAME;
  const content = (
    <>
      <span className={valueClassName}>{entry.value}</span>
      <span className={LANDING_GRID_CARD_META_LABEL_CLASSNAME}>{entry.label}</span>
    </>
  );

  return lead ? (
    <strong className={LANDING_GRID_CARD_META_ITEM_LEAD_CLASSNAME}>{content}</strong>
  ) : (
    <span className={LANDING_GRID_CARD_META_ITEM_CLASSNAME}>{content}</span>
  );
}

function ExpandedMetaRow({
  leading,
  trailing,
  interactive
}: {
  leading: readonly [ExpandedMetaEntry, ...ExpandedMetaEntry[]];
  trailing: ExpandedMetaEntry;
  interactive: boolean;
}) {
  return (
    <p
      // 3 단 stagger 의 셋째 칸이다(`design.md:374`). CSS 는 40/100/160ms 를 정의하는데 meta 가
      // Middle 로 배정돼 **Late 가 소비자 0 인 채로 남아** 있었다 — 죽은 코드가 아니라 배정
      // 누락이다. 순서는 질문(Early) → 선택지(Middle) → 메타(Late).
      className={joinClassNames(LANDING_GRID_CARD_META_ROW_CLASSNAME, styles.motionStageLate)}
      data-slot={interactive ? 'meta' : undefined}
      data-motion-slot="meta"
    >
      <span className={LANDING_GRID_CARD_META_GROUP_CLASSNAME} data-meta-group="run">
        {leading.map((entry, index) => (
          <Fragment key={entry.label}>
            {index > 0 ? (
              <span className={LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME} aria-hidden="true">
                ·
              </span>
            ) : null}
            <ExpandedMetaItem entry={entry} lead={index === 0} />
          </Fragment>
        ))}
      </span>
      <span className={LANDING_GRID_CARD_META_GROUP_CLASSNAME} data-meta-group="social">
        <ExpandedMetaItem entry={trailing} lead={false} />
      </span>
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
      leading={[
        {label: copy.metaEstimated, value: formatMetaValue(card.test.meta.durationM, locale)},
        {label: copy.metaAttempts, value: formatMetaValue(card.test.meta.engagedC, locale)}
      ]}
      trailing={{label: copy.metaShares, value: formatMetaValue(card.test.meta.sharedC, locale)}}
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
