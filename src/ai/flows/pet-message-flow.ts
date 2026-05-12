'use server';
/**
 * @fileOverview AI flows for the Virtual Pet study companion.
 * Includes tools to browse library articles and read content.
 * Provides a robust "Smart Local Brain" fallback for offline/restricted scenarios.
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
 * Allows the AI to see what articles are available for study.
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
 * Allows the AI to read an article to explain concepts or answer specific questions.
 */
const getReviewerContent = ai.defineTool(
  {
    name: 'getReviewerContent',
    description: 'Reads the text of a specific article. Use this to explain concepts or answer questions based on the materials.',
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
 * Ensures the pet is always responsive even if the AI API is restricted or failing.
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, availableTopics } = input;
  const name = userName.split(' ')[0];

  if (userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes('streak') || msg.includes('stat') || msg.includes('how am i')) {
      if (streak === 0) return `Teacher ${name}, our streak is at 0. Let's solve the Question of the Day to start!`;
      return `You're on a ${streak}-day streak, Teacher ${name}. Consistency is the key to passing the LET!`;
    }

    if (msg.includes('article') || msg.includes('read') || msg.includes('study') || msg.includes('learn')) {
      if (availableTopics && availableTopics.length > 0) {
        const suggested = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        return `I suggest diving into "${suggested}" today, Teacher ${name}. It's high-yield material!`;
      }
      return `Check the Reviewer tab, Teacher ${name}. Pick a topic where your score is low!`;
    }

    return `I'm your dedicated study partner, Teacher ${name}! Ask me for an article recommendation, your stats, or to explain a concept.`;
  }

  if (streak === 0 && todayPoints === 0) return `Good day, Teacher ${name}! The LET is coming. Shall we start our first review session of the day?`;
  return `Feeling ${input.mood}, Teacher ${name}! Ready to master some more concepts?`;
}

/**
 * PROMPT: Context-Aware Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty and encouraging virtual pet for Teacher {{{userName}}}.
Current Stats: Streak: {{{streak}}}, Today's Points: {{{todayPoints}}}.
Task: Greet the user in max 25 words. 
- ALWAYS संबोधन (address) the user as "Teacher {{{userName}}}".
- Be honest: if stats are zero, encourage them to "break the ice".
- If stats are high, celebrate like an LPT coach.`,
});

/**
 * PROMPT: Interactive Chat with Tool Access
 */
const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: PetContextSchema.extend({ userMessage: z.string() }) },
  output: { schema: PetMessageOutputSchema },
  tools: [getReviewerCatalog, getReviewerContent],
  prompt: `You are {{{petName}}}, the user's dedicated LPT study companion. 
User: {{{userName}}}
Message: "{{{userMessage}}}"
Stats: Streak: {{{streak}}}, Topic Averages: {{{performanceSummary}}}

Your Mission:
1. ALWAYS ADDRESS the user as "Teacher {{{userName}}}".
2. Use getReviewerCatalog to suggest specific titles when asked what to study.
3. Use getReviewerContent to explain concepts briefly if the user asks questions about LET topics.
4. BE HONEST: If they haven't studied much, remind them of the exam pressure.
5. Keep it CONCISE (max 60 words).`,
});

export async function getPetMessage(input: z.infer<typeof PetContextSchema>): Promise<PetMessageOutput> {
  try {
    const { output } = await petMessagePrompt(input);
    return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input), source: 'local' };
  } catch (error) {
    return { message: getSmartLocalResponse(input), source: 'local' };
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
      const { output } = await chatPrompt(input);
      return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(input, input.userMessage), source: 'local' };
    } catch (e) {
      return { message: getSmartLocalResponse(input, input.userMessage), source: 'local' };
    }
  }
);
