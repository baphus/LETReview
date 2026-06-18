'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from '@/hooks/use-toast';

// XP rewards for different activities
const XP_REWARDS = {
  questionAnswered: 2,
  questionCorrect: 5,
  challengeCompleted: 15,
  pomodoroCompleted: 10,
  streakDay: 8,
  qotdCorrect: 12,
  articleRead: 6,
  quizPassed: 20, // Score >= passing score
  perfectQuiz: 50, // 100% score
} as const;

type XPActivity = keyof typeof XP_REWARDS;

/**
 * Hook to manage pet XP and leveling.
 * 
 * Pet level formula: XP needed = level * 100
 * Level 1 -> 2: 100 XP
 * Level 2 -> 3: 200 XP
 * Level 3 -> 4: 300 XP
 * ...etc
 * 
 * Auto-awards XP by tracking changes to questionsAnswered and completedSessions.
 */
export function usePetXP() {
  const { user, updateUser } = useUser();
  const { toast } = useToast();
  
  // Track previous values to detect changes
  const prevQuestionsRef = useRef<number | null>(null);
  const prevSessionsRef = useRef<number | null>(null);
  const prevChallengesRef = useRef<number | null>(null);

  // Auto-award XP when user stats change
  useEffect(() => {
    if (!user) return;
    
    const currentQuestions = user.questionsAnswered || 0;
    const currentSessions = user.completedSessions || 0;
    const todayKey = new Date().toISOString().split('T')[0];
    const currentChallenges = user.dailyProgress?.[todayKey]?.challengesCompleted?.length || 0;

    // Initialize refs on first load
    if (prevQuestionsRef.current === null) {
      prevQuestionsRef.current = currentQuestions;
      prevSessionsRef.current = currentSessions;
      prevChallengesRef.current = currentChallenges;
      return;
    }

    let xpToAdd = 0;

    // Questions answered
    const questionsDiff = currentQuestions - (prevQuestionsRef.current || 0);
    if (questionsDiff > 0) {
      xpToAdd += questionsDiff * XP_REWARDS.questionAnswered;
    }

    // Pomodoro sessions
    const sessionsDiff = currentSessions - (prevSessionsRef.current || 0);
    if (sessionsDiff > 0) {
      xpToAdd += sessionsDiff * XP_REWARDS.pomodoroCompleted;
    }

    // Challenges completed today
    const challengesDiff = currentChallenges - (prevChallengesRef.current || 0);
    if (challengesDiff > 0) {
      xpToAdd += challengesDiff * XP_REWARDS.challengeCompleted;
    }

    // Update refs
    prevQuestionsRef.current = currentQuestions;
    prevSessionsRef.current = currentSessions;
    prevChallengesRef.current = currentChallenges;

    // Award XP if any earned
    if (xpToAdd > 0) {
      const currentLevel = user.petLevel || 1;
      const currentXP = user.petXP || 0;
      
      let newXP = currentXP + xpToAdd;
      let newLevel = currentLevel;
      let leveledUp = false;

      let xpForNextLevel = currentLevel * 100;
      while (newXP >= xpForNextLevel) {
        newXP -= xpForNextLevel;
        newLevel++;
        leveledUp = true;
        xpForNextLevel = newLevel * 100;
      }

      updateUser({
        petXP: newXP,
        petLevel: newLevel,
      });

      if (leveledUp) {
        const petName = user.petNames?.[user.activePet || ''] || user.activePet || 'Your pet';
        toast({
          title: `${petName} leveled up! 🎉`,
          description: `${petName} is now Level ${newLevel}! Keep studying to grow stronger.`,
          className: "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
        });
      }
    }
  }, [user?.questionsAnswered, user?.completedSessions, user?.dailyProgress]);

  const awardXP = useCallback(async (activity: XPActivity, multiplier: number = 1) => {
    if (!user) return;

    const currentLevel = user.petLevel || 1;
    const currentXP = user.petXP || 0;
    const xpToAdd = XP_REWARDS[activity] * multiplier;
    
    let newXP = currentXP + xpToAdd;
    let newLevel = currentLevel;
    let leveledUp = false;

    let xpForNextLevel = currentLevel * 100;
    while (newXP >= xpForNextLevel) {
      newXP -= xpForNextLevel;
      newLevel++;
      leveledUp = true;
      xpForNextLevel = newLevel * 100;
    }

    await updateUser({
      petXP: newXP,
      petLevel: newLevel,
    });

    if (leveledUp) {
      const petName = user.petNames?.[user.activePet || ''] || user.activePet || 'Your pet';
      toast({
        title: `${petName} leveled up! 🎉`,
        description: `${petName} is now Level ${newLevel}! Keep studying to level up more.`,
        className: "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
      });
    }
  }, [user, updateUser, toast]);

  const getXPForActivity = (activity: XPActivity): number => {
    return XP_REWARDS[activity];
  };

  return {
    awardXP,
    getXPForActivity,
    currentLevel: user?.petLevel || 1,
    currentXP: user?.petXP || 0,
    xpForNextLevel: (user?.petLevel || 1) * 100,
    XP_REWARDS,
  };
}
