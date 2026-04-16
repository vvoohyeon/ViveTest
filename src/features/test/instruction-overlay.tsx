'use client';

const instructionActionRowClassName = 'flex flex-wrap gap-[10px]';
const instructionButtonBaseClassName =
  'inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-[var(--interactive-neutral-border)] px-[14px] py-3 text-center font-semibold leading-[1.35] text-[var(--text-strong)] [font:inherit] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease]';
const instructionPrimaryButtonClassName = `${instructionButtonBaseClassName} test-primary-button`;
const instructionSecondaryButtonClassName = `${instructionButtonBaseClassName} test-secondary-button [background:var(--interactive-neutral-bg-strong)]`;

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
  secondaryTestId = 'test-secondary-instruction-button'
}: InstructionOverlayProps) {
  return (
    <div
      className="test-instruction-overlay fixed inset-0 z-[1050] grid place-items-center bg-[var(--overlay-scrim-soft)] p-6 max-[767px]:p-0"
      data-testid="test-instruction-overlay"
    >
      <div
        className="test-instruction-card grid gap-[14px] rounded-[18px] p-5 [background:color-mix(in_srgb,var(--panel-solid)_94%,transparent)] [box-shadow:var(--dialog-shadow)] max-[767px]:min-h-full max-[767px]:w-full max-[767px]:content-start max-[767px]:rounded-none max-[767px]:pt-[88px]"
      >
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
          <p className="test-instruction-note m-0 text-[var(--text-normal)]" data-testid="test-instruction-note">
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
      </div>
    </div>
  );
}
