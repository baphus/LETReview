
export interface QuizQuestion {
  id: number;
  category: "gen_education" | "professional";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  choices: string[];
  answer: string;
  explanation?: string;
}

export interface Pet {
  name: string;
  unlock_criteria: string;
  streak_req: number;
  image: string;
  hint: string;
}
