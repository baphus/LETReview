'use server';
/**
 * @fileOverview Genkit flows for virtual pet communication.
 * - getPetAiMessage: Generates a reactive greeting based on current stats.
 * - chatWithPet: Handles two-way conversation between the user and their pet.
 */

import { ai, z } from '@/ai/genkit';

const PetContextSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  userName: z.string().describe('The name of the user.'),
  mood: z.string().describe('The current mood of the pet.'),
  streak: z.number().describe('The current study streak of the user.'),
  todayPoints: z.number().describe('Points earned today.'),
  totalAnswers: z.number().describe('Total questions answered overall.'),
  challengesToday: z.number().describe('Number of daily challenges completed today.'),
});

const PetMessageOutputSchema = z.object({
  message: z.string().describe('A short, catchy message from the pet.'),
  source: z.enum(['ai', 'local']).optional(),
});

export type PetMessageOutput = z.infer<typeof PetMessageOutputSchema>;

/**
 * PROMPT: Reactive Greeting
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty virtual companion for a teacher candidate named {{{userName}}} studying for the LET in the Philippines.

Stats Context:
- Mood: {{{mood}}}
- Streak: {{{streak}}} days
- Points Today: {{{todayPoints}}}
- Total Answers: {{{totalAnswers}}}
- Challenges Today: {{{challengesToday}}}

Task: Generate a single greeting (max 20 words).
- DO NOT congratulate a 0-day streak. If streak is 0, encourage them to start one.
- Use Teacher humor or Pinoy cultural references occasionally.
- Be supportive but characteristic of your mood ({{{mood}}}).`,
});

/**
 * PROMPT: Interactive Chat
 */
const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { 
    schema: PetContextSchema.extend({
      userMessage: z.string().describe('What the user just said.'),
      history: z.array(z.object({ role: z.string(), content: z.string() })).optional()
    }) 
  },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, the user's study pet. The user ({{{userName}}}) just said: "{{{userMessage}}}"

Context:
- Your Mood: {{{mood}}}
- Their Streak: {{{streak}}}
- Answers: {{{totalAnswers}}}

Respond as the pet. Keep it short (1-2 sentences), encouraging, and funny. 
If they ask about their progress, use the provided stats.
If they are just chatting, stay in character.
Avoid being robotic.`,
});

export async function getPetMessage(input: z.infer<typeof PetContextSchema>): Promise<PetMessageOutput> {
  try {
    const { output } = await petMessagePrompt(input);
    if (!output) throw new Error('AI returned empty output');
    return { ...output, source: 'ai' };
  } catch (error) {
    console.warn('AI Pet Message failed, using local fallback:', error);
    
    // Improved logical fallbacks
    const streakMsg = input.streak > 0 
      ? `A ${input.streak}-day streak? You're on your way to that LPT title!`
      : `Ready to start your first streak today, ${input.userName}? Let's go!`;

    const fallbacks = [
      streakMsg,
      `Teaching is the profession that creates all other professions. You've got this!`,
      `Don't forget: Every master was once a student. Keep it up!`,
      `Why did the teacher wear sunglasses? Because her students were so bright! Like you!`,
    ];
    
    return {
      message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
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
      return { message: output?.message || "I'm a bit speechless! Keep studying!", source: 'ai' };
    } catch (e) {
      return { message: "I'm focusing really hard right now, but I heard you! Let's get back to the reviewers.", source: 'local' };
    }
  }
);
