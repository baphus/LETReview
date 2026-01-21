
'use client';

import Link from 'next/link';
import { Flame, Gem, User, HelpCircle } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/firebase/auth/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePathname, useSearchParams } from 'next/navigation';
import { Skeleton } from './ui/skeleton';

const getPageTitle = (pathname: string, searchParams: URLSearchParams) => {
    const isChallenge = searchParams.get('challenge') === 'true';
    const topicId = searchParams.get('topic');

    if (pathname.startsWith('/reviewer/questions/new')) return 'Add Questions';
    if (pathname.startsWith('/reviewer/questions')) {
        if (isChallenge) return 'Daily Challenge';
        if (topicId) return 'Practice Quiz';
    }
    if (pathname.startsWith('/home')) return 'Home';
    if (pathname.startsWith('/reviewer/review/new')) return 'New Article';
    if (pathname.startsWith('/reviewer/review/')) return 'Reviewer';
    if (pathname.startsWith('/reviewer/review')) return 'Reviewer';
    if (pathname.startsWith('/quiz')) return 'Quiz Mode';
    if (pathname.startsWith('/daily')) return 'Daily Activities';
    if (pathname.startsWith('/timer')) return 'Timer';
    if (pathname.startsWith('/profile')) return 'Profile';
    return 'LETReview';
}

export function AppHeader() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageTitle = getPageTitle(pathname, searchParams);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between shrink-0 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-bold font-headline hidden sm:block">{pageTitle}</h1>
      </div>

      {isLoading ? (
         <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      ) : user && (
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
            <Flame className="h-5 w-5 text-destructive" />
            <span>{user.streak}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
            <Gem className="h-5 w-5 text-accent" />
            <span>{user.points}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span>{user.questionsAnswered || 0}</span>
          </div>
           <Link href="/profile">
              <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary transition-colors">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>
                      <User className="h-5 w-5" />
                  </AvatarFallback>
              </Avatar>
          </Link>
        </div>
      )}
    </header>
  );
}
