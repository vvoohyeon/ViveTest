'use client';

import {type RefObject, useEffect, useLayoutEffect, useState} from 'react';

interface LandingCardMeasuredTextSplit {
  visibleLineTexts: string[];
  overflowText: string;
}

export interface LandingCardTitleSplit {
  line1Text: string;
  overflowText: string;
}

export interface LandingCardSubtitleSplit {
  line1Text: string;
  line2Text: string;
  leadText: string;
  overflowText: string;
}

interface UseLandingCardMeasuredTextSplitInput {
  enabled: boolean;
  freeze: boolean;
  text: string;
  visibleLineCount: number;
  textRef: RefObject<HTMLElement | null>;
}

interface UseLandingCardTitleSplitInput {
  enabled: boolean;
  freeze: boolean;
  text: string;
  titleRef: RefObject<HTMLElement | null>;
}

interface UseLandingCardSubtitleSplitInput {
  enabled: boolean;
  freeze: boolean;
  text: string;
  subtitleRef: RefObject<HTMLElement | null>;
}

function createDefaultSplit(text: string, visibleLineCount: number): LandingCardMeasuredTextSplit {
  const safeVisibleLineCount = Math.max(1, Math.trunc(visibleLineCount));
  return {
    visibleLineTexts: Array.from({length: safeVisibleLineCount}, (_, index) => (index === 0 ? text : '')),
    overflowText: ''
  };
}

function isSameSplit(left: LandingCardMeasuredTextSplit, right: LandingCardMeasuredTextSplit): boolean {
  if (left.overflowText !== right.overflowText || left.visibleLineTexts.length !== right.visibleLineTexts.length) {
    return false;
  }

  return left.visibleLineTexts.every((line, index) => line === right.visibleLineTexts[index]);
}

function buildTextProbe(textElement: HTMLElement): HTMLElement {
  const probe = document.createElement(textElement.tagName.toLowerCase());
  const computedStyle = window.getComputedStyle(textElement);
  probe.className = 'landing-grid-card-text-probe';
  probe.style.width = `${textElement.getBoundingClientRect().width}px`;
  probe.style.font = computedStyle.font;
  probe.style.fontFamily = computedStyle.fontFamily;
  probe.style.fontSize = computedStyle.fontSize;
  probe.style.fontStyle = computedStyle.fontStyle;
  probe.style.fontStretch = computedStyle.fontStretch;
  probe.style.fontVariant = computedStyle.fontVariant;
  probe.style.fontWeight = computedStyle.fontWeight;
  probe.style.letterSpacing = computedStyle.letterSpacing;
  probe.style.lineHeight = computedStyle.lineHeight;
  probe.style.textTransform = computedStyle.textTransform;
  return probe;
}

function fitsWithinLineCount(
  probe: HTMLElement,
  text: string,
  maxVisibleLines: number,
  singleLineHeight: number
): boolean {
  probe.textContent = text;
  return probe.getBoundingClientRect().height <= singleLineHeight * maxVisibleLines + 0.5;
}

function measurePrefixLengthForLineCount(
  probe: HTMLElement,
  text: string,
  maxVisibleLines: number,
  singleLineHeight: number
): number {
  if (text.length === 0) {
    return 0;
  }

  if (fitsWithinLineCount(probe, text, maxVisibleLines, singleLineHeight)) {
    return text.length;
  }

  let low = 1;
  let high = text.length - 1;
  let bestPrefixLength = 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (fitsWithinLineCount(probe, text.slice(0, middle), maxVisibleLines, singleLineHeight)) {
      bestPrefixLength = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return bestPrefixLength;
}

function measureLandingCardTextSplit(
  textElement: HTMLElement,
  text: string,
  visibleLineCount: number
): LandingCardMeasuredTextSplit {
  if (text.length <= 1) {
    return createDefaultSplit(text, visibleLineCount);
  }

  const elementWidth = textElement.getBoundingClientRect().width;
  if (!Number.isFinite(elementWidth) || elementWidth <= 0) {
    return createDefaultSplit(text, visibleLineCount);
  }

  const probe = buildTextProbe(textElement);
  document.body.appendChild(probe);

  try {
    probe.textContent = 'A';
    const measuredSingleLineHeight = probe.getBoundingClientRect().height;
    const computedLineHeight = Number.parseFloat(window.getComputedStyle(textElement).lineHeight);
    const singleLineHeight = Number.isFinite(computedLineHeight) ? computedLineHeight : measuredSingleLineHeight;

    if (!Number.isFinite(singleLineHeight) || singleLineHeight <= 0) {
      return createDefaultSplit(text, visibleLineCount);
    }

    const visibleLineTexts: string[] = [];
    let previousBoundary = 0;

    for (let lineIndex = 1; lineIndex <= visibleLineCount; lineIndex += 1) {
      const currentBoundary = measurePrefixLengthForLineCount(probe, text, lineIndex, singleLineHeight);
      visibleLineTexts.push(text.slice(previousBoundary, currentBoundary));
      previousBoundary = currentBoundary;
    }

    return {
      visibleLineTexts,
      overflowText: text.slice(previousBoundary)
    };
  } finally {
    probe.remove();
  }
}

function useLandingCardMeasuredTextSplit({
  enabled,
  freeze,
  text,
  visibleLineCount,
  textRef
}: UseLandingCardMeasuredTextSplitInput): LandingCardMeasuredTextSplit {
  const [split, setSplit] = useState<LandingCardMeasuredTextSplit>(() => createDefaultSplit(text, visibleLineCount));

  useEffect(() => {
    setSplit(createDefaultSplit(text, visibleLineCount));
  }, [text, visibleLineCount]);

  useLayoutEffect(() => {
    if (!enabled) {
      setSplit(createDefaultSplit(text, visibleLineCount));
      return;
    }

    if (freeze) {
      return;
    }

    const textElement = textRef.current;
    if (!textElement || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let frame = 0;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const measure = () => {
      if (cancelled) {
        return;
      }

      const nextSplit = measureLandingCardTextSplit(textElement, text, visibleLineCount);
      setSplit((previous) => (isSameSplit(previous, nextSplit) ? previous : nextSplit));
    };

    const scheduleMeasure = () => {
      if (cancelled) {
        return;
      }

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(textElement);
    }

    void document.fonts?.ready?.then(() => {
      scheduleMeasure();
    });

    return () => {
      cancelled = true;
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      resizeObserver?.disconnect();
    };
  }, [enabled, freeze, text, textRef, visibleLineCount]);

  return split;
}

export function useLandingCardTitleSplit({
  enabled,
  freeze,
  text,
  titleRef
}: UseLandingCardTitleSplitInput): LandingCardTitleSplit {
  const split = useLandingCardMeasuredTextSplit({
    enabled,
    freeze,
    text,
    visibleLineCount: 1,
    textRef: titleRef
  });

  return {
    line1Text: split.visibleLineTexts[0] ?? '',
    overflowText: split.overflowText
  };
}

export function useLandingCardSubtitleSplit({
  enabled,
  freeze,
  text,
  subtitleRef
}: UseLandingCardSubtitleSplitInput): LandingCardSubtitleSplit {
  const split = useLandingCardMeasuredTextSplit({
    enabled,
    freeze,
    text,
    visibleLineCount: 2,
    textRef: subtitleRef
  });
  const line1Text = split.visibleLineTexts[0] ?? '';
  const line2Text = split.visibleLineTexts[1] ?? '';

  return {
    line1Text,
    line2Text,
    leadText: `${line1Text}${line2Text}`,
    overflowText: split.overflowText
  };
}
