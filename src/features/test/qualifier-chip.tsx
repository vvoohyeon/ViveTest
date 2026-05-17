'use client';

import type {KeyboardEvent} from 'react';

const testButtonFocusRingClassName =
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--focus-ring-inner),0_0_0_4px_var(--focus-ring-outer)]';
const testQualifierChipClassName =
  `test-qualifier-chip inline-flex w-fit cursor-pointer items-center gap-[6px] rounded-full border border-[var(--interactive-neutral-border)] bg-[var(--interactive-neutral-bg-soft)] px-3 py-1 text-sm font-semibold text-[var(--text-strong)] [transition-duration:140ms] [transition-property:border-color,background-color,box-shadow,color,transform] [transition-timing-function:ease] hover:border-[var(--interactive-neutral-border-strong)] hover:bg-[var(--interactive-neutral-bg-hover)] active:bg-[var(--interactive-neutral-bg-pressed)] ${testButtonFocusRingClassName}`;

interface QualifierChipProps {
  label: string;
  ariaLabel: string;
  onActivate: () => void;
}

export function QualifierChip({label, ariaLabel, onActivate}: QualifierChipProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={testQualifierChipClassName}
      aria-label={ariaLabel}
      data-testid="test-qualifier-chip"
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      {label}
    </div>
  );
}
