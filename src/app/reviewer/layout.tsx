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
         <div className="container mx-auto max-w-2xl">
            {children}
        </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <main>{children}</main>
    </div>
  );
}
