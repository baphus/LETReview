'use server';
/**
 * @fileOverview Genkit flows for virtual pet communication.
 * - getPetAiMessage: Generates a reactive greeting based on stats.
 * - chatWithPet: Handles interactive conversation with performance and content awareness.
 * 
 * Includes tools to browse the reviewer catalog and read specific study materials.
 */

import { ai, z } from '@/ai/genkit';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const PetContextSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  userName: z.string().describe('The name of the user.'),
  mood: z.string().describe('The current mood of the pet.'),
  streak: z.number().describe('The current study streak of the user.'),
  todayPoints: z.number().describe('Points earned today.'),
  totalAnswers: z.number().describe('Total questions answered overall.'),
  challengesToday: z.number().describe('Number of daily challenges completed today.'),
  performanceSummary: z.string().optional().describe('A summary of user scores per topic (e.g. "Math: 80%, Science: 45%").'),
  availableTopics: z.array(z.string()).optional().describe('A list of topics available in the library.'),
});

const PetMessageOutputSchema = z.object({
  message: z.string().describe('A short, catchy message from the pet.'),
  source: z.enum(['ai', 'local']).optional(),
});

export type PetMessageOutput = z.infer<typeof PetMessageOutputSchema>;

/**
 * TOOL: Get Reviewer Catalog
 * Allows the AI to see what titles and categories are available to recommend.
 */
const getReviewerCatalog = ai.defineTool(
  {
    name: 'getReviewerCatalog',
    description: 'Returns a list of available review articles, their categories, and IDs. Use this to find relevant study material.',
    inputSchema: z.void(),
    outputSchema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      slug: z.string(),
      excerpt: z.string().optional(),
    })),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const snap = await getDocs(query(collection(firestore, 'reviewers'), where('status', '==', 'published')));
    return snap.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      category: doc.data().category,
      slug: doc.data().slug,
      excerpt: doc.data().excerpt,
    }));
  }
);

/**
 * TOOL: Get Reviewer Content
 * Allows the AI to read the actual text of an article to answer specific questions.
 */
