'use client';

import {useCallback} from 'react';
import type {RefObject} from 'react';

import {isVisibleFocusableGnbElement} from '@/features/gnb/gnb-keyboard-dom';
import type {MobileMenuState} from '@/features/gnb/types';

interface UseGnbKeyboardTargetsInput {
  settingsPanelId: string;
  mobileMenuPanelId: string;
  settingsOpen: boolean;
  mobileMenuState: MobileMenuState;
  mobileMenuTriggerRef: RefObject<HTMLButtonElement | null>;
}

interface UseGnbKeyboardTargetsOutput {
  getOrderedKeyboardTargets: () => HTMLElement[];
}

const GNB_TARGET_SELECTOR = 'a[href], button';
const GNB_PANEL_SELECTOR = '[data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]';

export function useGnbKeyboardTargets(input: UseGnbKeyboardTargetsInput): UseGnbKeyboardTargetsOutput {
  const {settingsPanelId, mobileMenuPanelId, settingsOpen, mobileMenuState, mobileMenuTriggerRef} = input;

  const getOrderedKeyboardTargets = useCallback((): HTMLElement[] => {
    if (typeof document === 'undefined') {
      return [];
    }

    const desktopContainer = document.querySelector<HTMLElement>('.gnb-desktop');
    const mobileContainer = document.querySelector<HTMLElement>('.gnb-mobile');
    const settingsPanel = document.getElementById(settingsPanelId);
    const mobilePanel = document.getElementById(mobileMenuPanelId);

    const getTopLevelTargets = (container: HTMLElement | null) => {
      if (!isVisibleFocusableGnbElement(container)) {
        return [];
      }

      return Array.from(container.querySelectorAll<HTMLElement>(GNB_TARGET_SELECTOR)).filter((element) => {
        if (!isVisibleFocusableGnbElement(element)) {
          return false;
        }

        return !element.closest(GNB_PANEL_SELECTOR);
      });
    };

    const getPanelTargets = (panel: HTMLElement | null) => {
      if (!isVisibleFocusableGnbElement(panel)) {
        return [];
      }

      return Array.from(panel.querySelectorAll<HTMLElement>(GNB_TARGET_SELECTOR)).filter((element) =>
        isVisibleFocusableGnbElement(element)
      );
    };

    const desktopTargets = getTopLevelTargets(desktopContainer);
    if (desktopTargets.length > 0) {
      return settingsOpen ? [...desktopTargets, ...getPanelTargets(settingsPanel)] : desktopTargets;
    }

    const mobileTargets = getTopLevelTargets(mobileContainer);
    if (mobileTargets.length === 0) {
      return [];
    }

    if (mobileMenuState !== 'closed') {
      const trigger = mobileMenuTriggerRef.current;
      return [...(isVisibleFocusableGnbElement(trigger) ? [trigger] : []), ...getPanelTargets(mobilePanel)];
    }

    return mobileTargets;
  }, [mobileMenuPanelId, mobileMenuState, mobileMenuTriggerRef, settingsOpen, settingsPanelId]);

  return {getOrderedKeyboardTargets};
}
