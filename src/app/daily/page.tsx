
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Star, RefreshCcw, CheckCircle, XCircle } from "lucide-react";
import { getQuestionOfTheDay } from "@/lib/data";
import type { QuizQuestion, DailyProgress } from "@/lib/types";
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
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

const QuestionOfTheDay = ({ onCorrectAnswer }: { onCorrectAnswer: () => void }) => {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const [question, setQuestion] = useState<QuizQuestion | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        setIsLoading(true);
        getQuestionOfTheDay().then(qotd => {
            setQuestion(qotd);
            if(user){
                const todayKey = getTodayKey();
                const todaysProgress = user.dailyProgress?.[todayKey];

                if(todaysProgress?.qotdCompleted){
                    setIsAnswered(true);
                    const previousAnswer = todaysProgress.qotdAnswer;
                    if (previousAnswer) {
                        setSelectedAnswer(previousAnswer);
                        setIsCorrect(previousAnswer === qotd.answer);
                    }
                }
            }
            setIsLoading(false);
        });
    }, [user]);

    const handleAnswer = async (answer: string) => {
        if (isAnswered || !user || !firestore || !question) return;

        const correct = answer === question.answer;
        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setIsAnswered(true);

        const todayKey = getTodayKey();
        const userRef = doc(firestore, "users", user.uid);
        
        const dailyProgressUpdate = {
            [`dailyProgress.${todayKey}.qotdCompleted`]: true,
            [`dailyProgress.${todayKey}.qotdAnswer`]: answer,
        };

        if (correct) {
            await updateDoc(userRef, {
                ...dailyProgressUpdate,
                points: increment(5),
                [`dailyProgress.${todayKey}.pointsEarned`]: increment(5)
            });
            onCorrectAnswer();
            toast({ title: "Correct!", description: "You earned 5 points!", className: "bg-green-100 border-green-300" });
        } else {
            await updateDoc(userRef, dailyProgressUpdate);
            toast({ variant: "destructive", title: "Incorrect", description: "Better luck tomorrow!" });
        }
    };

    if (isLoading) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Question of the Day</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Loading...</p>
                </CardContent>
            </Card>
        )
    }

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
  const { user } = useUser();
  const firestore = useFirestore();

  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"gen_education" | "professional">("gen_education");
  const todayKey = getTodayKey();

  useEffect(() => {
    if (user) {
        const todaysChallenges = user.dailyProgress?.[todayKey]?.challengesCompleted || [];
        setChallengeCompletedToday(todaysChallenges.length > 0);
        
        const lastChallengeDateString = user.lastChallengeDate;
        if (lastChallengeDateString) {
            const lastChallengeDate = startOfDay(new Date(lastChallengeDateString));
            const yesterday = startOfYesterday();

            if (user.streak > 0 && isBefore(lastChallengeDate, yesterday)) {
                setStreakBroken(true);
                if (firestore) {
                    const userRef = doc(firestore, "users", user.uid);
                    updateDoc(userRef, { streak: 0 });
                }
            } else {
                setStreakBroken(false);
            }
        }
    }
  }, [user, firestore, todayKey]);


  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/review?challenge=true&difficulty=${difficulty}&count=${count}&category=${selectedCategory}`);
  };
  
  const restoreStreakCost = Math.min(250, (user?.highestStreak || 0) * 10);

  const handleRestoreStreak = async () => {
     if (user && firestore && user.points >= restoreStreakCost) {
        const userRef = doc(firestore, "users", user.uid);
        await updateDoc(userRef, {
            points: increment(-restoreStreakCost),
            streak: user.highestStreak
        });
        setStreakBroken(false);
        toast({
          title: "Streak Restored!",
          description: `You spent ${restoreStreakCost} points.`,
          className: "bg-green-100 border-green-300"
        });
    } else {
      toast({ variant: "destructive", title: "Not enough points!", description: `You need ${restoreStreakCost} points to restore your streak.`});
    }
  };
  
  if (!user) {
      return null; // Or a loading spinner
  }
  
  const todaysChallenges = user.dailyProgress?.[todayKey]?.challengesCompleted || [];

  const challenges = [
    { difficulty: 'easy', count: 5, points: 25, color: 'green' },
    { difficulty: 'medium', count: 10, points: 75, color: 'yellow' },
    { difficulty: 'hard', count: 15, points: 150, color: 'red' },
  ];

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
            <p className="text-3xl font-bold">{user.streak} Days</p>
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
            <p className="text-3xl font-bold">{user.points}</p>
          </CardContent>
        </Card>
      </div>

      <QuestionOfTheDay onCorrectAnswer={() => {}} />

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
              Restore your {user.highestStreak}-day streak for {restoreStreakCost} points or start a new challenge.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={user.points < restoreStreakCost}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Restore Streak ({restoreStreakCost} points)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will cost {restoreStreakCost} points and restore your streak to {user.highestStreak} days.
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
             const challengeId = `${challenge.difficulty}-${selectedCategory}`;
             const isCompleted = todaysChallenges.includes(challengeId);
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

    