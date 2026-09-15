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
  // **`visible` 로 일찍 `null` 을 돌려주지 않는다.** 모달 시트가 이탈 모션을 그리려면 닫힌 뒤에도
  // 트리에 남아 있어야 하고, 마운트 경계를 넘나들면 cleanup 이 자기 side effect 를 되돌린다
  // (`docs/LESSONS_LEARNED.md` L39). 보이지 않는 동안 무엇을 그릴지는 표면이 스스로 정한다 —
  // 데스크톱 다이얼로그는 `null`, 시트는 닫힌 위상이다.
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
      visible={visible}
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
