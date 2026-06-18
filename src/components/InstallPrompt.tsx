'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if user previously dismissed (respect for 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Listen for the beforeinstallprompt event (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after user has spent some time on the app
      setTimeout(() => setShowPrompt(true), 30000); // 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show after a delay since there's no native prompt
    if (ios) {
      setTimeout(() => setShowPrompt(true), 60000); // 1 minute
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or prompt not ready
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in-up sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-xl border bg-card p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install LETReview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? 'Tap the share button then "Add to Home Screen" for the best experience.'
                : 'Install for quick access, offline study, and a native app experience.'}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors min-h-0 min-w-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {isIOS ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleDismiss}
            >
              <Share className="h-3.5 w-3.5" />
              Got it
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleDismiss}
              >
                Not now
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={handleInstall}
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
