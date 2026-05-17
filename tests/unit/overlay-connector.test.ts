// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {OverlayConnector} from '../../src/features/test/overlay-connector';
import type {QualifierOverlayItem} from '../../src/features/test/qualifier-overlay-model';

type OverlayConnectorProps = React.ComponentProps<typeof OverlayConnector>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const qualifierItem: QualifierOverlayItem = {
  canonicalIndex: 1,
  questionText: 'My sexual identity is',
  choices: [
    {token: 'M', label: 'Male'},
    {token: 'F', label: 'Female'}
  ]
};

function buildProps(overrides: Partial<OverlayConnectorProps> = {}): OverlayConnectorProps {
  return {
    visible: true,
    title: 'Instruction title',
    instructionText: 'Read this carefully.',
    consentNote: undefined,
    showDivider: false,
    primaryLabel: 'Start',
    secondaryLabel: undefined,
    primaryTestId: 'test-primary',
    secondaryTestId: undefined,
    qualifierContinueNextLabel: 'Next',
    qualifierRestartConfirmLabel: 'Confirm restart',
    qualifierStartLabel: 'Start',
    qualifierReentryCancelLabel: 'Cancel',
    qualifierEntryBackLabel: 'Back',
    overlayStep: 'instruction',
    overlayMode: 'entry',
    qualifierDraft: {},
    qualifierItems: [],
    currentQualifierItem: undefined,
    currentQualifierStepIndex: null,
    onPrimaryAction: vi.fn(),
    onSecondaryAction: undefined,
    onQualifierSelect: vi.fn(),
    onQualifierBack: vi.fn(),
    ...overrides
  };
}

function renderOverlayConnector(props: OverlayConnectorProps): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(React.createElement(OverlayConnector, props));
  });

  return container;
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true
  });
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  container?.remove();
  container = null;
  Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
});

describe('OverlayConnector', () => {
  it('E-1 renders nothing when visible is false', () => {
    const view = renderOverlayConnector(buildProps({visible: false}));

    expect(view.querySelector('[data-testid="test-instruction-overlay"]')).toBeNull();
  });

  it('E-2 invokes onPrimaryAction from the entry instruction view', () => {
    const onPrimaryAction = vi.fn();
    const view = renderOverlayConnector(buildProps({onPrimaryAction}));

    const primary = view.querySelector<HTMLButtonElement>('[data-testid="test-primary"]');
    act(() => {
      primary?.click();
    });

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it('E-3 maps entry qualifier choices to onQualifierSelect', () => {
    const onQualifierSelect = vi.fn();
    const view = renderOverlayConnector(
      buildProps({
        overlayStep: 0,
        qualifierItems: [qualifierItem],
        currentQualifierItem: qualifierItem,
        currentQualifierStepIndex: 0,
        onQualifierSelect
      })
    );

    const choice = view.querySelector<HTMLButtonElement>('[data-testid="test-qualifier-choice-m"]');
    act(() => {
      choice?.click();
    });

    expect(onQualifierSelect).toHaveBeenCalledWith(1, 'M');
  });

  it('E-4 uses the reentry cancel label for reentry qualifier back action', () => {
    const view = renderOverlayConnector(
      buildProps({
        overlayStep: 0,
        overlayMode: 'reentry',
        qualifierDraft: {1: 'M'},
        qualifierItems: [qualifierItem],
        currentQualifierItem: qualifierItem,
        currentQualifierStepIndex: 0
      })
    );

    expect(
      view.querySelector('[data-testid="test-qualifier-reentry-cancel-button"]')?.textContent
    ).toBe('Cancel');
    expect(view.querySelector('[data-testid="test-qualifier-back-button"]')).toBeNull();
  });

  it('E-5 invokes onQualifierBack from the entry qualifier back button', () => {
    const onQualifierBack = vi.fn();
    const view = renderOverlayConnector(
      buildProps({
        overlayStep: 0,
        qualifierItems: [qualifierItem],
        currentQualifierItem: qualifierItem,
        currentQualifierStepIndex: 0,
        onQualifierBack
      })
    );

    const back = view.querySelector<HTMLButtonElement>('[data-testid="test-qualifier-back-button"]');
    act(() => {
      back?.click();
    });

    expect(onQualifierBack).toHaveBeenCalledTimes(1);
  });
});
