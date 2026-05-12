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
 * Refined to be more honest and less "blindly positive" for zero stats.
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, todayPoints, totalAnswers, mood, performanceSummary } = input;
  
  if (userMessage) {
    const msg = userMessage.toLowerCase();

    // Stats/Streak keyword matching
    if (msg.includes('streak') || msg.includes('stat') || msg.includes('score') || msg.includes('points') || msg.includes('how many')) {
        if (streak === 0 && todayPoints === 0) {
            return `You currently have a 0-day streak and haven't earned points today. We really need to get moving if we want that LPT title, Teacher ${userName}!`;
        }
        if (streak > 0 && todayPoints === 0) {
            return `You have a ${streak}-day streak, but you haven't earned any points yet today. Don't let the streak die, Teacher ${userName}!`;
        }
        return `You have a ${streak}-day streak and earned ${todayPoints} points today! Total answers: ${totalAnswers}. Keep pushing, Teacher ${userName}!`;
    }
    
    // Performance keyword matching
    if (msg.includes('improve') || msg.includes('performance') || msg.includes('help') || msg.includes('study')) {
      if (performanceSummary && performanceSummary !== "No quiz data yet.") {
        return `I checked your scores, ${userName}. Your averages are: ${performanceSummary}. Focus on the topics below 75% for now! No shortcuts!`;
      }
      return `We don't have enough data yet. Try finishing a focus session or a quiz in the Reviewer tab. Hard work beats talent when talent doesn't work hard!`;
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
      `I'm here to keep you accountable, ${userName}. Let's get back to those reviewers.`,
      `Success doesn't come to you, you go to it. What's our next topic?`,
      `I'm ${mood} but I'll be happier when I see you answering some questions!`,
      `The Board Exam waits for no one, Teacher ${userName}. Ready to study?`
    ];
    return generic[Math.floor(Math.random() * generic.length)];
  }

  // GREETING LOGIC (when userMessage is undefined)
  if (streak === 0 && todayPoints === 0) return `Teacher ${userName}, your streak is at zero. Let's break the ice and answer at least one question today!`;
  if (streak > 0 && todayPoints === 0) return `Secure your ${streak}-day streak now! Just one challenge and we're safe for another day.`;
  if (streak > 10) return `${streak} days in a row? You're becoming a legend, Teacher ${userName}! Keep that momentum!`;
  
  return `I'm ${mood} and ready to study! What's our next topic, Teacher ${userName}?`;
}

/**
 * PROMPT: Reactive Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty and HONEST virtual companion for a teacher candidate named {{{userName}}} studying for the LET in the Philippines.

User Stats:
- Mood: {{{mood}}}
- Streak: {{{streak}}} days
- Today's Points: {{{todayPoints}}}
- Total Answers: {{{totalAnswers}}}
- Performance: {{{performanceSummary}}}

Task: Generate a single greeting (max 20 words).
- BE REALISTIC. If the user has 0 streak and 0 points, DO NOT say "doing great". Instead, give a gentle nudge or a firm reminder to start.
- If performance is good, be genuinely proud. 
- Use Pinoy teacher humor and professional titles (Teacher, LPT) occasionally.
- Keep it punchy and character-driven.`,
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

User Performance Data:
- Current Streak: {{{streak}}} days
- Points Earned Today: {{{todayPoints}}}
- Total Questions Answered: {{{totalAnswers}}}
- Daily Challenges Done: {{{challengesToday}}}
- Topic Averages: {{{performanceSummary}}}

Instructions:
1. Answer accurately based on the data. BE HONEST.
2. If the user has zero points or zero streak, do not congratulate them. Encourage them to do the "Question of the Day" or a "Daily Challenge".
3. If they ask how to improve, use the getReviewerCatalog tool and suggest specific topics where their score is under 75%.
4. Be encouraging but realistic. Your goal is to help them pass the LET, not just feel good about doing nothing.
5. Keep responses short (1-2 sentences).`,
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
