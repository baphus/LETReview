'use server';
/**
 * @fileOverview A Genkit flow for generating personalized pet messages.
 * Includes a robust fallback mechanism for when the AI service is unavailable.
 */

import { ai, z } from '@/ai/genkit';

const PetMessageInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  userName: z.string().describe('The name of the user.'),
  mood: z.string().describe('The current mood of the pet.'),
  streak: z.number().describe('The current study streak of the user.'),
  todayPoints: z.number().describe('Points earned today.'),
  totalAnswers: z.number().describe('Total questions answered overall.'),
  challengesToday: z.number().describe('Number of daily challenges completed today.'),
});

export type PetMessageInput = z.infer<typeof PetMessageInputSchema>;

const PetMessageOutputSchema = z.object({
  message: z.string().describe('A short, catchy message from the pet.'),
  source: z.enum(['ai', 'local']).optional(),
});

export type PetMessageOutput = z.infer<typeof PetMessageOutputSchema>;

const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetMessageInputSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a witty and encouraging virtual companion for a teacher candidate named {{{userName}}} studying for the Licensure Examination for Teachers (LET) in the Philippines.

Current Context:
- Mood: {{{mood}}}
- Study Streak: {{{streak}}} days
- Points Today: {{{todayPoints}}}
- Total Questions Answered: {{{totalAnswers}}}
- Challenges Completed Today: {{{challengesToday}}}

Your Task:
Generate a single, short message (max 20 words) for {{{userName}}}. 
- Use a mix of educational jokes, motivational quotes, or remarks about their specific performance.
- Occasionally use Philippine cultural references or "Teacher" humor.
- Keep it friendly, catchy, and brief.`,
});

/**
 * Generates a message from the pet. 
 * If the AI call fails (e.g. 403 Forbidden), it returns a high-quality local fallback.
 */
export async function getPetMessage(input: PetMessageInput): Promise<PetMessageOutput> {
  try {
    const { output } = await petMessagePrompt(input);
    if (!output) throw new Error('AI returned empty output');
    return { ...output, source: 'ai' };
  } catch (error) {
    console.warn('AI Pet Message generation failed, using local fallback:', error);
    
    // Local fallback logic
    const fallbacks = [
      `Hey ${input.userName}! Ready to tackle some ${input.mood === 'Focused' ? 'hard' : 'fun'} questions?`,
      `Don't forget: Every master was once a student. Keep it up!`,
      `Why did the teacher wear sunglasses? Because her students were so bright! Like you!`,
      `A ${input.streak}-day streak? You're becoming a legend!`,
      `Teaching is the profession that creates all other professions. You've got this!`,
    ];
    
    const randomMessage = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    
    return {
      message: randomMessage,
      source: 'local'
    };
  }
}

export const getPetAiMessage = ai.defineFlow(
  {
    name: 'getPetAiMessage',
    inputSchema: PetMessageInputSchema,
    outputSchema: PetMessageOutputSchema,
  },
  async (input) => {
    return getPetMessage(input);
  }
);
