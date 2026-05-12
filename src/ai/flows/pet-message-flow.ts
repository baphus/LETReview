'use server';
/**
 * @fileOverview Advanced Genkit flows for virtual pet intelligence.
 * Now supports local tiny models via Ollama (e.g., phi3).
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
  performanceSummary: z.string().optional().describe('A summary of user scores per topic.'),
  availableTopics: z.array(z.string()).optional().describe('A list of topics available in the library.'),
});

const PetMessageOutputSchema = z.object({
  message: z.string().describe('The response from the pet.'),
  source: z.enum(['ai', 'local']).optional(),
});

export type PetMessageOutput = z.infer<typeof PetMessageOutputSchema>;

/**
 * TOOL: Get Reviewer Catalog
 */
const getReviewerCatalog = ai.defineTool(
  {
    name: 'getReviewerCatalog',
    description: 'Returns all available study articles. Use this when the user asks what to study.',
    inputSchema: z.void(),
    outputSchema: z.array(z.object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      slug: z.string(),
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
    }));
  }
);

/**
 * TOOL: Get Reviewer Content
 */
const getReviewerContent = ai.defineTool(
  {
    name: 'getReviewerContent',
    description: 'Reads the text of a specific article. Use this to explain concepts or answer questions.',
    inputSchema: z.object({ articleId: z.string() }),
    outputSchema: z.object({ title: z.string(), content: z.string() }),
  },
  async (input) => {
    const { firestore } = initializeFirebase();
    const docSnap = await getDoc(doc(firestore, 'reviewers', input.articleId));
    if (!docSnap.exists()) throw new Error('Article not found');
    return { title: docSnap.data().title, content: docSnap.data().content };
  }
);

/**
 * SMART LOCAL BRAIN (FALLBACK)
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, totalAnswers, performanceSummary, availableTopics } = input;
  const name = userName.split(' ')[0];

  if (userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes('streak') || msg.includes('how am i doing') || msg.includes('stat')) {
      if (streak === 0) return `Teacher ${name}, our streak is at 0. Let's answer one question to start!`;
      return `You're on a ${streak}-day streak, ${name}. Keep that momentum, Future LPT!`;
    }

    if (msg.includes('article') || msg.includes('read') || msg.includes('study')) {
      if (availableTopics && availableTopics.length > 0) {
        const suggested = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        return `I suggest diving into "${suggested}" today, ${name}. It's high-yield material!`;
      }
      return `Check the Reviewer tab, ${name}. Pick a topic you haven't mastered yet!`;
    }

    return `I'm your study pet, ${name}! Ask me for an article recommendation, your stats, or just for a joke.`;
  }

  if (streak === 0 && todayPoints === 0) return `Teacher ${name}, the LET is coming! Let's earn our first points today.`;
  return `Feeling ${input.mood}, Future LPT ${name}! Ready for some review?`;
}

/**
 * PROMPT: Context-Aware Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  model: 'ollama/phi3', // Default to tiny local model
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty, encouraging, but HONEST virtual pet for Teacher {{{userName}}}.
Current Stats: Streak: {{{streak}}}, Today's Points: {{{todayPoints}}}, Answers: {{{totalAnswers}}}.
Task: Greet the user in max 25 words. 
- DO NOT say "you're doing great" if stats are zero. Be firm.
- If stats are high, celebrate like an LPT coach.
- Use Pinoy teacher flavor.`,
});

/**
 * PROMPT: Interactive Chat with Tool Access
 */
const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  model: 'ollama/phi3', // Try local tiny model first
  input: { schema: PetContextSchema.extend({ userMessage: z.string() }) },
  output: { schema: PetMessageOutputSchema },
  tools: [getReviewerCatalog, getReviewerContent],
  prompt: `You are {{{petName}}}, the user's dedicated LPT study companion. 
User: {{{userName}}}
Message: "{{{userMessage}}}"
Stats: Streak: {{{streak}}}, Topics: {{{performanceSummary}}}

Your Mission:
1. ADDRESS the user as "Teacher {{{userName}}}".
2. Use getReviewerCatalog to suggest specific titles when asked what to study.
3. Use getReviewerContent to explain concepts briefly.
4. If stats are zero, BE FIRM about consistency.
5. Keep it CONCISE (max 60 words).`,
});

export async function getPetMessage(input: z.infer<typeof PetContextSchema>): Promise<PetMessageOutput> {
  try {
    // Try the local model first
    const { output } = await petMessagePrompt(input);
    return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input), source: 'local' };
  } catch (error) {
    // Fallback to Google AI if Ollama is not running
    try {
      const { output } = await petMessagePrompt(input, { model: 'googleai/gemini-2.5-flash' });
      return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input), source: 'local' };
    } catch (e) {
      return { message: getSmartLocalResponse(input), source: 'local' };
    }
  }
}

export const getPetAiMessage = ai.defineFlow(
  { name: 'getPetAiMessage', inputSchema: PetContextSchema, outputSchema: PetMessageOutputSchema },
  async (input) => getPetMessage(input)
);

export const chatWithPet = ai.defineFlow(
  { name: 'chatWithPet', inputSchema: PetContextSchema.extend({ userMessage: z.string() }), outputSchema: PetMessageOutputSchema },
  async (input) => {
    try {
      // Try local tiny model first
      const { output } = await chatPrompt(input);
      return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input, input.userMessage), source: 'local' };
    } catch (e) {
      // Fallback to cloud Gemini for tool calling support if local model fails
      try {
        const { output } = await chatPrompt(input, { model: 'googleai/gemini-2.5-flash' });
        return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input, input.userMessage), source: 'local' };
      } catch (cloudError) {
        return { message: getSmartLocalResponse(input, input.userMessage), source: 'local' };
      }
    }
  }
);
