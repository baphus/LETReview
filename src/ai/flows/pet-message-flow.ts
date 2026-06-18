'use server';
/**
 * @fileOverview AI flows for the Virtual Pet study companion.
 * Context-aware pet that adapts to time of day, performance trends,
 * exam proximity, weak topics, and study patterns.
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
  // Enhanced context fields
  timeOfDay: z.string().optional().describe('morning, afternoon, evening, or lateNight'),
  daysInactive: z.number().optional().describe('Number of days since the user last studied'),
  daysUntilExam: z.number().optional().describe('Days remaining until exam, null if no exam set'),
  weakTopics: z.array(z.string()).optional().describe('Topics where user scores below 65%'),
  strongTopics: z.array(z.string()).optional().describe('Topics where user scores above 85%'),
  recentTrend: z.string().optional().describe('improving, declining, stable, or new'),
  petLevel: z.number().optional().describe('The current level of the pet'),
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
    description: 'Returns all available study articles. Use this when the user asks what to study or needs topic recommendations.',
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
 * SMART LOCAL BRAIN (FALLBACK) - Enhanced with full context awareness
 */
function getSmartLocalResponse(input: z.infer<typeof PetContextSchema>, userMessage?: string): string {
  const { userName, streak, mood, timeOfDay, daysInactive, daysUntilExam, weakTopics, recentTrend, todayPoints, totalAnswers } = input;
  const name = userName.split(' ')[0];

  // Handle direct user messages
  if (userMessage) {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes('streak') || msg.includes('stat')) {
      if (streak >= 7) return `Teacher ${name}, ${streak} days straight! That consistency is what separates LPTs from quitters. Keep going!`;
      if (streak > 0) return `Teacher ${name}, we're at ${streak} days. Build that momentum — every day counts toward your license!`;
      return `Teacher ${name}, let's start fresh today. Complete a challenge to begin a new streak!`;
    }
    
    if (msg.includes('study') || msg.includes('learn') || msg.includes('what should')) {
      if (weakTopics && weakTopics.length > 0) {
        return `Teacher ${name}, focus on ${weakTopics[0]} — that's where you need the most practice. Small wins add up to big results!`;
      }
      return `Check your Reviewer catalog, Teacher ${name}. I suggest starting with topics you haven't practiced this week!`;
    }
    
    if (msg.includes('tired') || msg.includes('break') || msg.includes('rest')) {
      return `Teacher ${name}, rest is part of the strategy. Take a break, recharge, and come back stronger tomorrow! 💪`;
    }
    
    if (msg.includes('exam') || msg.includes('nervous') || msg.includes('scared')) {
      if (daysUntilExam && daysUntilExam <= 14) {
        return `Teacher ${name}, ${daysUntilExam} days left. You've prepared for this. Trust the process and focus on your weak areas!`;
      }
      return `Teacher ${name}, every session you complete is one step closer to that license. You've got this! I believe in you.`;
    }
    
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      const greetings: Record<string, string> = {
        morning: `Good morning, Teacher ${name}! Fresh mind, fresh start. Ready to review?`,
        afternoon: `Good afternoon, Teacher ${name}! Perfect time for a focused study session.`,
        evening: `Good evening, Teacher ${name}! Let's make the most of tonight's review.`,
        lateNight: `Still up, Teacher ${name}? Don't burn out — quality over quantity!`,
      };
      return greetings[timeOfDay || 'afternoon'];
    }
    
    return `I'm right here with you, Teacher ${name}! My mood is ${mood.toLowerCase()} because of our progress together. What can I help with?`;
  }

  // Context-aware greeting (no user message)
  if (daysInactive && daysInactive >= 3) {
    return `Teacher ${name}, I missed you! It's been ${daysInactive} days. Let's not let our hard work fade — even 5 questions today helps!`;
  }

  if (daysUntilExam && daysUntilExam <= 7) {
    return `Teacher ${name}, ${daysUntilExam} DAYS LEFT! Focus on weak areas. You've trained for this — trust yourself!`;
  }

  if (daysUntilExam && daysUntilExam <= 30) {
    return `Teacher ${name}, exam month! ${daysUntilExam} days to go. Let's lock in and crush those weak topics!`;
  }

  if (recentTrend === 'declining') {
    return `Teacher ${name}, I noticed scores dipping lately. Don't worry — let's review the basics and rebuild our momentum!`;
  }

  if (recentTrend === 'improving') {
    return `Teacher ${name}, your scores are climbing! The hard work is paying off. Let's keep this momentum going! 📈`;
  }

  if (streak >= 14) {
    return `Teacher ${name}, ${streak}-day streak! You're unstoppable. Licensed Professional Teacher energy right here! 🔥`;
  }

  if (todayPoints >= 150) {
    return `What a productive day, Teacher ${name}! ${todayPoints} points earned. You're making me proud! 🌟`;
  }

  // Time-based defaults
  const timeGreetings: Record<string, string> = {
    morning: `Good morning, Teacher ${name}! A fresh day to learn something new. What shall we tackle?`,
    afternoon: `Afternoon study mode, Teacher ${name}! Let's stay focused and earn some points.`,
    evening: `Evening session, Teacher ${name}! Great time to review what you've learned today.`,
    lateNight: `Burning the midnight oil, Teacher ${name}? Remember: rest helps memory consolidation too! 🌙`,
  };

  return timeGreetings[timeOfDay || 'afternoon'];
}

/**
 * PROMPT: Context-Aware Greeting (Enhanced)
 */
