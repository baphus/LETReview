
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award, Zap, Sparkles, XCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/use-timer";
import { sampleQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";


const MiniQuiz = ({ onCorrectAnswer, onIncorrectAnswer }: { onCorrectAnswer: () => void, onIncorrectAnswer: () => void }) => {
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    const getNewQuestion = useCallback(() => {
        const allQuestions = [...sampleQuestions];
        const randomIndex = Math.floor(Math.random() * allQuestions.length);
        const newQuestion = { ...allQuestions[randomIndex] };
        // Shuffle choices for the new question
        newQuestion.choices = [...newQuestion.choices].sort(() => Math.random() - 0.5);
        setQuestion(newQuestion);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setIsCorrect(false);
    }, []);

    useEffect(() => {
        getNewQuestion();
    }, [getNewQuestion]);

    const handleAnswer = (answer: string) => {
        if (isAnswered) return;

        const correct = answer === question?.answer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
            onCorrectAnswer();
            setTimeout(() => {
                getNewQuestion();
            }, 1200); 
        } else {
            onIncorrectAnswer();
        }
    };
    
    if (!question) return null;

    return (
        <Card className="w-full max-w-sm animate-fade-in-up">
            <CardHeader>
                <CardTitle className="text-center font-headline text-lg">Quick Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-center font-semibold">{question.question}</p>
                <div className="grid grid-cols-1 gap-2">
                    {question.choices.map((choice, index) => {
                        const isTheCorrectAnswer = choice === question.answer;
                        const isSelected = choice === selectedAnswer;

                        return (
                            <Button
                                key={`${choice}-${index}`}
                                variant="outline"
                                onClick={() => handleAnswer(choice)}
                                disabled={isAnswered}
                                className={cn(
                                    "h-auto whitespace-normal",
                                    isAnswered && isTheCorrectAnswer && "bg-green-100 border-green-300 hover:bg-green-100 text-green-800",
                                    isAnswered && isSelected && !isTheCorrectAnswer && "bg-red-100 border-red-300 hover:bg-red-100 text-red-800",
                                    isAnswered && !isSelected && !isTheCorrectAnswer && "opacity-60"
                                )}
                            >
                                {choice}
                            </Button>
                        )
                    })}
                </div>
            </CardContent>
            {isAnswered && !isCorrect && (
                <CardFooter className="flex-col gap-2">
                     <p className="text-sm text-center text-muted-foreground">The correct answer is highlighted in green.</p>
                     <Button onClick={getNewQuestion} className="w-full">
                        Next Question <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};


export default function TimerPage() {
  const { 
    time, 
    isActive, 
    mode, 
    sessions, 
    toggleTimer, 
    resetTimer: baseResetTimer,
    FOCUS_TIME,
    BREAK_TIME,
    addCompletedSession
  } = useTimer();
  
  const { toast } = useToast();
  const [streak, setStreak] = useState(0);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  
  const progress = useMemo(() => (
    mode === 'focus' 
      ? (FOCUS_TIME - time) / FOCUS_TIME 
      : (BREAK_TIME - time) / BREAK_TIME
  ) * 100, [time, mode, FOCUS_TIME, BREAK_TIME]);


  const handleTimerEnd = useCallback(() => {
    if (mode === "focus") {
      addCompletedSession();
      toast({
        title: "Focus session complete!",
        description: `Time for a 5-minute break.`,
      });
      setStreak(0);
    } else {
      toast({
        title: "Break's over!",
        description: "Time to start another focus session.",
      });
    }
  }, [mode, toast, addCompletedSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        // Timer logic is handled by the hook, this is for completion
      }, 1000);
    } else if (isActive && time <= 0) {
        handleTimerEnd();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time, handleTimerEnd]);
  

  const handleCorrectAnswer = useCallback(() => {
    const newStreak = streak + 1;
    setStreak(newStreak);

    if (newStreak > 0 && newStreak % 5 === 0) {
        const pointsEarned = 1;
        const savedUser = localStorage.getItem("userProfile");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            user.points = (user.points || 0) + pointsEarned;
            localStorage.setItem("userProfile", JSON.stringify(user));
        }
        toast({
            title: `Streak Bonus! +${pointsEarned} Point`,
            description: `You've answered 5 questions correctly in a row!`,
            className: "bg-green-100 border-green-300"
        });
    }
  }, [streak, toast]);
  
   const handleIncorrectAnswer = useCallback(() => {
    if (streak > 0) {
        toast({
            variant: "destructive",
            title: "Streak Lost!",
            description: "You answered incorrectly. Your streak has been reset.",
        });
    }
    setStreak(0);
  }, [streak, toast]);
  
  const resetTimer = () => {
    baseResetTimer();
    setStreak(0);
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl flex flex-col">
      <header className="flex items-center gap-2 mb-6">
        <Clock className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Pomodoro Timer</h1>
      </header>

      <div className="flex-1 flex flex-col justify-center items-center gap-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
                {mode === 'focus' ? <Clock className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                <span>{mode === "focus" ? "Focus Session" : "Short Break"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 rounded-full flex items-center justify-center bg-muted">
                <div 
                    className="absolute top-0 left-0 w-full h-full rounded-full"
                    style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, transparent ${progress}%)`}}
                ></div>
                <div className="relative w-40 h-40 bg-background rounded-full flex items-center justify-center">
                    <span className="text-5xl font-bold font-mono tracking-tighter">
                        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={toggleTimer} size="lg" className="w-28">
                {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                {isActive ? "Pause" : "Start"}
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {isActive && mode === 'focus' && (
            <MiniQuiz 
                onCorrectAnswer={handleCorrectAnswer} 
                onIncorrectAnswer={handleIncorrectAnswer} 
            />
        )}

      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 text-center">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Award className="text-primary" />
                    <span>Completed Sessions</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{sessions}</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Zap className="text-yellow-500" />
                    <span>Current Streak</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{streak}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
