'use client';

import {useCallback, useEffect, useId, useRef, type KeyboardEvent, type ReactNode} from 'react';

import {BottomSheet} from '@/features/ui/bottom-sheet';
import type {SheetCloseReason} from '@/features/ui/sheet-motion';
import {useIsMobileViewport} from '@/features/ui/use-mobile-viewport';

import type {QualifierOverlayItem} from './qualifier-overlay-model';
import {
  testAnswerChoiceClassName,
  testAnswerChoiceMarkClassName,
  testAnswerChoiceTextClassName,
  testBodyClassName,
  testCaptionClassName,
  testFloatingClassName,
  testPrimaryButtonClassName,
  testQuietButtonClassName,
  testScrimClassName,
  testSecondaryButtonClassName,
  testTitleClassName
} from './surface-class-names';

const instructionActionRowClassName = 'flex flex-wrap items-center gap-2';
// 모바일 액션 행은 **세로 스택 · 전체 폭**이고 primary 가 맨 아래(엄지)다. 두 버튼을 가로로
// 나열하면 12 locale 중 8 개에서 접혔고, `justify-end` 가 부차 행동을 주 행동 **위**로 올렸다
// (명세 §2-3). 접힘을 방치하지 않는다는 것이 §4 결함 3 이다.
const instructionSheetActionRowClassName = 'grid gap-2 [&>button]:w-full';
// 다이얼로그는 floating 표면이다: `--surface-raised` · 모서리 하나 · overlay 그림자.
// 종전에는 94% 반투명 패널에 22px 흐림 그림자를 얹고 **테두리가 아예 없었다** — 그래서 다크
// 에서 다이얼로그와 그 뒤 페이지를 가르는 것이 아무것도 없었다(scrim 은 1.04:1 밖에 못 어둡게
// 한다). 모바일에서는 표면이 뷰포트를 가득 채워 뒷면이 보이지 않으므로 모서리를 걷는다.
const instructionCardClassName =
  `test-instruction-card grid gap-4 p-5 ${testFloatingClassName} max-[767px]:min-h-full max-[767px]:w-full max-[767px]:content-start max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:pt-[88px]`;
const instructionNoteClassName = `test-instruction-note ${testCaptionClassName}`;
// 열리면 포커스가 다이얼로그 컨테이너 자체로 들어온다 — 첫 컨트롤이 아니라. 첫 컨트롤에 두면
// Enter 한 번이 곧 「동의하고 시작」이 되는데, 동의를 묻는 창에서 그것은 기본값으로 삼을
// 행동이 아니다. 컨테이너는 컨트롤이 아니므로 UA 링을 그리지 않는다.
const instructionDialogClassName = `${instructionCardClassName} outline-none`;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface InstructionOverlayProps {
  /** 보이는가. **컴포넌트는 계속 마운트된다** — 모달 시트가 이탈 모션을 그리려면 닫힌 뒤에도
   *  트리에 남아 있어야 하고, 마운트 경계를 넘나들면 cleanup 이 자기 side effect 를 되돌린다. */
  visible: boolean;
  title: string;
  instructionText: string;
  consentNote?: string;
  showDivider: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  primaryTestId?: string;
  secondaryTestId?: string;
  qualifierStep?: {
    item: QualifierOverlayItem;
    selectedToken: string | null;
    onSelect: (token: string) => void;
    onBack: () => void;
    continueLabel: string;
    continueDisabled: boolean;
    showBack: boolean;
    isReentry?: boolean;
    backLabel?: string;
  };
}

