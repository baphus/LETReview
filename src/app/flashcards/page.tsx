'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Check, X, ArrowUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mockFlashcards = [
  {
    question: "What is the primary purpose of RA 9155?",
    answer: "To provide the framework for the governance of basic education, renaming DECS to DepEd."
  },
  {
    question: "Which educational philosophy emphasizes the '3Rs'?",
    answer: "Essentialism, which focuses on teaching fundamental knowledge and skills."
  },
  {
    question: "What does Vygotsky's 'Zone of Proximal Development' (ZPD) refer to?",
    answer: "The difference between what a child can achieve independently and what they can achieve with guidance."
  },
  {
    question: "A toddler sees a cat and calls it 'dog'. This is an example of what, according to Piaget?",
    answer: "Assimilation, where new information is fitted into existing schemas."
  },
  {
    question: "The K-12 program was institutionalized through which Republic Act?",
    answer: "RA 10533, also known as the Enhanced Basic Education Act of 2013."
  },
];

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

export default function FlashcardGamePage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [showHint, setShowHint] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    // Show hint on first load
    const hasSeenHint = localStorage.getItem('flashcardHintSeen');
    if (!hasSeenHint) {
      setShowHint(true);
      localStorage.setItem('flashcardHintSeen', 'true');
    }
  }, []);

  const handleNextCard = (wasCorrect: boolean) => {
    if (wasCorrect) {
      setProgress(p => p + (100 / mockFlashcards.length));
    }

    // Animate out
    setTimeout(() => {
      if (currentIndex < mockFlashcards.length - 1) {
        setCurrentIndex(i => i + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
      setSwipeDirection(null);
    }, 300);
  };

  const handleInteractionEnd = (direction: SwipeDirection) => {
    if (!isFlipped) return;

    setSwipeDirection(direction);

    switch (direction) {
      case 'right': // Correct
        handleNextCard(true);
        break;
      case 'left': // Incorrect
        handleNextCard(false);
        break;
      case 'up': // Hard
        // Visual feedback only, then reset
        setTimeout(() => setSwipeDirection(null), 500);
        break;
      case 'down': // Bookmark
        // Visual feedback only, then reset
        setTimeout(() => setSwipeDirection(null), 500);
        break;
      default:
        break;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (cardRef.current) {
        cardRef.current.style.transition = 'none';
    }
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStart.current || !cardRef.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const rotation = dx * 0.1; // Rotate based on horizontal movement
    
    cardRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current || !dragStart.current || !cardRef.current) return;

    isDragging.current = false;
    cardRef.current.style.transition = 'transform 0.3s ease-out';
    cardRef.current.style.transform = ''; // Reset transform to let CSS handle it
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const threshold = 50;

    if (Math.abs(dx) > Math.abs(dy)) { // Horizontal swipe
      if (dx > threshold) handleInteractionEnd('right');
      else if (dx < -threshold) handleInteractionEnd('left');
    } else { // Vertical swipe
      if (dy > threshold) handleInteractionEnd('down');
      else if (dy < -threshold) handleInteractionEnd('up');
    }
    
    dragStart.current = null;
  };
  
  const handleCardClick = () => {
    // A tiny delay to distinguish a tap from the start of a drag
    setTimeout(() => {
        if (!isDragging.current) {
            setIsFlipped(f => !f);
        }
    }, 50);
  }

  const restartSession = () => {
    setCurrentIndex(0);
    setProgress(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSwipeDirection(null);
  };
  
  const currentCard = mockFlashcards[currentIndex];

  if (sessionComplete) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-bold font-headline mb-4">Session Complete!</h1>
        <p className="text-muted-foreground mb-8">You've reviewed all the flashcards.</p>
        <div className="flex gap-4">
          <Button onClick={restartSession}>Review Again</Button>
          <Button variant="outline" onClick={() => router.back()}>Exit</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col p-4 font-body">
      {/* Top Bar */}
      <header className="flex items-center gap-4 mb-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-muted-foreground">The Teaching Profession</p>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>
        <div className="w-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowHint(true)}>
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show gesture hints</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* Gesture Hint Overlay */}
        {showHint && (
          <div 
            className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center text-white animate-fade-in-up"
            onClick={() => setShowHint(false)}
          >
            <h2 className="text-2xl font-bold font-headline mb-8">Gesture Controls</h2>
            <div className="space-y-6 text-lg text-center">
                <p><strong>Tap card</strong> to reveal the answer.</p>
                <p><strong>Swipe Right</strong> if you got it right.</p>
                <p><strong>Swipe Left</strong> if you were wrong.</p>
                <p><strong>Swipe Up</strong> to mark as 'Hard'.</p>
                <p><strong>Swipe Down</strong> to bookmark.</p>
            </div>
            <Button variant="secondary" className="mt-12">Got it!</Button>
          </div>
        )}
        
        {/* Flashcard Area */}
        <div className="flashcard-container w-full h-full max-w-md max-h-[70vh] flex items-center justify-center">
          <div
            ref={cardRef}
            className={cn(
                "flashcard relative w-full h-full cursor-pointer touch-none",
                isFlipped && 'is-flipped',
            )}
            onClick={handleCardClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Front of Card */}
            <Card className="flashcard-front absolute w-full h-full flex items-center justify-center text-center p-6">
                <CardContent className="p-0">
                    <p className="text-xl md:text-2xl font-semibold">{currentCard.question}</p>
                </CardContent>
            </Card>
            
            {/* Back of Card */}
            <Card className="flashcard-back absolute w-full h-full flex items-center justify-center text-center p-6">
                <CardContent className="p-0">
                    <p className="text-lg md:text-xl">{currentCard.answer}</p>
                </CardContent>
            </Card>

            {/* Swipe Feedback Overlay */}
            <div
                className={cn(
                    "absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none transition-opacity duration-300 opacity-0",
                    swipeDirection === 'right' && 'bg-green-500/80 opacity-100',
                    swipeDirection === 'left' && 'bg-red-500/80 opacity-100',
                    swipeDirection === 'up' && 'bg-yellow-500/80 opacity-100',
                    swipeDirection === 'down' && 'bg-blue-500/80 opacity-100',
                )}
            >
                {swipeDirection === 'right' && <Check className="h-24 w-24 text-white" />}
                {swipeDirection === 'left' && <X className="h-24 w-24 text-white" />}
                {swipeDirection === 'up' && <ArrowUp className="h-24 w-24 text-white" />}
                {swipeDirection === 'down' && <Bookmark className="h-24 w-24 text-white" />}
            </div>
          </div>
        </div>

        {/* Gesture instructions (for non-touch devices) */}
        <div className="hidden md:block text-center mt-4 text-sm text-muted-foreground">
            {isFlipped ? "Click and drag to swipe" : "Click to reveal answer"}
        </div>
      </main>
    </div>
  );
}
