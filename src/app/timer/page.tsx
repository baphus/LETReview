
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award, Gem, Bell, Flame, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/use-timer";
import { getQuestions } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase/auth/use-user";
import { format } from "date-fns";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const MiniQuiz = ({ onCorrectAnswer, onIncorrectAnswer, onStreak }: { onCorrectAnswer: (points: number, questionId: string) => void, onIncorrectAnswer: () => void, onStreak: () => void }) => {
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [questionIndex, setQuestionIndex] = useState(0);

    useEffect(() => {
        getQuestions({ difficulty: 'easy', shuffle: true, limit: 10 }).then(setQuizQuestions);
    }, []);

    const getNewQuestion = useCallback(() => {
        if (quizQuestions.length === 0) return;
        
        const nextIndex = (questionIndex + 1) % quizQuestions.length;
        setQuestionIndex(nextIndex);
        
        const newQuestion = { ...quizQuestions[nextIndex] };
        newQuestion.choices = [...newQuestion.choices].sort(() => Math.random() - 0.5);
        setQuestion(newQuestion);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setIsCorrect(false);
    }, [quizQuestions, questionIndex]);

    useEffect(() => {
        if (quizQuestions.length > 0) {
            getNewQuestion();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizQuestions]);

    const handleAnswer = (answer: string) => {
        if (isAnswered || !question) return;

        const correct = answer === question.correctAnswer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
            const currentStreak = useTimer.getState().quizStreak;
            const pointsGained = 1 * (currentStreak + 1);
            onCorrectAnswer(pointsGained, question.id);
            onStreak();
            setTimeout(getNewQuestion, 1200); 
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
                        const isTheCorrectAnswer = choice === question.correctAnswer;
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
    time: rawTime, 
    isActive, 
    mode, 
    sessions,
    todaysSessions,
    toggleTimer, 
    resetTimer: baseResetTimer,
    setMode,
    FOCUS_TIME,
    SHORT_BREAK_TIME,
    LONG_BREAK_TIME,
    quizStreak,
    highestQuizStreak,
    handleCorrectQuizAnswer,
    handleIncorrectQuizAnswer,
    timerEnded
  } = useTimer();
  
  const { user, updateUser } = useUser();
  const [showCombo, setShowCombo] = useState(false);
  const [showPoints, setShowPoints] = useState<{ show: boolean, points: number }>({ show: false, points: 0 });

  const time = rawTime || 0;
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  
  const progress = useMemo(() => {
    const totalTime = mode === 'focus' ? FOCUS_TIME : (mode === 'shortBreak' ? SHORT_BREAK_TIME : LONG_BREAK_TIME);
    if(totalTime === 0 || time === undefined) return 0;
    return ((totalTime - time) / totalTime) * 100;
  }, [time, mode, FOCUS_TIME, SHORT_BREAK_TIME, LONG_BREAK_TIME]);

  
  const handleCorrectAnswer = useCallback(async (points: number, questionId: string) => {
    handleCorrectQuizAnswer(); // This updates the local timer state
    
    if (user) {
      const todayKey = getTodayKey();
      
      const newStreak = (quizStreak || 0) + 1;
      const newHighestStreak = Math.max(highestQuizStreak || 0, newStreak);
      
      let updates: any = {
        points: (user.points || 0) + points,
        dailyProgress: {
            ...user.dailyProgress,
            [todayKey]: {
                ...user.dailyProgress[todayKey],
                pointsEarned: (user.dailyProgress[todayKey]?.pointsEarned || 0) + points,
            }
        },
      };

      if (newHighestStreak > (user.highestQuizStreak || 0)) {
        updates.highestQuizStreak = newHighestStreak;
      }
      
      if (!user.answeredQuestionIds?.includes(questionId)) {
          updates.questionsAnswered = (user.questionsAnswered || 0) + 1;
          updates.answeredQuestionIds = [...(user.answeredQuestionIds || []), questionId];
      }

      updateUser(updates);
    }
    
    setShowPoints({ show: true, points: points });
    setTimeout(() => setShowPoints({ show: false, points: 0 }), 1500);
  }, [user, quizStreak, highestQuizStreak, updateUser, handleCorrectQuizAnswer]);
  
  const handleStreak = () => {
    const currentStreak = useTimer.getState().quizStreak;
    if (currentStreak > 1) {
      setShowCombo(true);
      setTimeout(() => setShowCombo(false), 1500);
    }
  }

  const resetTimer = () => {
    baseResetTimer();
  }
  
  const handleStartNextSession = (nextMode: "shortBreak" | "longBreak") => {
    setMode(nextMode);
    setTimeout(() => toggleTimer(), 100); 
  }

  const getModeTitle = () => {
    switch (mode) {
      case 'focus': return "Focus Session";
      case 'shortBreak': return "Short Break";
      case 'longBreak': return "Long Break";
    }
  }
  
   const nextBreakMode = useMemo(() => {
    return (sessions + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
  }, [sessions]);


  return (
    <div className="container mx-auto p-4 max-w-2xl flex flex-col">
      <header className="flex items-center gap-2 mb-6">
        <Clock className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Pomodoro Timer</h1>
      </header>

       <div className="flex justify-center mb-6">
          <Tabs 
            value={mode} 
            onValueChange={(value) => {
              if(!isActive) {
                setMode(value as "focus" | "shortBreak" | "longBreak")
              }
            }}
            className="w-full max-w-sm"
          >
              <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="focus" disabled={isActive}>Focus</TabsTrigger>
                  <TabsTrigger value="shortBreak" disabled={isActive}>Short Break</TabsTrigger>
                  <TabsTrigger value="longBreak" disabled={isActive}>Long Break</TabsTrigger>
              </TabsList>
          </Tabs>
      </div>


      <div className="flex-1 flex flex-col justify-center items-center gap-6">
        <div className="relative">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-lg font-semibold flex items-center justify-center gap-2">
                  {mode === 'focus' ? <Clock className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                  <span>{getModeTitle()}</span>
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
                <Button onClick={toggleTimer} size="lg" className="w-28" disabled={timerEnded}>
                  {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                  {isActive ? "Pause" : "Start"}
                </Button>
                <Button onClick={resetTimer} variant="outline" size="lg">
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {timerEnded && mode === 'focus' && (
             <Card className="w-full max-w-sm animate-fade-in-up">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-accent" />
                        Time for a break!
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button onClick={() => handleStartNextSession(nextBreakMode)}>
                        Start {nextBreakMode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                    </Button>
                    <Button variant="ghost" onClick={resetTimer}>Dismiss</Button>
                </CardContent>
            </Card>
        )}

        
        {isActive && mode === 'focus' && (
            <div className="relative">
                <MiniQuiz 
                    onCorrectAnswer={handleCorrectAnswer} 
                    onIncorrectQuizAnswer={handleIncorrectQuizAnswer} 
                    onStreak={handleStreak}
                />
                 {showCombo && useTimer.getState().quizStreak > 1 && (
                    <div className="absolute -top-4 -right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-lg font-bold animate-combo-pop">
                        🔥 Streak x{useTimer.getState().quizStreak}!
                    </div>
                )}
                 {showPoints.show && (
                    <div className="absolute -top-4 left-0 bg-primary text-primary-foreground px-3 py-1 rounded-full text-lg font-bold animate-combo-pop flex items-center gap-1">
                        <Gem className="h-4 w-4" /> +{showPoints.points}
                    </div>
                )}
            </div>
        )}

      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 text-center">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-center gap-2">
                    <Award className="text-primary" />
                    <span>Today's Sessions</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{todaysSessions}</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-center gap-2 text-destructive">
                    <Flame className="text-destructive" />
                    <span>Highest Quiz Streak</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{highestQuizStreak}</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
