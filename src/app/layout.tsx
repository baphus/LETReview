
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { TimerProvider } from "@/hooks/use-timer";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import SplashScreen from "@/components/SplashScreen";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { useUser } from "@/firebase/auth/use-user";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, activeTheme } = useUser();
  const [isShowingSplash, setIsShowingSplash] = useState(pathname === "/");

  useEffect(() => {
    if (pathname === '/') {
      setIsShowingSplash(true);
      const splashShown = sessionStorage.getItem("splashShown");
      if (splashShown) {
        setIsShowingSplash(false);
      } else {
        setTimeout(() => {
          setIsShowingSplash(false);
          sessionStorage.setItem("splashShown", "true");
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

  if (isShowingSplash && pathname === "/") {
    return <SplashScreen />;
  }

  const isAppPage = !['/', '/login'].includes(pathname);

  if (isLoading && isAppPage) {
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
  // if (isAppPage && !user) {
  //   return null;
  // }

  return (
    <TimerProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <AppSidebar />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 overflow-y-auto pb-20 md:pb-4">
            {children}
          </main>
          <BottomNav />
          <Toaster />
        </SidebarInset>
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
          <RootLayoutContent>{children}</RootLayoutContent>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
