
export interface QuizQuestion {
  id: number;
  category: "gen_education" | "professional" | "custom";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
  image?: string; // Optional image URL or base64 data URI
}

export type QuizQuestionForm = Omit<QuizQuestion, 'id' | 'category'> & {
    id?: number;
};


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

export interface QuestionBank {
    id: string;
    name: string;
    questions: QuizQuestion[];
    examDate?: string;
    passingScore?: number;
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
    lastChallengeDate?: string;
}

export interface UserProfile {
     uid: string;
     name: string;
     avatarUrl: string;
     themeMode: 'light' | 'dark';
     activeBankId: string;
     banks: QuestionBank[];
     lastLogin: string;
}
