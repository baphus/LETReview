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
  metadataBase: new URL('https://letreview--letreview.asia-southeast1.hosted.app'),
  title: {
    default: 'LETReview | Your Gamified LET Review Partner',
    template: '%s | LETReview'
  },
  description: 'Ace the Licensure Examination for Teachers (LET) in the Philippines with our gamified review app. Study GENED, PROFED, and Majorship topics with interactive quizzes, streaks, and pets.',
  applicationName: 'LETReview',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LETReview',
    startupImage: [
      // iPhone SE, iPod touch 7th gen
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      // iPhone 8, 7, 6s, 6
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone X, XS, 11 Pro, 12 mini, 13 mini
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone XR, 11, XS Max, 11 Pro Max
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
      },
      // iPhone 12, 12 Pro, 13, 13 Pro, 14
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone 14 Pro, 15, 15 Pro
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      // iPhone 14 Plus, 15 Plus, 14 Pro Max, 15 Pro Max
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: 'https://letreview--letreview.asia-southeast1.hosted.app',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4A4AFF' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
