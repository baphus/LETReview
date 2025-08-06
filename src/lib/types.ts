
export interface QuizQuestion {
  id: number;
  category: "gen_education" | "professional" | "custom";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
  image?: string; // Optional image URL
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

    