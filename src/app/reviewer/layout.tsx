
"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { BookOpen } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';

export default function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isChallenge = useSearchParams().get('challenge') === 'true';

  // Determine the active tab. Default to 'review' if not in questions.
  const activeTab = pathname.includes('/questions') ? 'questions' : 'review';

  const onTabChange = (value: string) => {
    router.push(`/reviewer/${value}`);
  };

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
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="review">Review</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
              </TabsList>
          </Tabs>
        </header>
      <main>{children}</main>
    </div>
  );
}
