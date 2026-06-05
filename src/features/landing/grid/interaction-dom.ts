export function getCardRootElement(element: HTMLElement): HTMLElement | null {
  return element.closest<HTMLElement>('[data-testid="landing-grid-card"]');
}

export function getExpandedFocusableElements(cardElement: HTMLElement): HTMLElement[] {
  const expandedBody = cardElement.querySelector<HTMLElement>('[data-slot="expandedBody"]');
  if (!expandedBody) {
    return [];
  }

  return Array.from(
    expandedBody.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
  ).filter((candidate) => candidate.getAttribute('aria-hidden') !== 'true');
}

export function resolveAdjacentCardVariant(
  cardVariants: readonly string[],
  currentCardVariant: string,
  step: 1 | -1
): string | null {
  const index = cardVariants.indexOf(currentCardVariant);
  if (index < 0) {
    return null;
  }

  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= cardVariants.length) {
    return null;
  }

  return cardVariants[nextIndex] ?? null;
}

// D1/BQ-26: keyboard handoff은 unavailable(non-enterable) 카드를 건너뛰고 같은 방향의 다음 enterable
// 카드로 이동한다. 해당 방향에 enterable 카드가 없으면 null을 반환해 GNB-return / self 폴백을 보존한다.
export function resolveAdjacentEnterableCardVariant(
  cardVariants: readonly string[],
  currentCardVariant: string,
  step: 1 | -1,
  isEnterable: (cardVariant: string) => boolean
): string | null {
  const index = cardVariants.indexOf(currentCardVariant);
  if (index < 0) {
    return null;
  }

  for (let nextIndex = index + step; nextIndex >= 0 && nextIndex < cardVariants.length; nextIndex += step) {
    const candidate = cardVariants[nextIndex];
    if (candidate && isEnterable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function focusCardByVariant(shellElement: HTMLElement | null, cardVariant: string | null): boolean {
  if (!shellElement || !cardVariant) {
    return false;
  }

  const selector = `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"] [data-testid="landing-grid-card-trigger"]`;
  const nextTrigger = shellElement.querySelector<HTMLElement>(selector);
  if (!nextTrigger) {
    return false;
  }

  nextTrigger.focus();
  return true;
}

export function isDocumentLevelFocusTarget(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return target === document.body || target === document.documentElement;
}

interface IsVisibleFocusableElementOptions {
  excludeDisabled?: boolean;
}

export function isVisibleFocusableElement(
  element: HTMLElement | null,
  options: IsVisibleFocusableElementOptions = {}
): element is HTMLElement {
  if (!element || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  if (options.excludeDisabled === true) {
    return !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true';
  }

  return true;
}

export function queueFocusCardByVariant(shellElement: HTMLElement | null, cardVariant: string | null) {
  if (typeof window === 'undefined' || !cardVariant) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      focusCardByVariant(shellElement, cardVariant);
    });
  });
}

export function queueFocusCallback(callback: () => void) {
  if (typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      callback();
    });
  });
}

export function isMobileCardElement(element: HTMLElement): boolean {
  const cardElement = getCardRootElement(element) ?? element;
  return cardElement.dataset.cardViewportTier === 'mobile';
}

export function resolveCardBoundaryElement(shellElement: HTMLElement | null, cardVariant: string): HTMLElement | null {
  if (!shellElement) {
    return null;
  }

  const cardElement = shellElement.querySelector<HTMLElement>(
    `[data-testid="landing-grid-card"][data-card-variant="${cardVariant}"]`
  );
  if (!cardElement) {
    return null;
  }

  return (
    cardElement.querySelector<HTMLElement>('[data-slot="expandedBody"]') ??
    cardElement.querySelector<HTMLElement>('[data-testid="landing-grid-card-trigger"]') ??
    cardElement
  );
}
