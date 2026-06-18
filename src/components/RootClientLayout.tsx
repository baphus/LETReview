'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { TimerProvider } from '@/hooks/use-timer';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { useUser } from '@/firebase/auth/use-user';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { Loader2 } from 'lucide-react';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NetworkStatus } from '@/components/NetworkStatus';

const publicPaths = [
  '/',
  '/login',
  '/register',
  '/privacy-policy',
  '/terms-of-service',
  '/privacy',
  '/terms',
];

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, activeTheme } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('mint', 'sunset', 'rose');
    if (activeTheme && activeTheme !== 'default') {
      document.documentElement.classList.add(activeTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (user && !isLoading && !user.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [user, isLoading]);

  const isPublicPage = publicPaths.includes(pathname);

  if (isPublicPage) {
    return (
      <TimerProvider>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </TimerProvider>
    );
  }

  if (isLoading) {
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

  // user object will be null if not logged in, and useUser handles redirection
  if (!user) {
    return (
      <div className="flex flex-col h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            <OnboardingDialog
              open={showOnboarding}
              onOpenChange={setShowOnboarding}
            />
            <Toaster />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TimerProvider>
  );
}

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <TooltipProvider>
        <Suspense
          fallback={
            <div className="flex h-dvh items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }
        >
          <RootLayoutContent>{children}</RootLayoutContent>
        </Suspense>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <NetworkStatus />
      </TooltipProvider>
    </FirebaseClientProvider>
  );
}
