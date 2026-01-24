

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Check,
  X,
  RotateCw,
  Settings,
  Play,
  Flame,
  Wand,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { getQuestions } from '@/lib/data';
import type { Reviewer, Subject, Topic, QuizQuestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// ========= UTILITY & TYPE DEFINITIONS =========

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;
interface SessionStats {
  correct: QuizQuestion[];
  incorrect: QuizQuestion[];
  hard: QuizQuestion[];
  saved: QuizQuestion[];
}

// ========= HUB COMPONENTS =========

const TopicCard = ({
  topic,
  subject,
  reviewer,
  onStart,
  onCustom,
}: {
  topic: Topic;
  subject: Subject | undefined;
  reviewer: Reviewer | undefined;
  onStart: () => void;
  onCustom: () => void;
}) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{topic.name}</CardTitle>
        {subject && (
          <CardDescription style={{ color: subject.color }}>
            {subject.name}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {reviewer
            ? reviewer.excerpt
            : `Expand your knowledge on ${topic.name}.`}
        </p>
      </CardContent>
      <CardFooter className="flex-col sm:flex-row gap-2">
        <Button onClick={onStart} className="w-full">
          <Play className="mr-2 h-4 w-4" /> Start Session
        </Button>
        <Button onClick={onCustom} variant="outline" className="w-full">
          <Settings className="mr-2 h-4 w-4" /> Custom
        </Button>
      </CardFooter>
    </Card>
  );
};

const HubSkeleton = () => (
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
        <CardFooter className="gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    ))}
  </div>
);

const FlashcardHub = ({
  onTopicSelect,
}: {
  onTopicSelect: (
    topicId: string,
    custom?: { count: number; difficulty: string }
  ) => void;
}) => {
  const firestore = useFirestore();
  const [activeCategory, setActiveCategory] = useState<
    'gened' | 'profed' | 'majorship'
  >('profed');
  const [customSessionTopic, setCustomSessionTopic] = useState<Topic | null>(
    null
  );

  const { data: subjects, isLoading: loadingSubjects } = useCollection<Subject>(
    useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, 'subjects'),
              where('categoryId', '==', activeCategory)
            )
          : null,
      [firestore, activeCategory]
    )
  );
  const { data: topics, isLoading: loadingTopics } = useCollection<Topic>(
    useMemoFirebase(
      () =>
        firestore && subjects && subjects.length > 0
          ? query(
              collection(firestore, 'topics'),
              where(
                'subjectId',
                'in',
                subjects.map(s => s.id)
              )
            )
          : null,
      [firestore, subjects]
    )
  );
  const { data: reviewers, isLoading: loadingReviewers } =
    useCollection<Reviewer>(
      useMemoFirebase(
        () =>
          firestore
            ? query(
                collection(firestore, 'reviewers'),
                where('category', '==', activeCategory),
                limit(20)
              )
            : null,
        [firestore, activeCategory]
      )
    );

  const isLoading = loadingSubjects || loadingTopics || loadingReviewers;

  const findReviewerForTopic = (topicId: string) => {
    return reviewers?.find(r => r.topicIds.includes(topicId));
  };

  const handleCustomSession = (config: {
    count: number;
    difficulty: string;
  }) => {
    if (customSessionTopic) {
      onTopicSelect(customSessionTopic.id, config);
    }
    setCustomSessionTopic(null);
  };

  return (
    <div className="container mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Flashcard Hub</h1>
        <p className="text-muted-foreground">
          Select a topic to start your flashcard session.
        </p>
      </header>
      <Tabs
        value={activeCategory}
        onValueChange={v => setActiveCategory(v as any)}
        className="mb-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gened">General Ed</TabsTrigger>
          <TabsTrigger value="profed">Professional Ed</TabsTrigger>
          <TabsTrigger value="majorship">Majorship</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <HubSkeleton />
      ) : topics && topics.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              subject={subjects?.find(s => s.id === topic.subjectId)}
              reviewer={findReviewerForTopic(topic.id)}
              onStart={() => onTopicSelect(topic.id)}
              onCustom={() => setCustomSessionTopic(topic)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No topics found for this category.
          </p>
        </div>
      )}

      {customSessionTopic && (
        <CustomSessionDialog
          topic={customSessionTopic}
          onClose={() => setCustomSessionTopic(null)}
          onStart={handleCustomSession}
        />
      )}
    </div>
  );
};

