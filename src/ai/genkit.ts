import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit configuration for LETReview.
 * Uses Google AI by default for prototype availability.
 * To use Local AI (e.g., Ollama), replace googleAI() with the ollama() plugin.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
