"use client";

export const THEME_TRANSITION_CONFIG = {
  durationMs: 2000,
  easing: "ease-in-out",
  blurAmount: 2,
  styleId: "theme-switch-style",
  baseStyleId: "theme-switch-base-style",
} as const;

interface BlurCircleTransitionInput {
  sourceEl?: HTMLElement | null;
  applyThemeDomWrite: () => void;
  durationMs?: number;
}

interface ViewTransitionLike {
  ready: Promise<void>;
}

type ThemeTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike;
};

export function resolveThemeTransitionDuration(durationMs?: number): number {
  return durationMs ?? THEME_TRANSITION_CONFIG.durationMs;
}

function isReducedMotionPreferred(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function supportsThemeTransition(
  sourceEl?: HTMLElement | null,
): boolean {
  if (typeof document === "undefined" || !sourceEl) {
    return false;
  }

  const transitionDocument = document as ThemeTransitionDocument;
  return (
    typeof transitionDocument.startViewTransition === "function" &&
    !isReducedMotionPreferred()
  );
}

export function getTransitionOrigin(sourceEl: HTMLElement): {
  x: number;
  y: number;
} {
  const { top, left, width, height } = sourceEl.getBoundingClientRect();

  return {
    x: left + width / 2,
    y: top + height / 2,
  };
}

function injectBaseStyles() {
  const existingStyle = document.getElementById(
    THEME_TRANSITION_CONFIG.baseStyleId,
  );
  if (existingStyle) {
    return;
  }

  const styleElement = document.createElement("style");
  styleElement.id = THEME_TRANSITION_CONFIG.baseStyleId;
  styleElement.textContent = `
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
      mix-blend-mode: normal;
    }
  `;
  document.head.appendChild(styleElement);
}

function createBlurCircleMask(blurAmount: number): string {
  return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><defs><filter id="blur"><feGaussianBlur stdDeviation="${blurAmount}" /></filter></defs><circle cx="0" cy="0" r="25" fill="white" filter="url(%23blur)"/></svg>')`;
}

function buildBlurCircleStyle(input: {
  x: number;
  y: number;
  durationMs: number;
}): string {
  const { x, y, durationMs } = input;
  const { easing, blurAmount } = THEME_TRANSITION_CONFIG;
  const topLeft = Math.hypot(x, y);
  const topRight = Math.hypot(window.innerWidth - x, y);
  const bottomLeft = Math.hypot(x, window.innerHeight - y);
  const bottomRight = Math.hypot(window.innerWidth - x, window.innerHeight - y);
  const maxRadius = Math.max(topLeft, topRight, bottomLeft, bottomRight);
  const viewportSize = Math.max(window.innerWidth, window.innerHeight) + 200;
  const finalMaskSize = Math.max(viewportSize * 4, maxRadius * 2.5);
  const finalMaskX = x - finalMaskSize / 2;
  const finalMaskY = y - finalMaskSize / 2;

  return `
    ::view-transition-group(root) {
      animation-duration: ${durationMs}ms;
      animation-timing-function: ${easing};
    }

    ::view-transition-new(root) {
      mask: ${createBlurCircleMask(blurAmount)} 0 0 / 100% 100% no-repeat;
      mask-position: ${x}px ${y}px;
      animation: theme-switch-blur-circle ${durationMs}ms ${easing};
      transform-origin: ${x}px ${y}px;
      will-change: mask-size, mask-position;
    }

    ::view-transition-old(root) {
      animation: theme-switch-blur-circle ${durationMs}ms ${easing};
      transform-origin: ${x}px ${y}px;
      z-index: -1;
      will-change: mask-size, mask-position;
    }

    @keyframes theme-switch-blur-circle {
      0% {
        mask-size: 0px;
        mask-position: ${x}px ${y}px;
      }

      100% {
        mask-size: ${finalMaskSize}px;
        mask-position: ${finalMaskX}px ${finalMaskY}px;
      }
    }
  `;
}

function removeTransitionStyle() {
  document.getElementById(THEME_TRANSITION_CONFIG.styleId)?.remove();
}

export async function runBlurCircleTransition({
  sourceEl,
  applyThemeDomWrite,
  durationMs,
}: BlurCircleTransitionInput): Promise<void> {
  if (!supportsThemeTransition(sourceEl)) {
    applyThemeDomWrite();
    return;
  }

  const transitionSourceEl = sourceEl;
  if (!transitionSourceEl) {
    applyThemeDomWrite();
    return;
  }

  const transitionDocument = document as ThemeTransitionDocument;
  const nextDurationMs = resolveThemeTransitionDuration(durationMs);
  const { x, y } = getTransitionOrigin(transitionSourceEl);

  injectBaseStyles();
  removeTransitionStyle();

  const styleElement = document.createElement("style");
  styleElement.id = THEME_TRANSITION_CONFIG.styleId;
  styleElement.textContent = buildBlurCircleStyle({
    x,
    y,
    durationMs: nextDurationMs,
  });
  document.head.appendChild(styleElement);

  try {
    const transition = transitionDocument.startViewTransition?.(() => {
      applyThemeDomWrite();
    });

    await transition?.ready;
  } catch {
    removeTransitionStyle();
    applyThemeDomWrite();
    return;
  }

  window.setTimeout(() => {
    removeTransitionStyle();
  }, nextDurationMs);
}
