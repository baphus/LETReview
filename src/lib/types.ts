export interface Question {
  id: number;
  category: "gen_education" | "professional";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  answer: string;
  explanation?: string;
}

export interface Pet {
  name: string;
  unlock_criteria: string;
  points: number;
  image: string;
  hint: string;
}
