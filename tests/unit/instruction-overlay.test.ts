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

function pressKey(target: Element | null, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...init});
  act(() => {
    target?.dispatchEvent(event);
  });
  return event;
}

describe('InstructionOverlay — modal dialog contract', () => {
  it('M-1 is a labelled modal dialog and takes focus on open', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn()
    });

    const dialog = view.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog?.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelledBy)?.textContent).toBe('Instruction title');
    const describedBy = dialog?.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Read this carefully.');
    expect(document.activeElement).toBe(dialog);
  });

  // 종전 제목은 「Escape performs the secondary (dismiss) action」이었고, 그 계약이 취소 키를
  // `ACTION_EFFECTS` 의 별칭으로 만들었다 — `deny_and_start` 면 `OPTED_OUT` 저장 +
  // `instructionSeen` 기록 + 진행, `deny_and_abandon` 이면 저장 + 랜딩 복귀. 개정으로
  // instruction step 의 `Esc` 는 no-op 이다(`req-test.md` §3.6).
  it('M-2 Escape is inert on the instruction step even when a secondary CTA exists', () => {
    const onPrimaryAction = vi.fn();
    const onSecondaryAction = vi.fn();
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: true,
      primaryLabel: 'Accept all and start',
      secondaryLabel: 'Deny and start',
      onPrimaryAction,
      onSecondaryAction
    });

    const event = pressKey(view.querySelector('[role="dialog"]'), 'Escape');

    // 부수효과를 실어 나르던 두 경로 어느 쪽도 실행되지 않는다.
    expect(onSecondaryAction).not.toHaveBeenCalled();
    expect(onPrimaryAction).not.toHaveBeenCalled();
    // `preventDefault` 도 하지 않는다 — 삼키지 않고 그대로 흘려보낸다.
    expect(event.defaultPrevented).toBe(false);
    // 그리고 창은 열린 채다. 동의를 묻는 문이 `Esc` 로 열리지 않는다는 것이 이 계약이다.
    expect(view.querySelector('[data-testid="test-instruction-overlay"]')).not.toBeNull();
  });

  it('M-2b the secondary CTA still carries its effect when pressed', () => {
    // 금지는 `Esc` 에만 걸린다 — 버튼을 눌렀을 때의 action identity 는 consent matrix 그대로다.
    // 이 단언이 없으면 위 개정이 secondary CTA 자체를 죽였는지 알 수 없다.
    const onSecondaryAction = vi.fn();
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: true,
      primaryLabel: 'Accept all and start',
      secondaryLabel: 'Deny and start',
      onPrimaryAction: vi.fn(),
      onSecondaryAction
    });

    view.querySelector<HTMLButtonElement>('[data-testid="test-secondary-instruction-button"]')?.click();

    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });

  it('M-3 Escape does nothing when the only way forward is the primary action', () => {
    const onPrimaryAction = vi.fn();
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction
    });

    const event = pressKey(view.querySelector('[role="dialog"]'), 'Escape');

    expect(onPrimaryAction).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(view.querySelector('[data-testid="test-instruction-overlay"]')).not.toBeNull();
  });

  it('M-4 Escape on a qualifier step is Back / Cancel', () => {
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

    pressKey(view.querySelector('[data-testid="test-qualifier-choice-m"]'), 'Escape');

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('M-5 Tab wraps inside the dialog in both directions', () => {
    const view = renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: true,
      primaryLabel: 'Accept all and start',
      secondaryLabel: 'Deny and start',
      onPrimaryAction: vi.fn(),
      onSecondaryAction: vi.fn()
    });

    const first = view.querySelector<HTMLButtonElement>('[data-testid="test-secondary-instruction-button"]');
    const last = view.querySelector<HTMLButtonElement>('[data-testid="test-start-button"]');

    act(() => {
      last?.focus();
    });
    const forward = pressKey(last, 'Tab');
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    const backward = pressKey(first, 'Tab', {shiftKey: true});
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    // From the container itself, Shift+Tab must not leak out of the dialog either.
    const dialog = view.querySelector<HTMLElement>('[role="dialog"]');
    act(() => {
      dialog?.focus();
    });
    const fromContainer = pressKey(dialog, 'Tab', {shiftKey: true});
    expect(fromContainer.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('M-6 returns focus to the opener when it closes', () => {
    const opener = document.createElement('button');
    opener.textContent = 'chip';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    renderOverlay({
      title: 'Instruction title',
      instructionText: 'Read this carefully.',
      showDivider: false,
      primaryLabel: 'Start',
      onPrimaryAction: vi.fn()
    });
    expect(document.activeElement).not.toBe(opener);

    act(() => {
      root?.unmount();
    });
    root = null;

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
