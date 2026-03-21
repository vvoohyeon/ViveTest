import {JSDOM} from 'jsdom';
import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {analyticsRenderSpy} = vi.hoisted(() => ({
  analyticsRenderSpy: vi.fn(() => null)
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: analyticsRenderSpy
}));

import {VercelAnalyticsGate} from '../../src/app/vercel-analytics-gate';
import {resetTelemetryConsentSourceForTests, setTelemetryConsentState} from '../../src/features/landing/telemetry/consent-source';

let root: Root | null = null;

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/en'
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: dom.window
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator
  });
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: dom.window.HTMLElement
  });
  Object.defineProperty(globalThis, 'StorageEvent', {
    configurable: true,
    value: dom.window.StorageEvent
  });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true
  });
}

async function renderGate() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  // effect 기반 동의 동기화가 끝난 뒤에만 Analytics 렌더 여부를 판정한다.
  await act(async () => {
    root?.render(React.createElement(VercelAnalyticsGate));
    await Promise.resolve();
  });
}

function uninstallDom() {
  // @ts-expect-error test cleanup
  delete globalThis.window;
  // @ts-expect-error test cleanup
  delete globalThis.document;
  // @ts-expect-error test cleanup
  delete globalThis.navigator;
  // @ts-expect-error test cleanup
  delete globalThis.HTMLElement;
  // @ts-expect-error test cleanup
  delete globalThis.StorageEvent;
  // @ts-expect-error test cleanup
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
}

describe('VercelAnalyticsGate', () => {
  beforeEach(() => {
    installDom();
    resetTelemetryConsentSourceForTests();
    analyticsRenderSpy.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });

    root = null;
    resetTelemetryConsentSourceForTests();
    uninstallDom();
  });

  it('does not render Analytics when consent is missing', async () => {
    await renderGate();

    expect(analyticsRenderSpy).not.toHaveBeenCalled();
  });

  it('does not render Analytics when consent stays UNKNOWN after sync', async () => {
    window.localStorage.removeItem('vivetest-telemetry-consent');

    await renderGate();

    expect(analyticsRenderSpy).not.toHaveBeenCalled();
  });

  it('does not render Analytics when consent is opted out', async () => {
    setTelemetryConsentState('OPTED_OUT');

    await renderGate();

    expect(analyticsRenderSpy).not.toHaveBeenCalled();
  });

  it('renders Analytics when consent is opted in', async () => {
    await renderGate();
    analyticsRenderSpy.mockClear();

    // 같은 탭 setter 호출만으로 gate가 즉시 재평가되어야 한다.
    await act(async () => {
      setTelemetryConsentState('OPTED_IN');
      await Promise.resolve();
    });

    expect(analyticsRenderSpy).toHaveBeenCalledTimes(1);
  });
});
