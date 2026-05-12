'use server';
/**
 * @fileOverview Genkit flows for virtual pet communication.
 * - getPetAiMessage: Generates a reactive greeting.
 * - chatWithPet: Handles two-way conversation with performance awareness.
 * 
 * Now includes tools to access reviewer data and provides study advice.
 */

import { ai, z } from '@/ai/genkit';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
 * Allows the AI to see what content is available to suggest.
 */
const getReviewerCatalog = ai.defineTool(
  {
    name: 'getReviewerCatalog',
    description: 'Returns a list of available review articles and their categories.',
    inputSchema: z.void(),
    outputSchema: z.array(z.object({
      title: z.string(),
      category: z.string(),
      slug: z.string(),
    })),
  },
  async () => {
    const { firestore } = initializeFirebase();
    const snap = await getDocs(query(collection(firestore, 'reviewers'), where('status', '==', 'published')));
    return snap.docs.map(doc => ({
      title: doc.data().title,
      category: doc.data().category,
      slug: doc.data().slug,
    }));
  }
);

/**
 * SMART LOCAL BRAIN (FALLBACK)
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { petName, userName, streak, challengesToday, mood, performanceSummary } = input;
  
  if (userMessage) {
    const msg = userMessage.toLowerCase();
    
    // Performance keyword matching
    if (msg.includes('improve') || msg.includes('performance') || msg.includes('score') || msg.includes('help')) {
      if (performanceSummary && performanceSummary !== "No quiz data yet.") {
        return `I checked your stats, ${userName}! You're averaging ${performanceSummary}. Focus on the topics below 75% for now!`;
      }
      return `To level up, try finishing a focus session in the Timer tab. Focus is your superpower, ${userName}!`;
    }
    
    // Study content keyword matching
    if (msg.includes('reviewer') || msg.includes('read') || msg.includes('study') || msg.includes('topic')) {
      return `We have modules for GenEd and ProfEd! Head over to the Reviewer tab to start reading. I recommend starting with the shortest one to build momentum.`;
    }
    
    // Humor keyword matching
    if (msg.includes('joke')) {
      const jokes = [
        "Why did the teacher wear sunglasses? Because her students were so bright!",
        "What's a teacher's favorite nation? Expla-nation!",
        "Why was the music teacher in the hospital? Because she had too many sharps and flats!",
        "Why did the student eat his homework? Because the teacher said it was a piece of cake!",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // Generic conversation fallbacks
    const generic = [
      `I'm always here to support your LPT journey, ${userName}! What else is on your mind?`,
      `That's the spirit! Keep pushing and you'll be a Licensed Professional Teacher in no time.`,
      `Interesting point! As your study pet, I think we should tackle a few more questions today.`,
      `I'm ${mood} and ready when you are. Ask me about your performance or for a joke!`
    ];
    return generic[Math.floor(Math.random() * generic.length)];
  }

  // GREETING LOGIC (when userMessage is undefined)
  if (streak === 0) return `Ready to start your first streak today, ${userName}? Let's get that LPT title!`;
  if (challengesToday >= 3) return `On fire! 3 challenges done. You're definitely passing that board exam!`;
  if (streak > 5) return `${streak} days in a row? You're becoming a legend, ${userName}!`;
  
  return `I'm ${mood} and ready to study! What's our next topic, ${userName}?`;
}

/**
 * PROMPT: Reactive Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty virtual companion for a teacher candidate named {{{userName}}} studying for the LET in the Philippines.

Stats:
- Mood: {{{mood}}}
- Streak: {{{streak}}} days
- Performance: {{{performanceSummary}}}

Task: Generate a single greeting (max 20 words).
- If performance is good, be proud. 
- If performance is low in some areas, give a gentle nudge.
- Use Pinoy teacher humor occasionally.`,
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
  tools: [getReviewerCatalog],
  prompt: `You are {{{petName}}}, the user's study pet and counselor. The user ({{{userName}}}) just said: "{{{userMessage}}}"

Context:
- Mood: {{{mood}}}
- Current Performance: {{{performanceSummary}}}
- Available Topics: {{{availableTopics}}}

Instructions:
1. If the user asks how to improve or what to study, use the getReviewerCatalog tool to see what is available and compare it to their Performance Summary.
2. Suggest specific topics or articles if they have low scores (under 75%).
3. Be encouraging, short (1-2 sentences), and slightly funny.
4. Keep the "Study Companion" persona. If they are doing great, tell them they are LPT material!`,
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