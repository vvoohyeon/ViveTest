// 카드가 쓰는 utility 클래스 문자열 전부와, 그것을 다루는 두 헬퍼.
//
// 값이 아니라 **의존 방향** 때문에 따로 있다. 카드가 다섯 파일로 갈리면서 자식 넷이 전부 이
// 문자열들을 읽는데, 이것이 카드 파일에 남으면 자식 → 카드 순환 import 가 생긴다.
// 여기 있는 문자열은 `scripts/qa/check-phase5·6·8·9` 가 이름으로 찾는 계약 표면이므로
// 철자를 바꾸지 않는다.

export function resolveTransformOriginClassName(originX: '0%' | '50%' | '100%'): string {
  switch (originX) {
    case '0%':
      return '[--landing-card-shell-extra-start:0%] [--landing-card-shell-extra-end:calc((var(--landing-card-shell-inline-scale)-1)*100%)]';
    case '100%':
      return '[--landing-card-shell-extra-start:calc((var(--landing-card-shell-inline-scale)-1)*100%)] [--landing-card-shell-extra-end:0%]';
    case '50%':
    default:
      return '[--landing-card-shell-extra-start:calc((var(--landing-card-shell-inline-scale)-1)*50%)] [--landing-card-shell-extra-end:calc((var(--landing-card-shell-inline-scale)-1)*50%)]';
  }
}

export function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export const LANDING_GRID_CARD_ROOT_CLASSNAME =
  'landing-grid-card group relative isolate min-w-0 overflow-visible rounded-[var(--landing-card-radius)] [--landing-card-radius:16px] [--landing-card-stage-shadow-bleed-x:72px] [--landing-card-stage-shadow-bleed-top:56px] [--landing-card-stage-shadow-bleed-bottom:192px] [--landing-card-origin-y:0%] [--landing-card-shell-scale:1.04] [--landing-card-shell-inline-scale:1] [--landing-card-shell-extra-start:0%] [--landing-card-shell-extra-end:0%] [--landing-card-motion-ms:280ms]';
export const LANDING_GRID_CARD_TRIGGER_BASE_CLASSNAME =
  'landing-grid-card-trigger relative block w-full rounded-[inherit] [border:0] bg-transparent text-left [color:inherit] cursor-pointer focus:outline-none aria-[disabled=true]:cursor-default';
export const LANDING_GRID_CARD_CONTENT_CLASSNAME =
  'landing-grid-card-content relative z-[1] flex min-w-0 flex-col justify-start';
export const LANDING_GRID_CARD_TITLE_BASE_CLASSNAME =
  'landing-grid-card-title relative z-[3] m-0 [font:var(--t-card-title)] [letter-spacing:var(--track-tight)] [overflow-wrap:anywhere]';
export const LANDING_GRID_CARD_SUBTITLE_BASE_CLASSNAME =
  'landing-grid-card-subtitle min-w-0 [font:var(--t-card-subtitle)] text-[var(--normal-subtitle-ink)] [overflow-wrap:anywhere]';
export const LANDING_GRID_CARD_THUMBNAIL_SLOT_CLASSNAME =
  'landing-grid-card-thumbnail-slot relative aspect-[16/6] w-full min-w-0 shrink-0 overflow-hidden rounded-[var(--normal-thumb-radius)] bg-[color-mix(in_srgb,var(--surface-muted)_85%,transparent)]';
export const LANDING_GRID_CARD_TAGS_CLASSNAME =
  'landing-grid-card-tags m-0 flex min-h-7 min-w-0 shrink-0 list-none items-center gap-2 overflow-hidden p-0';
export const LANDING_GRID_CARD_TAGS_GAP_CLASSNAME =
  'landing-grid-card-tags-gap h-[calc(var(--landing-card-base-gap)_+_var(--landing-card-comp-gap))]';
export const LANDING_GRID_CARD_TAG_ITEM_CLASSNAME = 'landing-grid-card-tag-item min-w-0 flex-[0_1_auto]';
export const LANDING_GRID_CARD_TAG_CHIP_CLASSNAME =
  'landing-grid-card-tag-chip block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--normal-tag-radius)] bg-[var(--normal-tag-bg)] px-[9px] py-1 text-[13px] font-medium text-[var(--normal-tag-ink)]';
export const LANDING_GRID_CARD_PREVIEW_QUESTION_CLASSNAME =
  'landing-grid-card-preview-question m-0 [font:var(--t-expanded-question)] [letter-spacing:var(--track-tight)] text-[var(--expanded-question-ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
