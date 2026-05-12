
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase/auth/use-user';
import { streakPets, achievementPets, rarePets } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Flame, Trophy, Brain, Stars, Moon, Coffee } from 'lucide-react';
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
      "Education is the most powerful weapon! Let's go!",
      "You make this look easy!",
      "Why did the teacher wear sunglasses? Because the class was so bright!",
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
      "ZZZ... oh! I was just visualizing our success.",
      "Even a future LPT needs their beauty sleep.",
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
      "Deep breaths. One Republic Act at a time.",
      "Even the best teachers started where you are.",
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
      "Future LPT in the building!",
      "Your brain is basically a supercomputer right now.",
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
      "I can practically see the neural pathways forming.",
    ],
  },
};

export function VirtualPetHero() {
  const { user } = useUser();
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
  const { mood } = useMemo(() => {
    let currentMood: PetMood = 'happy';
    if (streak >= 3) currentMood = 'motivated';
    if ((todayStats.questionsAnswered || 0) > 15) currentMood = 'focused';
    if (challengesToday > 2) currentMood = 'stressed';
    if ((todayStats.pomodorosCompleted || 0) === 0 && !todayStats.qotdCompleted) currentMood = 'sleepy';

    return {
      mood: MOODS[currentMood],
    };
  }, [streak, todayStats, challengesToday]);

  const performanceRemarks = useMemo(() => {
    if (!user) return [];
    const remarks: string[] = [
      `Welcome back, ${user.name}! Ready to ace the LET?`,
      `Great to see you again, Teacher ${user.name}!`,
    ];

    // Streak Milestones
    if (streak === 0) {
      remarks.push("Let's start a new streak today! I believe in you.");
    } else if (streak === 1) {
      remarks.push("Day 1 of our new journey! The first step is the most important.");
    } else if (streak === 3) {
      remarks.push("3 days in a row! You're building a solid study habit.");
    } else if (streak >= 7 && streak < 14) {
      remarks.push(`${streak} days! You're officially a consistent reviewer!`);
    } else if (streak >= 30) {
      remarks.push(`A whole month of studying! ${streak} days is legendary!`);
    }

    // Daily Challenge Remarks
    if (challengesToday === 1) {
      remarks.push("First challenge of the day done! Keep that momentum.");
    } else if (challengesToday >= 3) {
      remarks.push(`Wow, ${challengesToday} challenges today? You're absolutely unstoppable!`);
    }
    
    if (todayStats.qotdCompleted) {
        remarks.push("You've already tackled the Question of the Day. Smart move!");
    }

    // Total Answer Milestones
    if (totalAnswers >= 1000) {
        remarks.push(`1,000+ questions answered! You're basically a human encyclopedia.`);
    } else if (totalAnswers >= 500) {
        remarks.push(`500 questions! You're halfway to becoming a master.`);
    } else if (totalAnswers >= 100) {
        remarks.push(`100+ questions answered! That's serious progress.`);
    }

    // Historical Comparisons
    if (user.highestStreak > streak && streak > 0) {
        remarks.push(`Our record is ${user.highestStreak} days. We can beat it together!`);
    }

    return remarks;
  }, [user, streak, totalAnswers, challengesToday, todayStats.qotdCompleted]);

  const randomMessage = useMemo(() => {
    // Give performance-based messages a high priority (70% chance if available)
    const useRemark = performanceRemarks.length > 0 && Math.random() > 0.3;
    const pool = useRemark ? performanceRemarks : mood.messages;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [mood, performanceRemarks]);

  if (!user) return null;

  return (
    <div className="w-full mb-8 space-y-6">
      <div className="flex flex-col items-center gap-6">
        {/* Chat Bubble - Optimized for mobile */}
        <div className="w-full max-w-xs md:max-w-md animate-fade-in-up">
          <div className="relative bg-card border shadow-sm rounded-2xl p-4 text-center">
            <p className="text-sm md:text-base font-medium leading-tight text-foreground">
              "{randomMessage}"
            </p>
            {/* Triangle pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-card" />
          </div>
        </div>

        {/* Pet Visual */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className={cn(
              "absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors scale-150",
              mood.color
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
          <Badge variant="secondary" className={cn("mt-1 gap-1 text-white border-none px-3 py-1", mood.color)}>
            {mood.icon}
            {mood.label}
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
