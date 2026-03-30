import {describe, expect, it} from 'vitest';

import {resolveTestEntryPolicy} from '../../src/features/test/entry-policy';

const INSTRUCTION_TEXT = 'Instruction dummy: representative copy';

describe('test entry policy', () => {
  it('keeps known-consent enterable cards on the plain instruction with Start only', () => {
    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'available',
        consentState: 'OPTED_IN',
        landingIngressFlag: true
      })
    ).toMatchObject({
      ingressType: 'landing',
      content: {
        instructionText: INSTRUCTION_TEXT,
        showConsentNote: false,
        consentNoteKey: null,
        showDivider: false
      },
      cta: {
        primary: {
          action: 'start',
          labelKey: 'start',
          testId: 'test-start-button'
        }
      },
      canAutoCommitAfterInstructionSeen: true
    });

    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'opt_out',
        consentState: 'OPTED_OUT',
        landingIngressFlag: false
      })
    ).toMatchObject({
      ingressType: 'direct',
      content: {
        showConsentNote: false,
        consentNoteKey: null,
        showDivider: false
      },
      cta: {
        primary: {
          action: 'start',
          labelKey: 'start',
          testId: 'test-start-button'
        }
      }
    });
  });

  it('uses the available unknown consent note with accept/abandon CTAs for both ingress types', () => {
    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'available',
        consentState: 'UNKNOWN',
        landingIngressFlag: true
      })
    ).toMatchObject({
      ingressType: 'landing',
      content: {
        showConsentNote: true,
        consentNoteKey: 'unknownAvailableNote',
        showDivider: true
      },
      cta: {
        primary: {
          action: 'accept_all_and_start',
          labelKey: 'acceptAllAndStart'
        },
        secondary: {
          action: 'deny_and_abandon',
          labelKey: 'denyAndAbandon'
        }
      },
      canAutoCommitAfterInstructionSeen: false
    });

    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'available',
        consentState: 'UNKNOWN',
        landingIngressFlag: false
      })
    ).toMatchObject({
      ingressType: 'direct',
      content: {
        showConsentNote: true,
        consentNoteKey: 'unknownAvailableNote',
        showDivider: true
      },
      cta: {
        primary: {
          action: 'accept_all_and_start'
        },
        secondary: {
          action: 'deny_and_abandon'
        }
      }
    });
  });

  it('uses the opt_out unknown consent note with accept/start CTAs for both ingress types', () => {
    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'opt_out',
        consentState: 'UNKNOWN',
        landingIngressFlag: true
      })
    ).toMatchObject({
      ingressType: 'landing',
      content: {
        showConsentNote: true,
        consentNoteKey: 'unknownOptOutNote',
        showDivider: true
      },
      cta: {
        primary: {
          action: 'accept_all_and_start'
        },
        secondary: {
          action: 'deny_and_start',
          labelKey: 'denyAndStart'
        }
      }
    });

    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'opt_out',
        consentState: 'UNKNOWN',
        landingIngressFlag: false
      })
    ).toMatchObject({
      ingressType: 'direct',
      content: {
        showConsentNote: true,
        consentNoteKey: 'unknownOptOutNote',
        showDivider: true
      },
      cta: {
        secondary: {
          action: 'deny_and_start'
        }
      }
    });
  });

  it('replaces the old redirect contract with a warning note and keep-current-preference CTA for direct opted-out available cards', () => {
    expect(
      resolveTestEntryPolicy({
        instructionText: INSTRUCTION_TEXT,
        cardType: 'available',
        consentState: 'OPTED_OUT',
        landingIngressFlag: false
      })
    ).toMatchObject({
      ingressType: 'direct',
      content: {
        showConsentNote: true,
        consentNoteKey: 'optedOutAvailableWarning',
        showDivider: true
      },
      cta: {
        primary: {
          action: 'accept_all_and_start'
        },
        secondary: {
          action: 'keep_current_preference',
          labelKey: 'keepCurrentPreference',
          testId: 'test-keep-current-preference-button'
        }
      },
      canAutoCommitAfterInstructionSeen: false
    });
  });

  it('keeps action effects independent from CTA text decisions', () => {
    const policy = resolveTestEntryPolicy({
      instructionText: INSTRUCTION_TEXT,
      cardType: 'available',
      consentState: 'UNKNOWN',
      landingIngressFlag: false
    });

    expect(policy.effects.accept_all_and_start).toEqual({
      writesConsent: 'OPTED_IN',
      redirectHome: false,
      commitsRuntimeEntry: true,
      recordsInstructionSeen: true
    });
    expect(policy.effects.deny_and_abandon).toEqual({
      writesConsent: 'OPTED_OUT',
      redirectHome: true,
      commitsRuntimeEntry: false,
      recordsInstructionSeen: false
    });
    expect(policy.effects.keep_current_preference).toEqual({
      writesConsent: null,
      redirectHome: true,
      commitsRuntimeEntry: false,
      recordsInstructionSeen: false
    });
  });
});