export const LANDING_GRID_CARD_ANSWER_GRID_CLASSNAME = 'landing-grid-card-answer-grid grid gap-2';
export const LANDING_GRID_CARD_ANSWER_CHOICE_CLASSNAME =
  'landing-grid-card-answer-choice group/answerChoice flex items-start gap-3 cursor-pointer overflow-visible rounded-[12px] border border-[var(--expanded-choice-border)] bg-[var(--expanded-choice-surface)] px-3.5 py-3 text-left text-clip transition-[border-color,background-color] duration-[140ms] [transition-timing-function:ease] motion-reduce:transition-none disabled:cursor-default hover:border-[var(--expanded-choice-accent)] hover:bg-[var(--expanded-choice-accent-surface)] focus-visible:[outline:2px_solid_var(--expanded-choice-accent)] focus-visible:[outline-offset:2px]';
export const LANDING_GRID_CARD_ANSWER_CHOICE_TEXT_CLASSNAME =
  'landing-grid-card-answer-choice-text min-w-0 flex-1 [font:var(--t-choice)] text-[var(--expanded-choice-ink)] [word-break:keep-all] [overflow-wrap:anywhere]';
export const LANDING_GRID_CARD_ANSWER_CHOICE_ARROW_CLASSNAME =
  'landing-grid-card-answer-choice-arrow shrink-0 [font:var(--t-choice)] text-[var(--expanded-choice-arrow-ink)] transition-colors duration-[140ms] [transition-timing-function:ease] motion-reduce:transition-none group-hover/answerChoice:text-[var(--expanded-choice-accent)]';
// design §6.10 quiet data row: horizontal wrapping row, dot separators, 13px/500/--muted,
// with the complete duration item emphasized. Inline value+label per item (no dt/dd stack).
export const LANDING_GRID_CARD_META_ROW_CLASSNAME =
  'landing-grid-card-meta-row m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-medium leading-[1.35] text-[var(--expanded-context-ink)]';
export const LANDING_GRID_CARD_META_ITEM_CLASSNAME =
  'landing-grid-card-meta-item inline-flex items-baseline gap-1 whitespace-nowrap';
export const LANDING_GRID_CARD_META_ITEM_LEAD_CLASSNAME =
  'landing-grid-card-meta-item landing-grid-card-meta-item-lead inline-flex items-baseline gap-1 whitespace-nowrap font-semibold text-[var(--expanded-meta-strong)]';
export const LANDING_GRID_CARD_META_SEPARATOR_CLASSNAME =
  'landing-grid-card-meta-separator select-none [color:color-mix(in_srgb,var(--expanded-context-ink)_55%,transparent)]';
export const LANDING_GRID_CARD_META_VALUE_CLASSNAME = 'landing-grid-card-meta-value';
export const LANDING_GRID_CARD_META_VALUE_LEAD_CLASSNAME =
  'landing-grid-card-meta-value landing-grid-card-meta-value-lead';
export const LANDING_GRID_CARD_META_LABEL_CLASSNAME = 'landing-grid-card-meta-label';
export const LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME =
  'landing-grid-card-title [font:var(--label)] text-[var(--expanded-context-ink)] [overflow-wrap:anywhere]';
// Desktop overlay expandedBody is a flex column so the BQ-24 height-floor surplus can be absorbed
// by a single spacer (design §7.3). Mobile expanded/transient bodies keep their own grid layout.
export const LANDING_GRID_CARD_EXPANDED_CLASSNAME = 'landing-grid-card-expanded mt-0 flex min-w-0 flex-col gap-[10px] p-4';
// desktop-overlay-floor body chain: flex-1 body fills the floored expandedBody; the single spacer
// (flex:1, min-height 14px) sits between the last choice / subtitle and the meta(+CTA) group so the
// meta anchors to the bottom and the card grows downward (content-fit) when content overflows.
export const LANDING_GRID_CARD_EXPANDED_FLOOR_BODY_CLASSNAME = 'landing-grid-card-expanded-floor-body flex min-w-0 flex-1 flex-col';
export const LANDING_GRID_CARD_EXPANDED_FLOOR_GROUP_CLASSNAME = 'landing-grid-card-expanded-floor-group flex min-w-0 flex-col gap-[10px]';
export const LANDING_GRID_CARD_EXPANDED_FLOOR_SPACER_CLASSNAME = 'landing-grid-card-expanded-floor-spacer min-h-[14px] flex-1';
export const LANDING_GRID_CARD_SHELL_GHOST_CLASSNAME = 'landing-grid-card-shell-ghost invisible';
export const LANDING_GRID_CARD_DESKTOP_STAGE_CLASSNAME = 'landing-grid-card-desktop-stage absolute inset-0 z-[3] pointer-events-none';
export const LANDING_GRID_CARD_EXPANDED_LAYER_CLASSNAME =
  'landing-grid-card-expanded-layer pointer-events-none absolute z-[1] [inset:var(--landing-card-stage-shadow-bleed-top)_var(--landing-card-stage-shadow-bleed-x)_var(--landing-card-stage-shadow-bleed-bottom)_var(--landing-card-stage-shadow-bleed-x)]';
