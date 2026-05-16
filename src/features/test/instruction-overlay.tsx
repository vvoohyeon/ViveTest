'use client';

import type {QualifierOverlayItem} from './qualifier-overlay-model';

const instructionActionRowClassName = 'flex flex-wrap gap-[10px]';
const instructionCardClassName =
  'test-instruction-card grid gap-[14px] rounded-[18px] p-5 [background:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] [box-shadow:var(--dialog-shadow)] max-[767px]:min-h-full max-[767px]:w-full max-[767px]:content-start max-[767px]:rounded-none max-[767px]:pt-[88px]';
const instructionNoteClassName = 'test-instruction-note m-0 leading-[1.5] text-[var(--muted-ink)]';
const instructionButtonFocusRingClassName =
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const instructionButtonBaseClassName =
  `inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none disabled:hover:!border-[var(--interactive-disabled-border)] disabled:hover:!bg-[var(--interactive-disabled-bg)] disabled:hover:!text-[var(--interactive-disabled-ink)] disabled:hover:!shadow-none disabled:hover:!translate-y-0 ${instructionButtonFocusRingClassName}`;
const instructionPrimaryButtonClassName =
  `${instructionButtonBaseClassName} border-[var(--interactive-accent-border)] bg-[var(--interactive-accent-bg)] shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),var(--interactive-accent-shadow)] hover:border-[var(--interactive-accent-border-strong)] hover:bg-[var(--interactive-accent-bg-hover)] hover:-translate-y-px active:bg-[var(--interactive-accent-bg-pressed)] active:translate-y-0 focus-visible:shadow-[inset_0_0_0_1px_var(--interactive-accent-outline),0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer),var(--interactive-accent-shadow)]`;
const instructionSecondaryButtonClassName =
  `${instructionButtonBaseClassName} border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-strong)] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)]`;
const qualifierChoiceButtonClassName =
  `${instructionSecondaryButtonClassName} justify-start text-left data-[selected=true]:border-[var(--interactive-accent-border)] data-[selected=true]:bg-[var(--interactive-accent-bg)]`;
const qualifierContinueButtonClassName =
  `${instructionPrimaryButtonClassName} disabled:!cursor-not-allowed disabled:!border-[var(--interactive-disabled-border)] disabled:!bg-[var(--interactive-disabled-bg)] disabled:!text-[var(--interactive-disabled-ink)] disabled:!opacity-100 disabled:!shadow-none ${instructionButtonFocusRingClassName}`;

interface InstructionOverlayProps {
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
  return (
    <div
      className="test-instruction-overlay fixed inset-0 z-[1050] grid place-items-center bg-[var(--overlay-scrim-soft)] p-6 max-[767px]:p-0"
      data-testid="test-instruction-overlay"
    >
      <div className={instructionCardClassName}>
        {qualifierStep ? (
          <div className="grid gap-[14px]" data-testid="test-qualifier-step">
            <h2 className="m-0">{qualifierStep.item.questionText}</h2>
            <div className="grid gap-[10px]">
              {qualifierStep.item.choices.map((choice) => (
                <button
                  key={choice.token}
                  type="button"
                  className={qualifierChoiceButtonClassName}
                  data-selected={qualifierStep.selectedToken === choice.token ? 'true' : 'false'}
                  data-testid={`test-qualifier-choice-${choice.token.toLowerCase()}`}
                  onClick={() => {
                    qualifierStep.onSelect(choice.token);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className={instructionActionRowClassName}>
              {qualifierStep.showBack ? (
                <button
                  type="button"
                  className={instructionSecondaryButtonClassName}
                  onClick={qualifierStep.onBack}
                  data-testid={
                    qualifierStep.isReentry
                      ? 'test-qualifier-reentry-cancel-button'
                      : 'test-qualifier-back-button'
                  }
                >
                  {qualifierStep.backLabel ?? 'Back'}
                </button>
              ) : null}
              <button
                type="button"
                className={qualifierContinueButtonClassName}
                onClick={onPrimaryAction}
                disabled={qualifierStep.continueDisabled}
                data-testid="test-qualifier-continue-button"
              >
                {qualifierStep.continueLabel}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="m-0">{title}</h2>
            <p className="m-0" data-testid="test-instruction-body">
              {instructionText}
            </p>
            {showDivider ? (
              <hr
                className="test-instruction-divider m-0 h-px w-full border-0 bg-[var(--surface-divider)]"
                data-testid="test-instruction-divider"
              />
            ) : null}
            {consentNote ? (
              <p className={instructionNoteClassName} data-testid="test-instruction-note">
                {consentNote}
              </p>
            ) : null}
            <div className={instructionActionRowClassName}>
              {secondaryLabel && onSecondaryAction ? (
                <button
                  type="button"
                  className={instructionSecondaryButtonClassName}
                  onClick={onSecondaryAction}
                  data-testid={secondaryTestId}
                >
                  {secondaryLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={instructionPrimaryButtonClassName}
                onClick={onPrimaryAction}
                data-testid={primaryTestId}
              >
                {primaryLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
