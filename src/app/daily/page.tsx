
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Star, RefreshCcw, Settings2, AlertCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { startOfDay, isBefore, startOfYesterday, format } from 'date-fns';
import { useUser } from "@/firebase/auth/use-user";
import { QuestionOfTheDay } from "@/components/QuestionOfTheDay";
import Link from "next/link";

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export default function DailyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, updateUser } = useUser();

  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'gened' | 'profed' | 'majorship'>("gened");
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
                updateUser({ streak: 0 });
            } else {
                setStreakBroken(false);
            }
        }
    }
  }, [user, todayKey, updateUser]);


  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/reviewer/questions?challenge=true&difficulty=${difficulty}&count=${count}&category=${selectedCategory}`);
  };
  
  const restoreStreakCost = Math.min(250, (user?.highestStreak || 0) * 10);

  const handleRestoreStreak = async () => {
     if (user && user.points >= restoreStreakCost) {
        updateUser({
            points: user.points - restoreStreakCost,
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
      return null; 
  }
  
  const todaysChallenges = user.dailyProgress?.[todayKey]?.challengesCompleted || [];
  const hasSubscriptions = user.subscribedReviewerIds && user.subscribedReviewerIds.length > 0;

  const challenges = [
    { difficulty: 'easy', count: 5, points: 25, color: 'green' },
    { difficulty: 'medium', count: 10, points: 75, color: 'yellow' },
    { difficulty: 'hard', count: 15, points: 150, color: 'red' },
  ];

  const getCategoryName = (category: 'gened' | 'profed' | 'majorship') => {
      switch (category) {
          case 'gened': return 'General Education';
          case 'profed': return 'Professional Education';
          case 'majorship': return 'Majorship';
      }
  }

  return (
    <div className="container mx-auto max-w-2xl">
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
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-headline">Daily Challenges</h2>
                <Link href="/profile">
                    <Button variant="outline" size="sm">
                        <Settings2 className="mr-2 h-4 w-4" /> Manage
                    </Button>
                </Link>
            </div>
             <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as "gened" | "profed" | "majorship")}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="gened">General Education</SelectItem>
                    <SelectItem value="profed">Professional Education</SelectItem>
                    <SelectItem value="majorship">Majorship</SelectItem>
                </SelectContent>
            </Select>
        </div>

        {!hasSubscriptions ? (
            <Card className="border-dashed border-2 bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                    <div className="space-y-1">
                        <p className="font-semibold text-lg">No Active Subscriptions</p>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Subscribe to study articles in your profile to unlock daily challenges for this category.
                        </p>
                    </div>
                    <Link href="/profile">
                        <Button>Go to Subscriptions</Button>
                    </Link>
                </CardContent>
            </Card>
        ) : (
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
                                <CardDescription>Complete a set of {challenge.count} {getCategoryName(selectedCategory)} questions.</CardDescription>
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
        )}
      </section>
    </div>
  );
}
