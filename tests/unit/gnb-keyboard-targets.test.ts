// @vitest-environment jsdom

import {renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {useGnbKeyboardTargets} from '../../src/features/gnb/hooks/use-gnb-keyboard-targets';
import type {MobileMenuState} from '../../src/features/gnb/types';

function mountGnbFixture() {
  document.body.innerHTML = `
    <header>
      <div class="gnb-desktop">
        <a href="/" data-testid="desktop-ci">Desktop CI</a>
        <a href="/history">History</a>
        <a href="/blog">Blog</a>
        <button data-testid="gnb-settings-trigger">Settings</button>
        <div id="settings-panel" data-testid="gnb-settings-panel" hidden>
          <button>English</button>
          <button disabled>Current Locale</button>
          <button aria-disabled="true">Current Theme</button>
          <button>Dark</button>
        </div>
      </div>
      <div class="gnb-mobile" hidden>
        <a href="/" data-testid="mobile-ci">Mobile CI</a>
        <button data-testid="gnb-mobile-back">Back</button>
        <button data-testid="gnb-mobile-menu-trigger">Menu</button>
      </div>
    </header>
    <div id="mobile-panel" data-testid="gnb-mobile-menu-panel" hidden>
      <a href="/">Home</a>
      <a href="/history">Mobile History</a>
      <button disabled>Disabled Mobile</button>
      <button>Light</button>
    </div>
  `;

  return {
    desktop: document.querySelector<HTMLElement>('.gnb-desktop')!,
    mobile: document.querySelector<HTMLElement>('.gnb-mobile')!,
    settingsPanel: document.getElementById('settings-panel')!,
    mobilePanel: document.getElementById('mobile-panel')!,
    mobileMenuTrigger: document.querySelector<HTMLButtonElement>('[data-testid="gnb-mobile-menu-trigger"]')!
  };
}

function renderTargets({
  settingsOpen = false,
  mobileMenuState = 'closed'
}: {
  settingsOpen?: boolean;
  mobileMenuState?: MobileMenuState;
} = {}) {
  const fixture = mountGnbFixture();
  fixture.settingsPanel.hidden = !settingsOpen;
  fixture.mobilePanel.hidden = mobileMenuState === 'closed';
  const mobileMenuTriggerRef = {current: fixture.mobileMenuTrigger};
  const {result} = renderHook(() =>
    useGnbKeyboardTargets({
      settingsPanelId: fixture.settingsPanel.id,
      mobileMenuPanelId: fixture.mobilePanel.id,
      settingsOpen,
      mobileMenuState,
      mobileMenuTriggerRef
    })
  );

  return {fixture, targets: result.current.getOrderedKeyboardTargets()};
}

describe('useGnbKeyboardTargets', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('desktop closed returns visible desktop CI, nav links, and settings trigger only', () => {
    const {targets} = renderTargets();

    expect(targets.map((element) => element.textContent)).toEqual(['Desktop CI', 'History', 'Blog', 'Settings']);
  });

  it('desktop settings open appends enabled settings panel controls after top-level targets', () => {
    const {targets} = renderTargets({settingsOpen: true});

    expect(targets.map((element) => element.textContent)).toEqual([
      'Desktop CI',
      'History',
      'Blog',
      'Settings',
      'English',
      'Dark'
    ]);
  });

  it('desktop closed excludes settings panel descendants from top-level targets', () => {
    const fixture = mountGnbFixture();
    fixture.settingsPanel.hidden = false;
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: false,
        mobileMenuState: 'closed',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).toEqual([
      'Desktop CI',
      'History',
      'Blog',
      'Settings'
    ]);
  });

  it('mobile closed returns visible mobile CI/back and menu trigger only', () => {
    const fixture = mountGnbFixture();
    fixture.desktop.hidden = true;
    fixture.mobile.hidden = false;
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: false,
        mobileMenuState: 'closed',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).toEqual([
      'Mobile CI',
      'Back',
      'Menu'
    ]);
  });

  it('mobile menu open returns mobile menu trigger followed by panel links and enabled controls', () => {
    const fixture = mountGnbFixture();
    fixture.desktop.hidden = true;
    fixture.mobile.hidden = false;
    fixture.mobilePanel.hidden = false;
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: false,
        mobileMenuState: 'open',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).toEqual([
      'Menu',
      'Home',
      'Mobile History',
      'Light'
    ]);
  });

  it('hidden desktop container falls back to mobile targets', () => {
    const fixture = mountGnbFixture();
    fixture.desktop.hidden = true;
    fixture.mobile.hidden = false;
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: false,
        mobileMenuState: 'closed',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).toEqual([
      'Mobile CI',
      'Back',
      'Menu'
    ]);
  });

  it('disabled current locale and theme buttons are excluded', () => {
    const fixture = mountGnbFixture();
    fixture.settingsPanel.hidden = false;
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: true,
        mobileMenuState: 'closed',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).not.toContain(
      'Current Locale'
    );
    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).not.toContain(
      'Current Theme'
    );
  });

  it('aria-hidden and CSS-hidden panels are excluded', () => {
    const fixture = mountGnbFixture();
    fixture.settingsPanel.hidden = false;
    fixture.settingsPanel.setAttribute('aria-hidden', 'true');
    fixture.desktop.hidden = true;
    fixture.mobile.hidden = false;
    fixture.mobilePanel.hidden = false;
    fixture.mobilePanel.style.display = 'none';
    const {result} = renderHook(() =>
      useGnbKeyboardTargets({
        settingsPanelId: fixture.settingsPanel.id,
        mobileMenuPanelId: fixture.mobilePanel.id,
        settingsOpen: true,
        mobileMenuState: 'open',
        mobileMenuTriggerRef: {current: fixture.mobileMenuTrigger}
      })
    );

    expect(result.current.getOrderedKeyboardTargets().map((element) => element.textContent)).toEqual(['Menu']);
  });
});
