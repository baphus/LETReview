'use server';
/**
 * @fileOverview A flow for generating a quiz from a list of questions.
 *
 * - generateQuiz - A function that takes a list of questions and returns a quiz with multiple-choice answers.
 * - GenerateQuizInput - The input type for the generateQuiz function.
 * - GenerateQuizOutput - The return type for the generateQuiz function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { Question, QuizQuestion } from '@/lib/types';

// Define the input schema for a single question
const QuestionSchema = z.object({
  id: z.number(),
  category: z.union([z.literal('gen_education'), z.literal('professional')]),
  difficulty: z.union([z.literal('easy'), z.literal('medium'), z.literal('hard')]),
  question: z.string(),
  answer: z.string(),
  explanation: z.string().optional(),
});

// Define the input schema for the flow
const GenerateQuizInputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

// Define the output schema for a single quiz question
const QuizQuestionSchema = QuestionSchema.extend({
  choices: z.array(z.string()).describe("An array of 4 multiple-choice options, one of which must be the correct answer."),
});

// Define the output schema for the flow
const GenerateQuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;


// The exported wrapper function that calls the flow
export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}

// Define the prompt for the AI model
const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: { schema: GenerateQuizInputSchema },
  output: { schema: GenerateQuizOutputSchema },
  prompt: `You are an expert quiz creator for teacher licensure exams.
Your task is to convert a list of questions with single answers into a multiple-choice quiz format.
For each question provided, you must generate 3 plausible but incorrect answers (distractors) and combine them with the correct answer to form 4 choices.
Ensure the original question, correct answer, and explanation are preserved.
The final output should be a list of quiz questions, each with an array of 4 choices.

Here are the questions:
{{#each questions}}
- Question: {{{this.question}}}
  Correct Answer: {{{this.answer}}}
  Explanation: {{{this.explanation}}}
{{/each}}
`,
});

// Define the Genkit flow
const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async (input) => {
    // Call the prompt with the input questions
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate quiz from the AI model.');
    }
    
    // Shuffle choices for each question to ensure the correct answer is not always in the same position
    const shuffledQuestions = output.questions.map(q => ({
      ...q,
      choices: q.choices.sort(() => Math.random() - 0.5)
    }));
    
    return { questions: shuffledQuestions };
  }
);
