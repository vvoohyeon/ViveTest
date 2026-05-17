// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {InstructionOverlay} from '../../src/features/test/instruction-overlay';
import type {QualifierOverlayItem} from '../../src/features/test/qualifier-overlay-model';

type OverlayProps = React.ComponentProps<typeof InstructionOverlay>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderOverlay(props: OverlayProps): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(React.createElement(InstructionOverlay, props));
  });

  return container;
}

const qualifierItem: QualifierOverlayItem = {
  canonicalIndex: 1,
  questionText: 'My sexual identity is',
  choices: [
    {token: 'M', label: 'Male'},
    {token: 'F', label: 'Female'}
  ]
};

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

describe('InstructionOverlay', () => {
  it('D-1 renders the entry instruction view with title, body, divider, note, and CTA only', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      consentNote: 'Consent note copy.',
      showDivider: true,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn()
    });

    expect(view.querySelector('[data-testid="test-instruction-overlay"]')).not.toBeNull();
    expect(view.querySelector('h2')?.textContent).toBe('Instruction title');
    expect(view.querySelector('[data-testid="test-instruction-body"]')?.textContent).toBe(
      'Read this carefully.'
    );
    expect(view.querySelector('[data-testid="test-instruction-divider"]')).not.toBeNull();
    expect(view.querySelector('[data-testid="test-instruction-note"]')?.textContent).toBe(
      'Consent note copy.'
    );
    expect(view.querySelector('[data-testid="test-start-button"]')?.textContent).toBe('Start');
    expect(view.querySelector('[data-testid="test-qualifier-step"]')).toBeNull();
  });

  it('D-2 renders the entry qualifier step with one button per choice and the continue label', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn(),
      qualifierStep: {
        item: qualifierItem,
        selectedToken: null,
        onSelect: vi.fn(),
        onBack: vi.fn(),
        continueLabel: 'Next',
        continueDisabled: false,
        showBack: true
      }
    });

    expect(view.querySelector('[data-testid="test-qualifier-step"]')).not.toBeNull();
    expect(view.querySelectorAll('[data-testid^="test-qualifier-choice-"]')).toHaveLength(
      qualifierItem.choices.length
    );
    expect(view.querySelector('[data-testid="test-qualifier-continue-button"]')?.textContent).toBe(
      'Next'
    );
    expect(view.querySelector('[data-testid="test-qualifier-back-button"]')).not.toBeNull();
  });

  it('D-3 hides the instruction copy in reentry and uses the reentry cancel button with backLabel', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      consentNote: 'Consent note copy.',
      showDivider: true,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn(),
      qualifierStep: {
        item: qualifierItem,
        selectedToken: 'M',
        onSelect: vi.fn(),
        onBack: vi.fn(),
        continueLabel: 'Confirm',
        continueDisabled: false,
        showBack: true,
        isReentry: true,
        backLabel: 'Cancel'
      }
    });

    expect(view.querySelector('h2')?.textContent).toBe(qualifierItem.questionText);
    expect(view.querySelector('[data-testid="test-instruction-body"]')).toBeNull();
    expect(view.querySelector('[data-testid="test-instruction-note"]')).toBeNull();
    const cancel = view.querySelector('[data-testid="test-qualifier-reentry-cancel-button"]');
    expect(cancel).not.toBeNull();
    expect(cancel?.textContent).toBe('Cancel');
    expect(cancel?.textContent).not.toBe('Back');
    expect(view.querySelector('[data-testid="test-qualifier-back-button"]')).toBeNull();
  });

  it('D-4 invokes onBack when the reentry cancel button is clicked', () => {
    const onBack = vi.fn();
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn(),
      qualifierStep: {
        item: qualifierItem,
        selectedToken: 'M',
        onSelect: vi.fn(),
        onBack,
        continueLabel: 'Confirm',
        continueDisabled: false,
        showBack: true,
        isReentry: true,
        backLabel: 'Cancel'
      }
    });

    const cancel = view.querySelector<HTMLButtonElement>(
      '[data-testid="test-qualifier-reentry-cancel-button"]'
    );
    act(() => {
      cancel?.click();
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('D-5 fires onPrimaryAction on continue and leaves continue enabled when not disabled', () => {
    const onPrimaryAction = vi.fn();
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction,
      qualifierStep: {
        item: qualifierItem,
        selectedToken: 'M',
        onSelect: vi.fn(),
        onBack: vi.fn(),
        continueLabel: 'Next',
        continueDisabled: false,
        showBack: true
      }
    });

    const continueButton = view.querySelector<HTMLButtonElement>(
      '[data-testid="test-qualifier-continue-button"]'
    );
    act(() => {
      continueButton?.click();
    });

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(continueButton?.disabled).toBe(false);
  });

  it('D-5 marks the continue button disabled when continueDisabled is true', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn(),
      qualifierStep: {
        item: qualifierItem,
        selectedToken: null,
        onSelect: vi.fn(),
        onBack: vi.fn(),
        continueLabel: 'Next',
        continueDisabled: true,
        showBack: true
      }
    });

    const continueButton = view.querySelector<HTMLButtonElement>(
      '[data-testid="test-qualifier-continue-button"]'
    );
    expect(continueButton?.disabled).toBe(true);
  });
});
