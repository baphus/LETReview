
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { QuizQuestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface SessionStats {
  correct: QuizQuestion[];
  incorrect: QuizQuestion[];
}

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

        <div className="flex-1 flex flex-col min-h-0">
          <DialogTitle className="text-lg font-semibold text-center pt-4">Review Incorrect Answers</DialogTitle>
          <ScrollArea className="mt-2 flex-1 pr-3">
            <div>
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
            </div>
          </ScrollArea>
        </div>

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


interface FlashcardSessionProps {
    initialQuestions: QuizQuestion[];
    onExit: () => void;
}

export function FlashcardSession({ initialQuestions, onExit }: FlashcardSessionProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [deck, setDeck] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    correct: [],
    incorrect: [],
  });
  const [sessionSummary, setSessionSummary] = useState<SessionStats | null>(
    null
  );

  // States for swipe gradients
  const [leftGradientOpacity, setLeftGradientOpacity] = useState(0);
  const [rightGradientOpacity, setRightGradientOpacity] = useState(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const wasDraggedRef = useRef(false);

  const setupDeck = useCallback(() => {
    setIsLoading(true);
    if (initialQuestions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Questions Found',
        description: 'There are no questions for this topic yet.',
      });
      onExit();
      return;
    }
    
    const shuffledQuestions = initialQuestions.map(q => ({
        ...q,
        choices: [...q.choices].sort(() => Math.random() - 0.5)
    }));

    setQuestions(shuffledQuestions);
    setDeck([...shuffledQuestions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: [], incorrect: [] });
    setSessionSummary(null);
    setIsLoading(false);
  }, [initialQuestions, onExit, toast]);

  useEffect(() => {
    setupDeck();
  }, [setupDeck]);

  const currentCard = deck[currentIndex];

  useEffect(() => {
    // When a new card becomes current, reset its visual state.
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'; // No transition on reset
      cardRef.current.style.transform = ''; // Clear transforms
      cardRef.current.style.opacity = '1';
      wasDraggedRef.current = false; // Ensure drag state is reset
      // Re-enable flip animation after a short delay
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = 'transform 0.6s';
        }
      }, 50);
    }
  }, [currentCard]);

  const handleNextCard = (result: 'correct' | 'incorrect') => {
    const currentCard = deck[currentIndex];
    if (!currentCard) return;

    let newStats = { ...sessionStats };
    let newDeck = [...deck];

    switch (result) {
      case 'correct':
        newStats.correct.push(currentCard);
        break;
      case 'incorrect':
        newStats.incorrect.push(currentCard);
        break;
    }

    newDeck.splice(currentIndex, 1);
    
    const timeoutId = setTimeout(() => {
      if (newDeck.length === 0) {
        setSessionSummary(newStats);
      } else {
        setDeck(newDeck);
        setCurrentIndex(Math.min(currentIndex, newDeck.length - 1));
      }
      setIsFlipped(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    setIsGrabbing(true);
    wasDraggedRef.current = false;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    isDraggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    if (cardRef.current) {
        cardRef.current.setPointerCapture(e.pointerId);
        cardRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !cardRef.current || typeof window === 'undefined') return;
    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;
    
    if (Math.abs(diff) > 5) {
      wasDraggedRef.current = true;
    }

    const flipTransform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg) ${flipTransform}`;
    
    const maxSwipeDistance = window.innerWidth / 2.5;
    const swipeProgress = Math.min(Math.abs(diff) / maxSwipeDistance, 1);

    if (diff > 0) { // Swiping right (correct)
        setRightGradientOpacity(swipeProgress);
        setLeftGradientOpacity(0);
    } else { // Swiping left (incorrect)
        setLeftGradientOpacity(swipeProgress);
        setRightGradientOpacity(0);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsGrabbing(false);
    setLeftGradientOpacity(0);
    setRightGradientOpacity(0);

    if (!isDraggingRef.current || !cardRef.current) return;
    
    if (pointerIdRef.current === e.pointerId) {
        cardRef.current.releasePointerCapture(e.pointerId);
    }
    
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    
    const diff = currentXRef.current - startXRef.current;
    const duration = Date.now() - startTimeRef.current;
    const velocity = duration > 0 ? diff / duration : 0;

    const distanceThreshold = 50;
    const velocityThreshold = 0.5;
    const isSufficientSwipe = Math.abs(diff) > distanceThreshold || Math.abs(velocity) > velocityThreshold;
    
    const flipTransform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

    if (isSufficientSwipe) {
      const direction = diff > 0 ? 'right' : 'left';
      cardRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      cardRef.current.style.transform = `translateX(${direction === 'right' ? '120%' : '-120%'}) rotate(${direction === 'right' ? 15 : -15}deg) ${flipTransform}`;
      cardRef.current.style.opacity = '0';
      handleNextCard(direction === 'right' ? 'correct' : 'incorrect');
    } else {
      cardRef.current.style.transition = 'transform 0.3s ease-out';
      cardRef.current.style.transform = flipTransform;
      cardRef.current.style.opacity = '1';
    }

    startXRef.current = 0;
    currentXRef.current = 0;
    startTimeRef.current = 0;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsGrabbing(false);
    setLeftGradientOpacity(0);
    setRightGradientOpacity(0);

    if (!isDraggingRef.current || !cardRef.current) return;
    
    if (pointerIdRef.current === e.pointerId) {
        cardRef.current.releasePointerCapture(e.pointerId);
    }

    isDraggingRef.current = false;
    pointerIdRef.current = null;
    
    cardRef.current.style.transition = 'transform 0.3s ease-out';
    cardRef.current.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

    startXRef.current = 0;
    currentXRef.current = 0;
    startTimeRef.current = 0;
  };

  const handleButtonPress = (result: 'correct' | 'incorrect') => {
    if (!cardRef.current) return;

    if (result === 'correct') {
      setRightGradientOpacity(1);
      setTimeout(() => setRightGradientOpacity(0), 400);
    } else {
      setLeftGradientOpacity(1);
      setTimeout(() => setLeftGradientOpacity(0), 400);
    }

    const flipTransform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    let swipeTransform = '';

    if (result === 'correct') {
      swipeTransform = 'translateX(120%) rotate(15deg)';
    } else if (result === 'incorrect') {
      swipeTransform = 'translateX(-120%) rotate(-15deg)';
    }

    cardRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    cardRef.current.style.transform = `${swipeTransform} ${flipTransform}`;
    cardRef.current.style.opacity = '0';

    handleNextCard(result);
  };


  const handleCardClick = (e: React.MouseEvent) => {
    if (wasDraggedRef.current) {
        wasDraggedRef.current = false;
        return;
    }
    setIsFlipped(prev => !prev);
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
        onRestart={setupDeck}
        onClose={onExit}
      />
    );

  if (!currentCard)
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
          <div className="text-center p-8">
            <p>Session complete or something went wrong.</p>
            <Button onClick={onExit} className="mt-4">Return</Button>
          </div>
      </div>
    );
  
  const totalAnswered = sessionStats.correct.length + sessionStats.incorrect.length;
  const progress = initialQuestions.length > 0 ? (totalAnswered / initialQuestions.length) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col touch-none bg-background"
    >
      <div
        className="pointer-events-none fixed inset-y-0 left-0 w-1/3 z-20"
        style={{
          background: 'linear-gradient(to right, hsl(var(--destructive) / 0.2), transparent)',
          opacity: leftGradientOpacity,
          transition: isGrabbing ? 'none' : 'opacity 0.3s ease-out',
        }}
      />
      <div
        className="pointer-events-none fixed inset-y-0 right-0 w-1/3 z-20"
        style={{
          background: 'linear-gradient(to left, hsl(var(--accent) / 0.2), transparent)',
          opacity: rightGradientOpacity,
          transition: isGrabbing ? 'none' : 'opacity 0.3s ease-out',
        }}
      />

      <header className="container mx-auto max-w-2xl flex items-center gap-4 pt-6 px-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
         <div className="relative flex-1">
            <Progress value={progress} />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary-foreground pointer-events-none">
                {deck.length} / {initialQuestions.length} left
            </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSessionSummary(sessionStats)}
        >
          End Session
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        <div className="flashcard-container relative w-full h-full max-w-md max-h-[60vh] sm:max-h-[65vh] flex items-center justify-center">
            
            {deck.length > 1 && (
                <div className="absolute w-full h-full pointer-events-none scale-95 -translate-y-2 opacity-50">
                    <Card className="w-full h-full bg-muted" />
                </div>
            )}
            
            {currentCard && (
                <div
                    ref={cardRef}
                    className="flashcard relative w-full h-full cursor-pointer"
                    onClick={handleCardClick}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', zIndex: 10 }}
                >
                    <Card className="flashcard-front absolute w-full h-full flex items-center justify-center text-center p-4 sm:p-6">
                    <p className="text-xl md:text-2xl font-semibold">
                        {currentCard.question}
                    </p>
                    </Card>
                    <Card className="flashcard-back absolute w-full h-full flex flex-col justify-center text-center p-4 sm:p-6">
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
                </div>
            )}
        </div>
        <div className="text-center mt-4 text-sm text-muted-foreground h-5">
          {isFlipped ? 'Tap to hide, or swipe/use buttons to assess.' : 'Tap to reveal answer'}
        </div>
        
        <div className="flex justify-center items-center py-4 shrink-0 gap-4 mt-2 w-full max-w-md">
            <Button variant="outline" className="w-full sm:w-auto border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-0 transition-opacity" onClick={() => handleButtonPress('incorrect')} disabled={!isFlipped}>
                <X className="mr-2 h-4 w-4" /> Incorrect
            </Button>
            <Button variant="outline" className="w-full sm:w-auto border-green-500 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-0 transition-opacity" onClick={() => handleButtonPress('correct')} disabled={!isFlipped}>
                <Check className="mr-2 h-4 w-4" /> Correct
            </Button>
        </div>
      </main>
      
    </div>
  );
};
