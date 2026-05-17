// @vitest-environment jsdom

import {NextIntlClientProvider} from 'next-intl';
import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import enMessages from '../../src/messages/en.json';
import {trackResultViewed} from '../../src/features/telemetry/runtime';
import {buildVariantQuestionBank} from '../../src/features/test/question-bank';
import {TestResultPanel} from '../../src/features/test/test-result-panel';
import type {LocalizedRoutePath} from '../../src/i18n/localized-path';

vi.mock('../../src/features/telemetry/runtime', () => ({
  trackResultViewed: vi.fn()
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderPanel() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  const panel = React.createElement(TestResultPanel, {
    questions: buildVariantQuestionBank('qmbti', 'en'),
    answers: {'1': 'A', '2': 'B', '3': 'A', '4': 'B'},
    locale: 'en',
    landingPath: '/en' as LocalizedRoutePath,
    route: '/en/test/qmbti',
    variant: 'qmbti',
    landingIngressFlag: true
  });
  const providerProps: React.ComponentProps<typeof NextIntlClientProvider> = {
    locale: 'en',
    messages: enMessages,
    timeZone: 'UTC',
    children: panel
  };
  const tree = React.createElement(NextIntlClientProvider, providerProps);

  act(() => {
    root?.render(tree);
  });
}

describe('TestResultPanel result_viewed telemetry', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: true
    });
    vi.clearAllMocks();
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

  it('fires result_viewed once when the result panel mounts', () => {
    renderPanel();

    expect(vi.mocked(trackResultViewed)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(trackResultViewed)).toHaveBeenCalledWith({
      locale: 'en',
      route: '/en/test/qmbti',
      variant: 'qmbti',
      landingIngressFlag: true
    });
  });
});