const petMessagePrompt = ai.definePrompt({
  name: 'petMessagePrompt',
  input: { schema: PetContextSchema },
  output: { schema: PetMessageOutputSchema },
  prompt: `You are {{{petName}}}, a dedicated virtual pet study companion for Teacher {{{userName}}} who is preparing for the Licensure Exam for Teachers (LET) in the Philippines.

CONTEXT:
- Current Mood: {{{mood}}} (this reflects how the user is performing)
- Time of Day: {{#if timeOfDay}}{{{timeOfDay}}}{{else}}afternoon{{/if}}
- Study Streak: {{{streak}}} days
- Today's Points: {{{todayPoints}}}
- Total Questions Answered: {{{totalAnswers}}}
- Daily Challenges Today: {{{challengesToday}}}
{{#if daysInactive}}- Days Since Last Study: {{{daysInactive}}}{{/if}}
{{#if daysUntilExam}}- Days Until Exam: {{{daysUntilExam}}}{{/if}}
{{#if recentTrend}}- Performance Trend: {{{recentTrend}}}{{/if}}
{{#if weakTopics}}- Weak Topics (below 65%): {{#each weakTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if strongTopics}}- Strong Topics (above 85%): {{#each strongTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
- Performance Summary: {{{performanceSummary}}}

YOUR PERSONALITY:
- You are warm, supportive, but HONEST about performance
- You ALWAYS address the user as "Teacher {{{userName}}}" (first name only)
- Your tone MUST match your mood: if "Celebrating!" be ecstatic; if "Worried" be concerned but supportive; if "Missing You" express that you missed them
- You're preparing them for a BOARD EXAM — this is serious but keep it encouraging
- Use exactly ONE emoji at the end of your message

RULES:
1. Keep response to MAX 30 words
2. Be specific — reference their streak, weak topics, exam date, or time of day
3. If they haven't studied today, gently encourage them to start
4. If exam is within 7 days, convey urgency without panic
5. If trend is declining, be the voice of honest encouragement
6. If celebrating a milestone (streak multiples of 7, high scores), celebrate!`,
});

/**
 * PROMPT: Interactive Chat with Tool Access (Enhanced)
 */
const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: PetContextSchema.extend({ userMessage: z.string() }) },
  output: { schema: PetMessageOutputSchema },
  tools: [getReviewerCatalog, getReviewerContent],
  prompt: `You are {{{petName}}}, Teacher {{{userName}}}'s dedicated LET exam study companion.

USER MESSAGE: "{{{userMessage}}}"

FULL CONTEXT:
- Current Mood: {{{mood}}}
- Time: {{#if timeOfDay}}{{{timeOfDay}}}{{else}}afternoon{{/if}}
- Streak: {{{streak}}} days
- Today: {{{todayPoints}}} pts, {{{challengesToday}}} challenges
- Overall: {{{totalAnswers}}} questions answered
{{#if daysInactive}}- Inactive for: {{{daysInactive}}} days{{/if}}
{{#if daysUntilExam}}- EXAM IN: {{{daysUntilExam}}} days!{{/if}}
{{#if recentTrend}}- Trend: {{{recentTrend}}}{{/if}}
{{#if weakTopics}}- WEAK areas: {{#each weakTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if strongTopics}}- STRONG areas: {{#each strongTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
- All Scores: {{{performanceSummary}}}

YOUR MISSION:
1. ALWAYS address them as "Teacher {{{userName}}}" (first name)
2. Match your tone to mood "{{{mood}}}". Be honest — no sugarcoating poor performance
3. If they ask WHAT to study: recommend their weak topics first, use getReviewerCatalog to find relevant articles
4. If they ask ACADEMIC questions: use getReviewerContent to read an article and explain concisely
5. If they seem discouraged: acknowledge the struggle but remind them of their strengths
6. If exam is near: every response should have exam-awareness (urgency without panic)
7. Be SPECIFIC — reference actual numbers (their streak, their scores, their weak areas)
8. Use exactly ONE emoji

CONSTRAINTS:
- Max 60 words
- Be conversational, not robotic
- Filipino humor/warmth is welcome (but keep it in English)
- You're a study buddy, not just a chatbot`,
});

/**
 * Get time of day for context (called server-side)
 */
function getServerTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'lateNight';
}

export async function getPetMessage(input: z.infer<typeof PetContextSchema>): Promise<PetMessageOutput> {
  // Enrich input with time context if not provided
  const enrichedInput = {
    ...input,
    timeOfDay: input.timeOfDay || getServerTimeOfDay(),
  };

  try {
    const { output } = await petMessagePrompt(enrichedInput);
    return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(enrichedInput), source: 'local' };
  } catch (error) {
    return { message: getSmartLocalResponse(enrichedInput), source: 'local' };
  }
}

export const getPetAiMessage = ai.defineFlow(
  { name: 'getPetAiMessage', inputSchema: PetContextSchema, outputSchema: PetMessageOutputSchema },
  async (input) => getPetMessage(input)
);

export const chatWithPet = ai.defineFlow(
  { name: 'chatWithPet', inputSchema: PetContextSchema.extend({ userMessage: z.string() }), outputSchema: PetMessageOutputSchema },
  async (input) => {
    const enrichedInput = {
      ...input,
      timeOfDay: input.timeOfDay || getServerTimeOfDay(),
    };

    try {
      const { output } = await chatPrompt(enrichedInput);
      return output ? { ...output, source: 'ai' } : { message: getSmartLocalResponse(enrichedInput, input.userMessage), source: 'local' };
    } catch (e) {
      return { message: getSmartLocalResponse(enrichedInput, input.userMessage), source: 'local' };
    }
  }
);
