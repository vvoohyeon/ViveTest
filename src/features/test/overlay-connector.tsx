'use client';

import {InstructionOverlay} from '@/features/test/instruction-overlay';
import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';

type OverlayStepId = 'instruction' | number;
type OverlayMode = 'entry' | 'reentry';

interface OverlayConnectorProps {
  visible: boolean;
  title: string;
  instructionText: string;
  consentNote?: string;
  showDivider: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryTestId?: string;
  secondaryTestId?: string;
  qualifierContinueNextLabel: string;
  qualifierRestartConfirmLabel: string;
  qualifierStartLabel: string;
  qualifierReentryCancelLabel: string;
  qualifierEntryBackLabel: string;
  overlayStep: OverlayStepId;
  overlayMode: OverlayMode;
  qualifierDraft: Record<number, string>;
  qualifierItems: ReadonlyArray<QualifierOverlayItem>;
  currentQualifierItem?: QualifierOverlayItem;
  currentQualifierStepIndex: number | null;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onQualifierSelect: (canonicalIndex: number, token: string) => void;
  onQualifierBack: () => void;
}

export function OverlayConnector({
  visible,
  title,
  instructionText,
  consentNote,
  showDivider,
  primaryLabel,
  secondaryLabel,
  primaryTestId,
  secondaryTestId,
  qualifierContinueNextLabel,
  qualifierRestartConfirmLabel,
  qualifierStartLabel,
  qualifierReentryCancelLabel,
  qualifierEntryBackLabel,
  overlayStep,
  overlayMode,
  qualifierDraft,
  qualifierItems,
  currentQualifierItem,
  currentQualifierStepIndex,
  onPrimaryAction,
  onSecondaryAction,
  onQualifierSelect,
  onQualifierBack
}: OverlayConnectorProps) {
  if (!visible) {
    return null;
  }

  const fallbackQualifierStepIndex = typeof overlayStep === 'number' ? overlayStep : 0;
  const qualifierStepIndex = currentQualifierStepIndex ?? fallbackQualifierStepIndex;
  const qualifierStep = currentQualifierItem
    ? {
        item: currentQualifierItem,
        selectedToken: qualifierDraft[currentQualifierItem.canonicalIndex] ?? null,
        onSelect: (token: string) => {
          onQualifierSelect(currentQualifierItem.canonicalIndex, token);
        },
        onBack: onQualifierBack,
        continueLabel:
          qualifierStepIndex < qualifierItems.length - 1
            ? qualifierContinueNextLabel
            : overlayMode === 'reentry'
              ? qualifierRestartConfirmLabel
              : qualifierStartLabel,
        continueDisabled: !qualifierDraft[currentQualifierItem.canonicalIndex],
        showBack: true,
        isReentry: overlayMode === 'reentry',
        backLabel: overlayMode === 'reentry' ? qualifierReentryCancelLabel : qualifierEntryBackLabel
      }
    : undefined;

  return (
    <InstructionOverlay
      title={title}
      instructionText={instructionText}
      consentNote={consentNote}
      showDivider={showDivider}
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
      onPrimaryAction={onPrimaryAction}
      onSecondaryAction={onSecondaryAction}
      primaryTestId={primaryTestId}
      secondaryTestId={secondaryTestId}
      qualifierStep={qualifierStep}
    />
  );
}
