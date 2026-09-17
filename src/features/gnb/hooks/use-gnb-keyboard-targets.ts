'use client';

import {useCallback} from 'react';

import {isVisibleFocusableGnbElement} from '@/features/gnb/gnb-keyboard-dom';
import type {MobileMenuState} from '@/features/gnb/types';

interface UseGnbKeyboardTargetsInput {
  settingsPanelId: string;
  mobileMenuPanelId: string;
  settingsOpen: boolean;
  mobileMenuState: MobileMenuState;
}

interface UseGnbKeyboardTargetsOutput {
  getOrderedKeyboardTargets: () => HTMLElement[];
}

const GNB_TARGET_SELECTOR = 'a[href], button';
const GNB_PANEL_SELECTOR = '[data-testid="gnb-settings-panel"], [data-testid="gnb-mobile-menu-panel"]';

export function useGnbKeyboardTargets(input: UseGnbKeyboardTargetsInput): UseGnbKeyboardTargetsOutput {
  const {settingsPanelId, mobileMenuPanelId, settingsOpen, mobileMenuState} = input;

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

    // 드로어가 열리면 순회는 **패널 안에서 닫힌다**(명세 §2-4 의 포커스 트랩). 종전에는 목록이
    // 햄버거로 시작했는데, 패널은 바 위층이라 그 버튼을 덮는다 — 보이지 않는 컨트롤이 첫
    // 탭 스톱이었다는 뜻이다. 이제 닫기는 패널 헤더 안에 보이는 것으로 있다.
    if (mobileMenuState !== 'closed') {
      return getPanelTargets(mobilePanel);
    }

    return mobileTargets;
  }, [mobileMenuPanelId, mobileMenuState, settingsOpen, settingsPanelId]);

  return {getOrderedKeyboardTargets};
}