const CustomSessionDialog = ({
  topic,
  onClose,
  onStart,
}: {
  topic: Topic;
  onClose: () => void;
  onStart: (config: { count: number; difficulty: string }) => void;
}) => {
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('all');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom Session: {topic.name}</DialogTitle>
          <DialogDescription>Configure your practice session.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Number of Questions</Label>
            <Select
              value={String(count)}
              onValueChange={v => setCount(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={v => setDifficulty(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onStart({ count, difficulty })}>Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ========= SESSION COMPONENTS =========

const SessionSummaryDialog = ({
  stats,
  onRestart,
  onClose,
}: {
  stats: SessionStats;
  onRestart: () => void;
  onClose: () => void;
}) => {
  const total = stats.correct.length + stats.incorrect.length;
  const accuracy = total > 0 ? (stats.correct.length / total) * 100 : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center font-headline text-3xl">
            Session Complete!
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 my-4">
          <Card className="text-center">
            <CardHeader className="pb-2">
              <CardTitle>Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-4xl font-bold"
                style={{ color: `hsl(${accuracy * 1.2}, 80%, 45%)` }}
              >
                {accuracy.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-green-50">
                <p className="text-3xl font-bold text-green-600">
                  {stats.correct.length}
                </p>
                <p className="text-sm font-medium text-green-700">Correct</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50">
                <p className="text-3xl font-bold text-red-600">
                  {stats.incorrect.length}
                </p>
                <p className="text-sm font-medium text-red-700">Incorrect</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="incorrect" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="incorrect">
              Incorrect ({stats.incorrect.length})
            </TabsTrigger>
            <TabsTrigger value="hard">Hard ({stats.hard.length})</TabsTrigger>
            <TabsTrigger value="saved">Saved ({stats.saved.length})</TabsTrigger>
          </TabsList>
          <ScrollArea className="mt-2 flex-1 pr-3">
            <TabsContent value="incorrect">
              {stats.incorrect.length > 0 ? (
                stats.incorrect.map((q) => (
                  <div key={q.id} className="border-b p-3 text-sm last:border-b-0">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-1 text-green-700 dark:text-green-500">
                      <span className="font-medium">Correct Answer:</span> {q.correctAnswer}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No incorrect answers! Great job!
                </p>
              )}
            </TabsContent>
            <TabsContent value="hard">
              {stats.hard.length > 0 ? (
                stats.hard.map(q => (
                  <div key={q.id} className="border-b p-3 text-sm last:border-b-0">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-1 text-green-700 dark:text-green-500">
                      <span className="font-medium">Correct Answer:</span> {q.correctAnswer}
                    </p>
                  </div>
                ))
              ) : (
                 <p className="p-4 text-center text-sm text-muted-foreground">
                  No questions marked as hard.
                </p>
              )}
            </TabsContent>
            <TabsContent value="saved">
              {stats.saved.length > 0 ? (
                stats.saved.map(q => (
                  <div key={q.id} className="border-b p-3 text-sm last:border-b-0">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-1 text-green-700 dark:text-green-500">
                      <span className="font-medium">Correct Answer:</span> {q.correctAnswer}
                    </p>
                  </div>
                ))
              ) : (
                 <p className="p-4 text-center text-sm text-muted-foreground">
                  No saved questions.
                </p>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full" onClick={onRestart}>
            <RotateCw className="mr-2 h-4 w-4" /> Restart Session
          </Button>
          <Button className="w-full" onClick={onClose}>
            Finish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FlashcardSession = ({
  topicId,
  customConfig,
  onExit,
}: {
  topicId: string;
  customConfig?: { count: number; difficulty: string };
  onExit: () => void;
}) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [deck, setDeck] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correct: [],
    incorrect: [],
    hard: [],
    saved: [],
  });
  const [sessionSummary, setSessionSummary] = useState<SessionStats | null>(
    null
  );

  const [dragState, setDragState] = useState({
    x: 0,
    y: 0,
    direction: null as SwipeDirection | null,
    opacity: 0,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const fetchAndSetupDeck = useCallback(async () => {
    setIsLoading(true);
    const fetchedQuestions = await getQuestions({
      topicId,
      limit: customConfig?.count,
      difficulty:
        customConfig?.difficulty === 'all'
          ? undefined
          : (customConfig?.difficulty as any),
      shuffle: true,
    });

    if (fetchedQuestions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Questions Found',
        description: 'There are no questions for this topic yet.',
      });
      onExit();
      return;
    }

    setQuestions(fetchedQuestions);
    setDeck(fetchedQuestions);
    setCurrentIndex(0);
    setIsLoading(false);
    setIsFlipped(false);
    setStreak(0);
    setSessionStats({ correct: [], incorrect: [], hard: [], saved: [] });
    setSessionSummary(null);
  }, [topicId, customConfig, toast, onExit]);

  useEffect(() => {
    fetchAndSetupDeck();
  }, [fetchAndSetupDeck]);

  const handleNextCard = (result: 'correct' | 'incorrect' | 'hard' | 'saved') => {
    const currentCard = deck[currentIndex];
    if (!currentCard) return;

    let newStreak = streak;
    let newStats = { ...sessionStats };
    let newDeck = [...deck];

    switch (result) {
      case 'correct':
        newStreak++;
        newStats.correct.push(currentCard);
        if (newStreak > 1) setShowStreak(true);
        setTimeout(() => setShowStreak(false), 1500);
        break;
      case 'incorrect':
        newStreak = 0;
        newStats.incorrect.push(currentCard);
        break;
      case 'hard':
        newStreak = 0;
        if (!newStats.hard.find(q => q.id === currentCard.id))
          newStats.hard.push(currentCard);
        const reinsertIndex = Math.min(currentIndex + 5, newDeck.length);
        newDeck.splice(reinsertIndex, 0, currentCard);
        break;
      case 'saved':
        if (!newStats.saved.find(q => q.id === currentCard.id))
          newStats.saved.push(currentCard);
        break;
    }

    newDeck.splice(currentIndex, 1);

    setStreak(newStreak);
    setSessionStats(newStats);

    if (cardRef.current)
      cardRef.current.style.transition = 'transform 0.3s ease-out';

    setTimeout(() => {
      if (newDeck.length === 0) {
        if (customConfig?.count) {
          setSessionSummary(newStats);
        } else {
          toast({
            title: 'Deck complete!',
            description: 'Reshuffling for another round.',
          });
          const reshuffledDeck = [...questions].sort(() => Math.random() - 0.5);
          setDeck(reshuffledDeck);
          setCurrentIndex(0);
          setIsFlipped(false);
        }
      } else {
        setDeck(newDeck);
        setCurrentIndex(Math.min(currentIndex, newDeck.length - 1));
        setIsFlipped(false);
      }
      setDragState({ x: 0, y: 0, direction: null, opacity: 0 });
      if (cardRef.current) cardRef.current.style.transform = '';
    }, 300);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (cardRef.current) cardRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !cardRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    cardRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${
      dx * 0.1
    }deg)`;

    let direction: SwipeDirection = null;
    if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? 'right' : 'left';
    else direction = dy > 0 ? 'down' : 'up';

    setDragState({
      x: dx,
      y: dy,
      direction,
      opacity: Math.min(Math.max(Math.abs(dx), Math.abs(dy)) / 150, 1),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (!dragStart.current) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const threshold = 60;

    let finalDirection: SwipeDirection = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold)
      finalDirection = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold)
      finalDirection = dy > 0 ? 'down' : 'up';

    if (finalDirection) {
      const resultsMap = {
        right: 'correct',
        left: 'incorrect',
        up: 'hard',
        down: 'saved',
      };
      const transformMap: { [key: string]: string } = {
        right: 'translateX(500px) rotate(30deg)',
        left: 'translateX(-500px) rotate(-30deg)',
      };
      if (transformMap[finalDirection])
        cardRef.current.style.transform = transformMap[finalDirection];
      handleNextCard(resultsMap[finalDirection] as any);
    } else {
      cardRef.current.style.transition = 'transform 0.3s ease-out';
      cardRef.current.style.transform = '';
      setDragState({ x: 0, y: 0, direction: null, opacity: 0 });
    }

    dragStart.current = null;
    document.body.style.userSelect = '';
  };

  const handleCardClick = () => {
    if (!dragStart.current) setIsFlipped(f => !f);
  };

  if (isLoading)
    return (
      <div className="text-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (sessionSummary)
    return (
      <SessionSummaryDialog
        stats={sessionSummary}
        onRestart={fetchAndSetupDeck}
        onClose={onExit}
      />
    );

  const currentCard = deck[currentIndex];
  if (!currentCard)
    return <div className="text-center p-8">Something went wrong.</div>;

  const getFeedback = () => {
    switch (dragState.direction) {
      case 'right':
        return { icon: <Check />, text: 'Correct', color: 'bg-green-500/80' };
      case 'left':
        return { icon: <X />, text: 'Incorrect', color: 'bg-red-500/80' };
      case 'up':
        return { icon: <Wand />, text: 'Hard', color: 'bg-yellow-500/80' };
      case 'down':
        return { icon: <Bookmark />, text: 'Save', color: 'bg-blue-500/80' };
      default:
        return null;
    }
  };
  const feedback = getFeedback();

  const getSwipeGradient = () => {
    if (!dragState.direction) return null;
    const opacity = dragState.opacity * 0.2;
    switch (dragState.direction) {
      case 'right':
        return `linear-gradient(90deg, transparent, rgba(74, 222, 128, ${opacity}))`;
      case 'left':
        return `linear-gradient(270deg, transparent, rgba(239, 68, 68, ${opacity}))`;
      case 'up':
        return `linear-gradient(0deg, transparent, rgba(250, 204, 21, ${opacity}))`;
      case 'down':
        return `linear-gradient(180deg, transparent, rgba(59, 130, 246, ${opacity}))`;
      default:
        return null;
    }
  };

  const swipeGradient = getSwipeGradient();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col touch-none bg-background"
      style={{
        background: swipeGradient || undefined,
        transition: 'background 0.1s ease-out',
      }}
    >
      <header className="container mx-auto max-w-2xl flex items-center gap-4 pt-6 px-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSessionSummary(sessionStats)}
        >
          End Session
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flashcard-container w-full h-full max-w-md max-h-[70vh] flex items-center justify-center">
          <div
            ref={cardRef}
            className={cn(
              'flashcard relative w-full h-full cursor-pointer',
              isFlipped && 'is-flipped'
            )}
            onClick={handleCardClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <Card className="flashcard-front absolute w-full h-full flex items-center justify-center text-center p-6">
              <p className="text-xl md:text-2xl font-semibold">
                {currentCard.question}
              </p>
            </Card>
            <Card className="flashcard-back absolute w-full h-full flex flex-col justify-center text-center p-6">
              <ScrollArea className="flex-1">
                <p className="text-lg md:text-xl font-semibold">
                  {currentCard.correctAnswer}
                </p>
                {currentCard.explanation && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {currentCard.explanation}
                  </p>
                )}
              </ScrollArea>
            </Card>
            {feedback && (
              <div
                className={cn(
                  'absolute inset-0 rounded-xl flex flex-col items-center justify-center text-white pointer-events-none',
                  feedback.color
                )}
                style={{ opacity: dragState.opacity }}
              >
                {React.cloneElement(feedback.icon, {
                  className: 'h-16 w-16',
                })}
                <p className="font-bold text-xl mt-2">{feedback.text}</p>
              </div>
            )}
          </div>
        </div>
        <div className="text-center mt-4 text-sm text-muted-foreground">
          {isFlipped ? 'Swipe to assess' : 'Tap to reveal answer'}
        </div>

        {showStreak && streak > 1 && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-destructive/80 text-destructive-foreground px-4 py-2 rounded-full text-2xl font-bold animate-combo-pop flex items-center gap-2">
            <Flame /> Streak x{streak}!
          </div>
        )}
      </main>
    </div>
  );
};

// ========= MAIN PAGE COMPONENT =========

function FlashcardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topicId = searchParams.get('topic');
  const countParam = searchParams.get('count');
  const difficultyParam = searchParams.get('difficulty');

  const customConfig = useMemo(() => {
    if (!countParam || !difficultyParam) return undefined;
    return { count: Number(countParam), difficulty: difficultyParam };
  }, [countParam, difficultyParam]);

  const handleTopicSelect = (
    selectedTopicId: string,
    custom?: { count: number; difficulty: string }
  ) => {
    const params = new URLSearchParams();
    params.set('topic', selectedTopicId);
    if (custom) {
      params.set('count', String(custom.count));
      params.set('difficulty', custom.difficulty);
    }
    router.push(`/flashcards?${params.toString()}`);
  };

  const handleExitSession = () => {
    router.push('/flashcards');
  };

  if (topicId) {
    return (
      <FlashcardSession
        topicId={topicId}
        customConfig={customConfig}
        onExit={handleExitSession}
      />
    );
  }

  return <FlashcardHub onTopicSelect={handleTopicSelect} />;
}

export default function FlashcardsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </div>
      }
    >
      <FlashcardsPageContent />
    </Suspense>
  );
}
