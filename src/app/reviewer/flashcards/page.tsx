
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlashcardSession } from '@/components/FlashcardSession';
import { getQuestions } from '@/lib/data';
import type { QuizQuestion, Topic } from '@/lib/types';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';

function FlashcardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');
  const firestore = useFirestore();

  const [view, setView] = useState<'list' | 'session'>('list');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const topicRef = useMemoFirebase(() => topicId && firestore ? doc(firestore, 'topics', topicId) : null, [topicId, firestore]);
  const { data: topic, isLoading: isLoadingTopic } = useDoc<Topic>(topicRef);

  useEffect(() => {
    if (topicId) {
      setIsLoading(true);
      getQuestions({ topicId, shuffle: false }).then(fetchedQuestions => {
        setQuestions(fetchedQuestions);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [topicId]);

  if (isLoading || isLoadingTopic) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!topicId || !topic) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Topic Not Found</h2>
        <p className="text-muted-foreground mt-2">The requested topic could not be found.</p>
        <Button asChild className="mt-4">
          <Link href="/reviewer/review">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reviewers
          </Link>
        </Button>
      </div>
    );
  }

  if (view === 'session') {
    return <FlashcardSession initialQuestions={questions} onExit={() => setView('list')} />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/reviewer/review" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Reviewers
        </Link>
        <h1 className="text-3xl font-bold font-headline">Flashcards: {topic.name}</h1>
        <p className="text-muted-foreground">{questions.length} cards available for this topic.</p>
      </header>
      
      {questions.length > 0 ? (
        <>
          <Button onClick={() => setView('session')} size="lg" className="w-full">
            <Play className="mr-2 h-5 w-5" /> Start Session
          </Button>

          <div className="space-y-3">
            {questions.map(q => (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <p>{q.question}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold">No Questions Yet</h2>
          <p className="text-muted-foreground mt-2">There are no flashcard questions for this topic.</p>
        </div>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <FlashcardPageContent />
    </Suspense>
  );
}
