
import { getFirestore, collection, query, where, getDocs, limit, getDoc, doc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { QuizQuestion, PetProfile } from "./types";
import staticQuestions from './seeds/questions-seed.json';

// Production Optimization: In-memory cache for the current session to prevent redundant reads
const questionsCache: Record<string, { data: QuizQuestion[], timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache for dynamic queries

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


export const getQuestionForDate = async (date: Date, subscribedReviewerIds?: string[]): Promise<QuizQuestion | null> => {
    const { firestore } = initializeFirebase();
    const dayOfYear = getDayOfYear(date);
    
    const cacheKey = `qotd-${dayOfYear}-${subscribedReviewerIds?.join(',') || 'none'}`;
    if (questionsCache[cacheKey] && (Date.now() - questionsCache[cacheKey].timestamp < CACHE_TTL)) {
        return questionsCache[cacheKey].data[0] || null;
    }

    let questionsPool: QuizQuestion[] = [];
    
    try {
        const questionsRef = collection(firestore, 'questions');
        let q;
        
        // If we have subscriptions, specifically fetch questions for those articles
        if (subscribedReviewerIds && subscribedReviewerIds.length > 0) {
            // Firestore array-contains-any limit is 10
            const batchIds = subscribedReviewerIds.slice(0, 10);
            q = query(
                questionsRef, 
                where('reviewerIds', 'array-contains-any', batchIds),
                limit(100)
            );
        } else if (subscribedReviewerIds) {
            // Subscribed list exists but is empty
            return null;
        } else {
            // No subscription context, fetch general questions
            q = query(questionsRef, limit(100));
        }

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            questionsPool = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizQuestion));
        } else {
            // Final fallback to static data
            questionsPool = staticQuestions as QuizQuestion[];
            if (subscribedReviewerIds && subscribedReviewerIds.length > 0) {
                questionsPool = questionsPool.filter(q => 
                    q.reviewerIds?.some(id => subscribedReviewerIds.includes(id))
                );
            }
        }
    } catch (e) {
        console.error("Error fetching QOTD from Firestore, using fallback", e);
        questionsPool = staticQuestions as QuizQuestion[];
    }

    if (questionsPool.length === 0) {
        return null;
    }

    // Deterministic selection based on the day
    const questionIndex = dayOfYear % questionsPool.length;
    const question = { ...questionsPool[questionIndex] };

    const dateString = date.toDateString();
    const rng = getSeed(dateString + question.id);
    question.choices = [...question.choices].sort(() => rng() - rng());

    // Update cache
    questionsCache[cacheKey] = { data: [question], timestamp: Date.now() };

    return question;
}

export const getQuestionOfTheDay = async (subscribedReviewerIds?: string[]): Promise<QuizQuestion | null> => {
    return getQuestionForDate(new Date(), subscribedReviewerIds);
};

export const getQuestions = async (options: {
    category?: 'gened' | 'profed' | 'majorship';
    difficulty?: 'easy' | 'medium' | 'hard';
    limit?: number;
    shuffle?: boolean;
    topicId?: string;
    subscribedReviewerIds?: string[];
}): Promise<QuizQuestion[]> => {
    const { firestore } = initializeFirebase();
    
    const cacheKey = `questions-${JSON.stringify(options)}`;
    if (questionsCache[cacheKey] && (Date.now() - questionsCache[cacheKey].timestamp < CACHE_TTL)) {
        return questionsCache[cacheKey].data;
    }
    
    let fetchedQuestions: QuizQuestion[] = [];
    let fromFallback = false;

    try {
        const questionsRef = collection(firestore, 'questions');
        const queryConstraints: any[] = [];
        
        if (options.category) {
            queryConstraints.push(where('category', '==', options.category));
        }
        if (options.difficulty) {
            queryConstraints.push(where('difficulty', '==', options.difficulty));
        }
        if (options.topicId) {
            queryConstraints.push(where('topicIds', 'array-contains', options.topicId));
        }

        // Subscriptions direct query optimization
        if (options.subscribedReviewerIds && options.subscribedReviewerIds.length > 0) {
            const batchIds = options.subscribedReviewerIds.slice(0, 10);
            queryConstraints.push(where('reviewerIds', 'array-contains-any', batchIds));
        } else if (options.subscribedReviewerIds) {
            // User explicitly has 0 subscriptions
            return [];
        }
        
        if (options.limit && !options.shuffle) {
            queryConstraints.push(limit(options.limit));
        } else {
            queryConstraints.push(limit(100)); // Pool for shuffling/filtering
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
        if (options.subscribedReviewerIds && options.subscribedReviewerIds.length > 0) {
            filteredQuestions = filteredQuestions.filter(q => 
                q.reviewerIds?.some(id => options.subscribedReviewerIds?.includes(id))
            );
        }
    }
    
    if (options.shuffle) {
        filteredQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);
    }
    
    if (options.limit) {
        filteredQuestions = filteredQuestions.slice(0, options.limit);
    }

    filteredQuestions.forEach(question => {
        if(question.choices) {
            question.choices = [...question.choices].sort(() => Math.random() - 0.5);
        }
    });

    // Update cache
    questionsCache[cacheKey] = { data: filteredQuestions, timestamp: Date.now() };

    return filteredQuestions;
};

export const streakPets: PetProfile[] = [
    {
        name: "Rocky",
        unlock_criteria: "Default Companion",
        streak_req: 0,
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