export function InstructionOverlay({
  visible,
  title,
  instructionText,
  consentNote,
  showDivider,
  primaryLabel,
  secondaryLabel,
  onPrimaryAction,
  onSecondaryAction,
  primaryTestId = 'test-start-button',
  secondaryTestId = 'test-secondary-instruction-button',
  qualifierStep
}: InstructionOverlayProps) {
  const isMobileViewport = useIsMobileViewport();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  // **Esc 는 취소이고, 취소는 아무것도 쓰지 않는다**(`req-test.md` §3.6).
  //
  // 종전에는 Esc 가 그 단계의 dismiss action, 즉 secondary CTA 의 별칭이었다. 그래서 취소
  // 키가 `ACTION_EFFECTS` 를 그대로 실행했다 — `UNKNOWN + available` 에서 Esc 한 번이
  // `deny_and_abandon` 이 되어 `OPTED_OUT` 을 영구 저장하고 랜딩으로 나갔고,
  // `UNKNOWN + opt_out` 에서는 `deny_and_start` 가 되어 저장 + `instructionSeen` 기록 +
  // qualifier 진행까지 갔다. 사용자가 「취소」로 읽는 키가 개인정보 설정을 바꾸는 유일한
  // 경로였다.
  //
  // instruction step 의 Esc 는 **no-op** 이다. 동의를 묻는 문은 Esc 로 통과시키지 않고, 앞으로
  // 나가는 길은 CTA 가 소유한다. 키보드 덫이 아니다 — primary CTA 가 항상 존재하고 Tab 으로
  // 도달하며, 나가는 secondary CTA 도 버튼으로 남아 있다.
  //
  // qualifier step 의 Esc 는 Back / Cancel 그대로다. 그 둘은 `use-qualifier-overlay-wizard` 의
  // draft 상태만 되돌리고 durable 상태를 쓰지 않으므로 위 금지를 이미 만족한다.
  const dismissAction = qualifierStep ? qualifierStep.onBack : undefined;
  const stepKey = qualifierStep ? qualifierStep.item.canonicalIndex : 'instruction';

  // 열릴 때 그 전에 포커스가 있던 곳을 적어 두고, 닫힐 때 거기로 돌려보낸다. 재진입(칩 → 창 →
  // 취소)에서는 그것이 칩이다. 처음 페이지가 열릴 때는 body 라 돌려보낼 곳이 없다.
  // 시트는 포커스 채취·복귀를 프리미티브가 갖는다. 여기 남는 것은 데스크톱 다이얼로그의 몫이다.
  const dialogActive = visible && !isMobileViewport;
  useEffect(() => {
    if (!dialogActive) {
      return;
    }

    const previous = document.activeElement;
    restoreFocusRef.current = previous instanceof HTMLElement && previous !== document.body ? previous : null;
    return () => {
      const target = restoreFocusRef.current;
      if (target && target.isConnected) {
        target.focus();
      }
    };
  }, [dialogActive]);

  // 단계가 바뀌면(지시 → qualifier, 재진입 뒤로) 눌렀던 버튼이 언마운트되어 포커스가 body 로
  // 새어 나간다. 컨테이너로 되돌려 트랩 안에 둔다.
  useEffect(() => {
    if (!dialogActive) {
      return;
    }
    dialogRef.current?.focus({preventScroll: true});
  }, [dialogActive, stepKey]);

  /**
   * 시트가 `Escape` 를 소유하되 **의미는 이 컴포넌트가 갖는다**(BQ-41). instruction step 에서는
   * no-op 이고, qualifier step 에서만 Back/Cancel 과 같다 — 그 둘은 draft 만 되돌리고 durable
   * 상태를 쓰지 않는다. 모달 시트라 backdrop·스와이프·history 는 애초에 닫기를 요청하지 않으므로
   * 여기 도달하는 것은 `escape` 뿐이다.
   */
  const handleSheetCloseRequest = useCallback(
    (reason: SheetCloseReason) => {
      if (reason !== 'escape' || !dismissAction) {
        return;
      }
      dismissAction();
    },
    [dismissAction]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        if (!dismissAction) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        dismissAction();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [dismissAction]
  );


  const qualifierBody: ReactNode = qualifierStep ? (
    <>
      <h2 id={titleId} className={testTitleClassName}>
        {qualifierStep.item.questionText}
      </h2>
      <div className="grid gap-2">
        {qualifierStep.item.choices.map((choice) => (
          <button
            key={choice.token}
            type="button"
            className={testAnswerChoiceClassName}
            data-selected={qualifierStep.selectedToken === choice.token ? 'true' : 'false'}
            data-testid={`test-qualifier-choice-${choice.token.toLowerCase()}`}
            onClick={() => {
              qualifierStep.onSelect(choice.token);
            }}
          >
            <span className={testAnswerChoiceTextClassName}>{choice.label}</span>
            <span className={testAnswerChoiceMarkClassName} aria-hidden="true" />
          </button>
        ))}
      </div>
    </>
  ) : null;

  const qualifierBackButton: ReactNode = qualifierStep?.showBack ? (
    <button
      type="button"
      className={testSecondaryButtonClassName}
      onClick={qualifierStep.onBack}
      data-testid={
        qualifierStep.isReentry ? 'test-qualifier-reentry-cancel-button' : 'test-qualifier-back-button'
      }
    >
      {qualifierStep.backLabel}
    </button>
  ) : null;

  const qualifierContinueButton: ReactNode = qualifierStep ? (
    <button
      type="button"
      className={testPrimaryButtonClassName}
      onClick={onPrimaryAction}
      disabled={qualifierStep.continueDisabled}
      data-testid="test-qualifier-continue-button"
    >
      {qualifierStep.continueLabel}
    </button>
  ) : null;

  const instructionBody: ReactNode = (
    <>
      <h2 id={titleId} className={testTitleClassName}>
        {title}
      </h2>
      <p id={descriptionId} className={testBodyClassName} data-testid="test-instruction-body">
        {instructionText}
      </p>
      {showDivider ? (
        <hr
          className="test-instruction-divider m-0 h-px w-full border-0 bg-[var(--hairline)]"
          data-testid="test-instruction-divider"
        />
      ) : null}
      {consentNote ? (
        <p className={instructionNoteClassName} data-testid="test-instruction-note">
          {consentNote}
        </p>
      ) : null}
    </>
  );

  // 동의 거부는 quiet 무게를 받는다. 종전에는 「이전」과 똑같은 중립 채움이어서
  // 동의 거부와 문항 이동이 같은 시각 무게를 가졌다.
  const instructionSecondaryButton: ReactNode =
    secondaryLabel && onSecondaryAction ? (
      <button
        type="button"
        className={testQuietButtonClassName}
        onClick={onSecondaryAction}
        data-testid={secondaryTestId}
      >
        {secondaryLabel}
      </button>
    ) : null;

  const instructionPrimaryButton: ReactNode = (
    <button
      type="button"
      className={testPrimaryButtonClassName}
      onClick={onPrimaryAction}
      data-testid={primaryTestId}
    >
      {primaryLabel}
    </button>
  );

  if (isMobileViewport) {
    // **모달 바텀시트**(명세 §2-3). 카드 시트와 같은 프리미티브를 쓰되 셋을 끈다 —
    // grabber(끌어 내릴 수 있다는 약속) · 제스처 닫기 · history 항목. 마지막 것은 이 시트가
    // 페이지 자신의 관문이고 뒤로가기가 곧 테스트 이전 이탈이기 때문이다(`req-test.md` §3.6).
    return (
      <BottomSheet
        open={visible}
        layerId="test-instruction-sheet"
        titleId={titleId}
        testId="test-instruction-overlay"
        grabber={false}
        dismissible={false}
        historyEntry={false}
        animatesResize
        stepKey={String(stepKey)}
        onCloseRequest={handleSheetCloseRequest}
        actionRow={
          <div className={instructionSheetActionRowClassName} data-slot="instructionActions">
            {/* primary 가 **맨 아래**다 — 엄지가 닿는 자리를 주 행동이 갖는다. */}
            {qualifierStep ? qualifierBackButton : instructionSecondaryButton}
            {qualifierStep ? qualifierContinueButton : instructionPrimaryButton}
          </div>
        }
      >
        <div className="grid gap-4" data-testid={qualifierStep ? 'test-qualifier-step' : undefined}>
          {qualifierStep ? qualifierBody : instructionBody}
        </div>
      </BottomSheet>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`test-instruction-overlay fixed inset-0 z-[1200] grid place-items-center p-6 ${testScrimClassName}`}
      data-testid="test-instruction-overlay"
    >
      <div
        ref={dialogRef}
        className={instructionDialogClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={qualifierStep ? undefined : descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {qualifierStep ? (
          <div className="grid gap-4" data-testid="test-qualifier-step">
            {qualifierBody}
            {/* 한 줄에 들어가면 우측 정렬 한 줄, 들어가지 않으면 **접지 않고 스택**한다. */}
            <div className={`${instructionActionRowClassName} justify-end`}>
              {qualifierBackButton}
              {qualifierContinueButton}
            </div>
          </div>
        ) : (
          <>
            {instructionBody}
            <div className={`${instructionActionRowClassName} justify-end`}>
              {instructionSecondaryButton}
              {instructionPrimaryButton}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
