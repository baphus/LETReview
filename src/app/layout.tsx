
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
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SplashScreenHandler } from "@/components/SplashScreen";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { loadUserProfile, getActiveBank } from "@/lib/data";


const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const applyUserTheme = () => {
    const profile = loadUserProfile();
    if (!profile) {
        // Default to light mode for logged-out users
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        return;
    }
    const activeBank = getActiveBank();

    // Handle light/dark mode from overall profile
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(profile.themeMode || 'light');
    
    // Handle custom accent themes from active bank
    document.documentElement.classList.remove('mint', 'sunset', 'rose');
    if (activeBank && activeBank.activeTheme && activeBank.activeTheme !== 'default') {
        document.documentElement.classList.add(activeBank.activeTheme);
    }
  };

  useEffect(() => {
    applyUserTheme();
    // Listen for storage changes to re-apply theme
    window.addEventListener('storage', applyUserTheme);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        const isAuthPage = pathname === "/login";
        const isLandingPage = pathname === "/";

        if (user) {
            // If user is logged in and on login or landing page, redirect to home
            if (isAuthPage || isLandingPage) {
                router.replace("/home");
            }
        } else {
            // If user is not logged in, and not on landing or login page, redirect to landing
            if (!isLandingPage && !isAuthPage) {
                router.replace("/");
            }
        }
        setIsCheckingAuth(false);
    });

     return () => {
      window.removeEventListener('storage', applyUserTheme);
      unsubscribe();
    };
  }, [pathname, router]);

  const isAppPage = !['/', '/login'].includes(pathname);

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
            <Skeleton className="h-16 w-full md:hidden" />
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

  return (
    <TimerProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <AppSidebar />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="p-2 border-b md:hidden">
          </header>
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
        <title>Qwiz</title>
        <meta
          name="description"
          content="A mobile-first web application for creating your own personalized reviewer."
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
        <SplashScreenHandler />
        <RootLayoutContent>{children}</RootLayoutContent>
      </body>
    </html>
  );
}