export const LANDING_GRID_CARD_EXPANDED_SHELL_FRAME_CLASSNAME =
  'landing-grid-card-expanded-shell-frame relative left-0 min-h-full min-w-0 w-full pointer-events-none will-change-[left,width] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
export const LANDING_GRID_CARD_EXPANDED_SHELL_CLASSNAME =
  'landing-grid-card-expanded-shell relative min-h-full min-w-0 w-full pointer-events-none [transform:scale(var(--landing-card-shell-scale))] [transform-origin:var(--landing-card-origin-x)_var(--landing-card-origin-y)] will-change-transform [backface-visibility:hidden] [-webkit-backface-visibility:hidden]';
export const LANDING_GRID_CARD_EXPANDED_SHADOW_CLASSNAME =
  'landing-grid-card-expanded-shadow pointer-events-none absolute inset-0 z-0 rounded-[var(--landing-card-radius)] [box-shadow:var(--expanded-card-shadow)]';
export const LANDING_GRID_CARD_EXPANDED_SURFACE_CLASSNAME =
  'landing-grid-card-expanded-surface relative z-[1] min-h-full w-full rounded-[var(--landing-card-radius)] [background:var(--expanded-card-surface)] [box-shadow:0_0_0_1px_var(--expanded-card-border)] pointer-events-auto';
// D-09, the card's instance of it. design.md 4.10 names the close button at 44x44.
export const LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME =
  'landing-grid-card-mobile-close relative inline-flex min-h-[var(--tap-min)] min-w-[var(--tap-min)] shrink-0 basis-auto items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-strong)] p-0 font-semibold [color:var(--ink)]';
export const LANDING_GRID_CARD_MOBILE_CLOSE_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME} cursor-pointer disabled:cursor-default disabled:opacity-70`;
export const LANDING_GRID_CARD_MOBILE_CLOSE_GHOST_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_CLOSE_BASE_CLASSNAME} landing-grid-card-mobile-close-ghost pointer-events-none`;
export const LANDING_GRID_CARD_MOBILE_EXPANDED_CLASSNAME =
  'landing-grid-card-mobile-expanded grid min-w-0 max-h-[calc(100dvh-116px)] gap-0 overflow-auto overscroll-contain px-4 pb-4';
export const LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME =
  'landing-grid-card-mobile-header sticky top-0 z-[4] flex items-start justify-between gap-3 bg-[var(--expanded-card-surface)] pt-4 pb-[14px]';
export const LANDING_GRID_CARD_MOBILE_TITLE_CLASSNAME =
  `${LANDING_GRID_CARD_EXPANDED_CONTEXT_CLASSNAME} landing-grid-card-mobile-title min-w-0 flex-1`;
export const LANDING_GRID_CARD_MOBILE_BODY_CLASSNAME = 'landing-grid-card-mobile-body grid min-w-0 gap-[10px]';
export const LANDING_GRID_CARD_MOBILE_TRANSIENT_SHELL_CLASSNAME =
  'landing-grid-card-mobile-transient-shell fixed left-[var(--landing-mobile-card-left,0px)] top-[var(--landing-mobile-anchor-top,0px)] z-[21] max-h-[calc(100dvh-116px)] max-w-full w-[var(--landing-mobile-card-width,100vw)] overflow-hidden rounded-[var(--landing-card-radius)] [box-shadow:var(--expanded-card-shadow)] pointer-events-none isolate';
export const LANDING_GRID_CARD_MOBILE_TRANSIENT_PANEL_CLASSNAME =
  'landing-grid-card-mobile-transient-panel pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[var(--expanded-card-surface)]';
export const LANDING_GRID_CARD_MOBILE_TRANSIENT_SURFACE_CLASSNAME =
  'landing-grid-card-mobile-transient-surface relative z-[1] grid min-w-0 max-h-[calc(100dvh-116px)] gap-0 overflow-hidden px-4 pb-4';
export const LANDING_GRID_CARD_MOBILE_TRANSIENT_HEADER_CLASSNAME =
  `${LANDING_GRID_CARD_MOBILE_HEADER_CLASSNAME} landing-grid-card-mobile-transient-header relative z-[1] bg-transparent`;
