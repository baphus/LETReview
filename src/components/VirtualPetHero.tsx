'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase/auth/use-user';
import { streakPets, achievementPets, rarePets } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Flame, Trophy, Brain, Stars, Moon, Coffee, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getPetAiMessage } from '@/ai/flows/pet-message-flow';

type PetMood = 'happy' | 'sleepy' | 'stressed' | 'motivated' | 'focused';

interface MoodConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
}

const MOODS: Record<PetMood, MoodConfig> = {
  happy: {
    label: 'Happy',
    icon: <Stars className="h-3 w-3" />,
    color: 'bg-green-500',
  },
  sleepy: {
    label: 'Sleepy',
    icon: <Moon className="h-3 w-3" />,
    color: 'bg-blue-400',
  },
  stressed: {
    label: 'Stressed',
    icon: <Coffee className="h-3 w-3" />,
    color: 'bg-orange-500',
  },
  motivated: {
    label: 'On Fire!',
    icon: <Flame className="h-3 w-3" />,
    color: 'bg-red-500',
  },
  focused: {
    label: 'Focused',
    icon: <Brain className="h-3 w-3" />,
    color: 'bg-purple-500',
  },
};

export function VirtualPetHero() {
  const { user } = useUser();
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const allPets = [...streakPets, ...achievementPets, ...rarePets];

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayStats = user?.dailyProgress?.[todayKey] || {};
  const streak = user?.streak || 0;
  const totalAnswers = user?.questionsAnswered || 0;
  const challengesToday = todayStats.challengesCompleted?.length || 0;

  // Derive Pet Data
  const petProfile = useMemo(() => {
    const active = allPets.find((p) => p.name === user?.activePet);
    return active || allPets[0]; // Fallback to Rocky
  }, [user?.activePet, allPets]);

  const petName = user?.petNames?.[petProfile.name] || petProfile.name;

  // Dynamic Logic for Mood
  const { moodKey, moodConfig } = useMemo(() => {
    let currentMood: PetMood = 'happy';
    if (streak >= 3) currentMood = 'motivated';
    if ((todayStats.questionsAnswered || 0) > 15) currentMood = 'focused';
    if (challengesToday > 2) currentMood = 'stressed';
    if ((todayStats.pomodorosCompleted || 0) === 0 && !todayStats.qotdCompleted) currentMood = 'sleepy';

    return {
      moodKey: currentMood,
      moodConfig: MOODS[currentMood],
    };
  }, [streak, todayStats, challengesToday]);

  // AI Message Generation
  useEffect(() => {
    if (!user) return;

    const fetchAiMessage = async () => {
      setIsGenerating(true);
      try {
        const response = await getPetAiMessage({
          petName,
          userName: user.name,
          mood: moodConfig.label,
          streak,
          todayPoints: todayStats.pointsEarned || 0,
          totalAnswers,
          challengesToday,
        });
        setAiMessage(response.message);
      } catch (error) {
        console.error('Failed to fetch AI message:', error);
        setAiMessage(`Hey ${user.name}! I'm happy to see you studying today.`);
      } finally {
        setIsGenerating(false);
      }
    };

    fetchAiMessage();
  }, [user?.uid, streak, challengesToday, petName, moodConfig.label, todayStats.pointsEarned, totalAnswers]);

  if (!user) return null;

  return (
    <div className="w-full mb-8 space-y-6">
      <div className="flex flex-col items-center gap-6">
        {/* Chat Bubble - Optimized for mobile */}
        <div className="w-full max-w-xs md:max-w-md animate-fade-in-up">
          <div className="relative bg-card border shadow-sm rounded-2xl p-4 text-center min-h-[60px] flex items-center justify-center">
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-sm md:text-base font-medium leading-tight text-foreground">
                "{aiMessage || '...'}"
              </p>
            )}
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-card" />
          </div>
        </div>

        {/* Pet Visual */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className={cn(
              "absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors scale-150",
              moodConfig.color
            )} />
            <Image
              src={petProfile.image}
              alt={petName}
              width={160}
              height={160}
              className="relative animate-bob z-10 p-2 drop-shadow-2xl"
              data-ai-hint={petProfile.hint}
            />
          </div>
          <h2 className="mt-4 text-2xl font-bold font-headline">{petName}</h2>
          <Badge variant="secondary" className={cn("mt-1 gap-1 text-white border-none px-3 py-1", moodConfig.color)}>
            {moodConfig.icon}
            {moodConfig.label}
          </Badge>
        </div>

        {/* Habit Stats - Compact for mobile */}
        <div className="w-full max-w-lg grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
             <Flame className="h-6 w-6 text-destructive mb-1" />
             <span className="text-lg font-bold">{streak}</span>
             <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Streak</span>
          </div>
          <div className="bg-muted/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
             <Trophy className="h-6 w-6 text-accent mb-1" />
             <span className="text-lg font-bold">{todayStats.pointsEarned || 0}</span>
             <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Today</span>
          </div>
          <div className="bg-muted/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
             <Brain className="h-6 w-6 text-primary mb-1" />
             <span className="text-lg font-bold">{todayStats.questionsAnswered || 0}</span>
             <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Answers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
