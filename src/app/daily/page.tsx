
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Shield, Star, Lock, RefreshCcw, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { pets, getQuestionOfTheDay } from "@/lib/data";
import type { QuizQuestion } from "@/lib/types";
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


interface UserStats {
  streak: number;
  highestStreak: number;
  points: number;
  lastChallengeDate?: string;
  lastQotdDate?: string;
  petsUnlocked: number;
  completedChallenges: string[];
}

const QuestionOfTheDay = ({ onCorrectAnswer }: { onCorrectAnswer: () => void }) => {
    const { toast } = useToast();
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    
    useEffect(() => {
        const qotd = getQuestionOfTheDay();
        setQuestion(qotd);
        const savedUser = localStorage.getItem("userProfile");
        if(savedUser){
            const user = JSON.parse(savedUser);
            const today = new Date().toDateString();
            if(user.lastQotdDate === today){
                setIsAnswered(true);
                // We don't know what they answered, so we just show the correct one
                setSelectedAnswer(qotd.answer);
                setIsCorrect(true);
            }
        }
    }, []);

    const handleAnswer = (answer: string) => {
        if (isAnswered) return;

        const correct = answer === question?.answer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        const savedUser = localStorage.getItem("userProfile");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            user.lastQotdDate = new Date().toDateString();
            if (correct) {
                onCorrectAnswer();
                toast({ title: "Correct!", description: "You earned 5 points!", className: "bg-green-100 border-green-300" });
            } else {
                 toast({ variant: "destructive", title: "Incorrect", description: "Better luck tomorrow!" });
            }
            localStorage.setItem("userProfile", JSON.stringify(user));
        }
    };

    if (!question) return null;

    return (
        <Card className="mb-6">
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
                                isAnswered && isTheCorrectAnswer && "bg-green-100 border-green-300 hover:bg-green-100 text-green-800",
                                isAnswered && isSelected && !isTheCorrectAnswer && "bg-red-100 border-red-300 hover:bg-red-100 text-red-800",
                                isAnswered && !isSelected && !isTheCorrectAnswer && "opacity-60"
                            )}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span>{choice}</span>
                                {isAnswered && isTheCorrectAnswer && <CheckCircle className="h-5 w-5 text-green-500" />}
                                {isAnswered && isSelected && !isTheCorrectAnswer && <XCircle className="h-5 w-5 text-red-500" />}
                            </div>
                        </Button>
                    )
                })}
            </CardContent>
            <CardFooter>
                 <div className={`flex items-center gap-1 font-semibold text-green-600`}>
                  <Star className={`h-4 w-4 fill-green-500`} />
                  <span>5 Points</span>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function DailyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 0,
    highestStreak: 0,
    points: 0,
    petsUnlocked: 0,
    completedChallenges: [],
  });
  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"gen_education" | "professional">("gen_education");

  const loadUserStats = useCallback(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = parsedUser.lastChallengeDate ? new Date(parsedUser.lastChallengeDate) : null;
      lastDate?.setHours(0, 0, 0, 0);

      const todayString = today.toDateString();
      const lastDateString = lastDate?.toDateString();

      const isCompletedToday = lastDateString === todayString;
      setChallengeCompletedToday(isCompletedToday);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      if (parsedUser.streak > 0 && lastDate && lastDate.getTime() < yesterday.getTime()) {
        setStreakBroken(true);
        parsedUser.streak = 0;
        localStorage.setItem("userProfile", JSON.stringify(parsedUser));
      } else {
        setStreakBroken(false);
      }
      
      const todayKey = new Date().toISOString().split('T')[0];
      const todaysChallenges = (parsedUser.completedChallenges || []).filter((id: string) => id.endsWith(todayKey));

      setUserStats({
        streak: parsedUser.streak || 0,
        highestStreak: parsedUser.highestStreak || 0,
        points: parsedUser.points || 0,
        lastChallengeDate: parsedUser.lastChallengeDate,
        lastQotdDate: parsedUser.lastQotdDate,
        petsUnlocked: parsedUser.petsUnlocked || 0,
        completedChallenges: todaysChallenges,
      });
    }
  }, []);

  useEffect(() => {
    loadUserStats();
    // This will run when the component mounts and also when the user navigates back to this page.
    const handleFocus = () => {
      loadUserStats();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadUserStats]);

  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/review?challenge=true&difficulty=${difficulty}&count=${count}&category=${selectedCategory}`);
  };
  
  const restoreStreakCost = Math.min(250, (userStats.highestStreak || 0) * 10);

  const handleRestoreStreak = () => {
     if (userStats.points >= restoreStreakCost) {
      const savedUser = localStorage.getItem("userProfile");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        user.points -= restoreStreakCost;
        user.streak = user.highestStreak;
        localStorage.setItem("userProfile", JSON.stringify(user));
        setStreakBroken(false);
        setUserStats(prev => ({ ...prev, points: user.points, streak: user.streak }));
        toast({
          title: "Streak Restored!",
          description: `You spent ${restoreStreakCost} points.`,
          className: "bg-green-100 border-green-300"
        });
      }
    } else {
      toast({ variant: "destructive", title: "Not enough points!", description: `You need ${restoreStreakCost} points to restore your streak.`});
    }
  };

  const handleQotdCorrect = () => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
        const user = JSON.parse(savedUser);
        user.points = (user.points || 0) + 5;
        localStorage.setItem("userProfile", JSON.stringify(user));
        setUserStats(prev => ({ ...prev, points: user.points }));
    }
  };


  const challenges = [
    { difficulty: 'easy', count: 5, points: 25, color: 'green' },
    { difficulty: 'medium', count: 10, points: 75, color: 'yellow' },
    { difficulty: 'hard', count: 15, points: 150, color: 'red' },
  ];
  
  const todayKey = new Date().toISOString().split('T')[0];


  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex items-center gap-2 mb-6">
        <CalendarDays className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Daily Activities</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <Card>
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
        <Card>
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

      <QuestionOfTheDay onCorrectAnswer={handleQotdCorrect} />

      {challengeCompletedToday && (
         <Card className="mb-6 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-center text-green-800 font-headline">
              Streak secured for today!
            </CardTitle>
            <CardDescription className="text-center text-green-600">You can still complete other challenges for extra points.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {streakBroken && !challengeCompletedToday && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-center text-amber-800 font-headline">
              Oh no! You lost your streak.
            </CardTitle>
            <CardDescription className="text-center text-amber-600">
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
             <Tabs value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value as "gen_education" | "professional");
                }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gen_education">General Education</TabsTrigger>
                    <TabsTrigger value="professional">Professional Education</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="space-y-4">
          {challenges.map(challenge => {
             const challengeId = `${challenge.difficulty}-${selectedCategory}-${todayKey}`;
             const isCompleted = userStats.completedChallenges.includes(challengeId);
            return (
                <Card key={challenge.difficulty} className={cn(isCompleted && "bg-muted/50", `border-${challenge.color}-200`)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline capitalize">{challenge.difficulty} Challenge</CardTitle>
                            <CardDescription>Complete a set of {challenge.count} {selectedCategory === 'gen_education' ? 'General' : 'Professional'} Education questions.</CardDescription>
                        </div>
                        {isCompleted && <Badge variant="secondary">Completed</Badge>}
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-between items-center">
                    <div className={`flex items-center gap-1 font-semibold text-${challenge.color}-600`}>
                      <Star className={`h-4 w-4 fill-${challenge.color}-500`} />
                      <span>{challenge.points} Points</span>
                    </div>
                    <Button onClick={() => handleStartChallenge(challenge.difficulty, challenge.count)} disabled={isCompleted}>
                      {isCompleted ? 'Done' : 'Start'}
                    </Button>
                  </CardFooter>
                </Card>
            )
          })}
        </div>
      </section>
    </div>
  );
}
