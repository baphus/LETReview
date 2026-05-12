
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase/auth/use-user';
import { streakPets, achievementPets, rarePets } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Flame, Zap, Trophy, Brain, Coffee, Moon, Stars } from 'lucide-react';
import { format } from 'date-fns';

type PetMood = 'happy' | 'sleepy' | 'stressed' | 'motivated' | 'focused';

interface MoodConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  messages: string[];
}

const MOODS: Record<PetMood, MoodConfig> = {
  happy: {
    label: 'Happy',
    icon: <Stars className="h-3 w-3" />,
    color: 'bg-green-500',
    messages: [
      "You're doing great! Keep it up!",
      "I love seeing you study!",
      "Feeling good today, are you?",
    ],
  },
  sleepy: {
    label: 'Sleepy',
    icon: <Moon className="h-3 w-3" />,
    color: 'bg-blue-400',
    messages: [
      "Is it study time yet? *yawn*",
      "I'm ready for a nap...",
      "Wake me up when we start reviewing.",
    ],
  },
  stressed: {
    label: 'Stressed',
    icon: <Coffee className="h-3 w-3" />,
    color: 'bg-orange-500',
    messages: [
      "That's a lot of questions! Take a breath.",
      "Don't let the exam scare you!",
      "Maybe a short break?",
    ],
  },
  motivated: {
    label: 'On Fire!',
    icon: <Flame className="h-3 w-3" />,
    color: 'bg-red-500',
    messages: [
      "UNSTOPPABLE! Let's crush this LET!",
      "Look at that streak go!",
      "You're making this look easy!",
    ],
  },
  focused: {
    label: 'Focused',
    icon: <Brain className="h-3 w-3" />,
    color: 'bg-purple-500',
    messages: [
      "Shhh, I'm analyzing the data...",
      "Absolute focus mode engaged.",
      "Every minute counts towards that LPT title.",
    ],
  },
};

export function VirtualPetHero() {
  const { user } = useUser();
  const allPets = [...streakPets, ...achievementPets, ...rarePets];

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayStats = user?.dailyProgress?.[todayKey] || {};
  const points = user?.points || 0;
  const streak = user?.streak || 0;

  // Derive Pet Data
  const petProfile = useMemo(() => {
    const active = allPets.find((p) => p.name === user?.activePet);
    return active || allPets[0]; // Fallback to Rocky
  }, [user?.activePet, allPets]);

  const petName = user?.petNames?.[petProfile.name] || petProfile.name;

  // Dynamic Logic for Mood, XP, and Level
  const { mood, level, xpProgress, energy } = useMemo(() => {
    // 1. Calculate Level (Simple log growth)
    const currentLevel = Math.floor(Math.sqrt(points / 20)) + 1;
    const nextLevelXP = Math.pow(currentLevel, 2) * 20;
    const prevLevelXP = Math.pow(currentLevel - 1, 2) * 20;
    const currentLevelXP = points - prevLevelXP;
    const totalLevelXPNeeded = nextLevelXP - prevLevelXP;
    const xpPercent = Math.min((currentLevelXP / totalLevelXPNeeded) * 100, 100);

    // 2. Calculate Energy
    // Max 100. Gains 20 per Pomodoro. Loses 5 per challenge. 
    // For MVP, we base it on today's session frequency
    const focusEnergy = Math.min((todayStats.pomodorosCompleted || 0) * 25 + 50, 100);
    const activityEnergy = Math.max(focusEnergy - (todayStats.challengesCompleted?.length || 0) * 10, 20);

    // 3. Determine Mood
    let currentMood: PetMood = 'happy';
    if (streak >= 3) currentMood = 'motivated';
    if ((todayStats.questionsAnswered || 0) > 15) currentMood = 'focused';
    if ((todayStats.challengesCompleted?.length || 0) > 2) currentMood = 'stressed';
    if ((todayStats.pomodorosCompleted || 0) === 0 && !todayStats.qotdCompleted) currentMood = 'sleepy';

    return {
      mood: MOODS[currentMood],
      level: currentLevel,
      xpProgress: xpPercent,
      energy: activityEnergy,
    };
  }, [points, streak, todayStats]);

  const randomMessage = useMemo(() => {
    return mood.messages[Math.floor(Math.random() * mood.messages.length)];
  }, [mood]);

  if (!user) return null;

  return (
    <div className="w-full mb-8 space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Left: Pet Visual & Bubble */}
        <div className="relative flex flex-col items-center group">
          {/* Chat Bubble */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none md:opacity-100 md:static md:translate-x-0 md:mb-4 md:w-56">
            <div className="relative bg-card border shadow-sm rounded-2xl p-3 text-center">
              <p className="text-sm font-medium leading-tight">
                "{randomMessage}"
              </p>
              {/* Triangle pointer */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-card" />
            </div>
          </div>

          <div className="relative">
            <div className={cn(
              "absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors",
              mood.color
            )} />
            <Image
              src={petProfile.image}
              alt={petName}
              width={140}
              height={140}
              className="relative animate-bob z-10 p-2 drop-shadow-xl"
              data-ai-hint={petProfile.hint}
            />
          </div>
          <h2 className="mt-2 text-2xl font-bold font-headline">{petName}</h2>
          <Badge variant="secondary" className={cn("mt-1 gap-1 text-white border-none", mood.color)}>
            {mood.icon}
            {mood.label}
          </Badge>
        </div>

        {/* Right: Stats Overview */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Level Card */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progression</p>
                  <p className="text-lg font-bold">Level {level}</p>
                </div>
                <p className="text-xs font-medium text-muted-foreground">{Math.round(xpProgress)}% to next level</p>
              </div>
              <Progress value={xpProgress} className="h-2.5 bg-muted" />
            </CardContent>
          </Card>

          {/* Energy Card */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Condition</p>
                  <div className="flex items-center gap-1.5">
                    <Zap className={cn("h-4 w-4", energy < 30 ? "text-destructive" : "text-yellow-500")} />
                    <p className="text-lg font-bold">Energy: {Math.round(energy)}%</p>
                  </div>
                </div>
              </div>
              <Progress 
                value={energy} 
                className="h-2.5 bg-muted" 
                style={{
                   // @ts-ignore - dynamic primary color override for low energy
                   '--progress-background': energy < 30 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' 
                }}
              />
            </CardContent>
          </Card>

          {/* Habit Stats */}
          <div className="sm:col-span-2 grid grid-cols-3 gap-2">
            <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
               <Flame className="h-5 w-5 text-destructive mb-1" />
               <span className="text-sm font-bold">{streak}</span>
               <span className="text-[10px] uppercase text-muted-foreground">Streak</span>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
               <Trophy className="h-5 w-5 text-accent mb-1" />
               <span className="text-sm font-bold">{todayStats.pointsEarned || 0}</span>
               <span className="text-[10px] uppercase text-muted-foreground">Daily Pts</span>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center justify-center text-center">
               <Brain className="h-5 w-5 text-primary mb-1" />
               <span className="text-sm font-bold">{todayStats.questionsAnswered || 0}</span>
               <span className="text-[10px] uppercase text-muted-foreground">Answers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
