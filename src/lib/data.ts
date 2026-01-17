import { getFirestore, collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { QuizQuestion, PetProfile } from "./types";
import staticQuestions from '../../docs/questions-seed.json';

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
    
    // Determine which category document to read based on whether the day of the year is even or odd
    const dayOfYear = getDayOfYear(date);
    const category = (dayOfYear % 2 === 0) ? 'gened' : 'profed';
    
    const categoryDocRef = doc(firestore, "questions", category);
    const docSnap = await getDoc(categoryDocRef);

    let questionsInCategory: QuizQuestion[] = [];

    if (docSnap.exists()) {
        questionsInCategory = (docSnap.data().questions || []) as QuizQuestion[];
    } else {
        // Fallback to static data if the document doesn't exist
        questionsInCategory = staticQuestions.filter(q => (q as QuizQuestion).category === category) as QuizQuestion[];
    }

    if (questionsInCategory.length === 0) {
        // Ultimate fallback if Firestore is empty and static file has no questions for the category
        return staticQuestions[0] as QuizQuestion;
    }

    // Use the day of the year to pick a question from the category list
    const questionIndex = dayOfYear % questionsInCategory.length;
    const question = questionsInCategory[questionIndex];

    // Deterministically shuffle choices so they are not always in the same order
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
    
    let allQuestions: QuizQuestion[] = [];

    if (options.topicId) {
        // If filtering by topic, fetch from all categories and then filter.
        const categories: Array<'gened' | 'profed' | 'majorship'> = ['gened', 'profed', 'majorship'];
        try {
            const categoryDocs = await Promise.all(
                categories.map(cat => getDoc(doc(firestore, "questions", cat)))
            );
            
            for (const docSnap of categoryDocs) {
                if (docSnap.exists()) {
                    allQuestions.push(...(docSnap.data().questions || []));
                }
            }
        } catch (e) {
            console.error("Error fetching topic questions from firestore, using fallback", e);
            allQuestions = staticQuestions as QuizQuestion[];
        }
        
        // Fallback for when firestore is empty
        if (allQuestions.length === 0) {
            allQuestions = staticQuestions as QuizQuestion[];
        }

    } else {
        const category = options.category || 'gened';
        const categoryDocRef = doc(firestore, "questions", category);
        const docSnap = await getDoc(categoryDocRef);

        if (docSnap.exists()) {
            allQuestions = (docSnap.data().questions || []) as QuizQuestion[];
        } else {
            // Fallback to static data
            allQuestions = staticQuestions.filter(q => (q as QuizQuestion).category === category) as QuizQuestion[];
        }
    }


    let filteredQuestions = allQuestions;

    if (options.topicId) {
        filteredQuestions = filteredQuestions.filter(q => q.topicIds?.includes(options.topicId as string));
    }
    
    if (options.difficulty) {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty === options.difficulty);
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
