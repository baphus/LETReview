import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit configuration for LETReview.
 * Uses Gemini 2.5 Flash as a "tiny model" in the cloud for high-performance,
 * low-latency, and cost-effective intelligence that works on any browser.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
