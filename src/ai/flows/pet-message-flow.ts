'use server';
/**
 * @fileOverview Advanced Genkit flows for virtual pet intelligence.
 * 
 * - getPetAiMessage: Generates context-aware greetings.
 * - chatWithPet: Handles deep conversation with tool access.
 * - getSmartLocalResponse: A robust local fallback engine.
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
 * Highly dynamic logic for restricted API environments.
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, totalAnswers, performanceSummary, availableTopics } = input;
  const name = userName.split(' ')[0]; // Use first name for warmth

  if (userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes('streak') || msg.includes('how am i doing') || msg.includes('stat')) {
      if (streak === 0) return `Teacher ${name}, our streak is at 0. The LET won't wait for us! Let's answer one question right now to start our journey.`;
      if (streak < 3) return `You're on a ${streak}-day streak, ${name}. Solid progress, but let's aim for a full week!`;
      return `A ${streak}-day streak! You're becoming a powerhouse. Keep that momentum, Future LPT!`;
    }

    if (msg.includes('article') || msg.includes('read') || msg.includes('study')) {
      if (availableTopics && availableTopics.length > 0) {
        const suggested = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        return `Since you're looking for focus, ${name}, I suggest diving into "${suggested}" today. It's a key part of the board exam!`;
      }
      return `I recommend checking the Reviewer tab, ${name}. Pick a topic in ProfEd that you haven't mastered yet!`;
    }

    if (msg.includes('improve') || msg.includes('help')) {
      if (performanceSummary && performanceSummary.includes('%')) {
        return `I've checked your scores, ${name}. Focus on your lowest topic—that's where the passing grade is won or lost!`;
      }
      return "The best way to improve is consistency. Try 10 minutes of focus time on a topic you find difficult.";
    }

    if (msg.includes('joke')) {
      const jokes = [
        "Why was the math book sad? Because it had too many problems! (Just like my life without you, Teacher!)",
        "What's a teacher's favorite tree? Geometry!",
        "What's an educator's favorite nation? Expla-nation!",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    return `I'm your study pet, ${name}! Ask me for an article recommendation, how to improve your ${streak}-day streak, or just for a joke.`;
  }

  // Reactive Greeting logic
  if (streak === 0 && todayPoints === 0) return `Teacher ${name}, the board exam is getting closer. Let's break the ice and earn our first points today!`;
  if (streak > 0 && todayPoints === 0) return `Protect that ${streak}-day streak, ${name}! Don't let your hard work reset now.`;
  return `Feeling ${input.mood}, Future LPT ${name}! We've earned ${todayPoints} points today. Ready for a few more?`;
}

/**
 * PROMPT: Context-Aware Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty, encouraging, but HONEST virtual pet for Teacher {{{userName}}}.
Current Stats: Streak: {{{streak}}}, Today's Points: {{{todayPoints}}}, Answers: {{{totalAnswers}}}.
Task: Greet the user in max 25 words. 
- DO NOT say "you're doing great" if stats are zero. Instead, challenge them.
- If stats are high, celebrate them like a true LPT coach.
- Use Pinoy teacher flavor.`,
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
Stats: Streak: {{{streak}}}, Topics: {{{performanceSummary}}}

Your Mission:
1. ADDRESS the user as "Teacher {{{userName}}}".
2. If they ask "what to study", use getReviewerCatalog and suggest one specific title.
3. If they ask about concepts (e.g., "What is Piaget?"), use tools to read the article and summarize it briefly.
4. If stats are zero, BE FIRM. Remind them that consistency is the only way to pass the LET.
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
