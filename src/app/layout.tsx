import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { RootClientLayout } from '@/components/RootClientLayout';
import { cn } from '@/lib/utils';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LETReview',
  description: 'A gamified, mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#4A4AFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          spaceGrotesk.variable,
          'font-body antialiased flex flex-col h-dvh bg-background'
        )}
        suppressHydrationWarning
      >
        <RootClientLayout>{children}</RootClientLayout>
      </body>
    </html>
  );
}
