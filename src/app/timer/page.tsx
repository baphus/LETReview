"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, Coffee, Play, Pause, RotateCcw, Award, Gem, Bell, Flame, ArrowRight, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/use-timer";
import { getQuestions } from "@/lib/data";
import type { QuizQuestion, UserProfile, DailyProgress } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUser } from "@/firebase/auth/use-user";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

// Mini Quiz Component - compact mobile-first design
const MiniQuiz = ({ onCorrectAnswer, onIncorrectAnswer, onStreak }: { onCorrectAnswer: (points: number, questionId: string) => void, onIncorrectAnswer: () => void, onStreak: () => void }) => {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

  const fetchQuestions = useCallback(async () => {
    const fetched = await getQuestions({ shuffle: true, limit: 100 });
    setQuizQuestions(fetched);
    return fetched;
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const getNewQuestion = useCallback(async () => {
    let pool = quizQuestions;
    let currentUsedIds = usedIds;

    // If we've used all questions, refetch a fresh batch
    const available = pool.filter(q => !currentUsedIds.has(q.id));
    if (available.length === 0) {
      pool = await fetchQuestions();
      currentUsedIds = new Set();
      setUsedIds(new Set());
    }

    const remainingPool = pool.filter(q => !currentUsedIds.has(q.id));
    if (remainingPool.length === 0) return;

    // Pick a random question from the remaining pool
    const randomIndex = Math.floor(Math.random() * remainingPool.length);
    const picked = { ...remainingPool[randomIndex] };
    picked.choices = [...picked.choices].sort(() => Math.random() - 0.5);

    setUsedIds(prev => new Set(prev).add(picked.id));
    setQuestion(picked);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(false);
  }, [quizQuestions, usedIds, fetchQuestions]);

  useEffect(() => {
    if (quizQuestions.length > 0 && !question) {
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
    <div className="w-full space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Quick Question</span>
      </div>
      <p className="text-sm font-medium leading-snug">{question.question}</p>
      <div className="grid grid-cols-1 gap-2">
        {question.choices.map((choice, index) => {
          const isTheCorrectAnswer = choice === question.correctAnswer;
          const isSelected = choice === selectedAnswer;

          return (
            <button
              key={`${choice}-${index}`}
              onClick={() => handleAnswer(choice)}
              disabled={isAnswered}
              className={cn(
                "w-full text-left text-sm p-3 rounded-xl border transition-all",
                !isAnswered && "hover:bg-muted active:scale-[0.98]",
                isAnswered && isTheCorrectAnswer && "bg-green-50 border-green-200 text-green-800",
                isAnswered && isSelected && !isTheCorrectAnswer && "bg-red-50 border-red-200 text-red-800",
                isAnswered && !isSelected && !isTheCorrectAnswer && "opacity-40",
                isAnswered && "pointer-events-none"
              )}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {isAnswered && !isCorrect && (
        <Button onClick={getNewQuestion} size="sm" className="w-full rounded-xl mt-2">
          Next Question <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
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
  const { toast } = useToast();
  const [showCombo, setShowCombo] = useState(false);
  const [showPoints, setShowPoints] = useState<{ show: boolean, points: number }>({ show: false, points: 0 });

  const time = rawTime || 0;
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  const progress = useMemo(() => {
    const totalTime = mode === 'focus' ? FOCUS_TIME : (mode === 'shortBreak' ? SHORT_BREAK_TIME : LONG_BREAK_TIME);
    if (totalTime === 0 || time === undefined) return 0;
    return ((totalTime - time) / totalTime) * 100;
  }, [time, mode, FOCUS_TIME, SHORT_BREAK_TIME, LONG_BREAK_TIME]);

  const handleCorrectAnswer = useCallback(async (points: number, questionId: string) => {
    handleCorrectQuizAnswer();

    if (user) {
      const todayKey = getTodayKey();
      const dailyProgress = user.dailyProgress?.[todayKey] || {};

      const newStreak = (quizStreak || 0) + 1;
      const newHighestStreak = Math.max(highestQuizStreak || 0, newStreak);

      let updates: Partial<UserProfile> = {
        points: (user.points || 0) + points,
      };

      let dailyProgressUpdate: Partial<DailyProgress> = {
        pointsEarned: (dailyProgress.pointsEarned || 0) + points,
      };

      if (newHighestStreak > (user.highestQuizStreak || 0)) {
        updates.highestQuizStreak = newHighestStreak;
      }

      if (!user.answeredQuestionIds?.includes(questionId)) {
        updates.questionsAnswered = (user.questionsAnswered || 0) + 1;
        updates.answeredQuestionIds = [...(user.answeredQuestionIds || []), questionId];
        dailyProgressUpdate.questionsAnswered = (dailyProgress.questionsAnswered || 0) + 1;
      }

      updates.dailyProgress = {
        ...user.dailyProgress,
        [todayKey]: {
          ...dailyProgress,
          ...dailyProgressUpdate
        }
      };

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
  };

  const resetTimer = () => baseResetTimer();

  const handleStartNextSession = (nextMode: "shortBreak" | "longBreak") => {
    setMode(nextMode);
    setTimeout(() => toggleTimer(), 100);
  };

  const nextBreakMode = useMemo(() => {
    return (sessions + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
  }, [sessions]);

  // SVG circular progress
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="container mx-auto max-w-lg flex flex-col items-center gap-6">
      {/* Mode Selector - pill style */}
      <div className="flex w-full max-w-xs bg-muted rounded-xl p-1">
        {(['focus', 'shortBreak', 'longBreak'] as const).map((m) => (
          <button
            key={m}
            onClick={() => !isActive && setMode(m)}
            disabled={isActive}
            className={cn(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
              mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              isActive && "pointer-events-none"
            )}
          >
            {m === 'focus' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative flex items-center justify-center">
        {/* SVG Ring */}
        <svg className="w-64 h-64 sm:w-72 sm:h-72 -rotate-90" viewBox="0 0 256 256">
          {/* Background ring */}
          <circle
            cx="128" cy="128" r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <circle
            cx="128" cy="128" r={radius}
            fill="none"
            stroke={mode === 'focus' ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            {mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Break' : 'Long Break'}
          </span>
          <span className="text-5xl sm:text-6xl font-bold font-mono tracking-tight">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          {isActive && mode === 'focus' && quizStreak > 0 && (
            <Badge variant="destructive" className="mt-2 gap-1">
              <Flame className="h-3 w-3" /> {quizStreak}x streak
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleTimer}
          size="lg"
          className="h-14 w-32 rounded-2xl text-base"
          disabled={timerEnded}
        >
          {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isActive ? "Pause" : "Start"}
        </Button>
        <Button
          onClick={resetTimer}
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-2xl"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Timer Ended - Break prompt */}
      {timerEnded && mode === 'focus' && (
        <div className="w-full rounded-xl border bg-accent/5 p-4 space-y-3 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold">Session complete!</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 rounded-xl" onClick={() => handleStartNextSession(nextBreakMode)}>
              Start {nextBreakMode === 'shortBreak' ? 'Short' : 'Long'} Break
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={resetTimer}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Mini Quiz during focus */}
      {isActive && mode === 'focus' && (
        <div className="w-full relative rounded-xl border bg-card p-4">
          <MiniQuiz
            onCorrectAnswer={handleCorrectAnswer}
            onIncorrectAnswer={handleIncorrectQuizAnswer}
            onStreak={handleStreak}
          />
          {showCombo && useTimer.getState().quizStreak > 1 && (
            <div className="absolute -top-3 right-4 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-sm font-bold animate-combo-pop">
              x{useTimer.getState().quizStreak}
            </div>
          )}
          {showPoints.show && (
            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-sm font-bold animate-combo-pop flex items-center gap-1">
              <Gem className="h-3 w-3" /> +{showPoints.points}
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="w-full grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 border">
          <Award className="h-4 w-4 text-primary" />
          <span className="text-lg font-bold">{todaysSessions}</span>
          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Today</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 border">
          <Clock className="h-4 w-4 text-accent" />
          <span className="text-lg font-bold">{sessions}</span>
          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Total</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 border">
          <Flame className="h-4 w-4 text-destructive" />
          <span className="text-lg font-bold">{highestQuizStreak}</span>
          <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">Best Streak</span>
        </div>
      </div>
    </div>
  );
}
