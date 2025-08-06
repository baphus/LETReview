
"use client";

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Logo from './Logo';

export function SplashScreen({ visible }: { visible: boolean }) {
    return (
        <div className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500",
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
            <div className="animate-fade-in-up">
                <Logo className="h-24 w-24 text-primary" />
            </div>
            <h1 className="text-4xl font-bold font-headline mt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                MyReviewer
            </h1>
            <p className="text-muted-foreground mt-2 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                Let's set you up for success.
            </p>
        </div>
    );
}

export function SplashScreenHandler() {
    const [isShowingSplash, setIsShowingSplash] = useState(true);
    const [isClient, setIsClient] = useState(false);
  
    useEffect(() => {
      setIsClient(true);
    }, []);
  
    useEffect(() => {
      if (!isClient) return;
  
      const splashShown = sessionStorage.getItem("splashShown");
      if (splashShown) {
          setIsShowingSplash(false);
      } else {
          const timer = setTimeout(() => {
              setIsShowingSplash(false);
              sessionStorage.setItem("splashShown", "true");
          }, 3000);
          return () => clearTimeout(timer);
      }
    }, [isClient]);
  
    if (!isClient) {
      return null; // Don't render anything on the server to prevent mismatch
    }
  
    return <SplashScreen visible={isShowingSplash} />;
}
