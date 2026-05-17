import {useCallback, useState} from 'react';

import type {QualifierOverlayItem} from '@/features/test/qualifier-overlay-model';

type OverlayStepId = 'instruction' | number;

interface UseQualifierOverlayWizardOutput {
  overlayStep: OverlayStepId;
  overlayMode: 'entry' | 'reentry';
  qualifierDraft: Record<number, string>;
  setOverlayStep: (next: OverlayStepId) => void;
  onQualifierSelect: (canonicalIndex: number, token: string) => void;
  onQualifierBack: () => void;
  reopenQualifierOverlay: (
    answers: Record<string, string>,
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => void;
  buildQualifierAnswers: (
    qualifierItems: ReadonlyArray<QualifierOverlayItem>
  ) => Record<string, string>;
  resetWizard: () => void;
}

export function useQualifierOverlayWizard(): UseQualifierOverlayWizardOutput {
  const [overlayStep, setOverlayStep] = useState<OverlayStepId>('instruction');
  const [overlayMode, setOverlayMode] = useState<'entry' | 'reentry'>('entry');
  const [qualifierDraft, setQualifierDraft] = useState<Record<number, string>>({});

  const resetWizard = useCallback(() => {
    setOverlayMode('entry');
    setOverlayStep('instruction');
    setQualifierDraft({});
  }, []);

  const buildQualifierAnswers = useCallback(
    (qualifierItems: ReadonlyArray<QualifierOverlayItem>) => {
      const entries = qualifierItems.flatMap((item): Array<[string, string]> => {
        const token = qualifierDraft[item.canonicalIndex];
        return token ? [[String(item.canonicalIndex), token]] : [];
      });

      return Object.fromEntries(entries);
    },
    [qualifierDraft]
  );

  const onQualifierBack = useCallback(() => {
    if (overlayMode === 'reentry') {
      if (typeof overlayStep === 'number' && overlayStep > 0) {
        setOverlayStep(overlayStep - 1);
        return;
      }

      setOverlayMode('entry');
      setOverlayStep('instruction');
      setQualifierDraft({});
      return;
    }

    setOverlayStep((prev) => (typeof prev === 'number' && prev > 0 ? prev - 1 : 'instruction'));
  }, [overlayMode, overlayStep]);

  const onQualifierSelect = useCallback((canonicalIndex: number, token: string) => {
    setQualifierDraft((prev) => ({...prev, [canonicalIndex]: token}));
  }, []);

  const reopenQualifierOverlay = useCallback(
    (answers: Record<string, string>, qualifierItems: ReadonlyArray<QualifierOverlayItem>) => {
      const seededDraft: Record<number, string> = {};
      for (const item of qualifierItems) {
        const storedToken = answers[String(item.canonicalIndex)];
        if (storedToken && item.choices.some((choice) => choice.token === storedToken)) {
          seededDraft[item.canonicalIndex] = storedToken;
        }
      }

      setQualifierDraft(seededDraft);
      setOverlayMode('reentry');
      setOverlayStep(0);
    },
    []
  );

  return {
    overlayStep,
    overlayMode,
    qualifierDraft,
    setOverlayStep,
    onQualifierSelect,
    onQualifierBack,
    reopenQualifierOverlay,
    buildQualifierAnswers,
    resetWizard
  };
}
