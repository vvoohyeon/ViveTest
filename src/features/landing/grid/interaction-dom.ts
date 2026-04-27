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

export function isVisibleFocusableElement(element: HTMLElement | null): element is HTMLElement {
  if (!element || element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
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
