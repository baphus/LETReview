
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Shield, Star, Lock, RefreshCcw, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { pets, getQuestionOfTheDay, loadQuestions } from "@/lib/data";
import type { QuizQuestion, DailyProgress } from "@/lib/types";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { startOfDay, isBefore, startOfYesterday, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";


interface UserStats {
  uid: string;
  streak: number;
  highestStreak: number;
  points: number;
  lastChallengeDate?: string;
  petsUnlocked: number;
  completedChallenges: string[];
  dailyProgress: Record<string, DailyProgress>;
}

// Function to get local date string in YYYY-MM-DD format
const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const QuestionOfTheDay = ({ onCorrectAnswer, userUid }: { onCorrectAnswer: () => void, userUid: string | null }) => {
    const { toast } = useToast();
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    
    useEffect(() => {
        if (!userUid) return;
        const qotd = getQuestionOfTheDay();
        setQuestion(qotd);
        const savedUser = localStorage.getItem(`userProfile_${userUid}`);
        if(savedUser){
            const user = JSON.parse(savedUser);
            const todayKey = getTodayKey();
            const todaysProgress = user.dailyProgress?.[todayKey];

            if(todaysProgress?.qotdCompleted){
                setIsAnswered(true);
                const previousAnswer = todaysProgress.qotdAnswer;
                if (previousAnswer) {
                    setSelectedAnswer(previousAnswer);
                    setIsCorrect(previousAnswer === qotd.answer);
                } else {
                    // Fallback for older data structure
                    setSelectedAnswer(qotd.answer);
                    setIsCorrect(true);
                }
            }
        }
    }, [userUid]);

    const handleAnswer = (answer: string) => {
        if (isAnswered || !userUid) return;

        const correct = answer === question?.answer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        const savedUser = localStorage.getItem(`userProfile_${userUid}`);
        if (savedUser) {
            let user = JSON.parse(savedUser);
            const todayKey = getTodayKey();

            if (!user.dailyProgress) user.dailyProgress = {};
            if (!user.dailyProgress[todayKey]) user.dailyProgress[todayKey] = { pointsEarned: 0, pomodorosCompleted: 0, challengesCompleted: [], qotdCompleted: false };
            
            user.dailyProgress[todayKey].qotdCompleted = true;
            user.dailyProgress[todayKey].qotdAnswer = answer;

            if (correct) {
                onCorrectAnswer(); // This updates the state in the parent component
                toast({ title: "Correct!", description: "You earned 5 points!", className: "bg-primary border-primary text-primary-foreground" });
            } else {
                 toast({ variant: "destructive", title: "Incorrect", description: "Better luck tomorrow!" });
            }
            localStorage.setItem(`userProfile_${userUid}`, JSON.stringify(user));
        }
    };

    if (!question) return null;

    return (
        <Card className="mb-6 animate-fade-in-up">
             {question.image && (
                <div className="relative w-full h-48 mb-4">
                    <Image 
                        src={question.image} 
                        alt={question.question} 
                        layout="fill" 
                        objectFit="contain"
                        className="rounded-t-lg"
                    />
                </div>
            )}
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Question of the Day</CardTitle>
                <CardDescription>{question.question}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
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
                                "h-auto whitespace-normal justify-start p-4 w-full text-left",
                                isAnswered && isTheCorrectAnswer && "bg-green-500/10 border-green-500/30 hover:bg-green-500/10 text-foreground",
                                isAnswered && isSelected && !isTheCorrectAnswer && "bg-red-500/10 border-red-500/30 hover:bg-red-500/10 text-foreground",
                                isAnswered && !isSelected && !isTheCorrectAnswer && "opacity-60"
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span>{choice}</span>
                                {isAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-400" />}
                                {isAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-400" />}
                            </div>
                        </Button>
                    )
                })}
            </CardContent>
            <CardFooter>
                 <div className={`flex items-center gap-1 font-semibold text-green-400`}>
                  <Star className={`h-4 w-4 fill-green-400`} />
                  <span>5 Points</span>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function DailyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"custom">("custom");
  const [questionCounts, setQuestionCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const todayKey = getTodayKey();

  const loadUserStats = useCallback(() => {
    const currentUid = localStorage.getItem('currentUser');
    if (currentUid) {
      const savedUser = localStorage.getItem(`userProfile_${currentUid}`);
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        const isCompletedToday = (parsedUser.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0) > 0;
        setChallengeCompletedToday(isCompletedToday);
        
        const lastChallengeDateString = parsedUser.lastChallengeDate;
        if (lastChallengeDateString) {
            const lastChallengeDate = startOfDay(new Date(lastChallengeDateString));
            const yesterday = startOfYesterday();

            if (parsedUser.streak > 0 && isBefore(lastChallengeDate, yesterday)) {
              setStreakBroken(true);
              parsedUser.streak = 0;
              localStorage.setItem(`userProfile_${currentUid}`, JSON.stringify(parsedUser));
            } else {
              setStreakBroken(false);
            }
        }
        
        const todaysChallenges = parsedUser.dailyProgress?.[todayKey]?.challengesCompleted || [];

        setUserStats({
          uid: currentUid,
          streak: parsedUser.streak || 0,
          highestStreak: parsedUser.highestStreak || 0,
          points: parsedUser.points || 0,
          lastChallengeDate: parsedUser.lastChallengeDate,
          petsUnlocked: parsedUser.petsUnlocked || 0,
          completedChallenges: todaysChallenges,
          dailyProgress: parsedUser.dailyProgress || {},
        });
      }
    } else {
        router.push('/login');
    }
  }, [todayKey, router]);

  useEffect(() => {
    loadUserStats();
    
    const allQuestions = loadQuestions();
    setQuestionCounts({
        easy: allQuestions.filter(q => q.difficulty === 'easy' && q.category === 'custom').length,
        medium: allQuestions.filter(q => q.difficulty === 'medium' && q.category === 'custom').length,
        hard: allQuestions.filter(q => q.difficulty === 'hard' && q.category === 'custom').length,
    });
    
    // This will run when the component mounts and also when the user navigates back to this page.
    const handleFocus = () => {
      loadUserStats();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
       window.removeEventListener('storage', handleFocus);
    };
  }, [loadUserStats]);

  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/review?challenge=true&difficulty=${difficulty}&count=${count}&category=${selectedCategory}`);
  };
  
  const restoreStreakCost = Math.min(250, (userStats?.highestStreak || 0) * 10);

  const handleRestoreStreak = () => {
     if (!userStats || userStats.points < restoreStreakCost) {
        toast({ variant: "destructive", title: "Not enough points!", description: `You need ${restoreStreakCost} points to restore your streak.`});
        return;
     }

      const savedUser = localStorage.getItem(`userProfile_${userStats.uid}`);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        user.points -= restoreStreakCost;
        user.streak = user.highestStreak;
        localStorage.setItem(`userProfile_${userStats.uid}`, JSON.stringify(user));
        setStreakBroken(false);
        setUserStats(prev => prev ? ({ ...prev, points: user.points, streak: user.streak }) : null);
        toast({
          title: "Streak Restored!",
          description: `You spent ${restoreStreakCost} points.`,
          className: "bg-primary border-primary text-primary-foreground"
        });
      }
  };

  const handleQotdCorrect = () => {
    if (!userStats) return;
    const savedUser = localStorage.getItem(`userProfile_${userStats.uid}`);
    if (savedUser) {
        const user = JSON.parse(savedUser);
        user.points = (user.points || 0) + 5;
        
        const todayKey = getTodayKey();
        if (!user.dailyProgress) user.dailyProgress = {};
        if (!user.dailyProgress[todayKey]) user.dailyProgress[todayKey] = { pointsEarned: 0, pomodorosCompleted: 0, challengesCompleted: [], qotdCompleted: false };
        user.dailyProgress[todayKey].pointsEarned = (user.dailyProgress[todayKey].pointsEarned || 0) + 5;

        localStorage.setItem(`userProfile_${userStats.uid}`, JSON.stringify(user));
        setUserStats(prev => prev ? ({ ...prev, points: user.points }) : null);
    }
  };

  if (!userStats) return null;


  const challenges = [
    { difficulty: 'easy', count: 5, points: 25, color: 'green' },
    { difficulty: 'medium', count: 10, points: 75, color: 'yellow' },
    { difficulty: 'hard', count: 15, points: 150, color: 'red' },
  ];

  return (
    <div className="container mx-auto p-4 max-w-2xl">
    <TooltipProvider>
      <header className="flex items-center gap-2 mb-6">
        <CalendarDays className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Daily Activities</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-lg text-destructive">
              <Flame className="text-destructive" />
              <span>Streak</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userStats.streak} Days</p>
          </CardContent>
        </Card>
        <Card className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Gem className="text-accent" />
              <span>Points</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userStats.points}</p>
          </CardContent>
        </Card>
      </div>

      <QuestionOfTheDay onCorrectAnswer={handleQotdCorrect} userUid={userStats.uid} />

      {challengeCompletedToday && (
         <Card className="mb-6 bg-green-500/10 border-green-500/20 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-center text-green-400 font-headline">
              Streak secured for today!
            </CardTitle>
            <CardDescription className="text-center text-green-500">You can still complete other challenges for extra points.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {streakBroken && !challengeCompletedToday && (
        <Card className="mb-6 bg-amber-500/10 border-amber-500/20 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-center text-amber-400 font-headline">
              Oh no! You lost your streak.
            </CardTitle>
            <CardDescription className="text-center text-amber-500">
              Restore your {userStats.highestStreak}-day streak for {restoreStreakCost} points or start a new challenge.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={userStats.points < restoreStreakCost}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Restore Streak ({restoreStreakCost} points)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will cost {restoreStreakCost} points and restore your streak to {userStats.highestStreak} days.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestoreStreak}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </CardFooter>
        </Card>
      )}

      <section>
        <div className="flex flex-col items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold font-headline">Daily Challenges</h2>
            <p className="text-muted-foreground">Select a difficulty to start a challenge with your custom questions.</p>
        </div>
        <div className="space-y-4">
          {challenges.map((challenge, index) => {
             const challengeId = `${challenge.difficulty}-custom`;
             const isCompleted = userStats.completedChallenges.includes(challengeId);
             const hasEnoughQuestions = questionCounts[challenge.difficulty as keyof typeof questionCounts] >= challenge.count;

            return (
                <Card 
                    key={challenge.difficulty} 
                    className={cn(
                        "animate-fade-in-up",
                        (isCompleted || !hasEnoughQuestions) && "bg-muted/50", 
                        `border-${challenge.color}-500/20`
                    )}
                    style={{ animationDelay: `${200 + index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline capitalize">{challenge.difficulty} Challenge</CardTitle>
                            <CardDescription>Complete a set of {challenge.count} questions. ({questionCounts[challenge.difficulty as keyof typeof questionCounts]} available)</CardDescription>
                        </div>
                        {isCompleted && <Badge variant="secondary">Completed</Badge>}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center">
                    <div className={cn('flex items-center gap-1 font-semibold', {
                        'text-green-400': challenge.color === 'green',
                        'text-yellow-400': challenge.color === 'yellow',
                        'text-red-400': challenge.color === 'red',
                    })}>
                      <Star className={cn('h-4 w-4', {
                        'fill-green-400': challenge.color === 'green',
                        'fill-yellow-400': challenge.color === 'yellow',
                        'fill-red-400': challenge.color === 'red',
                      })} />
                      <span>{challenge.points} Points</span>
                    </div>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <span tabIndex={0}>
                                 <Button onClick={() => handleStartChallenge(challenge.difficulty as 'easy' | 'medium' | 'hard', challenge.count)} disabled={isCompleted || !hasEnoughQuestions}>
                                  {isCompleted ? 'Done' : 'Start'}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        {!hasEnoughQuestions && (
                            <TooltipContent>
                                <p>Not enough {challenge.difficulty} questions. Add more in your question bank.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                  </CardFooter>
                </Card>
            )
          })}
        </div>
      </section>
    </TooltipProvider>
    </div>
  );
}
