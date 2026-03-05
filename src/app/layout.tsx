import type {Metadata} from 'next';
import type {ReactNode} from 'react';

import {defaultLocale} from '@/config/site';

import './globals.css';

export const metadata: Metadata = {
  title: 'VibeTest',
  description: 'Reset baseline placeholder'
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang={defaultLocale}>
      <body>{children}</body>
    </html>
  );
}
