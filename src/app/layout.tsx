import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LETReview</title>
        <meta
          name="description"
          content="A gamified, mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines."
        />
        <meta name="theme-color" content="#4A4AFF" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.13.11/dist/katex.min.css"
          integrity="sha384-Um5gpz1odJg5Z4HAmzPtgZKdTBHZdw8S29IecapCSB31ligYPhHQZMIlWLYQGVoc"
          crossOrigin="anonymous"
        />
      </head>
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
