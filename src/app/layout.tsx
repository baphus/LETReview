import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import RootClientLayout from "@/components/RootClientLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "LETReview",
  description:
    "A mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased flex flex-col h-dvh bg-background`}
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <TooltipProvider>
            <RootClientLayout>{children}</RootClientLayout>
          </TooltipProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
