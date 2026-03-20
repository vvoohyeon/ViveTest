import { describe, expect, it } from "vitest";

import {
  THEME_TRANSITION_CONFIG,
  resolveThemeTransitionDuration,
} from "../../src/features/landing/gnb/hooks/theme-transition";

describe("gnb theme transition contracts", () => {
  it("keeps the blur circle duration config at 750ms by default", () => {
    expect(THEME_TRANSITION_CONFIG.durationMs).toBe(1500);
    expect(resolveThemeTransitionDuration()).toBe(
      THEME_TRANSITION_CONFIG.durationMs,
    );
  });

  it("allows explicit duration overrides for future experiments", () => {
    expect(resolveThemeTransitionDuration(1500)).toBe(1500);
  });
});
