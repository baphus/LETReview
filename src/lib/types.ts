
import { FieldValue } from 'firebase/firestore';

export interface QuizQuestion {
  id: string; // Changed from number to string for Firestore
  category: "gened" | "profed" | "majorship";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
}

export type ReviewArticleType = "Article" | "Video" | "Mixed";

export interface ReviewArticle {
    slug: string;
    title: string;
    category: "gened" | "profed" | "majorship";
    description: string;
    type: ReviewArticleType;
    readingTime: number; // in minutes
    difficulty: "easy" | "medium" | "hard";
    content?: string;
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
    questionsAnswered?: number;
    answeredQuestionIds?: string[];
}
