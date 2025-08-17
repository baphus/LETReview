
import type { QuizQuestion, PetProfile, QuestionBank, UserProfile } from "./types";
import { format } from 'date-fns';

// This file now contains only placeholder data.
// The main source of questions will be from local storage.
export const sampleQuestions: QuizQuestion[] = [
  {
    id: 1,
    category: "custom",
    difficulty: "easy",
    question: "This is a sample question. Add your own questions in the profile page!",
    choices: ["Correct Answer", "Wrong Answer 1", "Wrong Answer 2", "Wrong Answer 3"],
    answer: "Correct Answer",
    explanation: "This is a sample explanation for the sample question."
  },
  {
    id: 2,
    category: "custom",
    difficulty: "easy",
    question: "What is the capital of France?",
    choices: ["Paris", "London", "Berlin", "Madrid"],
    answer: "Paris",
    explanation: "Paris is the capital and most populous city of France."
  },
  {
    id: 3,
    category: "custom",
    difficulty: "medium",
    question: "Which planet is known as the Red Planet?",
    choices: ["Earth", "Mars", "Jupiter", "Saturn"],
    answer: "Mars",
    explanation: "Mars is often called the 'Red Planet' because of its reddish appearance."
  },
  {
    id: 4,
    category: "custom",
    difficulty: "hard",
    question: "Who wrote 'To Kill a Mockingbird'?",
    choices: ["Harper Lee", "J.K. Rowling", "Ernest Hemingway", "Mark Twain"],
    answer: "Harper Lee",
    explanation: "The novel was published in 1960 and was an immediate success."
  },
  {
    id: 5,
    category: "custom",
    difficulty: "easy",
    question: "What is 2 + 2?",
    choices: ["3", "4", "5", "6"],
    answer: "4",
    explanation: "Basic arithmetic."
  }
];


// ---- NEW BANK-AWARE DATA FUNCTIONS ----

const getTodayKey = () => format(new Date(), 'yyyy-MM-dd');

export const createNewBank = (name: string): QuestionBank => ({
    id: `bank_${Date.now()}`,
    name,
    questions: [...sampleQuestions.map((q, i) => ({ ...q, id: Date.now() + i }))],
    points: 0,
    streak: 0,
    highestStreak: 0,
    highestQuizStreak: 0,
    completedSessions: 0,
    unlockedThemes: ['default'],
    activeTheme: 'default',
    unlockedPets: [],
    petNames: {},
    passingScore: 75,
    dailyProgress: {},
});

export const loadUserProfile = (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    const uid = localStorage.getItem('currentUser');
    if (!uid) return null;

    const savedProfile = localStorage.getItem(`userProfile_${uid}`);
    if (savedProfile) {
        return JSON.parse(savedProfile);
    }
    return null;
}

export const saveUserProfile = (profile: UserProfile) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`userProfile_${profile.uid}`, JSON.stringify(profile));
    window.dispatchEvent(new Event('storage'));
};


export const getActiveBank = (): QuestionBank | null => {
    const profile = loadUserProfile();
    if (!profile) return null;
    return profile.banks.find(b => b.id === profile.activeBankId) || null;
}

export const saveActiveBank = (bank: QuestionBank) => {
    const profile = loadUserProfile();
    if (!profile) return;
    
    const bankIndex = profile.banks.findIndex(b => b.id === bank.id);
    if (bankIndex !== -1) {
        profile.banks[bankIndex] = bank;
        saveUserProfile(profile);
    }
}


// Function to load questions from the active bank
export const loadQuestions = (): QuizQuestion[] => {
  const activeBank = getActiveBank();
  return activeBank?.questions || [];
};

// Function to save questions to the active bank
export const saveQuestions = (questions: QuizQuestion[]) => {
  const activeBank = getActiveBank();
  if (activeBank) {
    activeBank.questions = questions;
    saveActiveBank(activeBank);
  }
};


// Function to generate a seed from a string (e.g., today's date)
const getSeed = (str: string) => {
  let h = 1779033703, i = 0;
  for (i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
};

const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

export const getQuestionForDate = (date: Date): QuizQuestion => {
    const questions = loadQuestions();
    if (questions.length === 0) return sampleQuestions[0];
    const dayOfYear = getDayOfYear(date);
    const index = dayOfYear % questions.length;
    const question = { ...questions[index] };

    // Deterministically shuffle choices so they are not always in the same order
    const dateString = date.toDateString();
    const rng = getSeed(dateString + question.id);
    question.choices = [...question.choices].sort(() => rng() - rng());

    return question;
}

export const getQuestionOfTheDay = (): QuizQuestion => {
    return getQuestionForDate(new Date());
};

export const pets: PetProfile[] = [
    {
        name: "Rocky",
        unlock_criteria: "1-day streak",
        streak_req: 1,
        image: "/pets/rocky.png",
        hint: "very hard"
    },
    {
        name: "Whiskers",
        unlock_criteria: "3-day streak",
        streak_req: 3,
        image: "/pets/whiskers.png",
        hint: "Jerry's worst enemy"
    },
    {
        name: "Goldie",
        unlock_criteria: "7-day streak",
        streak_req: 7,
        image: "/pets/goldie.png",
        hint: "Bloop bloop"
    },
    {
        name: "Sonic",
        unlock_criteria: "14-day streak",
        streak_req: 14,
        image: "/pets/sonic.png",
        hint: "Outran the rabbit"
    },
     {
        name: "Feathers",
        unlock_criteria: "30-day streak",
        streak_req: 30,
        image: "/pets/feathers.png",
        hint: "Higher and higher"
    },
    {
        name: "Hoppy",
        unlock_criteria: "50-day streak",
        streak_req: 50,
        image: "/pets/hoppy.png",
        hint: "Hop-hop"
    },
     {
        name: "Spike",
        unlock_criteria: "75-day streak",
        streak_req: 75,
        image: "/pets/spike.png",
        hint: "They see me rollin'"
    },
    {
        name: "Phoenix",
        unlock_criteria: "100-day streak",
        streak_req: 100,
        image: "/pets/phoenix.png",
        hint: "Mythical"
    },
];

export const achievementPets: PetProfile[] = [
    {
        name: "Owlbert",
        unlock_criteria: "Complete 10 Pomodoro sessions",
        unlock_value: 10,
        streak_req: 0,
        image: "/pets/owlbert.png",
        hint: "wise choice",
    },
    {
        name: "Einstein",
        unlock_criteria: "Complete 50 Pomodoro sessions",
        unlock_value: 50,
        streak_req: 0,
        image: "/pets/einstein.png",
        hint: "E=mc^2",
    },
    {
        name: "Sparky",
        unlock_criteria: "Get a quiz streak of 10",
        unlock_value: 10,
        streak_req: 0,
        image: "/pets/sparky.png",
        hint: "electric",
    },
    {
        name: "Bolt",
        unlock_criteria: "Get a quiz streak of 25",
        unlock_value: 25,
        streak_req: 0,
        image: "/pets/bolt.png",
        hint: "lightning fast",
    },
]

export const rarePets: PetProfile[] = [
    { name: "Draco", unlock_criteria: "Purchase in store", cost: 1000, image: "/pets/draco.png", hint: "fire breathing", streak_req: 0 },
];
