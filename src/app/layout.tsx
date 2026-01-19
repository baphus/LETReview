
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
import SplashScreen from "@/components/SplashScreen";
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
  const [isShowingSplash, setIsShowingSplash] = useState(pathname === "/");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (pathname === '/') {
      setIsShowingSplash(true);
      const splashShown = typeof window !== 'undefined' ? sessionStorage.getItem("splashShown") : null;
      if (splashShown) {
        setIsShowingSplash(false);
      } else {
        setTimeout(() => {
          setIsShowingSplash(false);
          if(typeof window !== 'undefined') {
            sessionStorage.setItem("splashShown", "true");
          }
        }, 3000);
      }
    } else {
      setIsShowingSplash(false);
    }
  }, [pathname]);


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

  if (isShowingSplash && pathname === "/") {
    return <SplashScreen />;
  }

  const isAppPage = pathname !== '/';

  if (isLoading && isAppPage && !user) {
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

  return (
    <TimerProvider>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <AppSidebar />
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="flex flex-col">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </main>
            <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
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
          content="A mobile-first web application for studying the Licensure Exam for Teachers (LET) in the Philippines."
        />
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
