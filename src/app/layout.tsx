
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
  metadataBase: new URL('https://letreview.app'),
  title: {
    default: 'LETReview | Your Gamified LET Review Partner',
    template: '%s | LETReview'
  },
  description: 'Ace the Licensure Examination for Teachers (LET) in the Philippines with our gamified review app. Study GENED, PROFED, and Majorship topics with interactive quizzes, streaks, and pets.',
  applicationName: 'LETReview',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LETReview',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: 'https://letreview.app',
    siteName: 'LETReview',
    title: 'LETReview | Your Gamified LET Review Partner',
    description: 'The most engaging way to prepare for the LET. Master concepts and track your progress with our gamified platform.',
    images: [
      {
        url: '/images/landing/app-preview.png',
        width: 1200,
        height: 630,
        alt: 'LETReview App Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LETReview | Your Gamified LET Review Partner',
    description: 'Prepare for the LET with interactive reviewers and daily challenges.',
    images: ['/images/landing/app-preview.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4A4AFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
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
