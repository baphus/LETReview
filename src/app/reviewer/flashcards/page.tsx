
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FlashcardSession } from '@/components/FlashcardSession';
import { getQuestions } from '@/lib/data';
import type { QuizQuestion, Topic } from '@/lib/types';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';


function FlashcardPageContent() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId');
  const firestore = useFirestore();

  const [view, setView] = useState<'list' | 'session'>('list');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for session questions
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  
  // State for custom session dialog
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customCount, setCustomCount] = useState('10');
  const [customShuffle, setCustomShuffle] = useState(true);

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

  useEffect(() => {
    if (questions.length > 0) {
        setCustomCount(String(Math.min(10, questions.length)));
    }
  }, [questions.length]);

  const countOptions = useMemo(() => {
    if (questions.length === 0) return [];
    
    const options = [5, 10, 20];
    const uniqueOptions = new Set(options.filter(o => o < questions.length));
    uniqueOptions.add(questions.length);

    return Array.from(uniqueOptions).sort((a,b) => a - b);
  }, [questions.length]);

  const handleStartFullSession = () => {
    const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
    setSessionQuestions(shuffledQuestions);
    setView('session');
  };

  const handleStartCustomSession = () => {
    let customQuestions = [...questions];
    if (customShuffle) {
        customQuestions = customQuestions.sort(() => Math.random() - 0.5);
    }
    const count = parseInt(customCount, 10);
    setSessionQuestions(customQuestions.slice(0, count));
    setIsCustomDialogOpen(false);
    setView('session');
  };

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
    return <FlashcardSession initialQuestions={sessionQuestions} onExit={() => setView('list')} />;
  }

  return (
    <>
    <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Custom Flashcard Session</DialogTitle>
                <DialogDescription>
                    Configure your practice session for the topic: {topic.name}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="question-count" className="text-right">
                        Questions
                    </Label>
                    <Select value={customCount} onValueChange={setCustomCount}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                             {countOptions.map(num => (
                                <SelectItem key={num} value={String(num)}>
                                    {num === questions.length ? `All (${num})` : `${num} Questions`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="shuffle-questions" className="text-right">
                        Shuffle
                    </Label>
                    <Switch
                        id="shuffle-questions"
                        checked={customShuffle}
                        onCheckedChange={setCustomShuffle}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleStartCustomSession} className="w-full">Start Session</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button onClick={handleStartFullSession} size="lg" variant="outline">
                <Play className="mr-2 h-5 w-5" /> Start Full Session ({questions.length})
            </Button>
            <Button onClick={() => setIsCustomDialogOpen(true)} size="lg">
                <Settings className="mr-2 h-5 w-5" /> Custom Session
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map(q => (
              <Card key={q.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="font-medium">{q.question}</p>
                  <p className="text-sm text-green-600 dark:text-green-500 pt-2 border-t">
                    <span className="font-semibold text-muted-foreground">Answer: </span>
                    {q.correctAnswer}
                  </p>
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
    </>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <FlashcardPageContent />
    </Suspense>
  );
}