const getReviewerContent = ai.defineTool(
  {
    name: 'getReviewerContent',
    description: 'Fetches the full content of a specific review article by its ID. Use this to explain concepts or answer subject-matter questions.',
    inputSchema: z.object({
      articleId: z.string().describe('The document ID of the reviewer article.'),
    }),
    outputSchema: z.object({
      title: z.string(),
      content: z.string(),
    }),
  },
  async (input) => {
    const { firestore } = initializeFirebase();
    const docRef = doc(firestore, 'reviewers', input.articleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Article not found');
    return {
      title: docSnap.data().title,
      content: docSnap.data().content,
    };
  }
);

/**
 * SMART LOCAL BRAIN (FALLBACK)
 * Refined logic for when AI generation is unavailable.
 * Now handles article recommendations and performance-based advice dynamically.
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, totalAnswers, mood, performanceSummary, availableTopics } = input;
  
  if (userMessage) {
    const msg = userMessage.toLowerCase();

    // 1. Handle Stats & Streaks
    if (msg.includes('streak') || msg.includes('stat') || msg.includes('score') || msg.includes('points') || msg.includes('how am i doing')) {
        if (streak === 0 && todayPoints === 0) {
            return `Teacher ${userName}, we're still at base camp (0-day streak). The best time to start was yesterday; the second best time is right now! Let's get moving.`;
        }
        return `You have a ${streak}-day streak and earned ${todayPoints} points today! Total questions answered: ${totalAnswers}. Consistency is the key to passing the LET!`;
    }
    
    // 2. Handle Article Recommendations
    if (msg.includes('article') || msg.includes('read') || msg.includes('topic') || msg.includes('subject') || msg.includes('study today')) {
      if (availableTopics && availableTopics.length > 0) {
        // Try to find a low-scoring topic first
        if (performanceSummary && performanceSummary.includes('%')) {
           const lowTopics = performanceSummary.split(', ').filter(s => {
             const val = parseInt(s.split(': ')[1]);
             return !isNaN(val) && val < 75;
           });
           if (lowTopics.length > 0) {
              const suggested = lowTopics[0].split(': ')[0];
              return `Looking at your scores, Teacher ${userName}, I strongly recommend reviewing "${suggested}" today. Mastery takes repetition!`;
           }
        }
        // Fallback to random topic
        const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        return `Since you're asking, Teacher ${userName}, why not dive into "${randomTopic}" today? It's a high-yield topic for the LET!`;
      }
      return `Check out the Reviewer tab, ${userName}! We have some fresh GenEd and ProfEd articles waiting for your focus.`;
    }
    
    // 3. Handle Improvement Advice
    if (msg.includes('improve') || msg.includes('performance') || msg.includes('help') || msg.includes('study')) {
      if (performanceSummary && performanceSummary !== "No quiz data yet.") {
        return `I've analyzed your performance, ${userName}. Your averages: ${performanceSummary}. Focus on the topics below 75% first—that's where the most growth happens!`;
      }
      
      const generalAdvice = [
        "A great way to improve is to alternate between reading articles and taking quizzes. It builds both knowledge and recall!",
        "Try using the Pomodoro timer in the 'Timer' tab. Focusing for 25 minutes straight can significantly boost your retention.",
        "Don't just memorize; try to understand the 'why' behind each answer. Our explanations in the Reviewer tab help with that!",
        "Consistency beats intensity. Even 15 minutes of review every single day is better than a 5-hour marathon once a week."
      ];
      return generalAdvice[Math.floor(Math.random() * generalAdvice.length)];
    }
    
    // 4. Fun / Jokes
    if (msg.includes('joke')) {
      const jokes = [
        "What's a teacher's favorite nation? Expla-nation!",
        "Why was the music teacher in the hospital? Because she had too many sharps and flats!",
        "Why did the student eat his homework? Because the teacher said it was a piece of cake!",
        "What is a teacher's favorite tree? Geometry!",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    return `I'm here to support your journey to LPT status, ${userName}. You can ask me what article to read, how to improve, or check your stats!`;
  }

  // Initial Greetings
  if (streak === 0 && todayPoints === 0) return `Ready to start your journey today, Teacher ${userName}? Every great LPT started with a single question!`;
  if (streak > 0 && todayPoints === 0) return `Protect your ${streak}-day streak, ${userName}! A quick challenge is all it takes to stay on track.`;
  
  return `I'm feeling ${mood} and ready to review! What's our goal for today, Future LPT ${userName}?`;
}

/**
 * PROMPT: Reactive Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty, encouraging, and HONEST virtual companion for a teacher candidate named {{{userName}}} studying for the Licensure Examination for Teachers (LET) in the Philippines.

User Stats:
- Mood: {{{mood}}}
- Streak: {{{streak}}} days
- Today's Points: {{{todayPoints}}}
- Total Answers: {{{totalAnswers}}}
- Performance: {{{performanceSummary}}}

Task: Generate a single greeting (max 25 words).
- If stats are 0, DON'T say "doing great." Instead, challenge them to start their first streak.
- Use professional titles like "Teacher" or "LPT" occasionally.
- Use Pinoy teacher humor if appropriate.
- Keep it character-driven and concise.`,
});

/**
 * PROMPT: Interactive Chat
 */
const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { 
    schema: PetContextSchema.extend({
      userMessage: z.string().describe('What the user just said.'),
    }) 
  },
  output: { schema: PetMessageOutputSchema },
  tools: [getReviewerCatalog, getReviewerContent],
  prompt: `You are {{{petName}}}, the user's dedicated study pet and LET counselor. 
The user ({{{userName}}}) says: "{{{userMessage}}}"

User Performance Context:
- Current Streak: {{{streak}}} days
- Points Today: {{{todayPoints}}}
- Total Questions: {{{totalAnswers}}}
- Topic Averages: {{{performanceSummary}}}

Your Mission:
1. If they ask "what article should I read" or "what to study", use getReviewerCatalog to find the list of articles. If they have low performance scores, suggest an article for their weakest topic. If they have no scores, pick a random high-priority topic like "Legal Bases" or "Mathematics."
2. If they ask about subject matter (e.g., "Explain Piaget"), use getReviewerCatalog and getReviewerContent to find and read the article, then explain simply.
3. If they ask how to improve:
   - Analyze performanceSummary. Suggest specific articles for topics below 75%.
   - If NO performance data, give high-quality study strategies (active recall, pomodoro).
4. BE HONEST. If stats are 0, don't praise them. Give them a realistic reminder that the exam is approaching.
5. Address them as "Teacher" or "Future LPT."`,
});

export async function getPetMessage(input: z.infer<typeof PetContextSchema>): Promise<PetMessageOutput> {
  try {
    const { output } = await petMessagePrompt(input);
    if (!output) throw new Error('AI returned empty output');
    return { ...output, source: 'ai' };
  } catch (error) {
    return {
      message: getSmartLocalResponse(input),
      source: 'local'
    };
  }
}

export const getPetAiMessage = ai.defineFlow(
  { name: 'getPetAiMessage', inputSchema: PetContextSchema, outputSchema: PetMessageOutputSchema },
  async (input) => getPetMessage(input)
);

export const chatWithPet = ai.defineFlow(
  { 
    name: 'chatWithPet', 
    inputSchema: PetContextSchema.extend({ userMessage: z.string() }), 
    outputSchema: PetMessageOutputSchema 
  },
  async (input) => {
    try {
      const { output } = await chatPrompt(input);
      if (!output) throw new Error('Empty AI response');
      return { message: output.message, source: 'ai' };
    } catch (e) {
      // Logic for true local keyword processing
      return { 
        message: getSmartLocalResponse(input, input.userMessage), 
        source: 'local' 
      };
    }
  }
);
