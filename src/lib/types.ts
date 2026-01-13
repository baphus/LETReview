
import { FieldValue } from 'firebase/firestore';

export interface QuizQuestion {
  id: number;
  category: "gen_education" | "professional";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
}

export interface PetProfile {
  name: string;
  unlock_criteria: string;
  streak_req: number;
  image: string;
  hint: string;
  unlock_value?: number;
  cost?: number;
}

export interface DailyProgress {
    qotdCompleted?: boolean;
    qotdAnswer?: string;
    challengesCompleted?: string[];
    pomodorosCompleted?: number;
    pointsEarned?: number;
}

export interface UserProfile {
    uid: string;
    name: string;
    avatarUrl: string;
    email: string;
    examDate?: string;
    points: number;
    streak: number;
    highestStreak: number;
    highestQuizStreak: number;
    completedSessions: number;
    unlockedThemes: string[];
    unlockedPets: string[];
    activeTheme: string;
    petNames: Record<string, string>;
    dailyProgress: Record<string, DailyProgress>;
    lastLogin: string;
    lastChallengeDate?: string;
    passingScore?: number;
    createdAt?: FieldValue;
}
