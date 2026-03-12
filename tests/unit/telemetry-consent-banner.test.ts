import {JSDOM} from 'jsdom';
import {NextIntlClientProvider} from 'next-intl';
import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import enMessages from '../../src/messages/en.json';
import krMessages from '../../src/messages/kr.json';
import {TelemetryConsentBanner} from '../../src/features/landing/shell/telemetry-consent-banner';
import {
  resetTelemetryConsentSourceForTests,
  setTelemetryConsentState,
  syncTelemetryConsentSource,
  TELEMETRY_CONSENT_STORAGE_KEY
} from '../../src/features/landing/telemetry/consent-source';

let root: Root | null = null;

function IntlProviderHarness(props: {
  locale: 'en' | 'kr';
  messages: typeof enMessages | typeof krMessages;
  children?: React.ReactNode;
}) {
  const providerProps: React.ComponentProps<typeof NextIntlClientProvider> = {
    locale: props.locale,
    messages: props.messages,
    timeZone: 'UTC',
    children: props.children
  };

  return React.createElement(NextIntlClientProvider, providerProps);
}

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

async function renderBanner(locale: 'en' | 'kr') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  const messages = locale === 'kr' ? krMessages : enMessages;

  const tree = React.createElement(
    IntlProviderHarness,
    {
      locale,
      messages
    },
    React.createElement(TelemetryConsentBanner)
  );

  await act(async () => {
    root?.render(tree);
    await Promise.resolve();
  });

  return container;
}

function queryBanner() {
  return document.querySelector('[data-testid="telemetry-consent-banner"]');
}

describe('TelemetryConsentBanner', () => {
  beforeEach(() => {
    installDom();
    resetTelemetryConsentSourceForTests();
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

  it('renders the English banner when consent is synced as UNKNOWN', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('en');

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      'We use cookies and similar technologies to help the service work properly and to understand how it is used.'
    );
    expect(document.querySelector('[data-testid="telemetry-consent-accept"]')?.textContent).toBe('Accept all');
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.textContent).toBe('Deny');
    expect(document.querySelector('[data-testid="telemetry-consent-preferences"]')?.textContent).toBe('Preferences');
  });

  it('renders the Korean banner when consent is synced as UNKNOWN', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('kr');

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      '서비스가 원활하게 작동하고 이용 현황을 이해하기 위해 쿠키 및 유사 기술을 사용합니다.'
    );
    expect(document.querySelector('[data-testid="telemetry-consent-accept"]')?.textContent).toBe('모두 허용');
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.textContent).toBe('거부');
    expect(document.querySelector('[data-testid="telemetry-consent-preferences"]')?.textContent).toBe('설정');
  });

  it('hides itself immediately after accepting consent', async () => {
    syncTelemetryConsentSource();
    await renderBanner('en');

    const acceptButton = document.querySelector<HTMLButtonElement>('[data-testid="telemetry-consent-accept"]');
    expect(acceptButton).not.toBeNull();

    await act(async () => {
      acceptButton?.click();
      await Promise.resolve();
    });

    expect(queryBanner()).toBeNull();
    expect(window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('OPTED_IN');
  });

  it('hides itself immediately after denying consent', async () => {
    syncTelemetryConsentSource();
    await renderBanner('en');

    const denyButton = document.querySelector<HTMLButtonElement>('[data-testid="telemetry-consent-deny"]');
    expect(denyButton).not.toBeNull();

    await act(async () => {
      denyButton?.click();
      await Promise.resolve();
    });

    expect(queryBanner()).toBeNull();
    expect(window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('OPTED_OUT');
  });

  it('stays hidden when consent is already opted out', async () => {
    setTelemetryConsentState('OPTED_OUT');
    await renderBanner('en');
    expect(queryBanner()).toBeNull();
  });

  it('stays hidden when consent is already opted in', async () => {
    setTelemetryConsentState('OPTED_IN');
    await renderBanner('en');
    expect(queryBanner()).toBeNull();
  });
});
