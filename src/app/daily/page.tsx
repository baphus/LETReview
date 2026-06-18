"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Star, RefreshCcw, Settings2, AlertCircle, CheckCircle2, ArrowRight, Trophy, Zap } from "lucide-react";
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

const challenges = [
  { difficulty: 'easy' as const, count: 5, points: 25, icon: Star, gradient: 'from-green-500 to-emerald-600', bgLight: 'bg-green-50 border-green-100', textColor: 'text-green-700' },
  { difficulty: 'medium' as const, count: 10, points: 75, icon: Zap, gradient: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-50 border-amber-100', textColor: 'text-amber-700' },
  { difficulty: 'hard' as const, count: 15, points: 150, icon: Trophy, gradient: 'from-red-500 to-rose-600', bgLight: 'bg-red-50 border-red-100', textColor: 'text-red-700' },
];

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
  
  if (!user) return null;
  
  const todaysChallenges = user.dailyProgress?.[todayKey]?.challengesCompleted || [];
  const hasSubscriptions = user.subscribedReviewerIds && user.subscribedReviewerIds.length > 0;
  const completedCount = todaysChallenges.length;

  return (
    <div className="container mx-auto max-w-lg space-y-6">
      {/* Streak Status Banner */}
      {challengeCompletedToday && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-800 text-sm">Streak secured for today!</p>
            <p className="text-xs text-green-600">Complete more challenges for extra points.</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0">
            {completedCount}/3
          </Badge>
        </div>
      )}

      {streakBroken && !challengeCompletedToday && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Flame className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm">Your streak was broken</p>
              <p className="text-xs text-amber-600">
                Restore your {user.highestStreak}-day streak for {restoreStreakCost} pts
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" className="w-full" disabled={user.points < restoreStreakCost}>
                <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                Restore Streak ({restoreStreakCost} pts)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore your streak?</AlertDialogTitle>
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
        </div>
      )}

      {/* Question of the Day */}
      <QuestionOfTheDay onCorrectAnswer={() => {}} />

      {/* Daily Challenges Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-headline">Daily Challenges</h2>
            <p className="text-xs text-muted-foreground">Complete a challenge to maintain your streak</p>
          </div>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings2 className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Category Selector */}
        <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as "gened" | "profed" | "majorship")}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gened">General Education</SelectItem>
            <SelectItem value="profed">Professional Education</SelectItem>
            <SelectItem value="majorship">Majorship</SelectItem>
          </SelectContent>
        </Select>

        {/* Challenge Cards */}
        {!hasSubscriptions ? (
          <div className="rounded-xl border-2 border-dashed bg-muted/20 p-8 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold">No Active Subscriptions</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Subscribe to reviewers in your profile to unlock challenges.
              </p>
            </div>
            <Link href="/profile">
              <Button size="sm">Go to Subscriptions</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map(challenge => {
              const challengeId = `${challenge.difficulty}-${selectedCategory}`;
              const isCompleted = todaysChallenges.includes(challengeId);
              const Icon = challenge.icon;

              return (
                <div
                  key={challenge.difficulty}
                  className={cn(
                    "relative rounded-xl border p-4 transition-all",
                    isCompleted ? "bg-muted/30 border-muted" : cn(challenge.bgLight, "hover:shadow-sm")
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      isCompleted ? "bg-muted" : `bg-gradient-to-br ${challenge.gradient}`
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Icon className="h-5 w-5 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          "font-semibold capitalize text-sm",
                          isCompleted && "text-muted-foreground"
                        )}>
                          {challenge.difficulty}
                        </h3>
                        {isCompleted && (
                          <Badge variant="secondary" className="text-[10px] h-5">Done</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {challenge.count} questions &middot; {challenge.points} pts
                      </p>
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      variant={isCompleted ? "ghost" : "default"}
                      className={cn("shrink-0 rounded-lg", isCompleted && "pointer-events-none opacity-50")}
                      onClick={() => handleStartChallenge(challenge.difficulty, challenge.count)}
                      disabled={isCompleted}
                    >
                      {isCompleted ? "Done" : (
                        <>Start <ArrowRight className="h-3.5 w-3.5 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
