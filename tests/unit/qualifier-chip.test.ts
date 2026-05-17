// @vitest-environment jsdom

import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {QualifierChip} from '../../src/features/test/qualifier-chip';

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderChip(props: React.ComponentProps<typeof QualifierChip>): HTMLDivElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(React.createElement(QualifierChip, props));
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

describe('QualifierChip', () => {
  it('D-1 renders the provided label', () => {
    const view = renderChip({
      label: 'Male · Pending',
      ariaLabel: 'Edit qualifier',
      onActivate: vi.fn()
    });

    expect(view.querySelector('[data-testid="test-qualifier-chip"]')?.textContent).toBe(
      'Male · Pending'
    );
  });

  it('D-2 invokes onActivate when clicked', () => {
    const onActivate = vi.fn();
    const view = renderChip({
      label: 'Male',
      ariaLabel: 'Edit qualifier',
      onActivate
    });

    const chip = view.querySelector<HTMLElement>('[data-testid="test-qualifier-chip"]');
    act(() => {
      chip?.click();
    });

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('D-3 applies the provided aria label', () => {
    const view = renderChip({
      label: 'Male',
      ariaLabel: 'Edit qualifier',
      onActivate: vi.fn()
    });

    expect(view.querySelector('[data-testid="test-qualifier-chip"]')?.getAttribute('aria-label')).toBe(
      'Edit qualifier'
    );
  });

  it('D-4 invokes onActivate when Enter is pressed', () => {
    const onActivate = vi.fn();
    const view = renderChip({
      label: 'Male',
      ariaLabel: 'Edit qualifier',
      onActivate
    });

    const chip = view.querySelector<HTMLElement>('[data-testid="test-qualifier-chip"]');
    const event = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true});
    act(() => {
      chip?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('D-5 invokes onActivate when Space is pressed', () => {
    const onActivate = vi.fn();
    const view = renderChip({
      label: 'Male',
      ariaLabel: 'Edit qualifier',
      onActivate
    });

    const chip = view.querySelector<HTMLElement>('[data-testid="test-qualifier-chip"]');
    const event = new KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true});
    act(() => {
      chip?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
