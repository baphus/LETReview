'use server';
/**
 * @fileOverview Genkit flows for virtual pet communication.
 * - getPetAiMessage: Generates a reactive greeting.
 * - chatWithPet: Handles two-way conversation.
 * 
 * Includes a "Smart Local Fallback" to ensure functionality without cloud AI.
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
 * SMART LOCAL BRAIN
 * Logic-based response generator for when Cloud AI is unavailable.
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { petName, userName, streak, challengesToday, mood, totalAnswers } = input;
  
  // 1. Handle specific chat keywords if userMessage exists
  if (userMessage) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('joke')) {
      const jokes = [
        "Why did the teacher wear sunglasses? Because her students were so bright! Like you!",
        "What's a teacher's favorite nation? Expla-nation!",
        "Why was the music teacher in the hospital? Because she had too many sharps and flats!",
        "Why did the teacher jump into the pool? To test the water! Classic pedagogical research.",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (msg.includes('help') || msg.includes('study')) {
      return `Focus is key, ${userName}! Try a 25-minute Pomodoro session. I'll be right here!`;
    }
    if (msg.includes('how') && msg.includes('doing')) {
      if (streak > 5) return `You're killing it with that ${streak}-day streak! Best student ever.`;
      return `We're making progress, ${userName}. One question at a time!`;
    }
    if (msg.includes('hello') || msg.includes('hi')) {
      return `Hi ${userName}! Ready to crunch some GenEd or ProfEd modules?`;
    }
  }

  // 2. Priority Performance Remarks (No AI needed for these)
  if (challengesToday >= 3) return `Tatlong challenges na agad?! You're on fire today, ${userName}! LPT in the making!`;
  
  if (streak === 0) {
    return `Ready to start your first streak today, ${userName}? Let's get that LPT title!`;
  }
  
  if (streak === 1) return `First day of the streak! The journey of a thousand miles begins with one GenEd question.`;
  if (streak === 7) return `Isang linggo na! Consistent ka na talaga, ${userName}. Keep it up!`;

  if (totalAnswers > 500) return `Over 500 questions answered! You're becoming an absolute master of the material.`;

  // 3. Mood-based responses
  const moodMap: Record<string, string[]> = {
    'Motivated': [
      `I can feel the energy! Let's crush those reviewers, ${userName}!`,
      `With this kind of focus, that board exam is going to be easy for you.`,
    ],
    'Sleepy': [
      `*Yawns*... Am I the sleepy one or are you? Coffee break muna, ${userName}?`,
      `Steady lang tayo. Even a little study is better than none!`,
    ],
    'Focused': [
      `Silent mode: ON. You're in the zone, ${userName}. I'm impressed!`,
      `Don't let me distract you. You're doing great work right now.`,
    ],
    'Stressed': [
      `Hinga nang malalim, ${userName}. Take a short break, then back to basics.`,
      `Don't worry about the hard ones. Mastery takes time!`,
    ],
    'Happy': [
      `Having fun while studying? That's the secret to passing, ${userName}!`,
      `Seeing you progress makes my digital heart happy. Let's go!`,
    ]
  };

  const options = moodMap[mood] || moodMap['Happy'];
  return options[Math.floor(Math.random() * options.length)];
}

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
- IF streak is 0, DO NOT congratulate them. Encourage them to start their first streak.
- Use Teacher humor or Pinoy cultural references occasionally (e.g., LPT goals, deped jokes).
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
    }) 
  },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, the user's study pet. The user ({{{userName}}}) just said: "{{{userMessage}}}"

Context:
- Your Mood: {{{mood}}}
- Their Streak: {{{streak}}}
- Total Questions: {{{totalAnswers}}}

Respond as the pet. Keep it short (1-2 sentences), encouraging, and funny. 
Use the provided stats to give a personalized answer. 
Avoid being robotic. Stay in your {{{mood}}} character.`,
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
