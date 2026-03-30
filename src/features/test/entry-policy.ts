import type {LandingCardType} from '@/features/landing/data';
import type {TelemetryConsentState} from '@/features/landing/telemetry/types';

export type TestIngressType = 'landing' | 'direct';
export type TestInstructionAction =
  | 'start'
  | 'accept_all_and_start'
  | 'deny_and_start'
  | 'deny_and_abandon'
  | 'keep_current_preference';
export type TestInstructionLabelKey =
  | 'start'
  | 'acceptAllAndStart'
  | 'denyAndAbandon'
  | 'denyAndStart'
  | 'keepCurrentPreference';
export type TestConsentNoteKey = 'unknownAvailableNote' | 'unknownOptOutNote' | 'optedOutAvailableWarning';

export interface TestInstructionContent {
  instructionText: string;
  showConsentNote: boolean;
  consentNoteKey: TestConsentNoteKey | null;
  showDivider: boolean;
}

export interface TestInstructionButton {
  action: TestInstructionAction;
  labelKey: TestInstructionLabelKey;
  testId: string;
}

export interface TestInstructionActionEffect {
  writesConsent: Exclude<TelemetryConsentState, 'UNKNOWN'> | null;
  redirectHome: boolean;
  commitsRuntimeEntry: boolean;
  recordsInstructionSeen: boolean;
}

export interface TestEntryPolicy {
  ingressType: TestIngressType;
  content: TestInstructionContent;
  cta: {
    primary: TestInstructionButton;
    secondary?: TestInstructionButton;
  };
  effects: Record<TestInstructionAction, TestInstructionActionEffect>;
  canAutoCommitAfterInstructionSeen: boolean;
}

const ACTION_EFFECTS: Record<TestInstructionAction, TestInstructionActionEffect> = {
  start: {
    writesConsent: null,
    redirectHome: false,
    commitsRuntimeEntry: true,
    recordsInstructionSeen: true
  },
  accept_all_and_start: {
    writesConsent: 'OPTED_IN',
    redirectHome: false,
    commitsRuntimeEntry: true,
    recordsInstructionSeen: true
  },
  deny_and_start: {
    writesConsent: 'OPTED_OUT',
    redirectHome: false,
    commitsRuntimeEntry: true,
    recordsInstructionSeen: true
  },
  deny_and_abandon: {
    writesConsent: 'OPTED_OUT',
    redirectHome: true,
    commitsRuntimeEntry: false,
    recordsInstructionSeen: false
  },
  keep_current_preference: {
    writesConsent: null,
    redirectHome: true,
    commitsRuntimeEntry: false,
    recordsInstructionSeen: false
  }
};

function buildButton(
  action: TestInstructionAction,
  labelKey: TestInstructionLabelKey,
  testId: string
): TestInstructionButton {
  return {
    action,
    labelKey,
    testId
  };
}

function buildPlainStartPolicy(
  ingressType: TestIngressType,
  instructionText: string
): TestEntryPolicy {
  return {
    ingressType,
    content: {
      instructionText,
      showConsentNote: false,
      consentNoteKey: null,
      showDivider: false
    },
    cta: {
      primary: buildButton('start', 'start', 'test-start-button')
    },
    effects: ACTION_EFFECTS,
    canAutoCommitAfterInstructionSeen: true
  };
}

function buildConsentPolicy(input: {
  ingressType: TestIngressType;
  instructionText: string;
  consentNoteKey: TestConsentNoteKey;
  primaryAction: TestInstructionAction;
  primaryLabelKey: TestInstructionLabelKey;
  primaryTestId: string;
  secondaryAction: TestInstructionAction;
  secondaryLabelKey: TestInstructionLabelKey;
  secondaryTestId: string;
}): TestEntryPolicy {
  return {
    ingressType: input.ingressType,
    content: {
      instructionText: input.instructionText,
      showConsentNote: true,
      consentNoteKey: input.consentNoteKey,
      showDivider: true
    },
    cta: {
      primary: buildButton(input.primaryAction, input.primaryLabelKey, input.primaryTestId),
      secondary: buildButton(input.secondaryAction, input.secondaryLabelKey, input.secondaryTestId)
    },
    effects: ACTION_EFFECTS,
    canAutoCommitAfterInstructionSeen: false
  };
}

export function resolveTestEntryPolicy(input: {
  instructionText: string;
  cardType: LandingCardType;
  consentState: TelemetryConsentState;
  landingIngressFlag: boolean;
}): TestEntryPolicy {
  const ingressType: TestIngressType = input.landingIngressFlag ? 'landing' : 'direct';

  if (ingressType === 'direct' && input.consentState === 'OPTED_OUT' && input.cardType === 'available') {
    return buildConsentPolicy({
      ingressType,
      instructionText: input.instructionText,
      consentNoteKey: 'optedOutAvailableWarning',
      primaryAction: 'accept_all_and_start',
      primaryLabelKey: 'acceptAllAndStart',
      primaryTestId: 'test-accept-all-and-start-button',
      secondaryAction: 'keep_current_preference',
      secondaryLabelKey: 'keepCurrentPreference',
      secondaryTestId: 'test-keep-current-preference-button'
    });
  }

  if (input.consentState === 'UNKNOWN' && input.cardType === 'available') {
    return buildConsentPolicy({
      ingressType,
      instructionText: input.instructionText,
      consentNoteKey: 'unknownAvailableNote',
      primaryAction: 'accept_all_and_start',
      primaryLabelKey: 'acceptAllAndStart',
      primaryTestId: 'test-accept-all-and-start-button',
      secondaryAction: 'deny_and_abandon',
      secondaryLabelKey: 'denyAndAbandon',
      secondaryTestId: 'test-deny-and-abandon-button'
    });
  }

  if (input.consentState === 'UNKNOWN' && input.cardType === 'opt_out') {
    return buildConsentPolicy({
      ingressType,
      instructionText: input.instructionText,
      consentNoteKey: 'unknownOptOutNote',
      primaryAction: 'accept_all_and_start',
      primaryLabelKey: 'acceptAllAndStart',
      primaryTestId: 'test-accept-all-and-start-button',
      secondaryAction: 'deny_and_start',
      secondaryLabelKey: 'denyAndStart',
      secondaryTestId: 'test-deny-and-start-button'
    });
  }

  return buildPlainStartPolicy(ingressType, input.instructionText);
}
