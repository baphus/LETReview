
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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);

   const applyActiveTheme = () => {
        const savedUser = localStorage.getItem("userProfile");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.activeTheme && user.activeTheme !== 'default') {
                document.documentElement.classList.remove('mint', 'sunset', 'rose');
                document.documentElement.classList.add(user.activeTheme);
            } else {
                 document.documentElement.classList.remove('mint', 'sunset', 'rose');
            }
        }
    };

  useEffect(() => {
    applyActiveTheme();
    const userProfile = localStorage.getItem("userProfile");
    const isAuthPage = pathname === "/login";
    
    if (!userProfile && !isAuthPage) {
      router.replace("/login");
    } else if (userProfile && isAuthPage) {
      router.replace("/home");
    } else {
      setIsCheckingAuth(false);
    }
  }, [pathname, router]);

  const isAppPage = pathname !== '/login';

  if (isCheckingAuth && isAppPage) {
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
            {/* The sidebar trigger is removed from here for mobile view */}
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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <title>MyReviewer</title>
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
