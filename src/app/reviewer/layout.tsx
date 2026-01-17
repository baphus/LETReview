"use client";

import { useSearchParams } from 'next/navigation';
import { BookOpen } from "lucide-react";

export default function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isChallenge = useSearchParams().get('challenge') === 'true';

  if (isChallenge) {
    return (
         <div className="container mx-auto p-4 max-w-2xl">
            {children}
        </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
       <header className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Reviewer</h1>
          </div>
        </header>
      <main>{children}</main>
    </div>
  );
}
