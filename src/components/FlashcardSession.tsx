
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

  const resetCardState = useCallback(() => {
    wasDraggedRef.current = false;
    if (cardRef.current) {
      // Forcefully and instantly reset styles
      cardRef.current.style.transition = 'none';
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '1';

      // Re-enable transitions for the next interaction after a very short delay
      setTimeout(() => {
        if(cardRef.current) {
          cardRef.current.style.transition = 'transform 0.6s';
        }
      }, 50);
    }
    setIsFlipped(false);
  }, []);

  useEffect(() => {
    resetCardState();
  }, [currentCard, resetCardState]);
  
  const handleNextCard = (result: 'correct' | 'incorrect') => {
    const currentCard = deck[currentIndex];
    if (!currentCard) return;

    setSessionStats(prevStats => {
        if (result === 'correct') {
            return { ...prevStats, correct: [...prevStats.correct, currentCard] };
        } else {
            return { ...prevStats, incorrect: [...prevStats.incorrect, currentCard] };
        }
    });

    const timeoutId = setTimeout(() => {
        setDeck(prevDeck => {
            const newDeck = prevDeck.filter(card => card.id !== currentCard.id);
            if (newDeck.length === 0) {
                // The session has ended. We construct the final stats and set the summary.
                // `sessionStats` in this closure is from the render before this final card was processed,
                // so we add the result of the final card manually.
                const finalStats = {
                    correct: result === 'correct' ? [...sessionStats.correct, currentCard] : sessionStats.correct,
                    incorrect: result === 'incorrect' ? [...sessionStats.incorrect, currentCard] : sessionStats.incorrect
                };
                setSessionSummary(finalStats);
            } else {
                 setCurrentIndex(prevIndex => Math.min(prevIndex, newDeck.length - 1));
            }
            return newDeck;
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    wasDraggedRef.current = false;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    isDraggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    if (cardRef.current) {
        setIsGrabbing(true);
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

    const flipTransform = 'rotateY(180deg)';
    cardRef.current.style.transform = `translateX(${diff}px) rotate(${diff * 0.05}deg) ${flipTransform}`;
    
    const maxSwipeDistance = window.innerWidth / 2.5;
    const swipeProgress = Math.min(Math.abs(diff) / maxSwipeDistance, 1);

    if (diff > 0) {
        setRightGradientOpacity(swipeProgress);
        setLeftGradientOpacity(0);
    } else {
        setLeftGradientOpacity(swipeProgress);
        setRightGradientOpacity(0);
    }
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;

    if (!isDraggingRef.current) {
      if (!wasDraggedRef.current) {
        setIsFlipped(prev => !prev);
      }
      return;
    }
    
    if (cardRef.current) {
      cardRef.current.releasePointerCapture(e.pointerId);
    }
    
    setIsGrabbing(false);
    setLeftGradientOpacity(0);
    setRightGradientOpacity(0);
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    
    const diff = currentXRef.current - startXRef.current;

    const distanceThreshold = 50;
    const isSufficientSwipe = Math.abs(diff) > distanceThreshold;
    
    const flipTransform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

    if (wasDraggedRef.current && isSufficientSwipe) {
      const direction = diff > 0 ? 'right' : 'left';
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        cardRef.current.style.transform = `translateX(${direction === 'right' ? '120%' : '-120%'}) rotate(${direction === 'right' ? 15 : -15}deg) ${flipTransform}`;
        cardRef.current.style.opacity = '0';
      }
      handleNextCard(direction === 'right' ? 'correct' : 'incorrect');
    } else {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
        cardRef.current.style.transform = flipTransform;
        cardRef.current.style.opacity = '1';
      }
    }
    
    if (!wasDraggedRef.current) {
        setIsFlipped(prev => !prev);
    }

    wasDraggedRef.current = false;
    startXRef.current = 0;
    currentXRef.current = 0;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !cardRef.current || pointerIdRef.current !== e.pointerId) return;
    
    cardRef.current.releasePointerCapture(e.pointerId);

    setIsGrabbing(false);
    setLeftGradientOpacity(0);
    setRightGradientOpacity(0);
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    
    cardRef.current.style.transition = 'transform 0.3s ease-out';
    cardRef.current.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
    
    wasDraggedRef.current = false;
    startXRef.current = 0;
    currentXRef.current = 0;
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

    const flipTransform = 'rotateY(180deg)';
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

  if (isLoading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
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
          background: 'linear-gradient(to right, hsl(var(--destructive) / 0.8), transparent)',
          opacity: leftGradientOpacity,
          transition: isGrabbing ? 'none' : 'opacity 0.3s ease-out',
        }}
      />
      <div
        className="pointer-events-none fixed inset-y-0 right-0 w-1/3 z-20"
        style={{
          background: 'linear-gradient(to left, hsl(var(--accent) / 0.8), transparent)',
          opacity: rightGradientOpacity,
          transition: isGrabbing ? 'none' : 'opacity 0.3s ease-out',
        }}
      />
       <div
        className="pointer-events-none fixed inset-y-0 left-0 flex items-center justify-start pl-8 z-30 transition-opacity"
        style={{ opacity: leftGradientOpacity }}
      >
        <div className="border-2 border-destructive text-destructive font-bold uppercase text-2xl px-4 py-2 rounded-lg -rotate-15">
          Incorrect
        </div>
      </div>
      <div
        className="pointer-events-none fixed inset-y-0 right-0 flex items-center justify-end pr-8 z-30 transition-opacity"
        style={{ opacity: rightGradientOpacity }}
      >
        <div className="border-2 border-accent text-accent font-bold uppercase text-2xl px-4 py-2 rounded-lg rotate-15">
          Correct
        </div>
      </div>

      <header className="container mx-auto max-w-2xl flex flex-col gap-3 pt-6 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit Session">
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold font-headline">Flashcard Session</h1>
          <Button
              variant="ghost"
              size="sm"
              onClick={() => setSessionSummary(sessionStats)}
          >
              End
          </Button>
        </div>
        <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1" />
            <p className="text-sm font-semibold text-muted-foreground w-16 text-right">
                {deck.length}/{initialQuestions.length}
            </p>
        </div>
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
                    className="flashcard select-none relative w-full h-full"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    style={{ 
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', 
                        zIndex: 10,
                        cursor: isFlipped ? (isGrabbing ? 'grabbing' : 'grab') : 'pointer',
                        transition: 'transform 0.6s'
                    }}
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
      </main>
      
      <footer className="w-full max-w-md mx-auto px-4 pb-6 mt-4">
        <div className="flex justify-center items-center gap-4">
            <Button variant="outline" className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-0 transition-opacity" onClick={() => handleButtonPress('incorrect')} disabled={!isFlipped}>
                <X className="mr-2 h-4 w-4" /> Incorrect
            </Button>
            <Button variant="outline" className="w-full sm:w-auto border-accent text-accent hover:bg-accent/10 hover:text-accent disabled:opacity-0 transition-opacity" onClick={() => handleButtonPress('correct')} disabled={!isFlipped}>
                <Check className="mr-2 h-4 w-4" /> Correct
            </Button>
        </div>
      </footer>
    </div>
  );
};
