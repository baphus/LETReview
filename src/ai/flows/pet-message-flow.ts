'use server';
/**
 * @fileOverview A Genkit flow for generating personalized pet messages.
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
- Occasionally use Philippine cultural references or "Teacher" humor (e.g., Republic Acts, educational philosophers).
- If the streak is 0, be gently encouraging. If it is high, be ecstatic.
- If they have answered many questions today, remind them to take care of themselves.
- If they just finished a challenge, celebrate their victory!

Keep it friendly, catchy, and brief enough for a chat bubble.`,
});

export const getPetAiMessage = ai.defineFlow(
  {
    name: 'getPetAiMessage',
    inputSchema: PetMessageInputSchema,
    outputSchema: PetMessageOutputSchema,
  },
  async (input) => {
    const { output } = await petMessagePrompt(input);
    if (!output) throw new Error('Failed to generate AI message');
    return output;
  }
);
