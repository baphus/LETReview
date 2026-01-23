
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Check, X, ArrowUp, Info, RotateCw, BarChart } from 'lucide-react';
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
  {
    question: "What is the primary focus of the Behaviorism philosophy in education?",
    answer: "Learning is a change in behavior, focusing on stimulus-response mechanisms."
  },
  {
    question: "Which Republic Act is known as the 'Magna Carta for Public School Teachers'?",
    answer: "RA 4670, which outlines the rights and benefits of public school teachers."
  }
];

type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null;

interface SessionStats {
    correct: number;
    incorrect: number;
    bookmarked: number;
}

export default function FlashcardGamePage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);
  
  const [sessionStats, setSessionStats] = useState<SessionStats>({ correct: 0, incorrect: 0, bookmarked: 0 });
  const [dragState, setDragState] = useState({ x: 0, y: 0, direction: null as SwipeDirection | null, opacity: 0 });

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('flashcardHintSeen');
    if (!hasSeenHint) {
      setShowHint(true);
      localStorage.setItem('flashcardHintSeen', 'true');
    }
  }, []);

  const handleNextCard = (result: 'correct' | 'incorrect' | 'bookmarked' | 'hard') => {
    setSessionStats(prev => {
        const newStats = {...prev};
        if (result === 'correct') newStats.correct++;
        if (result === 'incorrect') newStats.incorrect++;
        if (result === 'bookmarked') newStats.bookmarked++;
        return newStats;
    });
    
    if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
    }

    setTimeout(() => {
      if (currentIndex < mockFlashcards.length - 1) {
        setCurrentIndex(i => i + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
      setDragState({ x: 0, y: 0, direction: null, opacity: 0 });
      if (cardRef.current) {
        cardRef.current.style.transform = '';
      }
    }, 300);
  };
  
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isFlipped) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (cardRef.current) {
        cardRef.current.style.transition = 'none';
    }
    document.body.style.userSelect = 'none';
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current || !cardRef.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const rotation = dx * 0.1;
    
    cardRef.current.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
    
    let direction: SwipeDirection = null;
    const threshold = 20;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > threshold) direction = 'right';
        else if (dx < -threshold) direction = 'left';
    } else {
        if (dy > threshold) direction = 'down';
        else if (dy < -threshold) direction = 'up';
    }
    
    const opacity = Math.min(Math.max(Math.abs(dx), Math.abs(dy)) / 150, 1);
    setDragState({ x: dx, y: dy, direction, opacity });
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current || !cardRef.current) return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const threshold = 60;
    
    let finalDirection: SwipeDirection = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        finalDirection = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
        finalDirection = dy > 0 ? 'down' : 'up';
    }

    if (finalDirection) {
        let result: 'correct' | 'incorrect' | 'bookmarked' | 'hard';
        let transform = '';
        switch(finalDirection) {
            case 'right': result = 'correct'; transform = 'translateX(500px) rotate(30deg)'; break;
            case 'left': result = 'incorrect'; transform = 'translateX(-500px) rotate(-30deg)'; break;
            case 'down': result = 'bookmarked'; break;
            case 'up': result = 'hard'; break;
        }
        if (transform) cardRef.current.style.transform = transform;
        handleNextCard(result);
    } else {
        cardRef.current.style.transition = 'transform 0.3s ease-out';
        cardRef.current.style.transform = '';
        setDragState({ x: 0, y: 0, direction: null, opacity: 0 });
    }
    
    dragStart.current = null;
    document.body.style.userSelect = '';
  };
  
  const handleCardClick = () => {
    setTimeout(() => {
        if (!dragStart.current) {
            setIsFlipped(f => !f);
        }
    }, 50);
  }

  const restartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setSessionStats({ correct: 0, incorrect: 0, bookmarked: 0 });
    setDragState({ x: 0, y: 0, direction: null, opacity: 0 });
  };
  
  const currentCard = mockFlashcards[currentIndex];
  const progress = ((currentIndex + 1) / mockFlashcards.length) * 100;
  const accuracy = sessionStats.correct + sessionStats.incorrect > 0
    ? (sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100
    : 0;

  if (sessionComplete) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center p-4">
        <div className="max-w-md w-full">
            <h1 className="text-4xl font-bold font-headline mb-2">Session Complete!</h1>
            <p className="text-muted-foreground mb-8">Here's your summary for this session.</p>
            
            <Card className="text-left">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-lg">Accuracy</span>
                        <span className="font-bold text-2xl" style={{ color: `hsl(${accuracy * 1.2}, 80%, 45%)` }}>
                            {accuracy.toFixed(0)}%
                        </span>
                    </div>
                     <Progress value={accuracy} />
                     <div className="grid grid-cols-3 gap-4 pt-4 text-center">
                         <div className="p-2 rounded-lg bg-green-50">
                             <p className="text-3xl font-bold text-green-600">{sessionStats.correct}</p>
                             <p className="text-sm font-medium text-green-700">Correct</p>
                         </div>
                         <div className="p-2 rounded-lg bg-red-50">
                             <p className="text-3xl font-bold text-red-600">{sessionStats.incorrect}</p>
                             <p className="text-sm font-medium text-red-700">Incorrect</p>
                         </div>
                         <div className="p-2 rounded-lg bg-blue-50">
                             <p className="text-3xl font-bold text-blue-600">{sessionStats.bookmarked}</p>
                             <p className="text-sm font-medium text-blue-700">Bookmarked</p>
                         </div>
                     </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-2 mt-8">
              <Button onClick={restartSession} size="lg">
                <RotateCw className="mr-2 h-4 w-4" /> Review Again
              </Button>
              <Button variant="outline" onClick={() => router.back()} size="lg">Exit</Button>
            </div>
        </div>
      </div>
    )
  }
  
  const getFeedback = () => {
    switch (dragState.direction) {
        case 'right': return { icon: <Check />, text: 'Correct', color: 'bg-green-500/80' };
        case 'left': return { icon: <X />, text: 'Incorrect', color: 'bg-red-500/80' };
        case 'up': return { icon: <ArrowUp />, text: 'Hard', color: 'bg-yellow-500/80' };
        case 'down': return { icon: <Bookmark />, text: 'Bookmark', color: 'bg-blue-500/80' };
        default: return null;
    }
  };
  const feedback = getFeedback();


  return (
    <div className="fixed inset-0 bg-background flex flex-col p-4 font-body touch-none">
      <header className="flex items-center gap-4 mb-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-muted-foreground">The Teaching Profession</p>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs font-mono text-muted-foreground">{currentIndex + 1}/{mockFlashcards.length}</span>
          </div>
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

      <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
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
        
        <div className="flashcard-container w-full h-full max-w-md max-h-[70vh] flex items-center justify-center">
          <div
            ref={cardRef}
            className={cn(
                "flashcard relative w-full h-full cursor-pointer",
                isFlipped && 'is-flipped',
            )}
            onClick={handleCardClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <Card className="flashcard-front absolute w-full h-full flex items-center justify-center text-center p-6">
                <CardContent className="p-0">
                    <p className="text-xl md:text-2xl font-semibold">{currentCard.question}</p>
                </CardContent>
            </Card>
            
            <Card className="flashcard-back absolute w-full h-full flex items-center justify-center text-center p-6">
                <CardContent className="p-0">
                    <p className="text-lg md:text-xl">{currentCard.answer}</p>
                </CardContent>
            </Card>

            <div
              className={cn(
                "absolute inset-0 rounded-xl flex flex-col items-center justify-center pointer-events-none transition-opacity duration-200 text-white",
                feedback?.color
              )}
              style={{ opacity: dragState.opacity }}
            >
              {feedback && (
                <>
                  {React.cloneElement(feedback.icon, { className: 'h-16 w-16' })}
                  <p className="font-bold text-xl mt-2">{feedback.text}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-sm text-muted-foreground">
            {isFlipped ? "Swipe in any direction" : "Tap to reveal answer"}
        </div>
      </main>
    </div>
  );
}
