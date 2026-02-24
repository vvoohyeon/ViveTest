import type {Metadata} from 'next';
import {Space_Grotesk, Fraunces} from 'next/font/google';
import './globals.css';

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans'
});

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif'
});

export const metadata: Metadata = {
  title: 'VibeTest',
  description: 'Interactive catalog landing for tests and blogs'
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({children}: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
