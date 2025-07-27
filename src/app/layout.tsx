
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { TimerProvider } from "@/hooks/use-timer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

// This is a temporary solution for metadata until we can have dynamic metadata with client components.
// export const metadata: Metadata = {
//   title: "LETsReview",
//   description:
//     "A mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines.",
//   manifest: "/manifest.json",
// };

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const userProfile = localStorage.getItem("userProfile");
    if (!userProfile && pathname !== "/login") {
      router.replace("/login");
    } else if (userProfile && pathname === "/login") {
      router.replace("/home");
    }
     else {
      setIsCheckingAuth(false);
    }
  }, [pathname, router]);

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-64 w-full" />
        </main>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const showNav = pathname !== '/login';

  return (
    <TimerProvider>
      <main className="flex-1 overflow-y-auto pb-20 md:pb-4">{children}</main>
      {showNav && <BottomNav />}
      <Toaster />
    </TimerProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LETsReview</title>
        <meta name="description" content="A mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines." />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased flex flex-col h-dvh bg-background`}
      >
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  );
}
