'use client';

import {useEffect, useRef, useState} from 'react';

const DEFAULT_BANNER_HEIGHT_PX = 120;

interface ConsentBannerProps {
  regionLabel: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  preferencesLabel: string;
  preferencesTitle: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onPreferencesAction?: () => void;
  rootTestId?: string;
  primaryTestId?: string;
  secondaryTestId?: string;
  preferencesTestId?: string;
}

export function ConsentBanner({
  regionLabel,
  message,
  primaryLabel,
  secondaryLabel,
  preferencesLabel,
  preferencesTitle,
  onPrimaryAction,
  onSecondaryAction,
  onPreferencesAction,
  rootTestId = 'telemetry-consent-banner',
  primaryTestId = 'telemetry-consent-accept',
  secondaryTestId = 'telemetry-consent-deny',
  preferencesTestId = 'telemetry-consent-preferences'
}: ConsentBannerProps) {
  const bannerRef = useRef<HTMLElement | null>(null);
  const [bannerHeight, setBannerHeight] = useState(DEFAULT_BANNER_HEIGHT_PX);

  useEffect(() => {
    const bannerElement = bannerRef.current;
    if (!bannerElement) {
      return;
    }

    const updateBannerHeight = () => {
      setBannerHeight(Math.max(DEFAULT_BANNER_HEIGHT_PX, Math.ceil(bannerElement.getBoundingClientRect().height)));
    };

    updateBannerHeight();
    window.addEventListener('resize', updateBannerHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', updateBannerHeight);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBannerHeight();
    });
    resizeObserver.observe(bannerElement);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateBannerHeight);
    };
  }, []);

  return (
    <>
      <div className="telemetry-consent-banner-spacer" aria-hidden="true" style={{height: `${bannerHeight}px`}} />
      <div className="telemetry-consent-banner-layer">
        <section
          ref={bannerRef}
          className="telemetry-consent-banner"
          aria-label={regionLabel}
          data-testid={rootTestId}
        >
          <p className="telemetry-consent-banner-message">{message}</p>
          <div className="telemetry-consent-banner-actions">
            <button
              type="button"
              className="telemetry-consent-banner-button telemetry-consent-banner-button-accent"
              data-testid={primaryTestId}
              onClick={onPrimaryAction}
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              className="telemetry-consent-banner-button telemetry-consent-banner-button-neutral"
              data-testid={secondaryTestId}
              onClick={onSecondaryAction}
            >
              {secondaryLabel}
            </button>
            <button
              type="button"
              className="telemetry-consent-banner-link"
              data-testid={preferencesTestId}
              title={preferencesTitle}
              onClick={onPreferencesAction}
            >
              {preferencesLabel}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
