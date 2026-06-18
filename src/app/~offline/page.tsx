import { WifiOff, RefreshCw, BookOpen } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center bg-background">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold font-headline mb-2">
        You're Offline
      </h1>

      <p className="text-muted-foreground max-w-sm mb-8">
        It looks like you've lost your internet connection. Don't worry — some features may still work from cache.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href="/home"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </a>

        <a
          href="/reviewer/review"
          className="inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" />
          View Cached Reviewers
        </a>
      </div>

      <p className="text-xs text-muted-foreground mt-8 max-w-xs">
        Tip: Pages you've visited before are saved for offline use. Try navigating to a page you've opened recently.
      </p>
    </div>
  );
}
