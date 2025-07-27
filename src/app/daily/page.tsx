"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Flame, Gem, Shield, Star } from "lucide-react";
import { pets } from "@/lib/data";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export default function DailyPage() {
  const userStats = {
    streak: 6,
    points: 125,
    streakBroken: true,
  };

  const unlockedPets = pets.slice(0, 2); // User unlocked rock and fish

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

      {userStats.streakBroken && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 font-headline">
              <Shield />
              Streak Recovery
            </CardTitle>
            <CardDescription className="text-amber-700">You lost your streak! Restore it to keep your progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-amber-500 hover:bg-amber-600">
              Use 25 Points to Recover
            </Button>
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Today's Challenges</h2>
        <div className="space-y-4">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="font-headline">Easy Challenge</CardTitle>
              <CardDescription>Complete a set of 5 questions.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center gap-1 font-semibold text-accent">
                <Star className="h-4 w-4 fill-accent" />
                <span>5 Points</span>
              </div>
              <Button>Start</Button>
            </CardFooter>
          </Card>
           <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="font-headline">Medium Challenge</CardTitle>
              <CardDescription>Complete a set of 10 questions.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
               <div className="flex items-center gap-1 font-semibold text-yellow-600">
                <Star className="h-4 w-4 fill-yellow-500" />
                <span>10 Points</span>
              </div>
              <Button>Start</Button>
            </CardFooter>
          </Card>
           <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="font-headline">Hard Challenge</CardTitle>
              <CardDescription>Complete a set of 15 questions.</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between items-center">
                <div className="flex items-center gap-1 font-semibold text-red-600">
                    <Star className="h-4 w-4 fill-red-500" />
                    <span>15 Points</span>
                </div>
              <Button>Start</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-bold font-headline mb-4">My Pets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pets.map((pet) => (
            <Card key={pet.name} className="flex flex-col items-center p-4 text-center">
              <Image 
                src={pet.image} 
                alt={pet.name} 
                width={80} 
                height={80} 
                className="rounded-full mb-2"
                data-ai-hint={pet.hint}
              />
              <p className="font-semibold text-sm">{pet.name}</p>
              <Badge variant={unlockedPets.some(p => p.name === pet.name) ? "default" : "secondary" } className="mt-1">
                {unlockedPets.some(p => p.name === pet.name) ? "Unlocked" : "Locked"}
              </Badge>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}
