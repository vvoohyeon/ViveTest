import {JSDOM} from 'jsdom';
import {NextIntlClientProvider} from 'next-intl';
import React, {act} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import enMessages from '../../src/messages/en.json';
import jaMessages from '../../src/messages/ja.json';
import krMessages from '../../src/messages/kr.json';
import {TelemetryConsentBanner} from '../../src/features/landing/shell/telemetry-consent-banner';
import {
  requestConsentRecall,
  resetConsentRecallForTests
} from '../../src/features/telemetry/consent-recall';
import {
  resetTelemetryConsentSourceForTests,
  setTelemetryConsentState,
  syncTelemetryConsentSource,
  TELEMETRY_CONSENT_STORAGE_KEY
} from '../../src/features/telemetry/consent-source';

let root: Root | null = null;
const testMessagesByLocale = {
  en: enMessages,
  kr: krMessages,
  ja: jaMessages
} as const;

type BannerTestLocale = keyof typeof testMessagesByLocale;

function IntlProviderHarness(props: {
  locale: BannerTestLocale;
  messages: (typeof testMessagesByLocale)[BannerTestLocale];
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

async function renderBanner(locale: BannerTestLocale) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  const tree = React.createElement(
    IntlProviderHarness,
    {
      locale,
      messages: testMessagesByLocale[locale]
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
    resetConsentRecallForTests();
  });

  afterEach(async () => {
    await act(async () => {
      root?.unmount();
      await Promise.resolve();
    });

    root = null;
    resetTelemetryConsentSourceForTests();
    resetConsentRecallForTests();
    uninstallDom();
  });

  it('renders the English banner when consent is synced as UNKNOWN', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('en');

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      'We use optional analytics to see which tests people finish. Nothing you answer is sent.'
    );
    expect(document.querySelector('[data-testid="telemetry-consent-accept"]')?.textContent).toBe('Allow');
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.textContent).toBe('Deny');
  });

  it('renders the Korean banner when consent is synced as UNKNOWN', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('kr');

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      '어떤 테스트가 끝까지 진행되는지 보기 위해 선택적 분석을 사용합니다. 답변 내용은 전송되지 않습니다.'
    );
    expect(document.querySelector('[data-testid="telemetry-consent-accept"]')?.textContent).toBe('허용');
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.textContent).toBe('거부');
  });

  it('renders the Japanese banner when consent is synced as UNKNOWN', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('ja');

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(
      'どのテストが最後まで進むかを把握するため、任意の分析を使用します。回答内容は送信されません。'
    );
    expect(document.querySelector('[data-testid="telemetry-consent-accept"]')?.textContent).toBe('許可');
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.textContent).toBe('拒否');
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
  it('shows two buttons and no close on the first-visit banner', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('en');

    // 규칙 4 — 세 번째 버튼은 없다. 종전의 `Preferences` 는 title 에만 설명이 있는 no-op 이었다.
    expect(document.querySelectorAll('.telemetry-consent-banner-actions button')).toHaveLength(2);
    expect(document.querySelector('[data-testid="telemetry-consent-preferences"]')).toBeNull();
    // 첫 방문 배너에 X 가 있으면 「선택하지 않음」이라는 네 번째 답이 생긴다(명세 §2-5).
    expect(document.querySelector('[data-testid="telemetry-consent-close"]')).toBeNull();
    expect(queryBanner()?.getAttribute('data-mode')).toBe('initial');
  });

  it('recalls the same banner with a close and marks Deny as the previous choice', async () => {
    setTelemetryConsentState('OPTED_OUT');
    await renderBanner('en');
    expect(queryBanner()).toBeNull();

    await act(async () => {
      requestConsentRecall();
      await Promise.resolve();
    });

    const banner = queryBanner();
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('data-mode')).toBe('recall');
    expect(document.querySelector('[data-testid="telemetry-consent-close"]')).not.toBeNull();

    const deny = document.querySelector('[data-testid="telemetry-consent-deny"]');
    expect(deny?.className).toContain('telemetry-consent-banner-previous-choice');
    expect(deny?.textContent).toContain('Your previous choice');
    // 재호출에서도 제품은 동의 쪽을 권한다 — CTA 는 형태를 잃지 않는다.
    const accept = document.querySelector('[data-testid="telemetry-consent-accept"]');
    expect(accept?.className).toContain('telemetry-consent-banner-button-accent');
    expect(accept?.className).not.toContain('telemetry-consent-banner-previous-choice');
  });

  it('marks Allow as the previous choice when the last answer was opt-in', async () => {
    setTelemetryConsentState('OPTED_IN');
    await renderBanner('en');

    await act(async () => {
      requestConsentRecall();
      await Promise.resolve();
    });

    const accept = document.querySelector('[data-testid="telemetry-consent-accept"]');
    expect(accept?.textContent).toContain('Your previous choice');
    expect(accept?.querySelector('.telemetry-consent-banner-mark')).not.toBeNull();
    expect(document.querySelector('[data-testid="telemetry-consent-deny"]')?.className).not.toContain(
      'telemetry-consent-banner-previous-choice'
    );
  });

  it('closes the recalled banner without changing the stored choice', async () => {
    setTelemetryConsentState('OPTED_OUT');
    await renderBanner('en');

    await act(async () => {
      requestConsentRecall();
      await Promise.resolve();
    });

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="telemetry-consent-close"]')?.click();
      await Promise.resolve();
    });

    expect(queryBanner()).toBeNull();
    expect(window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('OPTED_OUT');
  });

  it('closes the recalled banner when a choice is made in it', async () => {
    // 회귀: 선택이 곧 닫기다. 재호출 요청을 함께 거두지 않으면 답한 직후의 배너가 재호출
    // 모드로 다시 서서 영영 닫히지 않는다.
    setTelemetryConsentState('OPTED_OUT');
    await renderBanner('en');

    await act(async () => {
      requestConsentRecall();
      await Promise.resolve();
    });

    await act(async () => {
      document.querySelector<HTMLButtonElement>('[data-testid="telemetry-consent-accept"]')?.click();
      await Promise.resolve();
    });

    expect(queryBanner()).toBeNull();
    expect(window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)).toBe('OPTED_IN');
  });

  it('keeps the first-visit banner in initial mode when recall is requested before any choice', async () => {
    window.localStorage.removeItem(TELEMETRY_CONSENT_STORAGE_KEY);
    syncTelemetryConsentSource();
    await renderBanner('en');

    await act(async () => {
      requestConsentRecall();
      await Promise.resolve();
    });

    expect(queryBanner()?.getAttribute('data-mode')).toBe('initial');
    expect(document.querySelector('[data-testid="telemetry-consent-close"]')).toBeNull();
  });
});
