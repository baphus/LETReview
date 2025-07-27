
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Shield, Star, Lock, RefreshCcw, HelpCircle } from "lucide-react";
import { pets } from "@/lib/data";
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


interface UserStats {
  streak: number;
  highestStreak: number;
  points: number;
  lastChallengeDate?: string;
  petsUnlocked: number;
}

export default function DailyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 0,
    highestStreak: 0,
    points: 0,
    petsUnlocked: 0,
  });
  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);
  const [streakBroken, setStreakBroken] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"gen_education" | "professional">("gen_education");

  const loadUserStats = () => {
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
      
      setUserStats({
        streak: parsedUser.streak || 0,
        highestStreak: parsedUser.highestStreak || 0,
        points: parsedUser.points || 0,
        lastChallengeDate: parsedUser.lastChallengeDate,
        petsUnlocked: parsedUser.petsUnlocked || 0,
      });
    }
  };

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
  }, []);

  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/?challenge=true&difficulty=${difficulty}&count=${count}&category=${selectedCategory}`);
  };
  
  const restoreStreakCost = Math.min(500, (userStats.highestStreak || 0) * 10);

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
        toast({ title: "Streak Restored!", description: `You spent ${restoreStreakCost} points.`});
      }
    } else {
      toast({ variant: "destructive", title: "Not enough points!", description: `You need ${restoreStreakCost} points to restore your streak.`});
    }
  };

  const challenges = [
    { difficulty: 'easy', count: 5, points: 5, color: 'green' },
    { difficulty: 'medium', count: 10, points: 10, color: 'yellow' },
    { difficulty: 'hard', count: 15, points: 15, color: 'red' },
  ];

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="flex items-center gap-2 mb-6">
        <CalendarDays className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Daily Challenge</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
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
            <h2 className="text-2xl font-bold font-headline">Today's Challenges</h2>
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
          {challenges.map(challenge => (
            <Card key={challenge.difficulty} className={`border-${challenge.color}-200`}>
              <CardHeader>
                <CardTitle className="font-headline capitalize">{challenge.difficulty} Challenge</CardTitle>
                <CardDescription>Complete a set of {challenge.count} {selectedCategory === 'gen_education' ? 'General' : 'Professional'} Education questions.</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between items-center">
                <div className={`flex items-center gap-1 font-semibold text-${challenge.color}-600`}>
                  <Star className={`h-4 w-4 fill-${challenge.color}-500`} />
                  <span>{challenge.points * challenge.count} Points</span>
                </div>
                <Button onClick={() => handleStartChallenge(challenge.difficulty, challenge.count)}>
                  Start
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-bold font-headline mb-4">My Pets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pets.map((pet) => {
            const isUnlocked = userStats.highestStreak >= pet.streak_req;
            return (
              <Card key={pet.name} className="flex flex-col items-center p-4 text-center relative">
                 {isUnlocked ? (
                    <Image 
                        src={pet.image} 
                        alt={pet.name} 
                        width={80} 
                        height={80} 
                        className="rounded-full mb-2"
                        data-ai-hint={pet.hint}
                    />
                 ) : (
                    <div className="w-[80px] h-[80px] rounded-full mb-2 bg-muted flex items-center justify-center">
                        <HelpCircle className="h-10 w-10 text-muted-foreground" />
                    </div>
                 )}
                <p className="font-semibold text-sm">{isUnlocked ? pet.name : '????'}</p>
                {isUnlocked ? (
                  <Badge variant="default" className="mt-1">Unlocked</Badge>
                ) : (
                  <Badge variant="secondary" className="mt-1 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>{pet.unlock_criteria}</span>
                  </Badge>
                )}
              </Card>
            )
          })}
        </div>
      </section>

    </div>
  );
}
