
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { TimerProvider } from "@/hooks/use-timer";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { useUser } from "@/firebase/auth/use-user";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnboardingDialog } from "@/components/OnboardingDialog";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, activeTheme, firebaseUser } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('mint', 'sunset', 'rose');
    if (activeTheme && activeTheme !== 'default') {
      document.documentElement.classList.add(activeTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (user && !isLoading && firebaseUser && !firebaseUser.isAnonymous && !user.hasCompletedOnboarding) {
        setShowOnboarding(true);
    }
  }, [user, isLoading, firebaseUser]);

  const isAppPage = pathname !== '/';

  if (isLoading && isAppPage && !user) {
    return (
      <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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

  if (!isAppPage) {
    return (
      <TimerProvider>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </TimerProvider>
    );
  }
  
  // This is handled by the useUser hook redirecting
  if (isAppPage && !user) {
    return (
       <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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

  return (
    <TimerProvider>
        <SidebarProvider>
            <div className="flex h-dvh">
                <Sidebar>
                    <AppSidebar />
                </Sidebar>
                <SidebarInset className="flex flex-col flex-1">
                    <AppHeader />
                    <main className="flex-1 overflow-y-auto py-4 sm:py-6">
                    {children}
                    </main>
                    <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
                    <Toaster />
                </SidebarInset>
            </div>
        </SidebarProvider>
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.13.11/dist/katex.min.css"
          integrity="sha384-Um5gpz1odJg5Z4HAmzPtgZKdTBHZdw8S29IecapCSB31ligYPhHQZMIlWLYQGVoc"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased flex flex-col h-dvh bg-background`}
      >
        <FirebaseClientProvider>
          <TooltipProvider>
            <RootLayoutContent>{children}</RootLayoutContent>
          </TooltipProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
