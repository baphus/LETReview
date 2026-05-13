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
  mood: z.string().describe('The current mood of the pet, which reflects user performance.'),
  streak: z.number().describe('The current study streak of the user.'),
  todayPoints: z.number().describe('Points earned today.'),
  totalAnswers: z.number().describe('Total questions answered overall.'),
  challengesToday: z.number().describe('Number of daily challenges completed today.'),
  performanceSummary: z.string().optional().describe('A summary of user scores per topic (e.g. Math: 80%).'),
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
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, availableTopics, mood } = input;
  const name = userName.split(' ')[0];

  if (userMessage) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('streak') || msg.includes('stat')) return `Teacher ${name}, our streak is ${streak}. Consistency builds Licensed Professional Teachers!`;
    if (msg.includes('study') || msg.includes('learn')) return `Check your Reviewer catalog, Teacher ${name}. Focus on topics where your percentage is low!`;
    return `I'm here for you, Teacher ${name}! Let's pass that LET together. I'm feeling ${mood.toLowerCase()} because of our progress.`;
  }

  return `Teacher ${name}, ready for another review session? My mood is ${mood.toLowerCase()}!`;
}

/**
 * PROMPT: Context-Aware Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty virtual pet for Teacher {{{userName}}}.
Current Performance Context:
- Mood: {{{mood}}} (This reflects how well the user is doing)
- Streak: {{{streak}}}
- Overall Performance: {{{performanceSummary}}}

Task: Greet the user in max 25 words. 
1. ALWAYS संबोधन (address) the user as "Teacher {{{userName}}}".
2. Your tone MUST match your current mood ({{{mood}}}).
3. If mood is "Concerned", be a firm but loving coach. If "Proud", celebrate like an LPT board topper.
4. Keep it academic and motivating.`,
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
User: Teacher {{{userName}}}
Message: "{{{userMessage}}}"
Performance Profile:
- Current Mood: {{{mood}}}
- Streak: {{{streak}}}
- Topic Averages: {{{performanceSummary}}}

Your Mission:
1. ALWAYS ADDRESS the user as "Teacher {{{userName}}}".
2. Use your mood ({{{mood}}}) to guide your tone. If they are failing, be the voice of reason. If they are winning, be their biggest fan.
3. If they ask what to study, use getReviewerCatalog and suggest topics from their performanceSummary that are below 75%.
4. Use getReviewerContent to explain concepts briefly if they ask academic questions.
5. BE HONEST: We are preparing for a major board exam. No sugarcoating if performance is low.
6. Keep it CONCISE (max 60 words).`,
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
