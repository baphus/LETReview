import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit configuration for LETReview.
 * Uses gemini-1.5-flash for maximum availability across free-tier keys.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-1.5-flash'),
});

export { z };
