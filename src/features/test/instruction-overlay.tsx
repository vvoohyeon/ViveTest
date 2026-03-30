'use client';

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
    <div className="test-instruction-overlay" data-testid="test-instruction-overlay">
      <div className="test-instruction-card">
        <h2>{title}</h2>
        <p data-testid="test-instruction-body">{instructionText}</p>
        {showDivider ? <hr className="test-instruction-divider" data-testid="test-instruction-divider" /> : null}
        {consentNote ? (
          <p className="test-instruction-note" data-testid="test-instruction-note">
            {consentNote}
          </p>
        ) : null}
        <div className="test-nav-row">
          {secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              className="test-secondary-button"
              onClick={onSecondaryAction}
              data-testid={secondaryTestId}
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="test-primary-button"
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
