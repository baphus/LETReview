"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Shield, Star, Lock } from "lucide-react";
import { pets } from "@/lib/data";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface UserStats {
  streak: number;
  points: number;
  lastChallengeDate?: string;
}

export default function DailyPage() {
  const router = useRouter();
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 0,
    points: 0,
  });
  const [petsUnlocked, setPetsUnlocked] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("userProfile");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUserStats({
        streak: parsedUser.streak || 0,
        points: parsedUser.points || 0,
        lastChallengeDate: parsedUser.lastChallengeDate,
      });
      setPetsUnlocked(parsedUser.petsUnlocked || 0);
    }
  }, []);

  const today = new Date().toDateString();
  const challengeCompletedToday = userStats.lastChallengeDate === today;

  const handleStartChallenge = (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    router.push(`/?challenge=true&difficulty=${difficulty}&count=${count}`);
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
              Great job! You've completed your challenge for today.
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Today's Challenges</h2>
        <div className="space-y-4">
          {challenges.map(challenge => (
            <Card key={challenge.difficulty} className={`border-${challenge.color}-200`}>
              <CardHeader>
                <CardTitle className="font-headline capitalize">{challenge.difficulty} Challenge</CardTitle>
                <CardDescription>Complete a set of {challenge.count} questions.</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between items-center">
                <div className={`flex items-center gap-1 font-semibold text-${challenge.color}-600`}>
                  <Star className={`h-4 w-4 fill-${challenge.color}-500`} />
                  <span>{challenge.points} Points</span>
                </div>
                <Button onClick={() => handleStartChallenge(challenge.difficulty, challenge.count)} disabled={challengeCompletedToday}>
                  {challengeCompletedToday ? 'Completed' : 'Start'}
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
            const isUnlocked = userStats.streak >= pet.streak_req;
            return (
              <Card key={pet.name} className="flex flex-col items-center p-4 text-center relative">
                 <Image 
                  src={pet.image} 
                  alt={pet.name} 
                  width={80} 
                  height={80} 
                  className={`rounded-full mb-2 transition-all ${!isUnlocked && 'grayscale'}`}
                  data-ai-hint={pet.hint}
                />
                <p className="font-semibold text-sm">{pet.name}</p>
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
