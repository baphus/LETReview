import { getFirestore, collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { QuizQuestion, PetProfile } from "./types";
import staticQuestions from './seeds/questions-seed.json';

const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

const getSeed = (str: string): (() => number) => {
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


export const getQuestionForDate = async (date: Date): Promise<QuizQuestion> => {
    const { firestore } = initializeFirebase();
    const dayOfYear = getDayOfYear(date);
    const category = (dayOfYear % 2 === 0) ? 'gened' : 'profed';
    
    let questionsInCategory: QuizQuestion[] = [];
    
    try {
        const questionsRef = collection(firestore, 'questions');
        const q = query(questionsRef, where('category', '==', category));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            questionsInCategory = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizQuestion));
        } else {
            questionsInCategory = staticQuestions.filter(q => (q as QuizQuestion).category === category) as QuizQuestion[];
        }
    } catch (e) {
        console.error("Error fetching QOTD from Firestore, using fallback", e);
        questionsInCategory = staticQuestions.filter(q => (q as QuizQuestion).category === category) as QuizQuestion[];
    }


    if (questionsInCategory.length === 0) {
        // Ultimate fallback
        return staticQuestions[0] as QuizQuestion;
    }

    const questionIndex = dayOfYear % questionsInCategory.length;
    const question = questionsInCategory[questionIndex];

    const dateString = date.toDateString();
    const rng = getSeed(dateString + question.id);
    question.choices = [...question.choices].sort(() => rng() - rng());

    return question;
}

export const getQuestionOfTheDay = async (): Promise<QuizQuestion> => {
    return getQuestionForDate(new Date());
};

export const getQuestions = async (options: {
    category?: 'gened' | 'profed' | 'majorship';
    difficulty?: 'easy' | 'medium' | 'hard';
    limit?: number;
    shuffle?: boolean;
    topicId?: string;
}): Promise<QuizQuestion[]> => {
    const { firestore } = initializeFirebase();
    
    let fetchedQuestions: QuizQuestion[] = [];
    let fromFallback = false;

    try {
        const questionsRef = collection(firestore, 'questions');
        const queryConstraints = [];
        if (options.category) {
            queryConstraints.push(where('category', '==', options.category));
        }
        if (options.difficulty) {
            queryConstraints.push(where('difficulty', '==', options.difficulty));
        }
        if (options.topicId) {
            queryConstraints.push(where('topicIds', 'array-contains', options.topicId));
        }
        
        const q = query(questionsRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            fetchedQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizQuestion));
        } else {
             fetchedQuestions = staticQuestions as QuizQuestion[];
             fromFallback = true;
        }

    } catch (e) {
        console.error("Error fetching questions from firestore, using fallback", e);
        fetchedQuestions = staticQuestions as QuizQuestion[];
        fromFallback = true;
    }
    
    let filteredQuestions = fetchedQuestions;

    // If we used fallback, we need to apply filters manually
    if (fromFallback) {
        if (options.category) {
            filteredQuestions = filteredQuestions.filter(q => q.category === options.category);
        }
        if (options.difficulty) {
            filteredQuestions = filteredQuestions.filter(q => q.difficulty === options.difficulty);
        }
        if (options.topicId) {
            filteredQuestions = filteredQuestions.filter(q => q.topicIds?.includes(options.topicId as string));
        }
    }
    
    if (options.shuffle) {
        filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    if (options.limit) {
        filteredQuestions = filteredQuestions.slice(0, options.limit);
    }

    // Shuffle choices for each question
    filteredQuestions.forEach(question => {
        if(question.choices) {
            question.choices = [...question.choices].sort(() => Math.random() - 0.5);
        }
    });

    return filteredQuestions;
};

export const streakPets: PetProfile[] = [
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
