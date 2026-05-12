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
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, totalAnswers, mood, performanceSummary } = input;
  
  if (userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes('streak') || msg.includes('stat') || msg.includes('score') || msg.includes('points')) {
        if (streak === 0 && todayPoints === 0) {
            return `Teacher ${userName}, we're at a 0-day streak. The best time to start was yesterday; the second best time is right now! Let's get moving.`;
        }
        return `You have a ${streak}-day streak and earned ${todayPoints} points today! Total questions answered: ${totalAnswers}. Consistency is the key to passing the LET!`;
    }
    
    if (msg.includes('improve') || msg.includes('performance') || msg.includes('help') || msg.includes('study')) {
      if (performanceSummary && performanceSummary !== "No quiz data yet.") {
        return `I've analyzed your performance, ${userName}. Your averages: ${performanceSummary}. I recommend focusing on your lowest-scoring topics first. Mastery takes time!`;
      }
      
      const generalAdvice = [
        "A great way to improve is to alternate between reading articles and taking quizzes. It builds both knowledge and recall!",
        "Try using the Pomodoro timer in the 'Timer' tab. Focusing for 25 minutes straight can significantly boost your retention.",
        "Don't just memorize; try to understand the 'why' behind each answer. Our explanations in the Reviewer tab help with that!",
        "Consistency beats intensity. Even 15 minutes of review every single day is better than a 5-hour marathon once a week."
      ];
      return generalAdvice[Math.floor(Math.random() * generalAdvice.length)];
    }
    
    if (msg.includes('joke')) {
      const jokes = [
        "What's a teacher's favorite nation? Expla-nation!",
        "Why was the music teacher in the hospital? Because she had too many sharps and flats!",
        "Why did the student eat his homework? Because the teacher said it was a piece of cake!",
        "What is a teacher's favorite tree? Geometry!",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    return `I'm here to support your journey to LPT status, ${userName}. Feel free to ask me about your stats or specific LET topics!`;
  }

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
1. If the user asks about subject matter (e.g., "Explain Piaget"), use getReviewerCatalog to find the article and getReviewerContent to read it, then explain simply.
2. If they ask how to improve:
   - If performanceSummary is available, analyze the averages. Suggest reading specific articles for topics where they score below 75%.
   - If NO performance data is available, DO NOT tell them to "come back later." Instead, give high-quality, general LET study strategies (e.g., active recall, spaced repetition, using the Pomodoro timer).
3. BE HONEST. If they haven't studied today (0 points/0 answers), give them a friendly reality check that the exam is approaching.
4. Keep responses punchy and supportive (1-3 sentences).
5. Use "Teacher" or "Future LPT" to address them.`,
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
      return { 
        message: getSmartLocalResponse(input, input.userMessage), 
        source: 'local' 
      };
    }
  }
);
