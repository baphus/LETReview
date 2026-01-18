
import { FieldValue } from 'firebase/firestore';

export interface Subject {
  id: string;
  categoryId: 'gened' | 'profed' | 'majorship';
  name: string;
  slug: string;
  color: string;
  orderIndex: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  slug: string;
}

export interface Reviewer {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentFormat: 'markdown';
  category: 'gened' | 'profed' | 'majorship';
  subjectId: string;
  topicIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  reviewerType: 'article' | 'video' | 'mixed';
  estimatedTime: number;
  status: 'draft' | 'published' | 'archived';
  orderIndex: number;
  createdBy?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id: string;
  subjectId?: string;
  topicIds?: string[];
  category: "gened" | "profed" | "majorship";
  difficulty: "easy" | "medium" | "hard";
  type?: "multiple_choice";
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation?: string;
  reviewerIds?: string[];
}


export interface ReviewerProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  lastReadPosition: number;
  updatedAt: string;
}

export interface ReviewerBookmark {
  createdAt: string;
}

// Keeping existing types that are not directly replaced
export type ReviewArticleType = "Article" | "Video" | "Mixed";
export interface ReviewArticle extends Reviewer {} // for backwards compatibility in other files

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

export interface TopicQuizProgress {
  scores: number[];
  highestScore: number;
  averageScore: number;
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
    quizProgress?: Record<string, TopicQuizProgress>;
}
