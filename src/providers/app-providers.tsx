'use client';

import type {ReactNode} from 'react';
import {TelemetryProvider} from '@/features/telemetry/telemetry-provider';
import {ThemeProvider} from '@/features/ui/theme-provider';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({children}: AppProvidersProps) {
  return (
    <ThemeProvider>
      <TelemetryProvider>{children}</TelemetryProvider>
    </ThemeProvider>
  );
}
