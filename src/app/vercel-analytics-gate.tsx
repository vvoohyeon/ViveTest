'use client';

import {Analytics} from '@vercel/analytics/next';
import {useEffect, useState} from 'react';

import {TELEMETRY_CONSENT_STORAGE_KEY} from '@/features/landing/telemetry/runtime';

function readAnalyticsConsent(): boolean {
  try {
    const raw = window.localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY)?.trim().toUpperCase() ?? '';
    return raw === 'OPTED_IN';
  } catch {
    return false;
  }
}

export function VercelAnalyticsGate() {
  const [shouldRenderAnalytics, setShouldRenderAnalytics] = useState<boolean | null>(null);

  useEffect(() => {
    // 기존 자체 텔레메트리와 같은 저장 키를 읽어 Vercel Analytics도 동일한 동의 정책을 따르게 한다.
    const syncConsentState = () => {
      setShouldRenderAnalytics(readAnalyticsConsent());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== TELEMETRY_CONSENT_STORAGE_KEY) {
        return;
      }

      syncConsentState();
    };

    syncConsentState();
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (shouldRenderAnalytics !== true) {
    return null;
  }

  return <Analytics />;
}
